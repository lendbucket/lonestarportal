"use client";

import { useTransition, useRef } from "react";
import { addLicense, deleteLicense } from "./actions";
import { ExpiryBadge } from "./ExpiryBadge";

interface License {
  id: string;
  type: string;
  number: string;
  state: string;
  expiresOn: Date | null;
}

export function LicensesSection({ licenses }: { licenses: License[] }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      await addLicense(formData);
      formRef.current?.reset();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteLicense(id);
    });
  }

  return (
    <div className="rounded-lg border border-stone/10 bg-white shadow-sm">
      <div className="border-b border-stone/10 px-6 py-4">
        <h2 className="font-display text-lg font-semibold text-slate">Licenses</h2>
      </div>

      {licenses.length > 0 && (
        <div className="divide-y divide-stone/10">
          {licenses.map((lic) => (
            <div key={lic.id} className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-sm font-medium text-charcoal">{lic.type}</span>
                  <span className="ml-2 text-sm text-stone">#{lic.number}</span>
                  <span className="ml-2 text-xs text-stone">({lic.state})</span>
                </div>
                <ExpiryBadge date={lic.expiresOn} />
              </div>
              <button
                onClick={() => handleDelete(lic.id)}
                disabled={pending}
                className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <form ref={formRef} action={handleAdd} className="border-t border-stone/10 p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <input
            name="type"
            placeholder="Type (e.g. General Contractor)"
            required
            className="rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          />
          <input
            name="number"
            placeholder="License number"
            required
            className="rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          />
          <input
            name="state"
            placeholder="State (e.g. TX)"
            required
            className="rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          />
          <input
            name="expiresOn"
            type="date"
            className="rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-slate/90 disabled:opacity-50 transition-colors"
          >
            {pending ? "Adding..." : "Add License"}
          </button>
        </div>
      </form>
    </div>
  );
}
