"use client";

import { useTransition, useRef } from "react";
import { Decimal } from "@prisma/client/runtime/library";
import { addReference, deleteReference } from "./actions";

interface Reference {
  id: string;
  projectName: string;
  clientName: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  value: Decimal | null;
  year: number | null;
  scopeSummary: string | null;
}

export function ReferencesSection({ references }: { references: Reference[] }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      await addReference(formData);
      formRef.current?.reset();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteReference(id);
    });
  }

  return (
    <div className="rounded-lg border border-stone/10 bg-white shadow-sm">
      <div className="border-b border-stone/10 px-6 py-4">
        <h2 className="font-display text-lg font-semibold text-slate">Past Project References</h2>
      </div>

      {references.length > 0 && (
        <div className="divide-y divide-stone/10">
          {references.map((ref) => (
            <div key={ref.id} className="px-6 py-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-sm font-medium text-charcoal">{ref.projectName}</span>
                  <span className="ml-2 text-sm text-stone">for {ref.clientName}</span>
                  {ref.year && <span className="ml-2 text-xs text-stone">({ref.year})</span>}
                  {ref.value && (
                    <span className="ml-2 text-xs text-stone">
                      ${Number(ref.value).toLocaleString()}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(ref.id)}
                  disabled={pending}
                  className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
              {ref.scopeSummary && (
                <p className="mt-1 text-xs text-stone">{ref.scopeSummary}</p>
              )}
              {(ref.contactName || ref.contactPhone || ref.contactEmail) && (
                <p className="mt-1 text-xs text-stone">
                  Contact: {[ref.contactName, ref.contactPhone, ref.contactEmail].filter(Boolean).join(" | ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <form ref={formRef} action={handleAdd} className="border-t border-stone/10 p-6 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            name="projectName"
            placeholder="Project name"
            required
            className="rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          />
          <input
            name="clientName"
            placeholder="Client name"
            required
            className="rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          />
          <input
            name="year"
            type="number"
            placeholder="Year"
            min="2000"
            max="2030"
            className="rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input
            name="contactName"
            placeholder="Contact name"
            className="rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          />
          <input
            name="contactPhone"
            placeholder="Contact phone"
            className="rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          />
          <input
            name="contactEmail"
            placeholder="Contact email"
            className="rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          />
          <input
            name="value"
            type="number"
            step="0.01"
            placeholder="Contract value"
            className="rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="sm:col-span-3">
            <textarea
              name="scopeSummary"
              placeholder="Scope summary"
              rows={2}
              className="w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="self-end rounded-md bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-slate/90 disabled:opacity-50 transition-colors"
          >
            {pending ? "Adding..." : "Add Reference"}
          </button>
        </div>
      </form>
    </div>
  );
}
