"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client-api";

const inputCls =
  "rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white";

const btnCls =
  "rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800";

export default function EnDescriptionActions({
  suggestionId,
  suggestedText,
  confirmStatus,
}: {
  suggestionId: number;
  suggestedText: string;
  confirmStatus: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(suggestedText);

  async function act(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    const res = await postJson(path, body);
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
      {editing ? (
        <>
          <input
            className={inputCls}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="button"
            className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={() =>
              act(`/api/quote-en-suggestions/${suggestionId}/confirm`, {
                finalText: text,
              })
            }
            disabled={busy}
          >
            保存修改
          </button>
          <button
            type="button"
            className={btnCls}
            onClick={() => setEditing(false)}
          >
            取消
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            onClick={() =>
              act(`/api/quote-en-suggestions/${suggestionId}/confirm`)
            }
            disabled={busy}
          >
            确认
          </button>
          <button
            type="button"
            className={btnCls}
            onClick={() => setEditing(true)}
          >
            修改
          </button>
          <button
            type="button"
            className={btnCls}
            onClick={() =>
              act(`/api/quote-en-suggestions/${suggestionId}/reject`)
            }
            disabled={busy}
          >
            拒绝
          </button>
        </>
      )}
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
