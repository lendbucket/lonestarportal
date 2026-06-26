"use client";

import { useActionState } from "react";
import { createManualSolicitation } from "./actions";

export function ManualSolicitationForm() {
  async function handleSubmit(_state: { error: string } | null, formData: FormData) {
    try {
      await createManualSolicitation(formData);
      return null;
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }

  const [state, formAction, pending] = useActionState(handleSubmit, null);

  return (
    <form
      action={formAction}
      className="rounded-lg border border-stone/10 bg-white shadow-sm"
    >
      <div className="p-6 space-y-6">
        {state?.error && (
          <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-800">
            {state.error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-charcoal">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              required
              placeholder="e.g., HVAC Replacement - City Hall"
              className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">
              Issuing Entity <span className="text-red-500">*</span>
            </label>
            <input
              name="issuingEntity"
              required
              placeholder="e.g., City of San Antonio"
              className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-charcoal">
              Solicitation Number
            </label>
            <input
              name="solicitationNumber"
              placeholder="e.g., IFB-2026-0142"
              className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">
              Trade Category
            </label>
            <input
              name="tradeCategory"
              placeholder="e.g., General Construction"
              className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">
              Location
            </label>
            <input
              name="location"
              placeholder="e.g., San Antonio, TX"
              className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-charcoal">
              Due Date
            </label>
            <input
              name="dueDate"
              type="datetime-local"
              className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">
              Source Link
            </label>
            <input
              name="sourceLink"
              type="url"
              placeholder="URL to the original listing"
              className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-charcoal">
            Scope of Work
          </label>
          <textarea
            name="scope"
            rows={4}
            placeholder="Description of the work being solicited..."
            className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-charcoal">
              Submission Method
            </label>
            <input
              name="submissionMethod"
              placeholder="e.g., Email, BidNet portal, sealed mail"
              className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">
              Submission Contact
            </label>
            <input
              name="submissionContact"
              placeholder="e.g., procurement@city.gov"
              className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-charcoal">
            Requirements
          </label>
          <textarea
            name="requirements"
            rows={4}
            placeholder="One requirement per line, e.g.:&#10;Bid bond (5%)&#10;Certificate of insurance&#10;3 project references&#10;Pricing breakdown by line item"
            className="mt-1 w-full rounded-md border border-stone/20 px-3 py-2 text-sm focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          />
          <p className="mt-1 text-xs text-stone">
            One requirement per line.
          </p>
        </div>
      </div>

      <div className="border-t border-stone/10 px-6 py-4 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-clay px-4 py-2 text-sm font-medium text-white hover:bg-clay/90 disabled:opacity-50 transition-colors"
        >
          {pending ? "Creating..." : "Create Solicitation"}
        </button>
      </div>
    </form>
  );
}
