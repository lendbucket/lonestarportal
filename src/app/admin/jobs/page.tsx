export const dynamic = "force-dynamic";

import Link from "next/link";
import { getJobs } from "./actions";

const statusOrder = ["DRAFT", "OFFERED", "ASSIGNED", "SCHEDULED", "IN_PROGRESS", "COMPLETE", "PAID", "CANCELLED"] as const;

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  OFFERED: "bg-blue-100 text-blue-800",
  ASSIGNED: "bg-indigo-100 text-indigo-800",
  SCHEDULED: "bg-purple-100 text-purple-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETE: "bg-green-100 text-green-800",
  PAID: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-700",
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

export default async function JobsPage() {
  const jobs = await getJobs();

  // Group by status
  const grouped = statusOrder.reduce<Record<string, typeof jobs>>((acc, status) => {
    acc[status] = jobs.filter((j) => j.status === status);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate">Jobs</h1>
          <p className="mt-1 text-sm text-stone">{jobs.length} job{jobs.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/admin/jobs/new"
          className="rounded-md bg-clay px-4 py-2 text-sm font-semibold text-white hover:bg-clay/90 transition-colors"
        >
          Create job
        </Link>
      </div>

      <div className="space-y-6">
        {statusOrder.map((status) => {
          const statusJobs = grouped[status];
          if (statusJobs.length === 0) return null;

          return (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status]}`}>
                  {statusLabels[status]}
                </span>
                <span className="text-xs text-stone">{statusJobs.length}</span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {statusJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/admin/jobs/${job.id}`}
                    className="rounded-lg border border-stone/10 bg-white p-4 shadow-sm hover:border-clay/30 transition-colors"
                  >
                    <h3 className="text-sm font-medium text-charcoal">{job.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone">
                      <span>{job.service.name}</span>
                      <span>&middot;</span>
                      <span>{job.city.name}</span>
                    </div>
                    <div className="mt-2 text-xs text-stone">
                      {job.customerName}
                      {job.assignments.length > 0 && (
                        <span className="ml-2">
                          &middot; {job.assignments.length} offer{job.assignments.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {job.amount && (
                      <div className="mt-1 text-sm font-medium text-charcoal">
                        ${Number(job.amount).toLocaleString()}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {jobs.length === 0 && (
          <div className="rounded-lg border border-stone/10 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-stone">No jobs yet. Create one or convert a lead.</p>
          </div>
        )}
      </div>
    </div>
  );
}
