export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSolicitations, getSolicitationCounts, exportSolicitationsCsv } from "./actions";
import { Pagination } from "@/components/Pagination";
import { CsvExportButton } from "@/components/CsvExportButton";

const statusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  DRAFTING: "bg-yellow-100 text-yellow-800",
  DRAFT_READY: "bg-green-100 text-green-800",
  NEEDS_DOC: "bg-orange-100 text-orange-800",
  APPROVED: "bg-indigo-100 text-indigo-800",
  SUBMITTED: "bg-purple-100 text-purple-800",
  WON: "bg-emerald-100 text-emerald-800",
  LOST: "bg-red-100 text-red-800",
  SKIPPED: "bg-stone/10 text-stone",
};

const statusLabels: Record<string, string> = {
  NEW: "New",
  DRAFTING: "Drafting",
  DRAFT_READY: "Draft Ready",
  NEEDS_DOC: "Needs Doc",
  APPROVED: "Approved",
  SUBMITTED: "Submitted",
  WON: "Won",
  LOST: "Lost",
  SKIPPED: "Skipped",
};

export default async function SolicitationsPage(props: {
  searchParams: Promise<{ status?: string; source?: string; search?: string; page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = parseInt(searchParams.page || "1", 10);
  const [result, counts] = await Promise.all([
    getSolicitations({ ...searchParams, page }),
    getSolicitationCounts(),
  ]);

  // Build the base href for pagination links preserving filters
  const filterParams = new URLSearchParams();
  if (searchParams.status) filterParams.set("status", searchParams.status);
  if (searchParams.source) filterParams.set("source", searchParams.source);
  if (searchParams.search) filterParams.set("search", searchParams.search);
  const baseHref = `/admin/solicitations${filterParams.toString() ? `?${filterParams}` : ""}`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate">
            Solicitations
          </h1>
          <p className="mt-1 text-sm text-stone">
            {counts.total} total | {counts.new} new | {counts.draftReady} drafts
            ready | {counts.needsDoc} need documents
          </p>
        </div>
        <div className="flex gap-3">
          <CsvExportButton
            exportAction={exportSolicitationsCsv.bind(null, {
              status: searchParams.status,
              source: searchParams.source,
              search: searchParams.search,
            })}
            filename="solicitations.csv"
          />
          <Link
            href="/admin/solicitations/new"
            className="rounded-md bg-clay px-4 py-2 text-sm font-medium text-white hover:bg-clay/90 transition-colors"
          >
            Add Solicitation
          </Link>
          <Link
            href="/admin/settings/integrations"
            className="rounded-md border border-stone/20 px-4 py-2 text-sm font-medium text-stone hover:text-charcoal hover:border-stone/40 transition-colors"
          >
            Gmail Settings
          </Link>
        </div>
      </div>

      {/* Filters */}
      <form className="mb-6 flex flex-wrap gap-3">
        <input
          name="search"
          defaultValue={searchParams.search || ""}
          placeholder="Search title, entity, or number..."
          className="w-64 rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
        />
        <select
          name="status"
          defaultValue={searchParams.status || "ALL"}
          className="rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
        >
          <option value="ALL">All statuses</option>
          <option value="NEW">New</option>
          <option value="DRAFTING">Drafting</option>
          <option value="DRAFT_READY">Draft Ready</option>
          <option value="NEEDS_DOC">Needs Doc</option>
          <option value="APPROVED">Approved</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="WON">Won</option>
          <option value="LOST">Lost</option>
          <option value="SKIPPED">Skipped</option>
        </select>
        <select
          name="source"
          defaultValue={searchParams.source || "ALL"}
          className="rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
        >
          <option value="ALL">All sources</option>
          <option value="GMAIL">Gmail</option>
          <option value="BIDNET">BidNet</option>
          <option value="MANUAL">Manual</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-slate px-4 py-2 text-sm font-medium text-white hover:bg-slate/90 transition-colors"
        >
          Filter
        </button>
      </form>

      {/* Table */}
      {result.items.length === 0 ? (
        <div className="rounded-lg border border-stone/10 bg-white p-12 text-center">
          <p className="text-sm text-stone">
            No solicitations found. Connect Gmail and sync to start receiving
            bid solicitations, or add one manually.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-stone/10 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-bone/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-stone">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-stone">Issuing Entity</th>
                  <th className="px-4 py-3 text-left font-medium text-stone">Due Date</th>
                  <th className="px-4 py-3 text-left font-medium text-stone">Source</th>
                  <th className="px-4 py-3 text-left font-medium text-stone">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone/10">
                {result.items.map((sol) => {
                  const isPastDue = sol.dueDate && new Date(sol.dueDate) < new Date();
                  return (
                    <tr key={sol.id} className="hover:bg-bone/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/solicitations/${sol.id}`}
                          className="font-medium text-charcoal hover:text-clay"
                        >
                          {sol.title}
                        </Link>
                        {sol.solicitationNumber && (
                          <p className="text-xs text-stone">#{sol.solicitationNumber}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone">{sol.issuingEntity}</td>
                      <td className="px-4 py-3">
                        {sol.dueDate ? (
                          <span className={isPastDue ? "text-red-600 font-medium" : "text-charcoal"}>
                            {new Date(sol.dueDate).toLocaleDateString()}
                            {isPastDue && <span className="ml-1 text-xs">(past due)</span>}
                          </span>
                        ) : (
                          <span className="text-stone">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-stone uppercase">{sol.source}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[sol.status] || "bg-stone/10 text-stone"}`}>
                          {statusLabels[sol.status] || sol.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={result.page} totalPages={result.totalPages} total={result.total} baseHref={baseHref} />
        </>
      )}
    </div>
  );
}
