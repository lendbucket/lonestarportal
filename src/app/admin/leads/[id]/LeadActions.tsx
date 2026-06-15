"use client";

import { useTransition, useState } from "react";
import { updateLeadStage, updateLeadNotes, convertLeadToJob, convertLeadToSubcontractor } from "../actions";

const stages = ["NEW", "CONTACTED", "QUOTED", "WON", "LOST"] as const;
const stageColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800 border-blue-200",
  CONTACTED: "bg-yellow-100 text-yellow-800 border-yellow-200",
  QUOTED: "bg-purple-100 text-purple-800 border-purple-200",
  WON: "bg-green-100 text-green-800 border-green-200",
  LOST: "bg-gray-100 text-gray-600 border-gray-200",
};

interface Props {
  lead: {
    id: string;
    type: string;
    stage: string;
    notes: string | null;
    serviceId: string | null;
    cityId: string | null;
  };
}

export function LeadActions({ lead }: Props) {
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState(lead.notes || "");

  function handleStageChange(stage: string) {
    startTransition(() => updateLeadStage(lead.id, stage as typeof stages[number]));
  }

  function handleSaveNotes() {
    startTransition(() => updateLeadNotes(lead.id, notes));
  }

  function handleConvertToJob() {
    startTransition(() => convertLeadToJob(lead.id));
  }

  function handleConvertToSub() {
    startTransition(() => convertLeadToSubcontractor(lead.id));
  }

  return (
    <div className="space-y-4">
      {/* Stage pipeline */}
      <div className="rounded-lg border border-stone/10 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-charcoal mb-3">Pipeline stage</h2>
        <div className="flex flex-col gap-2">
          {stages.map((s) => (
            <button
              key={s}
              disabled={pending}
              onClick={() => handleStageChange(s)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                lead.stage === s
                  ? stageColors[s]
                  : "border-stone/20 text-stone hover:border-stone/40"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-lg border border-stone/10 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-charcoal mb-3">Notes</h2>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
        />
        <button
          onClick={handleSaveNotes}
          disabled={pending}
          className="mt-2 rounded-md bg-slate px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate/90 disabled:opacity-50 transition-colors"
        >
          Save notes
        </button>
      </div>

      {/* Conversion actions */}
      <div className="rounded-lg border border-stone/10 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-charcoal mb-3">Convert</h2>
        {lead.type === "CUSTOMER" && (
          <button
            onClick={handleConvertToJob}
            disabled={pending || !lead.serviceId || !lead.cityId}
            className="w-full rounded-md bg-clay px-4 py-2 text-sm font-semibold text-white hover:bg-clay/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Convert to job
          </button>
        )}
        {lead.type === "SUBCONTRACTOR" && (
          <button
            onClick={handleConvertToSub}
            disabled={pending}
            className="w-full rounded-md bg-clay px-4 py-2 text-sm font-semibold text-white hover:bg-clay/90 disabled:opacity-50 transition-colors"
          >
            Convert to subcontractor
          </button>
        )}
        {lead.type === "CUSTOMER" && (!lead.serviceId || !lead.cityId) && (
          <p className="mt-2 text-xs text-stone">
            Lead must have a service and city before converting to a job.
          </p>
        )}
      </div>
    </div>
  );
}
