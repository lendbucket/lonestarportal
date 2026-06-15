export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getLead } from "../actions";
import { LeadActions } from "./LeadActions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
  const lead = await getLead(id);

  if (!lead) notFound();

  const fields = [
    { label: "Type", value: lead.type === "CUSTOMER" ? "Customer" : "Subcontractor" },
    { label: "Email", value: lead.email || "-" },
    { label: "Phone", value: lead.phone || "-" },
    { label: "Service", value: lead.service?.name || "-" },
    { label: "City", value: lead.city?.name || "-" },
    { label: "Property type", value: lead.propertyType || "-" },
    { label: "Source", value: lead.source },
    { label: "Created", value: new Date(lead.createdAt).toLocaleString() },
  ];

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/leads" className="text-sm text-stone hover:text-clay transition-colors">
          &larr; Back to leads
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate">{lead.name}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-stone/10 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-charcoal mb-4">Lead details</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {fields.map((f) => (
                <div key={f.label}>
                  <dt className="text-xs font-medium text-stone">{f.label}</dt>
                  <dd className="mt-0.5 text-sm text-charcoal">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {lead.scope && (
            <div className="rounded-lg border border-stone/10 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-charcoal mb-2">Scope</h2>
              <p className="text-sm text-charcoal whitespace-pre-wrap">{lead.scope}</p>
            </div>
          )}
        </div>

        {/* Sidebar actions */}
        <div>
          <LeadActions lead={lead} />
        </div>
      </div>
    </div>
  );
}
