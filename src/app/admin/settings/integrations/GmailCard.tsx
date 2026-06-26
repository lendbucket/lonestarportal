"use client";

import { useTransition, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { disconnectGmail, triggerSync } from "./actions";

interface Connection {
  id: string;
  emailAddress: string;
  status: string;
  lastSyncedAt: Date | null;
}

export function GmailCard({ connection }: { connection: Connection | null }) {
  const [pending, startTransition] = useTransition();
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    const error = searchParams.get("gmailError");
    const connected = searchParams.get("gmailConnected");
    if (error) setFlash(`Connection error: ${error}`);
    else if (connected) setFlash("Gmail connected successfully.");

    if (error || connected) {
      const timer = setTimeout(() => setFlash(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  function handleDisconnect() {
    if (!confirm("Disconnect Gmail? The bid engine will stop polling for new solicitations.")) return;
    startTransition(async () => {
      await disconnectGmail();
    });
  }

  function handleSync() {
    setSyncResult(null);
    startTransition(async () => {
      try {
        const result = await triggerSync();
        setSyncResult(
          `Processed ${result.processed} messages. ${result.solicitations} solicitations created, ${result.skipped} skipped.` +
          (result.errors.length > 0
            ? ` ${result.errors.length} error(s).`
            : "")
        );
      } catch (err: unknown) {
        setSyncResult(`Sync failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  }

  return (
    <div className="rounded-lg border border-stone/10 bg-white shadow-sm">
      <div className="border-b border-stone/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-red-600" fill="currentColor">
              <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
            </svg>
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-slate">Gmail</h2>
            <p className="text-xs text-stone">
              Read-only access to poll for bid solicitation emails.
            </p>
          </div>
        </div>

        {connection ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Connected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-stone/10 px-2.5 py-0.5 text-xs font-medium text-stone">
            Not connected
          </span>
        )}
      </div>

      {flash && (
        <div
          className={`mx-6 mt-4 rounded-md px-4 py-2 text-sm ${
            flash.includes("error") || flash.includes("Error")
              ? "bg-red-50 text-red-800"
              : "bg-green-50 text-green-800"
          }`}
        >
          {flash}
        </div>
      )}

      <div className="p-6">
        {connection ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-stone">Account</span>
                <p className="font-medium text-charcoal">{connection.emailAddress}</p>
              </div>
              <div>
                <span className="text-stone">Last synced</span>
                <p className="font-medium text-charcoal">
                  {connection.lastSyncedAt
                    ? new Date(connection.lastSyncedAt).toLocaleString()
                    : "Never"}
                </p>
              </div>
            </div>

            {syncResult && (
              <div className="rounded-md bg-bone px-4 py-2 text-sm text-charcoal">
                {syncResult}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSync}
                disabled={pending}
                className="rounded-md bg-clay px-4 py-2 text-sm font-medium text-white hover:bg-clay/90 disabled:opacity-50 transition-colors"
              >
                {pending ? "Syncing..." : "Sync Now"}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={pending}
                className="rounded-md border border-stone/20 px-4 py-2 text-sm font-medium text-stone hover:text-charcoal hover:border-stone/40 disabled:opacity-50 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-stone">
              Connect your Gmail account to automatically poll for bid
              solicitation emails. The engine uses read-only access and never
              sends, deletes, or modifies any messages.
            </p>
            <a
              href="/api/integrations/gmail"
              className="inline-block rounded-md bg-clay px-4 py-2 text-sm font-medium text-white hover:bg-clay/90 transition-colors"
            >
              Connect Gmail
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
