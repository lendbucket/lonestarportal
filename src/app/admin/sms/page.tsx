export const dynamic = "force-dynamic";

import { getSmsHistory, getJobs, getServices, getCities } from "./actions";
import { SmsComposer } from "./SmsComposer";

export default async function SmsPage() {
  const [history, jobs, services, cities] = await Promise.all([
    getSmsHistory(),
    getJobs(),
    getServices(),
    getCities(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-slate">Mass SMS</h1>
        <p className="mt-1 text-sm text-stone">Send messages to your subcontractor network</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Composer */}
        <SmsComposer jobs={jobs} services={services} cities={cities} />

        {/* History */}
        <div>
          <h2 className="text-sm font-semibold text-charcoal mb-3">Recent blasts</h2>
          {history.length === 0 ? (
            <div className="rounded-lg border border-stone/10 bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-stone">No messages sent yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((blast) => {
                const sent = blast.recipients.filter((r) => r.status === "sent").length;
                const failed = blast.recipients.filter((r) => r.status === "failed").length;
                const total = blast.recipients.length;

                return (
                  <div key={blast.id} className="rounded-lg border border-stone/10 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-stone">
                          {new Date(blast.createdAt).toLocaleString()} &middot; {blast.sentBy.name}
                        </p>
                        {blast.job && (
                          <p className="text-xs text-clay mt-0.5">Job: {blast.job.title}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-700">{sent} sent</span>
                        {failed > 0 && <span className="text-red-600">{failed} failed</span>}
                        <span className="text-stone">{total} total</span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-charcoal whitespace-pre-wrap line-clamp-3">
                      {blast.message}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {blast.recipients.slice(0, 5).map((r) => (
                        <span key={r.id} className="inline-block rounded bg-bone px-2 py-0.5 text-xs text-stone">
                          {r.subcontractor.companyName}
                        </span>
                      ))}
                      {blast.recipients.length > 5 && (
                        <span className="text-xs text-stone">+{blast.recipients.length - 5} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
