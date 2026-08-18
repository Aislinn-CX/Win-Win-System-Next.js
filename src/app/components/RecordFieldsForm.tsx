"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { patchJson } from "@/lib/client-api";

const inputCls =
  "rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white";

const btnCls =
  "rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800";

interface RecordFields {
  plannedEtd: string | null;
  bookingStatus: string | null;
  loadingDate: string | null;
  docsSentStatus: boolean | null;
  docsSentDate: string | null;
  expectedPaymentDate: string | null;
  factoryActualDoneDate: string | null;
  remark: string | null;
}

export default function RecordFieldsForm({
  itemId,
  record,
}: {
  itemId: number;
  record: RecordFields;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    plannedEtd: record.plannedEtd ?? "",
    bookingStatus: record.bookingStatus ?? "",
    loadingDate: record.loadingDate ?? "",
    docsSentStatus: record.docsSentStatus ?? false,
    docsSentDate: record.docsSentDate ?? "",
    expectedPaymentDate: record.expectedPaymentDate ?? "",
    factoryActualDoneDate: record.factoryActualDoneDate ?? "",
    remark: record.remark ?? "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await patchJson(`/api/contract-items/${itemId}/record`, {
      plannedEtd: form.plannedEtd || null,
      bookingStatus: form.bookingStatus || null,
      loadingDate: form.loadingDate || null,
      docsSentStatus: form.docsSentStatus,
      docsSentDate: form.docsSentDate || null,
      expectedPaymentDate: form.expectedPaymentDate || null,
      factoryActualDoneDate: form.factoryActualDoneDate || null,
      remark: form.remark || null,
    });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="mt-2">
      <button type="button" className={btnCls} onClick={() => setOpen(!open)}>
        编辑记录
      </button>

      {open && (
        <form
          onSubmit={submit}
          className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60 sm:grid-cols-4"
        >
          <label className="block">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              计划 ETD
            </span>
            <input
              type="date"
              className={inputCls}
              value={form.plannedEtd}
              onChange={(e) => set("plannedEtd", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              订舱状态
            </span>
            <input
              className={inputCls}
              value={form.bookingStatus}
              onChange={(e) => set("bookingStatus", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              装柜日期
            </span>
            <input
              type="date"
              className={inputCls}
              value={form.loadingDate}
              onChange={(e) => set("loadingDate", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              预计收款日
            </span>
            <input
              type="date"
              className={inputCls}
              value={form.expectedPaymentDate}
              onChange={(e) => set("expectedPaymentDate", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              工厂实际完成日
            </span>
            <input
              type="date"
              className={inputCls}
              value={form.factoryActualDoneDate}
              onChange={(e) => set("factoryActualDoneDate", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              单证日期
            </span>
            <input
              type="date"
              className={inputCls}
              value={form.docsSentDate}
              onChange={(e) => set("docsSentDate", e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 self-end pb-1.5">
            <input
              type="checkbox"
              checked={form.docsSentStatus}
              onChange={(e) => set("docsSentStatus", e.target.checked)}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              单证已发
            </span>
          </label>
          <label className="col-span-2 block sm:col-span-4">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              备注
            </span>
            <input
              className={inputCls}
              value={form.remark}
              onChange={(e) => set("remark", e.target.value)}
            />
          </label>

          <div className="col-span-2 flex items-center gap-2 sm:col-span-4">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              取消
            </button>
            {error && (
              <span className="text-xs text-red-600 dark:text-red-400">
                {error}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
