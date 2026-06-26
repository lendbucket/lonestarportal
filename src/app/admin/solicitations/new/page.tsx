export const dynamic = "force-dynamic";

import Link from "next/link";
import { ManualSolicitationForm } from "./ManualSolicitationForm";

export default function NewSolicitationPage() {
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

      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-slate">
          Add Solicitation
        </h1>
        <p className="mt-1 text-sm text-stone">
          Manually enter a solicitation that arrived outside of email.
        </p>
      </div>

      <ManualSolicitationForm />
    </div>
  );
}
