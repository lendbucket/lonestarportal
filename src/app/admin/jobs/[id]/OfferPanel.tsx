"use client";

import { useState, useTransition } from "react";
import { offerJobToSubs } from "../actions";

interface Sub {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
}

interface Props {
  jobId: string;
  matchingSubs: Sub[];
}

export function OfferPanel({ jobId, matchingSubs }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleOffer() {
    startTransition(() => offerJobToSubs(jobId, Array.from(selected)));
  }

  return (
    <div className="rounded-lg border border-stone/10 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-charcoal mb-3">
        Matching subcontractors ({matchingSubs.length})
      </h2>
      <p className="text-xs text-stone mb-3">
        These subs are active, serve the job&apos;s city, and have the job&apos;s trade.
      </p>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {matchingSubs.map((sub) => (
          <label
            key={sub.id}
            className="flex items-center gap-3 rounded-md border border-stone/10 px-3 py-2 cursor-pointer hover:bg-bone/30 transition-colors"
          >
            <input
              type="checkbox"
              checked={selected.has(sub.id)}
              onChange={() => toggle(sub.id)}
              className="rounded border-stone/30 text-clay focus:ring-clay"
            />
            <div>
              <p className="text-sm font-medium text-charcoal">{sub.companyName}</p>
              <p className="text-xs text-stone">{sub.contactName} &middot; {sub.phone}</p>
            </div>
          </label>
        ))}
      </div>

      <button
        onClick={handleOffer}
        disabled={pending || selected.size === 0}
        className="mt-3 w-full rounded-md bg-clay px-4 py-2 text-sm font-semibold text-white hover:bg-clay/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? "Sending offers..." : `Offer to ${selected.size} sub${selected.size !== 1 ? "s" : ""}`}
      </button>
    </div>
  );
}
