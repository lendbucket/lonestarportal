export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMyJobs } from "./actions";
import { JobCard } from "./JobCard";

export default async function PortalDashboard() {
  const session = await getServerSession(authOptions);
  const assignments = await getMyJobs();

  const offered = assignments.filter((a) => a.status === "OFFERED");
  const active = assignments.filter((a) =>
    a.status === "ACCEPTED" && ["ASSIGNED", "SCHEDULED", "IN_PROGRESS"].includes(a.job.status)
  );
  const completed = assignments.filter((a) =>
    a.status === "ACCEPTED" && ["COMPLETE", "PAID"].includes(a.job.status)
  );
  const declined = assignments.filter((a) => a.status === "DECLINED");

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-slate">My Jobs</h1>
        <p className="mt-1 text-sm text-stone">
          Welcome back, {session?.user?.name || "Subcontractor"}.
        </p>
      </div>

      {/* Offered jobs */}
      {offered.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-charcoal mb-3">
            Job offers ({offered.length})
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {offered.map((a) => (
              <JobCard key={a.id} assignment={a} showActions />
            ))}
          </div>
        </div>
      )}

      {/* Active jobs */}
      {active.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-charcoal mb-3">
            Active jobs ({active.length})
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {active.map((a) => (
              <JobCard key={a.id} assignment={a} showUpload />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-charcoal mb-3">
            Completed ({completed.length})
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {completed.map((a) => (
              <JobCard key={a.id} assignment={a} />
            ))}
          </div>
        </div>
      )}

      {/* Declined */}
      {declined.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-charcoal mb-3">
            Declined ({declined.length})
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 opacity-60">
            {declined.map((a) => (
              <JobCard key={a.id} assignment={a} />
            ))}
          </div>
        </div>
      )}

      {assignments.length === 0 && (
        <div className="rounded-lg border border-stone/10 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-stone">No jobs assigned yet. Check back soon.</p>
        </div>
      )}
    </div>
  );
}
