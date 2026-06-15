export const dynamic = "force-dynamic";

import Link from "next/link";
import { getServices, getCities, createJob } from "../actions";
import { JobForm } from "./JobForm";

async function handleCreate(_state: { error?: string } | null, formData: FormData) {
  "use server";
  try {
    await createJob(formData);
    return null;
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export default async function NewJobPage() {
  const [services, cities] = await Promise.all([getServices(), getCities()]);

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/jobs" className="text-sm text-stone hover:text-clay transition-colors">
          &larr; Back to jobs
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate">Create job</h1>
      </div>

      <JobForm services={services} cities={cities} action={handleCreate} />
    </div>
  );
}
