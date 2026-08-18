import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuoteDetail } from "@/lib/queries";
import EnDescriptionActions from "../../components/EnDescriptionActions";
import GenerateDescriptionButton from "../../components/GenerateDescriptionButton";
import ImageCandidateActions from "../../components/ImageCandidateActions";
import PageShell from "../../components/PageShell";
import QuoteCheckButton from "../../components/QuoteCheckButton";
import QuoteStatusActions from "../../components/QuoteStatusActions";
import RetrieveButton from "../../components/RetrieveButton";
import StatusBadge from "../../components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getQuoteDetail(Number(id));
  if (!detail || Number.isNaN(Number(id))) notFound();

  const { quote: q, items, suggestions, candidates, candidateSources } = detail;
  const hasFlags = items.some(
    (it) => it.checkFlags && it.checkFlags.length > 0,
  );
  const itemMap = new Map(items.map((i) => [i.id, i]));

  return (
    <PageShell
      title={q.quoteNo}
      subtitle={q.customerName}
      actions={
        <Link
          href="/quotes"
          className="rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          返回列表
        </Link>
      }
    >
      {/* 报价信息 + 状态操作 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              状态
            </span>
            <StatusBadge status={q.status} />
            <QuoteCheckButton quoteId={q.id} />
          </div>
          <QuoteStatusActions
            quoteId={q.id}
            status={q.status}
            hasFlags={hasFlags}
          />
        </div>
      </div>

      {/* 产品明细 */}
      <h2 className="mt-8 mb-3 text-sm font-semibold text-gray-900 dark:text-white">
        产品明细
      </h2>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">货号</th>
              <th className="px-4 py-3 font-medium">中文描述</th>
              <th className="px-4 py-3 font-medium">英文描述（已确认）</th>
              <th className="px-4 py-3 font-medium">自查标记</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  {it.itemNo}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {it.descriptionCn}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {it.descriptionEnConfirmed ?? "—"}
                </td>
                <td className="px-4 py-3">
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
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <RetrieveButton quoteItemId={it.id} />
                    <GenerateDescriptionButton quoteItemId={it.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 翻译建议 */}
      <h2 className="mt-8 mb-3 text-sm font-semibold text-gray-900 dark:text-white">
        翻译建议
      </h2>
      {suggestions.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500">
          暂无翻译建议
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-700 dark:bg-gray-900">
          {suggestions.map((s) => {
            const item = itemMap.get(s.quoteItemId);
            return (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {item ? `${item.itemNo} · ${item.descriptionCn}` : "—"}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {s.suggestedText}
                  </p>
                </div>
                <EnDescriptionActions
                  suggestionId={s.id}
                  suggestedText={s.suggestedText}
                  confirmStatus={s.confirmStatus}
                />
              </li>
            );
          })}
        </ul>
      )}

      {/* 检索候选 */}
      <h2 className="mt-8 mb-3 text-sm font-semibold text-gray-900 dark:text-white">
        检索候选
      </h2>
      {candidates.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500">
          暂无检索候选
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-700 dark:bg-gray-900">
          {candidates.map((c) => {
            const item = itemMap.get(c.quoteItemId);
            const src = candidateSources.get(c.id);
            return (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {item ? item.itemNo : "—"} · {c.source}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-900 dark:text-white">
                    {src ? `${src.itemNo} · ${src.description}` : "—"}
                  </p>
                  {src?.descriptionEnConfirmed ? (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      EN: {src.descriptionEnConfirmed}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    {c.imageUrl ? c.imageUrl : "暂无图片"}
                    {src?.unitPrice != null
                      ? ` · 历史价 ${src.unitPrice}`
                      : " · 历史价 —"}
                  </p>
                </div>
                <ImageCandidateActions
                  candidateId={c.id}
                  confirmStatus={c.confirmStatus}
                />
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
