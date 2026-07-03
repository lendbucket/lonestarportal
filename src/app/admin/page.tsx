export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRecentActivity } from "@/lib/activity-log";
import Link from "next/link";

function DashTile({
  label,
  value,
  href,
  variant = "default",
}: {
  label: string;
  value: number;
  href: string;
  variant?: "default" | "warn" | "danger" | "success";
}) {
  const colors = {
    default: "border-stone/10",
    warn: "border-yellow-200 bg-yellow-50",
    danger: "border-red-200 bg-red-50",
    success: "border-green-200 bg-green-50",
  };

  return (
    <Link
      href={href}
      className={`block rounded-lg border ${colors[variant]} bg-white p-5 shadow-sm hover:shadow-md transition-shadow`}
    >
      <p className="text-sm font-medium text-stone">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-charcoal">{value}</p>
    </Link>
  );
}

function DueSolicitation({
  title,
  issuingEntity,
  id,
  daysRemaining,
}: {
  title: string;
  issuingEntity: string;
  id: string;
  daysRemaining: number;
}) {
  const badgeColor =
    daysRemaining <= 1
      ? "bg-red-100 text-red-800"
      : daysRemaining <= 3
      ? "bg-yellow-100 text-yellow-800"
      : "bg-blue-100 text-blue-800";

  return (
    <Link
      href={`/admin/solicitations/${id}`}
      className="flex items-center justify-between rounded-md border border-stone/10 px-4 py-3 hover:bg-bone/30 transition-colors"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-charcoal">{title}</p>
        <p className="text-xs text-stone">{issuingEntity}</p>
      </div>
      <span className={`ml-3 flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColor}`}>
        {daysRemaining <= 0 ? "Today" : `${daysRemaining}d`}
      </span>
    </Link>
  );
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  const now = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    solsDueSoon,
    draftsAwaiting,
    needsDocCount,
    staleOffers,
    newLeads,
    jobsByStatus,
    expiringLicenses,
    expiringInsurance,
    expiringCerts,
  ] = await Promise.all([
    // Solicitations due in next 7 days (not SKIPPED/LOST/WON/SUBMITTED)
    prisma.solicitation.findMany({
      where: {
        dueDate: { gte: now, lte: sevenDaysOut },
        status: { notIn: ["SKIPPED", "LOST", "WON", "SUBMITTED"] },
      },
      select: { id: true, title: true, issuingEntity: true, dueDate: true },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),

    // Drafts awaiting approval
    prisma.solicitation.count({ where: { status: "DRAFT_READY" } }),

    // NEEDS_DOC count
    prisma.solicitation.count({ where: { status: "NEEDS_DOC" } }),

    // Offered jobs with no response after 24 hours
    prisma.jobAssignment.count({
      where: {
        status: "OFFERED",
        createdAt: { lt: twentyFourHoursAgo },
      },
    }),

    // Leads in NEW stage
    prisma.lead.count({ where: { stage: "NEW" } }),

    // Job counts by status
    prisma.job.groupBy({
      by: ["status"],
      _count: true,
    }),

    // Expiring licenses (within 30 days)
    prisma.bidLicense.count({
      where: {
        expiresOn: { gte: now, lte: thirtyDaysOut },
      },
    }),

    // Expiring insurance (within 30 days)
    prisma.insurancePolicy.count({
      where: {
        expiresOn: { gte: now, lte: thirtyDaysOut },
      },
    }),

    // Expiring certifications (within 30 days)
    prisma.certification.count({
      where: {
        expiresOn: { gte: now, lte: thirtyDaysOut },
      },
    }),
  ]);

  const recentActivity = await getRecentActivity(20);

  // Also check for already expired items
  const [expiredLicenses, expiredInsurance, expiredCerts] = await Promise.all([
    prisma.bidLicense.count({ where: { expiresOn: { lt: now } } }),
    prisma.insurancePolicy.count({ where: { expiresOn: { lt: now } } }),
    prisma.certification.count({ where: { expiresOn: { lt: now } } }),
  ]);

  const jobStatusMap = new Map(
    jobsByStatus.map((g) => [g.status, g._count])
  );

  const activeJobs =
    (jobStatusMap.get("OFFERED") || 0) +
    (jobStatusMap.get("ASSIGNED") || 0) +
    (jobStatusMap.get("SCHEDULED") || 0) +
    (jobStatusMap.get("IN_PROGRESS") || 0);

  const totalExpiring = expiringLicenses + expiringInsurance + expiringCerts;
  const totalExpired = expiredLicenses + expiredInsurance + expiredCerts;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-slate">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-stone">
          Welcome back, {session?.user?.name || "Admin"}.
        </p>
      </div>

      {/* Top-level action tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <DashTile
          label="Drafts Awaiting Approval"
          value={draftsAwaiting}
          href="/admin/solicitations?status=DRAFT_READY"
          variant={draftsAwaiting > 0 ? "warn" : "default"}
        />
        <DashTile
          label="Needs Source Document"
          value={needsDocCount}
          href="/admin/solicitations?status=NEEDS_DOC"
          variant={needsDocCount > 0 ? "warn" : "default"}
        />
        <DashTile
          label="New Leads"
          value={newLeads}
          href="/admin/leads?stage=NEW"
          variant={newLeads > 0 ? "success" : "default"}
        />
        <DashTile
          label="Stale Offers (>24h)"
          value={staleOffers}
          href="/admin/jobs?status=OFFERED"
          variant={staleOffers > 0 ? "danger" : "default"}
        />
      </div>

      {/* Job counts by status */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-8">
        {(
          [
            ["Draft", "DRAFT"],
            ["Offered", "OFFERED"],
            ["Assigned", "ASSIGNED"],
            ["Scheduled", "SCHEDULED"],
            ["In Progress", "IN_PROGRESS"],
            ["Complete", "COMPLETE"],
          ] as const
        ).map(([label, status]) => (
          <DashTile
            key={status}
            label={label}
            value={jobStatusMap.get(status) || 0}
            href={`/admin/jobs?status=${status}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Solicitations due soon */}
        <div className="rounded-lg border border-stone/10 bg-white shadow-sm">
          <div className="border-b border-stone/10 px-6 py-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-slate">
              Due This Week
            </h2>
            <Link
              href="/admin/solicitations"
              className="text-xs text-clay hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="p-4 space-y-2">
            {solsDueSoon.length === 0 ? (
              <p className="text-sm text-stone py-3 text-center">
                No solicitations due in the next 7 days.
              </p>
            ) : (
              solsDueSoon.map((sol) => {
                const daysRemaining = Math.max(
                  0,
                  Math.ceil(
                    (new Date(sol.dueDate!).getTime() - now.getTime()) /
                      (24 * 60 * 60 * 1000)
                  )
                );
                return (
                  <DueSolicitation
                    key={sol.id}
                    id={sol.id}
                    title={sol.title}
                    issuingEntity={sol.issuingEntity}
                    daysRemaining={daysRemaining}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Bid Profile health */}
        <div className="rounded-lg border border-stone/10 bg-white shadow-sm">
          <div className="border-b border-stone/10 px-6 py-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-slate">
              Bid Profile Health
            </h2>
            <Link
              href="/admin/bid-profile"
              className="text-xs text-clay hover:underline"
            >
              Manage
            </Link>
          </div>
          <div className="p-6 space-y-4">
            {totalExpired > 0 && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm font-medium text-red-800">
                  {totalExpired} expired item{totalExpired > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {expiredLicenses > 0 && `${expiredLicenses} license${expiredLicenses > 1 ? "s" : ""}`}
                  {expiredLicenses > 0 && (expiredInsurance > 0 || expiredCerts > 0) && ", "}
                  {expiredInsurance > 0 && `${expiredInsurance} insurance polic${expiredInsurance > 1 ? "ies" : "y"}`}
                  {expiredInsurance > 0 && expiredCerts > 0 && ", "}
                  {expiredCerts > 0 && `${expiredCerts} certification${expiredCerts > 1 ? "s" : ""}`}
                </p>
              </div>
            )}
            {totalExpiring > 0 && (
              <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3">
                <p className="text-sm font-medium text-yellow-800">
                  {totalExpiring} expiring within 30 days
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  {expiringLicenses > 0 && `${expiringLicenses} license${expiringLicenses > 1 ? "s" : ""}`}
                  {expiringLicenses > 0 && (expiringInsurance > 0 || expiringCerts > 0) && ", "}
                  {expiringInsurance > 0 && `${expiringInsurance} polic${expiringInsurance > 1 ? "ies" : "y"}`}
                  {expiringInsurance > 0 && expiringCerts > 0 && ", "}
                  {expiringCerts > 0 && `${expiringCerts} cert${expiringCerts > 1 ? "s" : ""}`}
                </p>
              </div>
            )}
            {totalExpired === 0 && totalExpiring === 0 && (
              <p className="text-sm text-stone text-center py-3">
                All licenses, insurance, and certifications are current.
              </p>
            )}

            <div className="border-t border-stone/10 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone">Active jobs</span>
                <span className="font-medium text-charcoal">{activeJobs}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="mt-8 rounded-lg border border-stone/10 bg-white shadow-sm">
        <div className="border-b border-stone/10 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-slate">
            Recent Activity
          </h2>
        </div>
        <div className="divide-y divide-stone/10">
          {recentActivity.length === 0 ? (
            <p className="px-6 py-4 text-sm text-stone">No activity recorded yet.</p>
          ) : (
            recentActivity.map((entry) => {
              const entityLink = getEntityLink(entry.entityType, entry.entityId);
              return (
                <div key={entry.id} className="flex items-center gap-4 px-6 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-charcoal">
                      <span className="font-medium">{formatAction(entry.action)}</span>
                      {entry.detail && (
                        <span className="text-stone"> - {entry.detail}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {entityLink && (
                      <Link href={entityLink} className="text-xs text-clay hover:underline">
                        View
                      </Link>
                    )}
                    <span className="text-xs text-stone">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function formatAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getEntityLink(entityType: string, entityId: string | null): string | null {
  if (!entityId) return null;
  switch (entityType) {
    case "Lead": return `/admin/leads/${entityId}`;
    case "Job": return `/admin/jobs/${entityId}`;
    case "Solicitation": return `/admin/solicitations/${entityId}`;
    case "Subcontractor": return `/admin/subcontractors/${entityId}`;
    default: return null;
  }
}
