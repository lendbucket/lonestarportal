"use client";

import { useTransition } from "react";
import { updateJobSchedule } from "../actions";

interface Props {
  job: {
    id: string;
    scheduledDate: Date | null;
    amount: unknown;
  };
}

export function JobScheduleForm({ job }: Props) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(() => updateJobSchedule(job.id, formData));
  }

  return (
    <div className="rounded-lg border border-stone/10 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-charcoal mb-3">Schedule and pricing</h2>
      <form action={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-stone mb-1">Scheduled date</label>
          <input
            name="scheduledDate"
            type="date"
            defaultValue={job.scheduledDate ? new Date(job.scheduledDate).toISOString().split("T")[0] : ""}
            className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone mb-1">Amount ($)</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={job.amount ? Number(job.amount) : ""}
            className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-slate px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate/90 disabled:opacity-50 transition-colors"
        >
          {pending ? "Saving..." : "Update"}
        </button>
      </form>
    </div>
  );
}
