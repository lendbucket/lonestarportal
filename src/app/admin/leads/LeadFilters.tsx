"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

interface Props {
  services: { id: string; slug: string; name: string }[];
  cities: { id: string; slug: string; name: string; region: string }[];
}

export function LeadFilters({ services, cities }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-3">
      <input
        type="text"
        placeholder="Search by name, email, or phone..."
        defaultValue={searchParams.get("search") || ""}
        onChange={(e) => updateParam("search", e.target.value)}
        className="rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal placeholder:text-stone/60 focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay w-64"
      />

      <select
        defaultValue={searchParams.get("type") || ""}
        onChange={(e) => updateParam("type", e.target.value)}
        className="rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
      >
        <option value="">All types</option>
        <option value="CUSTOMER">Customer</option>
        <option value="SUBCONTRACTOR">Subcontractor</option>
      </select>

      <select
        defaultValue={searchParams.get("stage") || ""}
        onChange={(e) => updateParam("stage", e.target.value)}
        className="rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
      >
        <option value="">All stages</option>
        <option value="NEW">New</option>
        <option value="CONTACTED">Contacted</option>
        <option value="QUOTED">Quoted</option>
        <option value="WON">Won</option>
        <option value="LOST">Lost</option>
      </select>

      <select
        defaultValue={searchParams.get("service") || ""}
        onChange={(e) => updateParam("service", e.target.value)}
        className="rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
      >
        <option value="">All services</option>
        {services.map((s) => (
          <option key={s.id} value={s.slug}>{s.name}</option>
        ))}
      </select>

      <select
        defaultValue={searchParams.get("city") || ""}
        onChange={(e) => updateParam("city", e.target.value)}
        className="rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
      >
        <option value="">All cities</option>
        {cities.map((c) => (
          <option key={c.id} value={c.slug}>{c.name} ({c.region})</option>
        ))}
      </select>
    </div>
  );
}
