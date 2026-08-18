import Link from "next/link";
import { listQuotes } from "@/lib/queries";
import PageShell from "../components/PageShell";
import QuoteCheckButton from "../components/QuoteCheckButton";
import StatusBadge from "../components/StatusBadge";

export const dynamic = "force-dynamic";

function fmtQty(n: number | null | undefined): string {
  if (n == null) return "—";
  return String(Math.round(n));
}

export default async function QuotesPage() {
  const quotes = await listQuotes();

  return (
    <PageShell title="报价自查" subtitle={`共 ${quotes.length} 个报价单`}>
      <div className="space-y-6">
        {quotes.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500">
            暂无报价单
          </div>
        ) : (
          quotes.map((q) => (
            <div
              key={q.id}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/quotes/${q.id}`}
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {q.quoteNo}
                  </Link>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {q.customerName}
                  </span>
                  <StatusBadge status={q.status} />
                </div>
                <QuoteCheckButton quoteId={q.id} />
              </div>

              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">货号</th>
                    <th className="px-5 py-2.5 font-medium">中文描述</th>
                    <th className="px-5 py-2.5 font-medium">尺寸 L×W×H</th>
                    <th className="px-5 py-2.5 font-medium">净重/毛重</th>
                    <th className="px-5 py-2.5 font-medium">CBM</th>
                    <th className="px-5 py-2.5 font-medium">
                      理论装柜量 (20C/40C/40HQ)
                    </th>
                    <th className="px-5 py-2.5 font-medium">自查标记</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {q.items.map((it) => (
                    <tr key={it.id}>
                      <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                        {it.itemNo}
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                        {it.descriptionCn}
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                        {[it.length, it.width, it.height]
                          .filter(Boolean)
                          .join(" × ") || "—"}
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                        {it.netWeight ?? "—"} / {it.grossWeight ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        {it.cbmMissing ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400">
                            CBM 缺失
                          </span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">
                            {it.cbm ?? "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                        {it.cbmMissing ? (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            需先填写 CBM
                          </span>
                        ) : (
                          <>
                            {fmtQty(it.theoreticalContainerQty?.["20C"])} /{" "}
                            {fmtQty(it.theoreticalContainerQty?.["40C"])} /{" "}
                            {fmtQty(it.theoreticalContainerQty?.["40HQ"])}
                          </>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {it.checkFlags && it.checkFlags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {it.checkFlags.map((flag) => (
                              <StatusBadge key={flag} status={flag} />
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">
                            通过
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </PageShell>
  );
}
