export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSubcontractors, getServicesGrouped, getCities } from "./actions";
import { SubcontractorFilters } from "./SubcontractorFilters";
import { Pagination } from "@/components/Pagination";

interface Props {
  searchParams: Promise<{
    search?: string;
    status?: string;
    trade?: string;
    city?: string;
    page?: string;
  }>;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-gray-100 text-gray-600",
};

export default async function SubcontractorsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const [result, categories, cities] = await Promise.all([
    getSubcontractors({
      search: params.search,
      status: params.status,
      tradeSlug: params.trade,
      citySlug: params.city,
      page,
    }),
    getServicesGrouped(),
    getCities(),
  ]);

  const services = categories.flatMap((c) => c.services);

  const filterParams = new URLSearchParams();
  if (params.search) filterParams.set("search", params.search);
  if (params.status) filterParams.set("status", params.status);
  if (params.trade) filterParams.set("trade", params.trade);
  if (params.city) filterParams.set("city", params.city);
  const baseHref = `/admin/subcontractors${filterParams.toString() ? `?${filterParams}` : ""}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate">Subcontractors</h1>
          <p className="mt-1 text-sm text-stone">{result.total} subcontractor{result.total !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/admin/subcontractors/new"
          className="rounded-md bg-clay px-4 py-2 text-sm font-semibold text-white hover:bg-clay/90 transition-colors"
        >
          Add subcontractor
        </Link>
      </div>

      <SubcontractorFilters services={services} cities={cities} />

      <div className="mt-4 overflow-hidden rounded-lg border border-stone/10 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-stone/10">
          <thead className="bg-bone/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone uppercase tracking-wider">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone uppercase tracking-wider">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone uppercase tracking-wider">Trades</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone uppercase tracking-wider">Areas</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-stone uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone/10">
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-stone">
                  No subcontractors found.
                </td>
              </tr>
            ) : (
              result.items.map((sub) => (
                <tr key={sub.id} className="hover:bg-bone/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/subcontractors/${sub.id}`}
                      className="text-sm font-medium text-charcoal hover:text-clay"
                    >
                      {sub.companyName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-charcoal">{sub.contactName}</div>
                    <div className="text-xs text-stone">{sub.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {sub.trades.slice(0, 3).map((t) => (
                        <span key={t.id} className="inline-block rounded bg-bone px-2 py-0.5 text-xs text-charcoal">
                          {t.name}
                        </span>
                      ))}
                      {sub.trades.length > 3 && (
                        <span className="text-xs text-stone">+{sub.trades.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {sub.serviceAreas.slice(0, 2).map((c) => (
                        <span key={c.id} className="inline-block rounded bg-bone px-2 py-0.5 text-xs text-charcoal">
                          {c.name}
                        </span>
                      ))}
                      {sub.serviceAreas.length > 2 && (
                        <span className="text-xs text-stone">+{sub.serviceAreas.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[sub.status]}`}>
                      {sub.status}
                    </span>
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
