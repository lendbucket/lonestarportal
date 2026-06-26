import { prisma } from "./prisma";
import { encrypt, decrypt } from "./encryption";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

// ─── Token management ───

interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

async function refreshAccessToken(refreshToken: string): Promise<TokenSet> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token refresh failed: ${body}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function getValidAccessToken(): Promise<string> {
  const conn = await prisma.gmailConnection.findFirst();
  if (!conn) throw new Error("Gmail not connected.");

  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // refresh 5 min early

  if (
    conn.encryptedAccessToken &&
    conn.accessTokenExpiresAt &&
    conn.accessTokenExpiresAt.getTime() > now.getTime() + bufferMs
  ) {
    return decrypt(conn.encryptedAccessToken);
  }

  const refreshToken = decrypt(conn.encryptedRefreshToken);
  const tokens = await refreshAccessToken(refreshToken);

  await prisma.gmailConnection.update({
    where: { id: conn.id },
    data: {
      encryptedAccessToken: encrypt(tokens.accessToken),
      encryptedRefreshToken: encrypt(tokens.refreshToken),
      accessTokenExpiresAt: tokens.expiresAt,
    },
  });

  return tokens.accessToken;
}

// ─── Gmail API helpers ───

async function gmailFetch(path: string, accessToken: string) {
  const res = await fetch(`${GMAIL_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gmail API error (${res.status}): ${body}`);
  }
  return res.json();
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  internalDate: string;
  payload: {
    headers: { name: string; value: string }[];
    mimeType: string;
    body?: { data?: string; size: number };
    parts?: GmailPart[];
  };
}

export interface GmailPart {
  partId: string;
  mimeType: string;
  filename: string;
  headers: { name: string; value: string }[];
  body: { attachmentId?: string; data?: string; size: number };
  parts?: GmailPart[];
}

export async function getProfile(accessToken: string) {
  return gmailFetch("/profile", accessToken);
}

export async function listHistory(
  accessToken: string,
  startHistoryId: string
): Promise<{ history?: { messagesAdded?: { message: { id: string } }[] }[]; historyId: string }> {
  const params = new URLSearchParams({
    startHistoryId,
    historyTypes: "messageAdded",
    labelId: "INBOX",
  });
  return gmailFetch(`/history?${params}`, accessToken);
}

export async function searchMessages(
  accessToken: string,
  query: string,
  maxResults = 50
): Promise<{ messages?: { id: string }[]; resultSizeEstimate: number }> {
  const params = new URLSearchParams({
    q: query,
    maxResults: String(maxResults),
  });
  return gmailFetch(`/messages?${params}`, accessToken);
}

export async function getMessage(
  accessToken: string,
  messageId: string
): Promise<GmailMessage> {
  return gmailFetch(`/messages/${messageId}?format=full`, accessToken);
}

export async function getAttachment(
  accessToken: string,
  messageId: string,
  attachmentId: string
): Promise<{ data: string; size: number }> {
  return gmailFetch(
    `/messages/${messageId}/attachments/${attachmentId}`,
    accessToken
  );
}

// ─── Body extraction ───

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf8");
}

function extractTextFromParts(parts: GmailPart[]): string {
  const texts: string[] = [];

  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      texts.push(decodeBase64Url(part.body.data));
    } else if (part.mimeType === "text/html" && part.body?.data && texts.length === 0) {
      // Fall back to HTML if no plain text
      const html = decodeBase64Url(part.body.data);
      texts.push(stripHtml(html));
    } else if (part.parts) {
      texts.push(extractTextFromParts(part.parts));
    }
  }

  return texts.join("\n");
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function getHeader(
  headers: { name: string; value: string }[],
  name: string
): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

export function extractBody(message: GmailMessage): string {
  const payload = message.payload;

  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    if (payload.mimeType === "text/html") return stripHtml(decoded);
    return decoded;
  }

  if (payload.parts) {
    return extractTextFromParts(payload.parts);
  }

  return message.snippet || "";
}

export function extractAttachments(
  message: GmailMessage
): { filename: string; mimeType: string; attachmentId: string }[] {
  const attachments: {
    filename: string;
    mimeType: string;
    attachmentId: string;
  }[] = [];

  function walk(parts: GmailPart[]) {
    for (const part of parts) {
      if (part.body?.attachmentId && part.filename) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          attachmentId: part.body.attachmentId,
        });
      }
      if (part.parts) walk(part.parts);
    }
  }

  if (message.payload.parts) walk(message.payload.parts);
  return attachments;
}

export function decodeBase64UrlToBuffer(data: string): Buffer {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}
