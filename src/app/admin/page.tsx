export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  const [leadCount, subCount, jobCount, activeSubCount] = await Promise.all([
    prisma.lead.count(),
    prisma.subcontractor.count(),
    prisma.job.count(),
    prisma.subcontractor.count({ where: { status: "ACTIVE" } }),
  ]);

  const stats = [
    { label: "Total Leads", value: leadCount },
    { label: "Subcontractors", value: subCount },
    { label: "Active Subs", value: activeSubCount },
    { label: "Jobs", value: jobCount },
  ];

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-stone/10 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-stone">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-charcoal">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
