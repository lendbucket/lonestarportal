import "server-only";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const FAST_MODEL = "claude-haiku-4-5-20251001";
const STRONG_MODEL = "claude-sonnet-4-6";

interface AiResponse {
  content: { type: string; text?: string }[];
  usage: { input_tokens: number; output_tokens: number };
}

async function callAnthropic(
  model: string,
  system: string,
  userMessage: string,
  maxTokens = 4096
): Promise<{ text: string; usage: { input: number; output: number } }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured.");

  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${body}`);
  }

  const data: AiResponse = await res.json();
  const text =
    data.content.find((c) => c.type === "text")?.text || "";

  return {
    text,
    usage: {
      input: data.usage.input_tokens,
      output: data.usage.output_tokens,
    },
  };
}

// ─── Classification ───

export interface ClassificationResult {
  isSolicitation: boolean;
  isDigest: boolean;
  digestCount: number;
  confidence: number;
}

export async function classifyEmail(
  subject: string,
  from: string,
  bodyExcerpt: string
): Promise<{ result: ClassificationResult; usage: { input: number; output: number } }> {
  const system = `You classify emails for a construction contracting company. Determine if this email is a bid solicitation (an invitation or request for bids/proposals/quotes for construction work, facility maintenance, or related services). BidNet notification emails that list one or more solicitations also count.

Respond with ONLY valid JSON, no other text:
{
  "isSolicitation": true/false,
  "isDigest": true/false,
  "digestCount": number (1 if single solicitation, >1 if digest listing multiple),
  "confidence": 0.0-1.0
}

Do NOT classify these as solicitations:
- Newsletters, marketing emails, account notifications
- Invoices, receipts, payment confirmations
- Internal communications, meeting invites
- Job board postings for employment
- Spam`;

  const userMsg = `Subject: ${subject}\nFrom: ${from}\n\n${bodyExcerpt.slice(0, 3000)}`;

  const { text, usage } = await callAnthropic(FAST_MODEL, system, userMsg, 256);

  try {
    const parsed = JSON.parse(text.trim());
    return {
      result: {
        isSolicitation: Boolean(parsed.isSolicitation),
        isDigest: Boolean(parsed.isDigest),
        digestCount: Number(parsed.digestCount) || 1,
        confidence: Number(parsed.confidence) || 0,
      },
      usage,
    };
  } catch {
    return {
      result: { isSolicitation: false, isDigest: false, digestCount: 0, confidence: 0 },
      usage,
    };
  }
}

// ─── Extraction ───

export interface ExtractedSolicitation {
  issuingEntity: string;
  solicitationNumber: string | null;
  title: string;
  scope: string | null;
  tradeCategory: string | null;
  location: string | null;
  dueDate: string | null;
  submissionMethod: string | null;
  submissionContact: string | null;
  requirements: string[];
  sourceLink: string | null;
  needsSourceDocument: boolean;
}

export async function extractSolicitation(
  subject: string,
  body: string,
  attachmentTexts: string[]
): Promise<{ solicitations: ExtractedSolicitation[]; usage: { input: number; output: number } }> {
  const system = `You extract structured bid solicitation data from emails received by a construction contracting company. The email may contain a single solicitation or be a BidNet-style digest listing multiple solicitations.

For each solicitation found, extract these fields:
- issuingEntity: the organization requesting bids
- solicitationNumber: the RFP/IFB/solicitation number if present
- title: a descriptive title for the solicitation
- scope: description of the work being solicited
- tradeCategory: the construction trade category (e.g., General Construction, Electrical, Plumbing, HVAC, Roofing, Painting, Demolition, Landscaping, etc.)
- location: where the work will be performed
- dueDate: the bid due date in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss) if found, null otherwise
- submissionMethod: how to submit the bid (email, portal, mail, etc.)
- submissionContact: who to contact or where to submit
- requirements: array of strings listing what the solicitation asks bidders to provide (bonds, insurance certs, licenses, references, pricing breakdown, etc.)
- sourceLink: any URL to the full solicitation or BidNet listing
- needsSourceDocument: true if the email is a brief notification/digest entry that does not contain the full solicitation details (common with BidNet digests that just have a title and link)

For a BidNet digest email, produce one entry per listed solicitation. Each entry from a digest will typically have needsSourceDocument: true.

Respond with ONLY valid JSON, no other text:
{ "solicitations": [ { ...fields... } ] }`;

  let userMsg = `Email subject: ${subject}\n\nEmail body:\n${body.slice(0, 8000)}`;
  if (attachmentTexts.length > 0) {
    userMsg += "\n\n--- Attachment text ---\n" + attachmentTexts.join("\n---\n").slice(0, 8000);
  }

  const { text, usage } = await callAnthropic(FAST_MODEL, system, userMsg, 4096);

  try {
    const parsed = JSON.parse(text.trim());
    const solicitations: ExtractedSolicitation[] = (parsed.solicitations || []).map(
      (s: Record<string, unknown>) => ({
        issuingEntity: String(s.issuingEntity || "Unknown"),
        solicitationNumber: s.solicitationNumber || null,
        title: String(s.title || "Untitled Solicitation"),
        scope: s.scope || null,
        tradeCategory: s.tradeCategory || null,
        location: s.location || null,
        dueDate: s.dueDate || null,
        submissionMethod: s.submissionMethod || null,
        submissionContact: s.submissionContact || null,
        requirements: Array.isArray(s.requirements)
          ? s.requirements.map(String)
          : [],
        sourceLink: s.sourceLink || null,
        needsSourceDocument: Boolean(s.needsSourceDocument),
      })
    );
    return { solicitations, usage };
  } catch {
    return { solicitations: [], usage };
  }
}

// ─── Draft generation ───

export interface BidProfileData {
  legalName: string;
  dba: string | null;
  address: string;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  uei: string | null;
  cage: string | null;
  duns: string | null;
  naicsCodes: string[];
  bondingCapacity: string | null;
  standardMarkupNotes: string | null;
  capabilityStatement: string | null;
  licenses: { type: string; number: string; state: string }[];
  insurancePolicies: { type: string; carrier: string; limit: string | null }[];
  certifications: { name: string; number: string | null; issuer: string | null }[];
  references: {
    projectName: string;
    clientName: string;
    value: string | null;
    year: number | null;
    scopeSummary: string | null;
  }[];
  documents: { id: string; label: string }[];
}

export async function generateBidDraft(
  solicitation: {
    title: string;
    issuingEntity: string;
    solicitationNumber: string | null;
    scope: string | null;
    location: string | null;
    dueDate: string | null;
    submissionMethod: string | null;
    submissionContact: string | null;
    requirements: string[];
    rawEmailExcerpt: string | null;
  },
  profile: BidProfileData
): Promise<{
  content: string;
  suggestedEnclosures: string[];
  model: string;
  usage: { input: number; output: number };
}> {
  const system = `You are a bid response writer for a construction contracting company. Write professional, direct bid responses. No filler language, no buzzwords, no marketing speak. Write clearly and specifically.

