"use client";

import { useTransition } from "react";
import { activateSubcontractor, deactivateSubcontractor, toggleSmsOptOut } from "../actions";

interface Props {
  sub: {
    id: string;
    status: string;
    smsOptOut: boolean;
    userId?: string | null;
  };
}

export function StatusActions({ sub }: Props) {
  const [pending, startTransition] = useTransition();

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    ACTIVE: "bg-green-100 text-green-800",
    INACTIVE: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="flex items-center gap-3">
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[sub.status]}`}>
        {sub.status}
      </span>

      {sub.status === "PENDING" && (
        <button
          disabled={pending}
          onClick={() => startTransition(() => activateSubcontractor(sub.id))}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {pending ? "Activating..." : "Activate and invite"}
        </button>
      )}

      {sub.status === "ACTIVE" && (
        <button
          disabled={pending}
          onClick={() => startTransition(() => deactivateSubcontractor(sub.id))}
          className="rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {pending ? "Deactivating..." : "Deactivate"}
        </button>
      )}

      {sub.status === "INACTIVE" && (
        <button
          disabled={pending}
          onClick={() => startTransition(() => activateSubcontractor(sub.id))}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {pending ? "Reactivating..." : "Reactivate"}
        </button>
      )}

      <button
        disabled={pending}
        onClick={() => startTransition(() => toggleSmsOptOut(sub.id))}
        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
          sub.smsOptOut
            ? "border border-stone/20 text-stone hover:text-charcoal"
            : "border border-red-200 text-red-700 hover:bg-red-50"
        }`}
      >
        {sub.smsOptOut ? "SMS opted out (re-enable)" : "Opt out of SMS"}
      </button>
    </div>
  );
}
