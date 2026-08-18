"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client-api";

export default function QuoteStatusActions({
  quoteId,
  status,
  hasFlags,
}: {
  quoteId: number;
  status: string;
  hasFlags: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(path: string) {
    setBusy(true);
    setError(null);
    const res = await postJson(path);
    setBusy(false);
    if (!res.ok) return setError(res.message);
    router.refresh();
  }

  async function submit() {
    await act(`/api/quotes/${quoteId}/submit`);
  }

  async function confirm() {
    if (hasFlags && !window.confirm("存在未处理的自查报警，确认仍要入库？")) {
      return;
    }
    await act(`/api/quotes/${quoteId}/confirm`);
  }

  async function returnRevision() {
    await act(`/api/quotes/${quoteId}/return`);
  }

  if (status === "已确认入库") return null;

  return (
    <div className="flex items-center gap-2">
      {status === "草稿自查中" && (
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          提交待确认
        </button>
      )}
      {status === "待用户确认" && (
        <>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="rounded-lg bg-green-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            确认入库
          </button>
          <button
            type="button"
            onClick={returnRevision}
            disabled={busy}
            className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
          >
            返回修改
          </button>
        </>
      )}
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