The response should include:
1. A cover letter addressed to the issuing entity referencing the solicitation number and title
2. A section-by-section response to each stated requirement
3. A recommended enclosures list from the company's available documents

Use the company profile data provided to populate qualifications, certifications, references, and insurance details. Only reference information that is actually in the profile. Do not fabricate credentials, project history, or capabilities.

Format the output as:
--- COVER LETTER ---
[cover letter text]

--- RESPONSE TO REQUIREMENTS ---
[requirement-by-requirement response]

--- RECOMMENDED ENCLOSURES ---
[list of document labels from the company's available documents that should be attached]

Write in a professional but plain tone. No em dashes, no en dashes.`;

  const profileSummary = `Company: ${profile.legalName}${profile.dba ? ` (DBA: ${profile.dba})` : ""}
Address: ${profile.address}
Phone: ${profile.phone || "N/A"} | Email: ${profile.email || "N/A"} | Website: ${profile.websiteUrl || "N/A"}
UEI: ${profile.uei || "N/A"} | CAGE: ${profile.cage || "N/A"} | DUNS: ${profile.duns || "N/A"}
NAICS: ${profile.naicsCodes.join(", ") || "N/A"}
Bonding Capacity: ${profile.bondingCapacity || "N/A"}

Licenses:
${profile.licenses.map((l) => `- ${l.type} #${l.number} (${l.state})`).join("\n") || "None listed"}

Insurance:
${profile.insurancePolicies.map((p) => `- ${p.type}: ${p.carrier}${p.limit ? `, Limit: ${p.limit}` : ""}`).join("\n") || "None listed"}

Certifications:
${profile.certifications.map((c) => `- ${c.name}${c.number ? ` #${c.number}` : ""}${c.issuer ? ` (${c.issuer})` : ""}`).join("\n") || "None listed"}

Past Project References:
${profile.references.map((r) => `- ${r.projectName} for ${r.clientName}${r.year ? ` (${r.year})` : ""}${r.value ? `, $${r.value}` : ""}${r.scopeSummary ? `: ${r.scopeSummary}` : ""}`).join("\n") || "None listed"}

Capability Statement:
${profile.capabilityStatement || "Not provided"}

Standard Markup/Pricing Notes:
${profile.standardMarkupNotes || "Not provided"}

Available Documents for Enclosure:
${profile.documents.map((d) => `- [${d.id}] ${d.label}`).join("\n") || "None uploaded"}`;

  const solicitationSummary = `Solicitation: ${solicitation.title}
Issuing Entity: ${solicitation.issuingEntity}
Solicitation Number: ${solicitation.solicitationNumber || "Not specified"}
Scope: ${solicitation.scope || "See requirements below"}
Location: ${solicitation.location || "Not specified"}
Due Date: ${solicitation.dueDate || "Not specified"}
Submission Method: ${solicitation.submissionMethod || "Not specified"}
Submission Contact: ${solicitation.submissionContact || "Not specified"}

Requirements:
${solicitation.requirements.map((r, i) => `${i + 1}. ${r}`).join("\n") || "No specific requirements listed"}

Original Email Excerpt:
${solicitation.rawEmailExcerpt?.slice(0, 4000) || "Not available"}`;

  const userMsg = `COMPANY PROFILE:\n${profileSummary}\n\nSOLICITATION:\n${solicitationSummary}`;

  const { text, usage } = await callAnthropic(STRONG_MODEL, system, userMsg, 8192);

  // Extract suggested enclosures from the draft
  const enclosureMatch = text.match(
    /--- RECOMMENDED ENCLOSURES ---\n([\s\S]*?)(?:---|$)/
  );
  const suggestedEnclosures: string[] = [];
  if (enclosureMatch) {
    const lines = enclosureMatch[1].split("\n").filter((l) => l.trim());
    for (const line of lines) {
      // Try to match document IDs from the profile
      const idMatch = line.match(/\[([^\]]+)\]/);
      if (idMatch) {
        suggestedEnclosures.push(idMatch[1]);
      } else {
        // Match by label
        for (const doc of profile.documents) {
          if (line.toLowerCase().includes(doc.label.toLowerCase())) {
            suggestedEnclosures.push(doc.id);
            break;
          }
        }
      }
    }
  }

  return {
    content: text,
    suggestedEnclosures,
    model: STRONG_MODEL,
    usage,
  };
}

export { FAST_MODEL, STRONG_MODEL };
