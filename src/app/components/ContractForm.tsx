"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client-api";

interface ItemDraft {
  id: string;
  itemNo: string;
  description: string;
  orderQty: string;
  unitPrice: string;
  amount: string;
  cbm: string;
  originalFactoryDate: string;
}

let nextItemId = 0;
const emptyItem = (): ItemDraft => ({
  id: `item-${++nextItemId}`,
  itemNo: "",
  description: "",
  orderQty: "",
  unitPrice: "",
  amount: "",
  cbm: "",
  originalFactoryDate: "",
});

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white";

export default function ContractForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    contractNo: "",
    customerName: "",
    customerCountry: "",
    paymentType: "DP",
    remark: "",
  });
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);

  function setField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setItem(idx: number, key: string, value: string) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)),
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await postJson("/api/contracts", {
      ...form,
      items: items.map((it) => ({
        itemNo: it.itemNo,
        description: it.description,
        orderQty: it.orderQty,
        unitPrice: it.unitPrice,
        amount: it.amount,
        cbm: it.cbm || null,
        originalFactoryDate: it.originalFactoryDate,
      })),
    });

    if (!res.ok) {
      setError(res.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setOpen(false);
    setForm({
      contractNo: "",
      customerName: "",
      customerCountry: "",
      paymentType: "DP",
      remark: "",
    });
    setItems([emptyItem()]);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        新建合同
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6">
          <div className="my-8 w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                新建合同
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                关闭
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    合同号 *
                  </span>
                  <input
                    className={inputCls}
                    value={form.contractNo}
                    onChange={(e) => setField("contractNo", e.target.value)}
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    客户名称 *
                  </span>
                  <input
                    className={inputCls}
                    value={form.customerName}
                    onChange={(e) => setField("customerName", e.target.value)}
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    客户国家 *
                  </span>
                  <input
                    className={inputCls}
                    value={form.customerCountry}
                    onChange={(e) =>
                      setField("customerCountry", e.target.value)
                    }
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    付款方式 *
                  </span>
                  <select
                    className={inputCls}
                    value={form.paymentType}
                    onChange={(e) => setField("paymentType", e.target.value)}
                  >
                    <option value="DP">DP</option>
                    <option value="OA">OA</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  备注
                </span>
                <input
                  className={inputCls}
                  value={form.remark}
                  onChange={(e) => setField("remark", e.target.value)}
                />
              </label>

              {/* 产品明细 */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    产品明细
                  </span>
                  <button
                    type="button"
                    onClick={() => setItems((prev) => [...prev, emptyItem()])}
                    className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                  >
                    + 添加产品
                  </button>
                </div>

                <div className="space-y-3 p-4">
                  {items.map((it, idx) => (
                    <div key={it.id} className="grid grid-cols-6 gap-2">
                      <input
                        className={inputCls}
                        placeholder="货号 *"
                        value={it.itemNo}
                        onChange={(e) => setItem(idx, "itemNo", e.target.value)}
                        required
                      />
                      <input
                        className={`${inputCls} col-span-2`}
                        placeholder="描述 *"
                        value={it.description}
                        onChange={(e) =>
                          setItem(idx, "description", e.target.value)
                        }
                        required
                      />
                      <input
                        className={inputCls}
                        placeholder="数量 *"
                        value={it.orderQty}
                        onChange={(e) =>
                          setItem(idx, "orderQty", e.target.value)
                        }
                        required
                      />
                      <input
                        className={inputCls}
                        placeholder="单价 *"
                        value={it.unitPrice}
                        onChange={(e) =>
                          setItem(idx, "unitPrice", e.target.value)
                        }
                        required
                      />
                      <input
                        className={inputCls}
                        placeholder="金额 *"
                        value={it.amount}
                        onChange={(e) => setItem(idx, "amount", e.target.value)}
                        required
                      />
                      <input
                        className={inputCls}
                        placeholder="CBM"
                        value={it.cbm}
                        onChange={(e) => setItem(idx, "cbm", e.target.value)}
                      />
                      <input
                        className={inputCls}
                        type="date"
                        placeholder="工厂交期 *"
                        value={it.originalFactoryDate}
                        onChange={(e) =>
                          setItem(idx, "originalFactoryDate", e.target.value)
                        }
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setItems((prev) => prev.filter((_, i) => i !== idx))
                        }
                        disabled={items.length === 1}
                        className="rounded-md px-2 text-xs text-red-600 hover:bg-red-50 disabled:opacity-30 dark:hover:bg-red-950"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "提交中…" : "提交"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
