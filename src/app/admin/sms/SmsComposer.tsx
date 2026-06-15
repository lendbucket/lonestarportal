"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { getActiveSubcontractors, sendSmsBlast } from "./actions";

interface Props {
  jobs: { id: string; title: string }[];
  services: { id: string; slug: string; name: string }[];
  cities: { id: string; slug: string; name: string; region: string }[];
}

interface Sub {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
}

export function SmsComposer({ jobs, services, cities }: Props) {
  const [message, setMessage] = useState("");
  const [jobId, setJobId] = useState("");
  const [tradeSlug, setTradeSlug] = useState("");
  const [citySlug, setCitySlug] = useState("");
  const [matchedSubs, setMatchedSubs] = useState<Sub[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(true);
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  const loadSubs = useCallback(() => {
    startTransition(async () => {
      const subs = await getActiveSubcontractors({
        tradeSlug: tradeSlug || undefined,
        citySlug: citySlug || undefined,
      });
      setMatchedSubs(subs);
      if (selectAll) {
        setSelectedIds(new Set(subs.map((s) => s.id)));
      }
    });
  }, [tradeSlug, citySlug, selectAll, startTransition]);

  useEffect(() => {
    loadSubs();
  }, [loadSubs]);

  function toggleSub(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSelectAll(false);
  }

  function toggleAll() {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(matchedSubs.map((s) => s.id)));
      setSelectAll(true);
    }
  }

  function handleSend() {
    if (!message.trim() || selectedIds.size === 0) return;

    startTransition(async () => {
      await sendSmsBlast({
        message: message.trim(),
        jobId: jobId || undefined,
        subcontractorIds: Array.from(selectedIds),
      });
      setMessage("");
      setJobId("");
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    });
  }

  const charCount = message.length;
  const maxChars = 1600;

  return (
    <div className="space-y-4">
      {/* Compose */}
      <div className="rounded-lg border border-stone/10 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-charcoal mb-3">Compose message</h2>

        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={maxChars}
          placeholder="Type your message to subcontractors..."
          className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal placeholder:text-stone/60 focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
        />
        <div className="mt-1 flex justify-between text-xs text-stone">
          <span>{charCount}/{maxChars} characters</span>
          <span>Opt-out line is added automatically</span>
        </div>

        <div className="mt-3">
          <label className="block text-xs font-medium text-stone mb-1">Attach a job (optional)</label>
          <select
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-sm text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          >
            <option value="">No job attached</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Recipients */}
      <div className="rounded-lg border border-stone/10 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-charcoal mb-3">Recipients</h2>

        <div className="flex flex-wrap gap-2 mb-3">
          <select
            value={tradeSlug}
            onChange={(e) => setTradeSlug(e.target.value)}
            className="rounded-md border border-stone/30 bg-white px-3 py-1.5 text-xs text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          >
            <option value="">All trades</option>
            {services.map((s) => (
              <option key={s.id} value={s.slug}>{s.name}</option>
            ))}
          </select>
          <select
            value={citySlug}
            onChange={(e) => setCitySlug(e.target.value)}
            className="rounded-md border border-stone/30 bg-white px-3 py-1.5 text-xs text-charcoal focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          >
            <option value="">All areas</option>
            {cities.map((c) => (
              <option key={c.id} value={c.slug}>{c.name} ({c.region})</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-2 text-xs text-charcoal">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={toggleAll}
              className="rounded border-stone/30 text-clay focus:ring-clay"
            />
            Select all ({matchedSubs.length})
          </label>
          <span className="text-xs text-stone font-medium">{selectedIds.size} selected</span>
        </div>

        <div className="max-h-48 overflow-y-auto space-y-1">
          {matchedSubs.map((sub) => (
            <label
              key={sub.id}
              className="flex items-center gap-2 rounded px-2 py-1 text-xs text-charcoal hover:bg-bone/50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(sub.id)}
                onChange={() => toggleSub(sub.id)}
                className="rounded border-stone/30 text-clay focus:ring-clay"
              />
              <span className="font-medium">{sub.companyName}</span>
              <span className="text-stone">{sub.phone}</span>
            </label>
          ))}
          {matchedSubs.length === 0 && (
            <p className="text-xs text-stone py-2">No active subcontractors match the current filters.</p>
          )}
        </div>
      </div>

      {/* Send */}
      <button
        onClick={handleSend}
        disabled={pending || !message.trim() || selectedIds.size === 0}
        className="w-full rounded-md bg-clay px-4 py-2.5 text-sm font-semibold text-white hover:bg-clay/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? "Sending..." : `Send to ${selectedIds.size} recipient${selectedIds.size !== 1 ? "s" : ""}`}
      </button>

      {sent && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Messages sent successfully.
        </div>
      )}
    </div>
  );
}
