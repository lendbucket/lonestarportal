import "server-only";

const TWILIO_API = "https://api.twilio.com/2010-04-01/Accounts";

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

interface SendResult {
  success: boolean;
  sid?: string;
  error?: string;
}

function getConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) return null;
  return { accountSid, authToken, fromNumber };
}

function toE164(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (/^\+1\d{10}$/.test(cleaned)) return cleaned;
  if (cleaned.startsWith("+")) return cleaned;
  if (/^1\d{10}$/.test(cleaned)) return `+${cleaned}`;
  if (/^\d{10}$/.test(cleaned)) return `+1${cleaned}`;
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

/**
 * Normalize a phone number to E.164 format.
 * Handles common US formats: (512) 555-1234, 512-555-1234, 5125551234, +15125551234
 */
export function normalizePhone(phone: string): string {
  return toE164(phone);
}

/**
 * Send a single SMS via Twilio REST API.
 */
export async function sendSms(to: string, body: string): Promise<SendResult> {
  const config = getConfig();
  if (!config) {
    return { success: false, error: "Twilio not configured" };
  }

  const normalizedTo = toE164(to);
  const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64");

  try {
    const res = await fetch(
      `${TWILIO_API}/${config.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: normalizedTo,
          From: config.fromNumber,
          Body: body,
        }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      return { success: true, sid: data.sid };
    }

    const errorBody = await res.text();
    console.error(`[twilio] SMS to ${normalizedTo} failed (${res.status}):`, errorBody);
    return { success: false, error: `HTTP ${res.status}` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[twilio] SMS to ${normalizedTo} error:`, msg);
    return { success: false, error: msg };
  }
}

/**
 * Check if Twilio is configured.
 */
export function isTwilioConfigured(): boolean {
  return getConfig() !== null;
}
