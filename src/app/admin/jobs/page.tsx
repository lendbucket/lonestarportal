export const dynamic = "force-dynamic";

import Link from "next/link";
import { getJobs } from "./actions";
import { Pagination } from "@/components/Pagination";

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

export default async function JobsPage(props: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = parseInt(searchParams.page || "1", 10);
  const result = await getJobs({ status: searchParams.status, page });

  const filterParams = new URLSearchParams();
  if (searchParams.status) filterParams.set("status", searchParams.status);
  const baseHref = `/admin/jobs${filterParams.toString() ? `?${filterParams}` : ""}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate">Jobs</h1>
          <p className="mt-1 text-sm text-stone">{result.total} job{result.total !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/admin/jobs/new"
          className="rounded-md bg-clay px-4 py-2 text-sm font-semibold text-white hover:bg-clay/90 transition-colors"
        >
          Create job
        </Link>
      </div>

      {/* Status filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/admin/jobs"
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !searchParams.status ? "bg-slate text-white" : "bg-stone/10 text-stone hover:bg-stone/20"
          }`}
        >
          All
        </Link>
        {Object.entries(statusLabels).map(([status, label]) => (
          <Link
            key={status}
            href={`/admin/jobs?status=${status}`}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              searchParams.status === status
                ? statusColors[status]
                : "bg-stone/10 text-stone hover:bg-stone/20"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {result.items.length === 0 ? (
        <div className="rounded-lg border border-stone/10 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-stone">No jobs found.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((job) => (
              <Link
                key={job.id}
                href={`/admin/jobs/${job.id}`}
                className="rounded-lg border border-stone/10 bg-white p-4 shadow-sm hover:border-clay/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-medium text-charcoal">{job.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[job.status]}`}>
                    {statusLabels[job.status]}
                  </span>
                </div>
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
          <Pagination page={result.page} totalPages={result.totalPages} total={result.total} baseHref={baseHref} />
        </>
      )}
    </div>
  );
}
