export const dynamic = "force-dynamic";

import { getBidProfile, getBidDocumentSignedUrl } from "./actions";
import { ProfileForm } from "./ProfileForm";
import { LicensesSection } from "./LicensesSection";
import { InsuranceSection } from "./InsuranceSection";
import { CertificationsSection } from "./CertificationsSection";
import { ReferencesSection } from "./ReferencesSection";
import { DocumentsSection } from "./DocumentsSection";

export default async function BidProfilePage() {
  const profile = await getBidProfile();

  // Resolve signed URLs for documents
  const documentsWithUrls = profile
    ? await Promise.all(
        profile.documents.map(async (doc) => ({
          ...doc,
          signedUrl: await getBidDocumentSignedUrl(doc.fileUrl).catch(() => null),
        }))
      )
    : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-slate">
          Company Bid Profile
        </h1>
        <p className="mt-1 text-sm text-stone">
          The source data every bid draft pulls from. Keep this current.
        </p>
      </div>

      <div className="space-y-8">
        <ProfileForm profile={profile} />

        {profile && (
          <>
            <LicensesSection licenses={profile.licenses} />
            <InsuranceSection policies={profile.insurancePolicies} />
            <CertificationsSection certifications={profile.certifications} />
            <ReferencesSection references={profile.references} />
            <DocumentsSection documents={documentsWithUrls} />
          </>
        )}

        {!profile && (
          <div className="rounded-lg border border-stone/10 bg-white p-6 text-center text-sm text-stone">
            Save the company profile above to unlock licenses, insurance,
            certifications, references, and document uploads.
          </div>
        )}
      </div>
    </div>
  );
}
