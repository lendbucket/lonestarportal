"use client";

export function ExpiryBadge({ date }: { date: Date | string | null }) {
  if (!date) return <span className="text-xs text-stone">No expiry</span>;

  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let colorClass = "bg-green-100 text-green-800";
  let label = d.toLocaleDateString();

  if (diffDays < 0) {
    colorClass = "bg-red-100 text-red-800";
    label = `Expired ${d.toLocaleDateString()}`;
  } else if (diffDays <= 30) {
    colorClass = "bg-yellow-100 text-yellow-800";
    label = `Expires ${d.toLocaleDateString()}`;
  }

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
