"use client";

import { useTransition, useState } from "react";
import { useSession } from "next-auth/react";
import {
  generateDraft,
  saveDraftEdits,
  approveDraft,
  markSubmitted,
  markWon,
  markLost,
  skipSolicitation,
  convertToJob,
  completeSolicitation,
  uploadSolicitationDocument,
} from "../actions";

interface Attachment {
  id: string;
  label: string;
  fileUrl: string;
  mimeType: string | null;
  extractedText: string | null;
}

interface Draft {
  id: string;
  generatedContent: string;
  editedContent: string | null;
  enclosures: unknown;
  aiModel: string;
  generatedAt: Date;
  approvedAt: Date | null;
  approvedByUserId: string | null;
  submittedAt: Date | null;
  submissionNotes: string | null;
}

interface BidDoc {
  id: string;
  label: string;
  fileUrl: string;
  mimeType: string | null;
}

interface Solicitation {
  id: string;
  source: string;
  gmailMessageId: string | null;
  sourceLink: string | null;
  receivedAt: Date;
  issuingEntity: string;
  solicitationNumber: string | null;
  title: string;
  scope: string | null;
  tradeCategory: string | null;
  location: string | null;
  dueDate: Date | null;
  submissionMethod: string | null;
  submissionContact: string | null;
  requirements: unknown;
  rawEmailExcerpt: string | null;
  needsSourceDocument: boolean;
  status: string;
  jobId: string | null;
  attachments: Attachment[];
  draft: Draft | null;
  job: { id: string; title: string; status: string } | null;
}

const statusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  DRAFTING: "bg-yellow-100 text-yellow-800",
  DRAFT_READY: "bg-green-100 text-green-800",
  NEEDS_DOC: "bg-orange-100 text-orange-800",
  APPROVED: "bg-indigo-100 text-indigo-800",
  SUBMITTED: "bg-purple-100 text-purple-800",
  WON: "bg-emerald-100 text-emerald-800",
  LOST: "bg-red-100 text-red-800",
  SKIPPED: "bg-stone/10 text-stone",
};

const statusLabels: Record<string, string> = {
  NEW: "New",
  DRAFTING: "Drafting...",
  DRAFT_READY: "Draft Ready",
  NEEDS_DOC: "Needs Document",
  APPROVED: "Approved",
  SUBMITTED: "Submitted",
  WON: "Won",
  LOST: "Lost",
  SKIPPED: "Skipped",
};

