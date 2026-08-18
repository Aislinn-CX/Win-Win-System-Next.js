"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client-api";

export default function RetrieveButton({
  quoteItemId,
}: {
  quoteItemId: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function retrieve() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await postJson<{ createdCount: number }>(
      `/api/quote-items/${quoteItemId}/retrieve`,
    );
    setBusy(false);
    if (!res.ok) return setError(res.message);
    if (res.data.createdCount === 0) {
      setNotice("未找到匹配的历史产品");
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        onClick={retrieve}
        disabled={busy}
      >
        {busy ? "检索中…" : "检索历史"}
      </button>
      {notice && (
        <span className="text-xs text-amber-600 dark:text-amber-400">
          {notice}
        </span>
      )}
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
