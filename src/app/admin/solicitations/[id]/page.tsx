export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getSolicitation, getBidProfileDocuments } from "../actions";
import { SolicitationDetail } from "./SolicitationDetail";

export default async function SolicitationPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const [solicitation, documents] = await Promise.all([
    getSolicitation(id),
    getBidProfileDocuments(),
  ]);

  if (!solicitation) notFound();

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/solicitations"
          className="text-sm text-stone hover:text-charcoal transition-colors"
        >
          &larr; Back to Solicitations
        </Link>
      </div>
      <SolicitationDetail solicitation={solicitation} documents={documents} />
    </div>
  );
}
