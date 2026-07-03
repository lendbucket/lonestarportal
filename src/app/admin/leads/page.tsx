export const dynamic = "force-dynamic";

import { getLeads, getServices, getCities, exportLeadsCsv } from "./actions";
import { LeadFilters } from "./LeadFilters";
import { Pagination } from "@/components/Pagination";
import { CsvExportButton } from "@/components/CsvExportButton";
import Link from "next/link";

interface Props {
  searchParams: Promise<{
    search?: string;
    type?: string;
    stage?: string;
    service?: string;
    city?: string;
    page?: string;
  }>;
}

const stageColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-yellow-100 text-yellow-800",
  QUOTED: "bg-purple-100 text-purple-800",
  WON: "bg-green-100 text-green-800",
  LOST: "bg-gray-100 text-gray-600",
};

const typeLabels: Record<string, string> = {
  CUSTOMER: "Customer",
  SUBCONTRACTOR: "Subcontractor",
};

export default async function LeadsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const [result, services, cities] = await Promise.all([
    getLeads({
      search: params.search,
      type: params.type,
      stage: params.stage,
      serviceSlug: params.service,
      citySlug: params.city,
      page,
    }),
    getServices(),
    getCities(),
  ]);

  const filterParams = new URLSearchParams();
  if (params.search) filterParams.set("search", params.search);
  if (params.type) filterParams.set("type", params.type);
  if (params.stage) filterParams.set("stage", params.stage);
  if (params.service) filterParams.set("service", params.service);
  if (params.city) filterParams.set("city", params.city);
  const baseHref = `/admin/leads${filterParams.toString() ? `?${filterParams}` : ""}`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate">Leads</h1>
          <p className="mt-1 text-sm text-stone">{result.total} lead{result.total !== 1 ? "s" : ""}</p>
        </div>
        <CsvExportButton
          exportAction={exportLeadsCsv.bind(null, {
            search: params.search,
            type: params.type,
            stage: params.stage,
            serviceSlug: params.service,
            citySlug: params.city,
          })}
          filename="leads.csv"
        />
      </div>

      <LeadFilters services={services} cities={cities} />

      <div className="mt-4 overflow-hidden rounded-lg border border-stone/10 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-stone/10">
          <thead className="bg-bone/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone uppercase tracking-wider">Service</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone uppercase tracking-wider">City</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone uppercase tracking-wider">Stage</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone/10">
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-stone">
                  No leads found.
                </td>
              </tr>
            ) : (
              result.items.map((lead) => (
                <tr key={lead.id} className="hover:bg-bone/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/leads/${lead.id}`}
                      className="text-sm font-medium text-charcoal hover:text-clay"
                    >
                      {lead.name}
                    </Link>
                    <div className="text-xs text-stone">{lead.email || lead.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-charcoal">{typeLabels[lead.type]}</td>
                  <td className="px-4 py-3 text-sm text-charcoal">{lead.service?.name || "-"}</td>
                  <td className="px-4 py-3 text-sm text-charcoal">{lead.city?.name || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${stageColors[lead.stage]}`}>
                      {lead.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={result.page} totalPages={result.totalPages} total={result.total} baseHref={baseHref} />
    </div>
  );
}
