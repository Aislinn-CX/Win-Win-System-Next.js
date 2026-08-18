"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client-api";

export default function ImageCandidateActions({
  candidateId,
  confirmStatus,
}: {
  candidateId: number;
  confirmStatus: string;
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

  if (confirmStatus !== "待确认") {
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">
        {confirmStatus}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
        onClick={() =>
          act(`/api/quote-image-candidates/${candidateId}/confirm`)
        }
        disabled={busy}
      >
        选择
      </button>
      <button
        type="button"
        className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        onClick={() => act(`/api/quote-image-candidates/${candidateId}/reject`)}
        disabled={busy}
      >
        拒绝
      </button>
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
