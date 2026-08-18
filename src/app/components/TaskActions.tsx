"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { patchJson } from "@/lib/client-api";

const ACTIVE = ["待提醒", "待处理", "暂不完成", "已逾期"];
const COMPLETABLE = ["待处理", "已逾期"];

export default function TaskActions({
  taskId,
  status,
}: {
  taskId: number;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPostpone, setShowPostpone] = useState(false);
  const [nextRemindDate, setNextRemindDate] = useState("");

  if (!ACTIVE.includes(status)) return null;

  async function complete() {
    setBusy(true);
    setError(null);
    const res = await patchJson(`/api/tasks/${taskId}`, { action: "complete" });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    router.refresh();
  }

  async function postpone(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await patchJson(`/api/tasks/${taskId}`, {
      action: "postpone",
      nextRemindDate,
    });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    setNextRemindDate("");
    setShowPostpone(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {COMPLETABLE.includes(status) && (
        <button
          type="button"
          onClick={complete}
          disabled={busy}
          className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          完成
        </button>
      )}
      <button
        type="button"
        onClick={() => setShowPostpone((v) => !v)}
        className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        延期
      </button>
      {showPostpone && (
        <form onSubmit={postpone} className="flex items-center gap-1">
          <input
            type="date"
            value={nextRemindDate}
            onChange={(e) => setNextRemindDate(e.target.value)}
            required
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            确定
          </button>
        </form>
      )}
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
