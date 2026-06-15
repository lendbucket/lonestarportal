"use client";

import { useActionState } from "react";

interface ServiceCategory {
  id: string;
  name: string;
  services: { id: string; name: string }[];
}

interface City {
  id: string;
  name: string;
  region: string;
}

interface SubData {
  id?: string;
  companyName?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  crewSize?: number | null;
  yearsInTrade?: number | null;
  licenseInfo?: string | null;
  insuranceStatus?: string | null;
  notes?: string | null;
  trades?: { id: string }[];
  serviceAreas?: { id: string }[];
}

interface Props {
  categories: ServiceCategory[];
  cities: City[];
  sub?: SubData;
  action: (state: { error?: string } | null, formData: FormData) => Promise<{ error?: string } | null>;
}

export function SubcontractorForm({ categories, cities, sub, action }: Props) {
  const [state, formAction, pending] = useActionState(action, null);

  const selectedTradeIds = new Set(sub?.trades?.map((t) => t.id) || []);
  const selectedCityIds = new Set(sub?.serviceAreas?.map((c) => c.id) || []);

  // Group cities by region
  const cityGroups = cities.reduce<Record<string, City[]>>((acc, city) => {
    if (!acc[city.region]) acc[city.region] = [];
    acc[city.region].push(city);
    return acc;
  }, {});

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Contact info */}
      <div className="rounded-lg border border-stone/10 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-charcoal mb-4">Contact information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Company name *</label>
            <input
              name="companyName"
              required
              defaultValue={sub?.companyName || ""}
              className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Contact name *</label>
            <input
              name="contactName"
              required
              defaultValue={sub?.contactName || ""}
              className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Phone *</label>
            <input
              name="phone"
              type="tel"
              required
              defaultValue={sub?.phone || ""}
              className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Email *</label>
            <input
              name="email"
              type="email"
              required
              defaultValue={sub?.email || ""}
              className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-lg border border-stone/10 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-charcoal mb-4">Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Crew size</label>
            <input
              name="crewSize"
              type="number"
              min={1}
              defaultValue={sub?.crewSize ?? ""}
              className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Years in trade</label>
            <input
              name="yearsInTrade"
              type="number"
              min={0}
              defaultValue={sub?.yearsInTrade ?? ""}
              className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-charcoal mb-1">License information</label>
            <textarea
              name="licenseInfo"
              rows={2}
              defaultValue={sub?.licenseInfo || ""}
              className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-charcoal mb-1">Insurance status</label>
            <textarea
              name="insuranceStatus"
              rows={2}
              defaultValue={sub?.insuranceStatus || ""}
              className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-charcoal mb-1">Notes</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={sub?.notes || ""}
              className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
        </div>
      </div>

      {/* Trades */}
      <div className="rounded-lg border border-stone/10 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-charcoal mb-4">Trades</h2>
        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat.id}>
              <p className="text-xs font-semibold text-stone uppercase tracking-wider mb-2">{cat.name}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {cat.services.map((svc) => (
                  <label key={svc.id} className="flex items-center gap-2 text-sm text-charcoal">
                    <input
                      type="checkbox"
                      name="tradeIds"
                      value={svc.id}
                      defaultChecked={selectedTradeIds.has(svc.id)}
                      className="rounded border-stone/30 text-clay focus:ring-clay"
                    />
                    {svc.name}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Service areas */}
      <div className="rounded-lg border border-stone/10 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-charcoal mb-4">Service areas</h2>
        <div className="space-y-4">
          {Object.entries(cityGroups).map(([region, regionCities]) => (
            <div key={region}>
              <p className="text-xs font-semibold text-stone uppercase tracking-wider mb-2">{region}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {regionCities.map((city) => (
                  <label key={city.id} className="flex items-center gap-2 text-sm text-charcoal">
                    <input
                      type="checkbox"
                      name="cityIds"
                      value={city.id}
                      defaultChecked={selectedCityIds.has(city.id)}
                      className="rounded border-stone/30 text-clay focus:ring-clay"
                    />
                    {city.name}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-clay px-5 py-2.5 text-sm font-semibold text-white hover:bg-clay/90 disabled:opacity-50 transition-colors"
        >
          {pending ? "Saving..." : sub?.id ? "Save changes" : "Create subcontractor"}
        </button>
      </div>
    </form>
  );
}
