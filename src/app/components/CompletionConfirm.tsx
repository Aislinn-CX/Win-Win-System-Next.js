"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client-api";

export default function CompletionConfirm({
  contractId,
}: {
  contractId: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm(decision: "agree" | "reject") {
    setBusy(true);
    setError(null);
    const res = await postJson(
      `/api/contracts/${contractId}/complete-confirm`,
      { decision },
    );
    setBusy(false);
    if (!res.ok) return setError(res.message);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
        合同全部产品已完成，是否确认完结？
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => confirm("agree")}
          disabled={busy}
          className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          同意完结
        </button>
        <button
          type="button"
          onClick={() => confirm("reject")}
          disabled={busy}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
        >
          暂不完结
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
