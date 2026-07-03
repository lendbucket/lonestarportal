"use client";

import { useTransition, useRef } from "react";
import { uploadBidDocument, deleteBidDocument } from "./actions";

interface Document {
  id: string;
  label: string;
  fileUrl: string;
  signedUrl?: string | null;
  mimeType: string | null;
  createdAt: Date;
}

export function DocumentsSection({ documents }: { documents: Document[] }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleUpload(formData: FormData) {
    startTransition(async () => {
      await uploadBidDocument(formData);
      formRef.current?.reset();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteBidDocument(id);
    });
  }

  return (
    <div className="rounded-lg border border-stone/10 bg-white shadow-sm">
      <div className="border-b border-stone/10 px-6 py-4">
        <h2 className="font-display text-lg font-semibold text-slate">
          Standard Enclosures
        </h2>
        <p className="mt-1 text-xs text-stone">
          COI, W-9, Capability Statement PDF, license copies, and other documents
          attached to every bid.
        </p>
      </div>

      {documents.length > 0 && (
        <div className="divide-y divide-stone/10">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-bone text-xs font-medium text-stone">
                  {doc.mimeType?.includes("pdf") ? "PDF" : "DOC"}
                </div>
                <div>
                  <a
                    href={doc.signedUrl || doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-charcoal hover:text-clay"
                  >
                    {doc.label}
                  </a>
                  <p className="text-xs text-stone">
                    Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                disabled={pending}
                className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <form ref={formRef} action={handleUpload} className="border-t border-stone/10 p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select
            name="label"
            required
            className="rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          >
            <option value="">Select document type...</option>
            <option value="Certificate of Insurance (COI)">Certificate of Insurance (COI)</option>
            <option value="W-9">W-9</option>
            <option value="Capability Statement">Capability Statement</option>
            <option value="License Copy">License Copy</option>
            <option value="Bond Letter">Bond Letter</option>
            <option value="Safety Program">Safety Program</option>
            <option value="Certification Copy">Certification Copy</option>
            <option value="Other">Other</option>
          </select>
          <input
            name="file"
            type="file"
            required
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            className="rounded-md border border-stone/20 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-bone file:px-3 file:py-1 file:text-xs file:font-medium file:text-slate focus:border-clay focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-slate/90 disabled:opacity-50 transition-colors"
          >
            {pending ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      </form>
    </div>
  );
}
