"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

interface Props {
  services: { id: string; slug: string; name: string }[];
  cities: { id: string; slug: string; name: string; region: string }[];
}

export function SubcontractorFilters({ services, cities }: Props) {
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
        defaultValue={searchParams.get("status") || ""}
        onChange={(e) => updateParam("status", e.target.value)}
        className="rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
      >
        <option value="">All statuses</option>
        <option value="PENDING">Pending</option>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
      </select>

      <select
        defaultValue={searchParams.get("trade") || ""}
        onChange={(e) => updateParam("trade", e.target.value)}
        className="rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
      >
        <option value="">All trades</option>
        {services.map((s) => (
          <option key={s.id} value={s.slug}>
            {s.name}
          </option>
        ))}
      </select>

      <select
        defaultValue={searchParams.get("city") || ""}
        onChange={(e) => updateParam("city", e.target.value)}
        className="rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
      >
        <option value="">All areas</option>
        {cities.map((c) => (
          <option key={c.id} value={c.slug}>
            {c.name} ({c.region})
          </option>
        ))}
      </select>
    </div>
  );
}
