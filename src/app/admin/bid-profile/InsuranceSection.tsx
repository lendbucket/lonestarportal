"use client";

import { useTransition, useRef } from "react";
import { addInsurancePolicy, deleteInsurancePolicy } from "./actions";
import { ExpiryBadge } from "./ExpiryBadge";

interface Policy {
  id: string;
  type: string;
  carrier: string;
  policyNumber: string;
  limit: string | null;
  expiresOn: Date | null;
}

export function InsuranceSection({ policies }: { policies: Policy[] }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      await addInsurancePolicy(formData);
      formRef.current?.reset();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteInsurancePolicy(id);
    });
  }

  return (
    <div className="rounded-lg border border-stone/10 bg-white shadow-sm">
      <div className="border-b border-stone/10 px-6 py-4">
        <h2 className="font-display text-lg font-semibold text-slate">Insurance Policies</h2>
      </div>

      {policies.length > 0 && (
        <div className="divide-y divide-stone/10">
          {policies.map((pol) => (
            <div key={pol.id} className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-sm font-medium text-charcoal">{pol.type}</span>
                  <span className="ml-2 text-sm text-stone">{pol.carrier}</span>
                  <span className="ml-2 text-xs text-stone">#{pol.policyNumber}</span>
                  {pol.limit && (
                    <span className="ml-2 text-xs text-stone">Limit: {pol.limit}</span>
                  )}
                </div>
                <ExpiryBadge date={pol.expiresOn} />
              </div>
              <button
                onClick={() => handleDelete(pol.id)}
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select
            name="type"
            required
            className="rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          >
            <option value="">Select type...</option>
            <option value="General Liability">General Liability</option>
            <option value="Workers Compensation">Workers Compensation</option>
            <option value="Commercial Auto">Commercial Auto</option>
            <option value="Umbrella">Umbrella</option>
            <option value="Professional Liability">Professional Liability</option>
            <option value="Builders Risk">Builders Risk</option>
          </select>
          <input
            name="carrier"
            placeholder="Carrier name"
            required
            className="rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          />
          <input
            name="policyNumber"
            placeholder="Policy number"
            required
            className="rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            name="limit"
            placeholder="Limit (e.g. $1,000,000)"
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
            {pending ? "Adding..." : "Add Policy"}
          </button>
        </div>
      </form>
    </div>
  );
}
