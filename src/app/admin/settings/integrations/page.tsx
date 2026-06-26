export const dynamic = "force-dynamic";

import { getGmailConnection } from "./actions";
import { GmailCard } from "./GmailCard";

export default async function IntegrationsPage() {
  const connection = await getGmailConnection();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-slate">
          Integrations
        </h1>
        <p className="mt-1 text-sm text-stone">
          Connect external services to the bid engine.
        </p>
      </div>

      <div className="space-y-6">
        <GmailCard connection={connection} />
      </div>
    </div>
  );
}
