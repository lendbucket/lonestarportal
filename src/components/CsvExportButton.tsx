"use client";

import { useTransition } from "react";

interface Props {
  exportAction: () => Promise<string>;
  filename: string;
}

export function CsvExportButton({ exportAction, filename }: Props) {
  const [pending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const csv = await exportAction();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <button
      onClick={handleExport}
      disabled={pending}
      className="rounded-md border border-stone/20 px-4 py-2 text-sm font-medium text-stone hover:text-charcoal hover:border-stone/40 disabled:opacity-50 transition-colors"
    >
      {pending ? "Exporting..." : "Export CSV"}
    </button>
  );
}
