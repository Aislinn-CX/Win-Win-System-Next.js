"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client-api";

export default function GenerateDescriptionButton({
  quoteItemId,
}: {
  quoteItemId: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    const res = await postJson(
      `/api/quote-items/${quoteItemId}/generate-description`,
    );
    setBusy(false);
    if (!res.ok) return setError(res.message);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        onClick={generate}
        disabled={busy}
      >
        {busy ? "生成中…" : "生成英文描述"}
      </button>
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
