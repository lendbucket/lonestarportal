import Link from "next/link";

interface Props {
  page: number;
  totalPages: number;
  total: number;
  baseHref: string;
}

export function Pagination({ page, totalPages, total, baseHref }: Props) {
  if (totalPages <= 1) return null;

  const separator = baseHref.includes("?") ? "&" : "?";

  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-stone">
        {total} result{total !== 1 ? "s" : ""}
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={`${baseHref}${separator}page=${page - 1}`}
            className="rounded-md border border-stone/20 px-3 py-1.5 text-sm text-stone hover:text-charcoal transition-colors"
          >
            Previous
          </Link>
        )}
        <span className="flex items-center px-3 text-sm text-stone">
          Page {page} of {totalPages}
        </span>
        {page < totalPages && (
          <Link
            href={`${baseHref}${separator}page=${page + 1}`}
            className="rounded-md border border-stone/20 px-3 py-1.5 text-sm text-stone hover:text-charcoal transition-colors"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
