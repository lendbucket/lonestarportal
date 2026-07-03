export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getSolicitation, getBidProfileDocuments, getAttachmentSignedUrl, getBidDocumentSignedUrl, getServicesForConvert, getCitiesForConvert } from "../actions";
import { SolicitationDetail } from "./SolicitationDetail";

export default async function SolicitationPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const [solicitation, documents, services, cities] = await Promise.all([
    getSolicitation(id),
    getBidProfileDocuments(),
    getServicesForConvert(),
    getCitiesForConvert(),
  ]);

  if (!solicitation) notFound();

  // Resolve signed URLs for attachments and bid documents
  const attachmentsWithUrls = await Promise.all(
    solicitation.attachments.map(async (att) => ({
      ...att,
      signedUrl: await getAttachmentSignedUrl(att.fileUrl).catch(() => null),
    }))
  );

  const documentsWithUrls = await Promise.all(
    documents.map(async (doc) => ({
      ...doc,
      signedUrl: await getBidDocumentSignedUrl(doc.fileUrl).catch(() => null),
    }))
  );

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
      <SolicitationDetail
        solicitation={{ ...solicitation, attachments: attachmentsWithUrls }}
        documents={documentsWithUrls}
        services={services}
        cities={cities}
      />
    </div>
  );
}
