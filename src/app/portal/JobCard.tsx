"use client";

import { useTransition, useRef } from "react";
import { acceptJob, declineJob, uploadJobPhoto } from "./actions";

const jobStatusLabels: Record<string, string> = {
  DRAFT: "Draft",
  OFFERED: "Offered",
  ASSIGNED: "Assigned",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETE: "Complete",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

const jobStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  OFFERED: "bg-blue-100 text-blue-800",
  ASSIGNED: "bg-indigo-100 text-indigo-800",
  SCHEDULED: "bg-purple-100 text-purple-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETE: "bg-green-100 text-green-800",
  PAID: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-700",
};

interface Assignment {
  id: string;
  status: string;
  job: {
    id: string;
    title: string;
    status: string;
    customerName: string;
    customerPhone: string | null;
    scope: string | null;
    scheduledDate: Date | null;
    amount: unknown;
    service: { name: string };
    city: { name: string };
  };
}

interface Props {
  assignment: Assignment;
  showActions?: boolean;
  showUpload?: boolean;
}

export function JobCard({ assignment, showActions, showUpload }: Props) {
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const { job } = assignment;

  function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("caption", "");

    startTransition(() => uploadJobPhoto(job.id, formData));
  }

  return (
    <div className="rounded-lg border border-stone/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-charcoal">{job.title}</h3>
          <div className="mt-1 flex flex-wrap gap-1 text-xs text-stone">
            <span>{job.service.name}</span>
            <span>&middot;</span>
            <span>{job.city.name}</span>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${jobStatusColors[job.status]}`}>
          {jobStatusLabels[job.status]}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-xs text-stone">
        <p>Customer: {job.customerName}</p>
        {job.customerPhone && <p>Phone: {job.customerPhone}</p>}
        {job.scheduledDate && (
          <p>Scheduled: {new Date(job.scheduledDate).toLocaleDateString()}</p>
        )}
        {job.amount != null && <p>Amount: ${Number(job.amount).toLocaleString()}</p>}
      </div>

      {job.scope && (
        <p className="mt-2 text-xs text-charcoal line-clamp-3">{job.scope}</p>
      )}

      {showActions && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => startTransition(() => acceptJob(assignment.id))}
            disabled={pending}
            className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {pending ? "..." : "Accept"}
          </button>
          <button
            onClick={() => startTransition(() => declineJob(assignment.id))}
            disabled={pending}
            className="flex-1 rounded-md bg-gray-200 px-3 py-2 text-sm font-semibold text-charcoal hover:bg-gray-300 disabled:opacity-50 transition-colors"
          >
            {pending ? "..." : "Decline"}
          </button>
        </div>
      )}

      {showUpload && (
        <div className="mt-4 border-t border-stone/10 pt-3">
          <label className="block text-xs font-medium text-stone mb-1">Upload completion photo</label>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="block w-full text-xs text-stone file:mr-2 file:rounded file:border-0 file:bg-bone file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-charcoal hover:file:bg-stone/20"
            />
            <button
              onClick={handleUpload}
              disabled={pending}
              className="rounded-md bg-slate px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate/90 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              Upload
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
