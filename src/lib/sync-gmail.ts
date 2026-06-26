"use server";

import { prisma } from "./prisma";
import { notifyOwnerNewSolicitations } from "./notify";
import {
  getValidAccessToken,
  listHistory,
  searchMessages,
  getMessage,
  getAttachment,
  extractBody,
  extractAttachments,
  getHeader,
  decodeBase64UrlToBuffer,
} from "./gmail";
import { classifyEmail, extractSolicitation } from "./ai";

interface SyncResult {
  processed: number;
  solicitations: number;
  skipped: number;
  errors: string[];
}

export async function syncGmail(): Promise<SyncResult> {
  const conn = await prisma.gmailConnection.findFirst();
  if (!conn || conn.status !== "connected") {
    throw new Error("Gmail not connected.");
  }

  const accessToken = await getValidAccessToken();
  const result: SyncResult = { processed: 0, solicitations: 0, skipped: 0, errors: [] };

  let messageIds: string[] = [];

  // Try incremental history sync first
  if (conn.lastHistoryId) {
    try {
      const history = await listHistory(accessToken, conn.lastHistoryId);

      if (history.history) {
        for (const entry of history.history) {
          if (entry.messagesAdded) {
            for (const added of entry.messagesAdded) {
              messageIds.push(added.message.id);
            }
          }
        }
      }

      // Update history ID
      if (history.historyId) {
        await prisma.gmailConnection.update({
          where: { id: conn.id },
          data: { lastHistoryId: history.historyId },
        });
      }
    } catch (err: unknown) {
      // History ID expired or invalid, fall back to date query
      console.warn("History sync failed, falling back to date query:", err instanceof Error ? err.message : err);
      messageIds = [];
    }
  }

  // Fallback: search for recent messages if history sync returned nothing
  if (messageIds.length === 0) {
    const since = conn.lastSyncedAt
      ? Math.floor(conn.lastSyncedAt.getTime() / 1000)
      : Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);

    const searchResult = await searchMessages(
      accessToken,
      `in:inbox after:${since}`,
      100
    );

    if (searchResult.messages) {
      messageIds = searchResult.messages.map((m) => m.id);
    }

    // Update history ID from profile
    try {
      const { getProfile } = await import("./gmail");
      const profile = await getProfile(accessToken);
      if (profile.historyId) {
        await prisma.gmailConnection.update({
          where: { id: conn.id },
          data: { lastHistoryId: String(profile.historyId) },
        });
      }
    } catch {
      // Non-critical
    }
  }

  // Deduplicate against already-processed messages
  const alreadyProcessed = await prisma.processedGmailMessage.findMany({
    where: { gmailMessageId: { in: messageIds } },
    select: { gmailMessageId: true },
  });
  const processedSet = new Set(alreadyProcessed.map((p) => p.gmailMessageId));

  // Also check existing solicitations
  const existingSolicitations = await prisma.solicitation.findMany({
    where: { gmailMessageId: { in: messageIds } },
    select: { gmailMessageId: true },
  });
  for (const s of existingSolicitations) {
    if (s.gmailMessageId) processedSet.add(s.gmailMessageId);
  }

  const newMessageIds = messageIds.filter((id) => !processedSet.has(id));

  for (const msgId of newMessageIds) {
    try {
      await processMessage(accessToken, msgId, result);
      result.processed++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Error processing message ${msgId}:`, msg);
      result.errors.push(`${msgId}: ${msg}`);
    }
  }

  // Update last synced time
  await prisma.gmailConnection.update({
    where: { id: conn.id },
    data: { lastSyncedAt: new Date() },
  });

  // Notify owner if new solicitations were created
  if (result.solicitations > 0) {
    await notifyOwnerNewSolicitations(result.solicitations);
  }

  return result;
}

async function processMessage(
  accessToken: string,
  messageId: string,
  result: SyncResult
) {
  const message = await getMessage(accessToken, messageId);
  const subject = getHeader(message.payload.headers, "Subject");
  const from = getHeader(message.payload.headers, "From");
  const body = extractBody(message);

  // Step 1: Classify
  const { result: classification } = await classifyEmail(
    subject,
    from,
    body
  );

  if (!classification.isSolicitation) {
    // Record as non-solicitation so we do not reprocess
    await prisma.processedGmailMessage.create({
      data: {
        gmailMessageId: messageId,
        classification: "not_solicitation",
      },
    });
    result.skipped++;
    return;
  }

  // Step 2: Extract PDF attachment text
  const attachmentInfos = extractAttachments(message);
  const attachmentTexts: string[] = [];
  const attachmentFiles: {
    filename: string;
    mimeType: string;
    buffer: Buffer;
    extractedText: string | null;
  }[] = [];

  for (const att of attachmentInfos) {
    if (att.mimeType === "application/pdf" || att.filename.endsWith(".pdf")) {
      try {
        const attData = await getAttachment(accessToken, messageId, att.attachmentId);
        const buffer = decodeBase64UrlToBuffer(attData.data);
        // Basic PDF text extraction: try to pull readable text from the buffer
        const text = extractTextFromPdfBuffer(buffer);
        if (text) {
          attachmentTexts.push(text);
        }
        attachmentFiles.push({
          filename: att.filename,
          mimeType: att.mimeType,
          buffer,
          extractedText: text || null,
        });
      } catch (err: unknown) {
        console.warn(`Failed to process attachment ${att.filename}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  // Step 3: Extract solicitation data
  const { solicitations: extracted } = await extractSolicitation(
    subject,
    body,
    attachmentTexts
  );

  if (extracted.length === 0) {
    await prisma.processedGmailMessage.create({
      data: {
        gmailMessageId: messageId,
        classification: classification.isDigest ? "digest_empty" : "extraction_failed",
      },
    });
    result.skipped++;
    return;
  }

  // Step 4: Create solicitation records
  const receivedAt = new Date(parseInt(message.internalDate));
  const source = classification.isDigest ? "BIDNET" : "GMAIL";

  for (let i = 0; i < extracted.length; i++) {
    const ext = extracted[i];
    const isFirst = i === 0;

    const solicitation = await prisma.solicitation.create({
      data: {
        source: source as "GMAIL" | "BIDNET",
        gmailMessageId: isFirst ? messageId : null,
        sourceLink: ext.sourceLink,
        receivedAt,
        issuingEntity: ext.issuingEntity,
        solicitationNumber: ext.solicitationNumber,
        title: ext.title,
        scope: ext.scope,
        tradeCategory: ext.tradeCategory,
        location: ext.location,
        dueDate: ext.dueDate ? new Date(ext.dueDate) : null,
        submissionMethod: ext.submissionMethod,
        submissionContact: ext.submissionContact,
        requirements: ext.requirements,
        rawEmailExcerpt: body.slice(0, 5000),
        needsSourceDocument: ext.needsSourceDocument,
        status: ext.needsSourceDocument ? "NEEDS_DOC" : "NEW",
      },
    });

    // Upload attachments for the first solicitation from this message
    if (isFirst && attachmentFiles.length > 0) {
      for (const att of attachmentFiles) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && serviceKey) {
          const fileName = `solicitations/${solicitation.id}/${Date.now()}-${att.filename}`;
          try {
            await fetch(
              `${supabaseUrl}/storage/v1/object/solicitation-attachments/${fileName}`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${serviceKey}`,
                  "Content-Type": att.mimeType,
                },
                body: new Uint8Array(att.buffer),
              }
            );

            const publicUrl = `${supabaseUrl}/storage/v1/object/public/solicitation-attachments/${fileName}`;
            await prisma.solicitationAttachment.create({
              data: {
                solicitationId: solicitation.id,
                label: att.filename,
                fileUrl: publicUrl,
                mimeType: att.mimeType,
                extractedText: att.extractedText,
              },
            });
          } catch (err: unknown) {
            console.warn(`Failed to upload attachment ${att.filename}:`, err instanceof Error ? err.message : err);
          }
        }
      }
    }

    result.solicitations++;
  }

  // Mark the Gmail message as processed
  await prisma.processedGmailMessage.create({
    data: {
      gmailMessageId: messageId,
      classification: classification.isDigest
        ? `digest_${extracted.length}`
        : "solicitation",
    },
  });
}

/**
 * Basic text extraction from a PDF buffer.
 * Pulls readable ASCII/UTF-8 text streams from the raw PDF bytes.
 * This is not a full PDF parser but handles most text-based PDFs.
 */
function extractTextFromPdfBuffer(buffer: Buffer): string {
  const content = buffer.toString("latin1");
  const texts: string[] = [];

  // Extract text between BT and ET markers (PDF text objects)
  const textObjectRegex = /BT\s([\s\S]*?)ET/g;
  let match;
  while ((match = textObjectRegex.exec(content)) !== null) {
    const block = match[1];
    // Extract text from Tj, TJ, and ' operators
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      texts.push(tjMatch[1]);
    }
    // TJ arrays
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
    let tjArrMatch;
    while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
      const inner = tjArrMatch[1];
      const strRegex = /\(([^)]*)\)/g;
      let strMatch;
      while ((strMatch = strRegex.exec(inner)) !== null) {
        texts.push(strMatch[1]);
      }
    }
  }

  const result = texts
    .join(" ")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return result;
}
