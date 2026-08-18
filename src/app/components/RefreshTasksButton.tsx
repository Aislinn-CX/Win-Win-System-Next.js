"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client-api";

export default function RefreshTasksButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setNotice(null);
    setError(null);
    const res = await postJson<{ changed: number }>("/api/tasks/refresh");
    setBusy(false);
    if (!res.ok) return setError(res.message);
    setNotice(`已刷新，${res.data.changed} 个任务状态更新`);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        onClick={refresh}
        disabled={busy}
      >
        {busy ? "刷新中…" : "刷新任务"}
      </button>
      {notice && (
        <span className="text-xs text-green-600 dark:text-green-400">
          {notice}
        </span>
      )}
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
