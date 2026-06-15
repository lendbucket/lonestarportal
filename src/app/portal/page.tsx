export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function PortalDashboard() {
  const session = await getServerSession(authOptions);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-slate">My Jobs</h1>
        <p className="mt-1 text-sm text-stone">
          Welcome back, {session?.user?.name || "Subcontractor"}. Your job assignments will appear here.
        </p>
      </div>

      <div className="rounded-lg border border-stone/10 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-stone">No jobs assigned yet. Check back soon.</p>
      </div>
    </div>
  );
}
