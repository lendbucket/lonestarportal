export const dynamic = "force-dynamic";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getJob, getMatchingSubcontractors, getJobPhotoSignedUrl } from "../actions";
import { getEntityActivity } from "@/lib/activity-log";
import { JobStatusFlow } from "./JobStatusFlow";
import { OfferPanel } from "./OfferPanel";
import { JobScheduleForm } from "./JobScheduleForm";

interface Props {
  params: Promise<{ id: string }>;
}

const assignmentStatusColors: Record<string, string> = {
  OFFERED: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-green-100 text-green-800",
  DECLINED: "bg-red-100 text-red-700",
};

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  const [matchingSubs, activityLog] = await Promise.all([
    getMatchingSubcontractors(job.serviceId, job.cityId),
    getEntityActivity("Job", id),
  ]);

  // Filter out subs already offered
  const offeredSubIds = new Set(job.assignments.map((a) => a.subcontractorId));
  const availableSubs = matchingSubs.filter((s) => !offeredSubIds.has(s.id));

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/jobs" className="text-sm text-stone hover:text-clay transition-colors">
          &larr; Back to jobs
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate">{job.title}</h1>
        <div className="mt-1 flex items-center gap-2 text-sm text-stone">
          <span>{job.service.name}</span>
          <span>&middot;</span>
          <span>{job.city.name}</span>
          {job.lead && (
            <>
              <span>&middot;</span>
              <Link href={`/admin/leads/${job.lead.id}`} className="text-clay hover:underline">
                From lead: {job.lead.name}
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer info */}
          <div className="rounded-lg border border-stone/10 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-charcoal mb-3">Customer</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <dt className="text-xs font-medium text-stone">Name</dt>
                <dd className="text-sm text-charcoal">{job.customerName}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-stone">Phone</dt>
                <dd className="text-sm text-charcoal">{job.customerPhone || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-stone">Email</dt>
                <dd className="text-sm text-charcoal">{job.customerEmail || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-stone">Amount</dt>
                <dd className="text-sm text-charcoal">{job.amount ? `$${Number(job.amount).toLocaleString()}` : "-"}</dd>
              </div>
            </dl>
            {job.scope && (
              <div className="mt-3 pt-3 border-t border-stone/10">
                <dt className="text-xs font-medium text-stone">Scope</dt>
                <dd className="mt-1 text-sm text-charcoal whitespace-pre-wrap">{job.scope}</dd>
              </div>
            )}
          </div>

          {/* Assignments */}
          <div className="rounded-lg border border-stone/10 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-charcoal mb-3">
              Assignments ({job.assignments.length})
            </h2>
            {job.assignments.length === 0 ? (
              <p className="text-sm text-stone">No subcontractors have been offered this job yet.</p>
            ) : (
              <div className="space-y-2">
                {job.assignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-md border border-stone/10 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-charcoal">{a.subcontractor.companyName}</p>
                      <p className="text-xs text-stone">{a.subcontractor.contactName} &middot; {a.subcontractor.phone}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${assignmentStatusColors[a.status]}`}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Offer to subs */}
          {(job.status === "DRAFT" || job.status === "OFFERED") && availableSubs.length > 0 && (
            <OfferPanel jobId={job.id} matchingSubs={availableSubs} />
          )}

          {/* Photos */}
          {job.photos.length > 0 && (
            <div className="rounded-lg border border-stone/10 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-charcoal mb-3">Photos</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {await Promise.all(job.photos.map(async (photo) => {
                  const signedUrl = await getJobPhotoSignedUrl(photo.url);
                  return (
                    <div key={photo.id} className="rounded-md overflow-hidden border border-stone/10">
                      <img src={signedUrl} alt={photo.caption || "Job photo"} className="w-full h-32 object-cover" />
                      {photo.caption && (
                        <p className="px-2 py-1 text-xs text-stone">{photo.caption}</p>
                      )}
                    </div>
                  );
                }))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <JobStatusFlow job={job} />
          <JobScheduleForm job={job} />

          {activityLog.length > 0 && (
            <div className="rounded-lg border border-stone/10 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-charcoal mb-3">Activity</h2>
              <div className="space-y-2">
                {activityLog.map((entry) => (
                  <div key={entry.id} className="text-xs">
                    <p className="text-charcoal">
                      {entry.action.replace(/_/g, " ")}
                    </p>
                    {entry.detail && <p className="text-stone">{entry.detail}</p>}
                    <p className="text-stone/60">{new Date(entry.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
