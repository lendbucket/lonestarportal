"use client";

import { useTransition } from "react";
import { updateJobStatus } from "../actions";

const statuses = ["DRAFT", "OFFERED", "ASSIGNED", "SCHEDULED", "IN_PROGRESS", "COMPLETE", "PAID", "CANCELLED"] as const;

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
  OFFERED: "bg-blue-100 text-blue-800 border-blue-200",
  ASSIGNED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  SCHEDULED: "bg-purple-100 text-purple-800 border-purple-200",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 border-yellow-200",
  COMPLETE: "bg-green-100 text-green-800 border-green-200",
  PAID: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  OFFERED: "Offered",
  ASSIGNED: "Assigned",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETE: "Complete",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

interface Props {
  job: { id: string; status: string };
}

export function JobStatusFlow({ job }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-lg border border-stone/10 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-charcoal mb-3">Status</h2>
      <div className="flex flex-col gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            disabled={pending}
            onClick={() => startTransition(() => updateJobStatus(job.id, s))}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              job.status === s
                ? statusColors[s]
                : "border-stone/20 text-stone hover:border-stone/40"
            }`}
          >
            {statusLabels[s]}
          </button>
        ))}
      </div>
    </div>
  );
}
