"use client";

import { useActionState } from "react";

interface Props {
  services: { id: string; name: string }[];
  cities: { id: string; name: string; region: string }[];
  action: (state: { error?: string } | null, formData: FormData) => Promise<{ error?: string } | null>;
}

export function JobForm({ services, cities, action }: Props) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {state?.error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="rounded-lg border border-stone/10 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-charcoal mb-4">Job details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-charcoal mb-1">Title *</label>
            <input
              name="title"
              required
              className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Service *</label>
            <select
              name="serviceId"
              required
              className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            >
              <option value="">Select service</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">City *</label>
            <select
              name="cityId"
              required
              className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            >
              <option value="">Select city</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.region})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Amount ($)</label>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-charcoal mb-1">Scope</label>
            <textarea
              name="scope"
              rows={3}
              className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-stone/10 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-charcoal mb-4">Customer</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-charcoal mb-1">Customer name *</label>
            <input
              name="customerName"
              required
              className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Phone</label>
            <input
              name="customerPhone"
              type="tel"
              className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Email</label>
            <input
              name="customerEmail"
              type="email"
              className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-clay px-5 py-2.5 text-sm font-semibold text-white hover:bg-clay/90 disabled:opacity-50 transition-colors"
        >
          {pending ? "Creating..." : "Create job"}
        </button>
      </div>
    </form>
  );
}
