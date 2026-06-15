export const dynamic = "force-dynamic";

import Link from "next/link";
import { getServicesGrouped, getCities, createSubcontractor } from "../actions";
import { SubcontractorForm } from "../SubcontractorForm";

async function handleCreate(_state: { error?: string } | null, formData: FormData) {
  "use server";
  try {
    await createSubcontractor(formData);
    return null;
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export default async function NewSubcontractorPage() {
  const [categories, cities] = await Promise.all([
    getServicesGrouped(),
    getCities(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/subcontractors" className="text-sm text-stone hover:text-clay transition-colors">
          &larr; Back to subcontractors
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate">Add subcontractor</h1>
      </div>

      <SubcontractorForm categories={categories} cities={cities} action={handleCreate} />
    </div>
  );
}
