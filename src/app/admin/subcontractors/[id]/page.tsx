export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubcontractor, getServicesGrouped, getCities, updateSubcontractor } from "../actions";
import { SubcontractorForm } from "../SubcontractorForm";
import { StatusActions } from "./StatusActions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SubcontractorDetailPage({ params }: Props) {
  const { id } = await params;
  const [sub, categories, cities] = await Promise.all([
    getSubcontractor(id),
    getServicesGrouped(),
    getCities(),
  ]);

  if (!sub) notFound();

  async function handleUpdate(_state: { error?: string } | null, formData: FormData) {
    "use server";
    try {
      await updateSubcontractor(id, formData);
      return null;
    } catch (e) {
      if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
      return { error: e instanceof Error ? e.message : "Something went wrong." };
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/subcontractors" className="text-sm text-stone hover:text-clay transition-colors">
          &larr; Back to subcontractors
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate">{sub.companyName}</h1>
            <p className="mt-1 text-sm text-stone">{sub.contactName} &middot; {sub.email}</p>
          </div>
          <StatusActions sub={sub} />
        </div>
      </div>

      <SubcontractorForm
        categories={categories}
        cities={cities}
        sub={sub}
        action={handleUpdate}
      />
    </div>
  );
}
