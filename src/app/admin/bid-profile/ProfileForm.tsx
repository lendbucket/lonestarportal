"use client";

import { useTransition } from "react";
import { upsertBidProfile } from "./actions";

interface Profile {
  id: string;
  legalName: string;
  dba: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  uei: string | null;
  cage: string | null;
  duns: string | null;
  naicsCodes: string[];
  bondingCapacity: string | null;
  standardMarkupNotes: string | null;
  capabilityStatement: string | null;
  w9OnFile: boolean;
}

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await upsertBidProfile(formData);
    });
  }

  return (
    <form action={handleSubmit} className="rounded-lg border border-stone/10 bg-white shadow-sm">
      <div className="border-b border-stone/10 px-6 py-4">
        <h2 className="font-display text-lg font-semibold text-slate">
          Company Information
        </h2>
      </div>

      <div className="p-6 space-y-6">
        {/* Identity */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-charcoal">
              Legal Name <span className="text-red-500">*</span>
            </label>
            <input
              name="legalName"
              defaultValue={profile?.legalName || ""}
              required
              className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">
              DBA (Doing Business As)
            </label>
            <input
              name="dba"
              defaultValue={profile?.dba || ""}
              className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-charcoal">
            Street Address
          </label>
          <input
            name="addressStreet"
            defaultValue={profile?.addressStreet || ""}
            className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-charcoal">City</label>
            <input
              name="addressCity"
              defaultValue={profile?.addressCity || ""}
              className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">State</label>
            <input
              name="addressState"
              defaultValue={profile?.addressState || ""}
              className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">ZIP</label>
            <input
              name="addressZip"
              defaultValue={profile?.addressZip || ""}
              className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-charcoal">Phone</label>
            <input
              name="phone"
              defaultValue={profile?.phone || ""}
              className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">Email</label>
            <input
              name="email"
              type="email"
              defaultValue={profile?.email || ""}
              className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">Website</label>
            <input
              name="websiteUrl"
              defaultValue={profile?.websiteUrl || ""}
              className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
        </div>

        {/* Federal IDs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-charcoal">UEI</label>
            <input
              name="uei"
              defaultValue={profile?.uei || ""}
              className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">CAGE Code</label>
            <input
              name="cage"
              defaultValue={profile?.cage || ""}
              className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">DUNS</label>
            <input
              name="duns"
              defaultValue={profile?.duns || ""}
              className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
        </div>

        {/* NAICS and bonding */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-charcoal">
              NAICS Codes
            </label>
            <input
              name="naicsCodes"
              defaultValue={profile?.naicsCodes?.join(", ") || ""}
              placeholder="236220, 238160, 238990"
              className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
            <p className="mt-1 text-xs text-stone">Comma-separated</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">
              Bonding Capacity
            </label>
            <input
              name="bondingCapacity"
              defaultValue={profile?.bondingCapacity || ""}
              placeholder="$500,000 per project"
              className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
        </div>

        {/* Markup notes */}
        <div>
          <label className="block text-sm font-medium text-charcoal">
            Standard Markup / Pricing Notes
          </label>
          <textarea
            name="standardMarkupNotes"
            rows={3}
            defaultValue={profile?.standardMarkupNotes || ""}
            placeholder="Standard markup structure, labor rates, material margins, etc."
            className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          />
        </div>

        {/* Capability statement */}
        <div>
          <label className="block text-sm font-medium text-charcoal">
            Capability Statement (text)
          </label>
          <textarea
            name="capabilityStatement"
            rows={6}
            defaultValue={profile?.capabilityStatement || ""}
            placeholder="Company overview, core competencies, past performance, differentiators..."
            className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          />
        </div>

        {/* W-9 */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="w9OnFile"
            id="w9OnFile"
            defaultChecked={profile?.w9OnFile || false}
            className="h-4 w-4 rounded border-stone/20 text-clay focus:ring-clay"
          />
          <label htmlFor="w9OnFile" className="text-sm font-medium text-charcoal">
            W-9 on file
          </label>
        </div>
      </div>

      <div className="border-t border-stone/10 px-6 py-4 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-clay px-4 py-2 text-sm font-medium text-white hover:bg-clay/90 disabled:opacity-50 transition-colors"
        >
          {pending ? "Saving..." : profile ? "Update Profile" : "Create Profile"}
        </button>
      </div>
    </form>
  );
}