export function SolicitationDetail({
  solicitation: sol,
  documents,
}: {
  solicitation: Solicitation;
  documents: BidDoc[];
}) {
  const { data: session } = useSession();
  const [pending, startTransition] = useTransition();
  const [draftContent, setDraftContent] = useState(
    sol.draft?.editedContent || sol.draft?.generatedContent || ""
  );
  const [selectedEnclosures, setSelectedEnclosures] = useState<string[]>(
    Array.isArray(sol.draft?.enclosures) ? sol.draft.enclosures.map(String) : []
  );
  const [message, setMessage] = useState<string | null>(null);
  const [showEmail, setShowEmail] = useState(false);

  const isPastDue = sol.dueDate && new Date(sol.dueDate) < new Date();
  const requirements: string[] = Array.isArray(sol.requirements)
    ? sol.requirements.map(String)
    : [];

  function handleGenerateDraft() {
    setMessage(null);
    startTransition(async () => {
      try {
        await generateDraft(sol.id);
        setMessage("Draft generated successfully.");
      } catch (err: unknown) {
        setMessage(`Draft generation failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  }

  function handleSaveEdits() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("editedContent", draftContent);
      for (const id of selectedEnclosures) {
        formData.append("enclosureIds", id);
      }
      await saveDraftEdits(sol.id, formData);
      setMessage("Edits saved.");
    });
  }

  function handleApprove() {
    if (!confirm("Approve this draft? You can still edit after approval.")) return;
    startTransition(async () => {
      await approveDraft(sol.id, session?.user?.id || "");
      setMessage("Draft approved.");
    });
  }

  function handleMarkSubmitted(formData: FormData) {
    startTransition(async () => {
      await markSubmitted(sol.id, formData);
      setMessage("Marked as submitted.");
    });
  }

  function handleSkip() {
    if (!confirm("Skip this solicitation? You can reopen it later.")) return;
    startTransition(async () => {
      await skipSolicitation(sol.id);
    });
  }

  function handleWon() {
    startTransition(async () => {
      await markWon(sol.id);
    });
  }

  function handleLost() {
    startTransition(async () => {
      await markLost(sol.id);
    });
  }

  function handleConvertToJob() {
    if (!confirm("Create a job from this solicitation?")) return;
    startTransition(async () => {
      await convertToJob(sol.id);
    });
  }

  function handleComplete(formData: FormData) {
    startTransition(async () => {
      try {
        await completeSolicitation(sol.id, formData);
        setMessage("Solicitation updated. You can now generate a draft.");
      } catch (err: unknown) {
        setMessage(err instanceof Error ? err.message : String(err));
      }
    });
  }

  function handleUploadDoc(formData: FormData) {
    startTransition(async () => {
      try {
        await uploadSolicitationDocument(sol.id, formData);
        setMessage("Document uploaded.");
      } catch (err: unknown) {
        setMessage(err instanceof Error ? err.message : String(err));
      }
    });
  }

  function toggleEnclosure(docId: string) {
    setSelectedEnclosures((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId]
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate">
            {sol.title}
          </h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-stone">
            <span>{sol.issuingEntity}</span>
            {sol.solicitationNumber && (
              <>
                <span className="text-stone/30">|</span>
                <span>#{sol.solicitationNumber}</span>
              </>
            )}
            <span className="text-stone/30">|</span>
            <span className="uppercase text-xs">{sol.source}</span>
          </div>
        </div>
        <span
          className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
            statusColors[sol.status] || "bg-stone/10 text-stone"
          }`}
        >
          {statusLabels[sol.status] || sol.status}
        </span>
      </div>

      {message && (
        <div
          className={`rounded-md px-4 py-2 text-sm ${
            message.includes("failed") || message.includes("error")
              ? "bg-red-50 text-red-800"
              : "bg-green-50 text-green-800"
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: solicitation details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key details */}
          <div className="rounded-lg border border-stone/10 bg-white shadow-sm">
            <div className="border-b border-stone/10 px-6 py-4">
              <h2 className="font-display text-lg font-semibold text-slate">
                Solicitation Details
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-stone">Location</span>
                  <p className="font-medium text-charcoal">
                    {sol.location || "Not specified"}
                  </p>
                </div>
                <div>
                  <span className="text-stone">Due Date</span>
                  <p
                    className={`font-medium ${
                      isPastDue ? "text-red-600" : "text-charcoal"
                    }`}
                  >
                    {sol.dueDate
                      ? new Date(sol.dueDate).toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "Not specified"}
                    {isPastDue && " (past due)"}
                  </p>
                </div>
                <div>
                  <span className="text-stone">Trade Category</span>
                  <p className="font-medium text-charcoal">
                    {sol.tradeCategory || "Not specified"}
                  </p>
                </div>
                <div>
                  <span className="text-stone">Received</span>
                  <p className="font-medium text-charcoal">
                    {new Date(sol.receivedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {sol.scope && (
                <div>
                  <span className="text-sm text-stone">Scope</span>
                  <p className="mt-1 text-sm text-charcoal whitespace-pre-wrap">
                    {sol.scope}
                  </p>
                </div>
              )}

              {sol.submissionMethod && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-stone">Submission Method</span>
                    <p className="font-medium text-charcoal">
                      {sol.submissionMethod}
                    </p>
                  </div>
                  <div>
                    <span className="text-stone">Submission Contact</span>
                    <p className="font-medium text-charcoal">
                      {sol.submissionContact || "Not specified"}
                    </p>
                  </div>
                </div>
              )}

              {requirements.length > 0 && (
                <div>
                  <span className="text-sm text-stone">Requirements</span>
                  <ul className="mt-1 space-y-1">
                    {requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-charcoal">
                        <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-clay" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {sol.sourceLink && (
                <div>
                  <a
                    href={sol.sourceLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-clay hover:underline"
                  >
                    View source listing
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* NEEDS_DOC: completion form */}
          {sol.status === "NEEDS_DOC" && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 shadow-sm">
              <div className="border-b border-orange-200 px-6 py-4">
                <h2 className="font-display text-lg font-semibold text-orange-900">
                  Source Document Needed
                </h2>
                <p className="mt-1 text-sm text-orange-700">
                  This solicitation was extracted from a brief notification. Paste
                  the full solicitation text or upload the PDF to generate a
                  complete draft.
                </p>
              </div>
              <div className="p-6 space-y-4">
                <form action={handleComplete}>
                  <textarea
                    name="solicitationText"
                    rows={8}
                    placeholder="Paste the full solicitation text here..."
                    className="w-full rounded-md border border-orange-200 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="mt-3 rounded-md bg-clay px-4 py-2 text-sm font-medium text-white hover:bg-clay/90 disabled:opacity-50 transition-colors"
                  >
                    {pending ? "Updating..." : "Complete Solicitation"}
                  </button>
                </form>
                <div className="border-t border-orange-200 pt-4">
                  <p className="mb-2 text-sm text-orange-700">
                    Or upload the solicitation PDF:
                  </p>
                  <form action={handleUploadDoc} className="flex gap-3">
                    <input
                      name="file"
                      type="file"
                      accept=".pdf"
                      required
                      className="rounded-md border border-orange-200 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-orange-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-orange-800"
                    />
                    <button
                      type="submit"
                      disabled={pending}
                      className="rounded-md bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-slate/90 disabled:opacity-50 transition-colors"
                    >
                      Upload
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Draft section */}
          {sol.draft && (
            <div className="rounded-lg border border-stone/10 bg-white shadow-sm">
              <div className="border-b border-stone/10 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold text-slate">
                    Bid Draft
                  </h2>
                  <p className="text-xs text-stone">
                    Generated {new Date(sol.draft.generatedAt).toLocaleString()}{" "}
                    with {sol.draft.aiModel}
                    {sol.draft.approvedAt && (
                      <span className="ml-2 text-green-700">
                        | Approved{" "}
                        {new Date(sol.draft.approvedAt).toLocaleDateString()}
                      </span>
                    )}
                    {sol.draft.submittedAt && (
                      <span className="ml-2 text-purple-700">
                        | Submitted{" "}
                        {new Date(sol.draft.submittedAt).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateDraft}
                    disabled={pending}
                    className="rounded-md border border-stone/20 px-3 py-1.5 text-xs font-medium text-stone hover:text-charcoal disabled:opacity-50 transition-colors"
                  >
                    Regenerate
                  </button>
                </div>
              </div>
              <div className="p-6">
                <textarea
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  rows={24}
                  className="w-full rounded-md border border-stone/20 px-4 py-3 text-sm font-mono leading-relaxed focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
                />
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleSaveEdits}
                    disabled={pending}
                    className="rounded-md bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-slate/90 disabled:opacity-50 transition-colors"
                  >
                    Save Edits
                  </button>
                  {!sol.draft.approvedAt && (
                    <button
                      onClick={handleApprove}
                      disabled={pending}
                      className="rounded-md bg-clay px-4 py-2 text-sm font-medium text-white hover:bg-clay/90 disabled:opacity-50 transition-colors"
                    >
                      Approve Draft
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Enclosures picker */}
          {sol.draft && documents.length > 0 && (
            <div className="rounded-lg border border-stone/10 bg-white shadow-sm">
              <div className="border-b border-stone/10 px-6 py-4">
                <h2 className="font-display text-lg font-semibold text-slate">
                  Enclosures
                </h2>
                <p className="text-xs text-stone">
                  Select the standard documents to include with this bid.
                </p>
              </div>
              <div className="divide-y divide-stone/10">
                {documents.map((doc) => (
                  <label
                    key={doc.id}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-bone/30 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEnclosures.includes(doc.id)}
                      onChange={() => toggleEnclosure(doc.id)}
                      className="h-4 w-4 rounded border-stone/20 text-clay focus:ring-clay"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-charcoal">
                        {doc.label}
                      </span>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-clay hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        view
                      </a>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Original email */}
          {sol.rawEmailExcerpt && (
            <div className="rounded-lg border border-stone/10 bg-white shadow-sm">
              <button
                onClick={() => setShowEmail(!showEmail)}
                className="w-full border-b border-stone/10 px-6 py-4 flex items-center justify-between text-left"
              >
                <h2 className="font-display text-lg font-semibold text-slate">
                  Original Email
                </h2>
                <span className="text-xs text-stone">
                  {showEmail ? "Hide" : "Show"}
                </span>
              </button>
              {showEmail && (
                <div className="p-6">
                  <pre className="whitespace-pre-wrap text-xs text-stone font-mono leading-relaxed max-h-96 overflow-y-auto">
                    {sol.rawEmailExcerpt}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Attachments */}
          {sol.attachments.length > 0 && (
            <div className="rounded-lg border border-stone/10 bg-white shadow-sm">
              <div className="border-b border-stone/10 px-6 py-4">
                <h2 className="font-display text-lg font-semibold text-slate">
                  Attachments
                </h2>
              </div>
              <div className="divide-y divide-stone/10">
                {sol.attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-3 px-6 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-bone text-xs font-medium text-stone">
                      {att.mimeType?.includes("pdf") ? "PDF" : "DOC"}
                    </div>
                    <a
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-charcoal hover:text-clay"
                    >
                      {att.label}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: actions sidebar */}
        <div className="space-y-6">
          {/* Actions card */}
          <div className="rounded-lg border border-stone/10 bg-white shadow-sm">
            <div className="border-b border-stone/10 px-6 py-4">
              <h2 className="font-display text-lg font-semibold text-slate">
                Actions
              </h2>
            </div>
            <div className="p-6 space-y-3">
              {(sol.status === "NEW" || sol.status === "NEEDS_DOC") &&
                !sol.needsSourceDocument && (
                  <button
                    onClick={handleGenerateDraft}
                    disabled={pending}
                    className="w-full rounded-md bg-clay px-4 py-2 text-sm font-medium text-white hover:bg-clay/90 disabled:opacity-50 transition-colors"
                  >
                    {pending ? "Generating..." : "Generate Draft"}
                  </button>
                )}

              {sol.status === "APPROVED" && (
                <form action={handleMarkSubmitted} className="space-y-3">
                  <textarea
                    name="submissionNotes"
                    rows={3}
                    placeholder="Submission notes (portal used, confirmation number, etc.)"
                    className="w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="w-full rounded-md bg-clay px-4 py-2 text-sm font-medium text-white hover:bg-clay/90 disabled:opacity-50 transition-colors"
                  >
                    Mark Submitted
                  </button>
                </form>
              )}

              {sol.status === "SUBMITTED" && (
                <div className="flex gap-2">
                  <button
                    onClick={handleWon}
                    disabled={pending}
                    className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    Won
                  </button>
                  <button
                    onClick={handleLost}
                    disabled={pending}
                    className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    Lost
                  </button>
                </div>
              )}

              {sol.status === "WON" && !sol.jobId && (
                <button
                  onClick={handleConvertToJob}
                  disabled={pending}
                  className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  Convert to Job
                </button>
              )}

              {sol.job && (
                <a
                  href={`/admin/jobs/${sol.job.id}`}
                  className="block w-full rounded-md border border-stone/20 px-4 py-2 text-center text-sm font-medium text-charcoal hover:bg-bone transition-colors"
                >
                  View Job: {sol.job.title}
                </a>
              )}

              {["NEW", "DRAFT_READY", "NEEDS_DOC"].includes(sol.status) && (
                <button
                  onClick={handleSkip}
                  disabled={pending}
                  className="w-full rounded-md border border-stone/20 px-4 py-2 text-sm font-medium text-stone hover:text-charcoal disabled:opacity-50 transition-colors"
                >
                  Skip
                </button>
              )}
            </div>
          </div>

          {/* Due date warning */}
          {isPastDue && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">
                This solicitation is past due.
              </p>
              <p className="mt-1 text-xs text-red-600">
                Due:{" "}
                {sol.dueDate &&
                  new Date(sol.dueDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
              </p>
            </div>
          )}

          {/* Submission notes */}
          {sol.draft?.submissionNotes && (
            <div className="rounded-lg border border-stone/10 bg-white shadow-sm">
              <div className="border-b border-stone/10 px-6 py-4">
                <h2 className="font-display text-sm font-semibold text-slate">
                  Submission Notes
                </h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-charcoal whitespace-pre-wrap">
                  {sol.draft.submissionNotes}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
