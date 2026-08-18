"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { patchJson, postJson } from "@/lib/client-api";

type ActionKey = "factoryDate" | "etd" | "payment" | "inspection";

const inputCls =
  "rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white";

const btnCls =
  "rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800";

export default function ItemActions({ itemId }: { itemId: number }) {
  const router = useRouter();
  const [active, setActive] = useState<ActionKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [factoryDate, setFactoryDate] = useState({ newDate: "", remark: "" });
  const [etd, setEtd] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [inspection, setInspection] = useState({
    inspectionDate: "",
    result: "Pass",
    failReason: "",
    retestDecision: "",
    retestDate: "",
    handlingMethod: "",
  });

  function reset() {
    setError(null);
    setActive(null);
    setFactoryDate({ newDate: "", remark: "" });
    setEtd("");
    setPaymentDate("");
    setInspection({
      inspectionDate: "",
      result: "Pass",
      failReason: "",
      retestDecision: "",
      retestDate: "",
      handlingMethod: "",
    });
  }

  async function submitFactoryDate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await patchJson(
      `/api/contract-items/${itemId}/factory-date`,
      factoryDate,
    );
    setBusy(false);
    if (!res.ok) return setError(res.message);
    reset();
    router.refresh();
  }

  async function submitEtd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await patchJson(`/api/contract-items/${itemId}/actual-etd`, {
      etd,
    });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    reset();
    router.refresh();
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await patchJson(`/api/contract-items/${itemId}/payment`, {
      paymentDate,
    });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    reset();
    router.refresh();
  }

  async function submitInspection(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await postJson(`/api/contract-items/${itemId}/inspections`, {
      inspectionDate: inspection.inspectionDate,
      result: inspection.result,
      failReason: inspection.result === "Fail" ? inspection.failReason : null,
      retestDecision:
        inspection.result === "Fail" ? inspection.retestDecision : null,
      retestDate:
        inspection.result === "Fail" && inspection.retestDecision === "重验"
          ? inspection.retestDate
          : null,
      handlingMethod:
        inspection.result === "Fail" && inspection.retestDecision === "不重验"
          ? inspection.handlingMethod
          : null,
    });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    reset();
    router.refresh();
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className={btnCls}
          onClick={() =>
            setActive(active === "factoryDate" ? null : "factoryDate")
          }
        >
          变更交期
        </button>
        <button
          type="button"
          className={btnCls}
          onClick={() => setActive(active === "etd" ? null : "etd")}
        >
          录入 ETD
        </button>
        <button
          type="button"
          className={btnCls}
          onClick={() => setActive(active === "payment" ? null : "payment")}
        >
          录入收款
        </button>
        <button
          type="button"
          className={btnCls}
          onClick={() =>
            setActive(active === "inspection" ? null : "inspection")
          }
        >
          验货
        </button>
      </div>

      {active === "factoryDate" && (
        <form
          onSubmit={submitFactoryDate}
          className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60"
        >
          <label className="block">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              新交期 *
            </span>
            <input
              type="date"
              className={inputCls}
              value={factoryDate.newDate}
              onChange={(e) =>
                setFactoryDate((f) => ({ ...f, newDate: e.target.value }))
              }
              required
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              备注
            </span>
            <input
              className={inputCls}
              value={factoryDate.remark}
              onChange={(e) =>
                setFactoryDate((f) => ({ ...f, remark: e.target.value }))
              }
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            提交
          </button>
        </form>
      )}

      {active === "etd" && (
        <form
          onSubmit={submitEtd}
          className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60"
        >
          <label className="block">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              实际 ETD *
            </span>
            <input
              type="date"
              className={inputCls}
              value={etd}
              onChange={(e) => setEtd(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            提交
          </button>
        </form>
      )}

      {active === "payment" && (
        <form
          onSubmit={submitPayment}
          className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60"
        >
          <label className="block">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              汇款日期 *
            </span>
            <input
              type="date"
              className={inputCls}
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            提交
          </button>
        </form>
      )}

      {active === "inspection" && (
        <form
          onSubmit={submitInspection}
          className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60"
        >
          <label className="block">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              验货日期 *
            </span>
            <input
              type="date"
              className={inputCls}
              value={inspection.inspectionDate}
              onChange={(e) =>
                setInspection((f) => ({ ...f, inspectionDate: e.target.value }))
              }
              required
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              结果 *
            </span>
            <select
              className={inputCls}
              value={inspection.result}
              onChange={(e) =>
                setInspection((f) => ({ ...f, result: e.target.value }))
              }
            >
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
            </select>
          </label>
          {inspection.result === "Fail" && (
            <>
              <label className="block">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  失败原因 *
                </span>
                <input
                  className={inputCls}
                  value={inspection.failReason}
                  onChange={(e) =>
                    setInspection((f) => ({ ...f, failReason: e.target.value }))
                  }
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  是否重验 *
                </span>
                <select
                  className={inputCls}
                  value={inspection.retestDecision}
                  onChange={(e) =>
                    setInspection((f) => ({
                      ...f,
                      retestDecision: e.target.value,
                    }))
                  }
                  required
                >
                  <option value="">请选择</option>
                  <option value="重验">重验</option>
                  <option value="不重验">不重验</option>
                </select>
              </label>
              {inspection.retestDecision === "重验" && (
                <label className="block">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    重验日期 *
                  </span>
                  <input
                    type="date"
                    className={inputCls}
                    value={inspection.retestDate}
                    onChange={(e) =>
                      setInspection((f) => ({
                        ...f,
                        retestDate: e.target.value,
                      }))
                    }
                    required
                  />
                </label>
              )}
              {inspection.retestDecision === "不重验" && (
                <label className="block">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    处理方式 *
                  </span>
                  <input
                    className={inputCls}
                    value={inspection.handlingMethod}
                    onChange={(e) =>
                      setInspection((f) => ({
                        ...f,
                        handlingMethod: e.target.value,
                      }))
                    }
                    required
                  />
                </label>
              )}
            </>
          )}
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            提交
          </button>
        </form>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
