import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { PAYMENT_TYPE_LABELS, taskTypeLabel } from "@/lib/labels";
import { getContractDetail } from "@/lib/queries";
import { ACTIVE_TASK_STATUSES } from "@/workflow";
import CompletionConfirm from "../../components/CompletionConfirm";
import ItemActions from "../../components/ItemActions";
import PageShell from "../../components/PageShell";
import RecordFieldsForm from "../../components/RecordFieldsForm";
import StatusBadge from "../../components/StatusBadge";
import TaskActions from "../../components/TaskActions";

export const dynamic = "force-dynamic";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getContractDetail(Number(id));
  if (!detail || Number.isNaN(Number(id))) notFound();

  const { contract: c, items, tasks, dateLogs, inspections } = detail;

  const completeConfirmTask = tasks.find(
    (t) =>
      t.taskType === "CONTRACT_COMPLETE_CONFIRM" &&
      ACTIVE_TASK_STATUSES.includes(
        t.status as (typeof ACTIVE_TASK_STATUSES)[number],
      ),
  );

  return (
    <PageShell
      title={c.contractNo}
      subtitle={c.customerName}
      actions={
        <Link
          href="/contracts"
          className="rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          返回列表
        </Link>
      }
    >
      {/* 合同信息 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
          <div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              客户
            </span>
            <p className="mt-0.5 text-gray-900 dark:text-white">
              {c.customerName}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              国家
            </span>
            <p className="mt-0.5 text-gray-900 dark:text-white">
              {c.customerCountry}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              付款方式
            </span>
            <p className="mt-0.5 text-gray-900 dark:text-white">
              {PAYMENT_TYPE_LABELS[c.paymentType] ?? c.paymentType}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              状态
            </span>
            <p className="mt-0.5">
              <StatusBadge status={c.status} />
            </p>
          </div>
          {c.completedAt && (
            <div>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                完结日期
              </span>
              <p className="mt-0.5 text-gray-900 dark:text-white">
                {c.completedAt}
              </p>
            </div>
          )}
        </div>
        {c.remark && (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            备注：{c.remark}
          </p>
        )}
      </div>

      {/* 完结确认 */}
      {completeConfirmTask && (
        <div className="mt-6">
          <CompletionConfirm contractId={c.id} />
        </div>
      )}

      {/* 产品明细 */}
      <h2 className="mt-8 mb-3 text-sm font-semibold text-gray-900 dark:text-white">
        产品明细
      </h2>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">货号</th>
              <th className="px-4 py-3 font-medium">描述</th>
              <th className="px-4 py-3 font-medium">数量</th>
              <th className="px-4 py-3 font-medium">金额</th>
              <th className="px-4 py-3 font-medium">工厂交期</th>
              <th className="px-4 py-3 font-medium">验货</th>
              <th className="px-4 py-3 font-medium">ETD</th>
              <th className="px-4 py-3 font-medium">收款日</th>
              <th className="px-4 py-3 font-medium">电放</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((it) => (
              <Fragment key={it.id}>
                <tr className="align-top">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {it.itemNo}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {it.description}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {it.orderQty}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {it.amount}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900 dark:text-white">
                      {it.currentFactoryDate ?? "—"}
                    </div>
                    <StatusBadge status={it.factoryStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={it.inspectionResult} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {it.actualEtd ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {it.actualPaymentDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {it.telexReleaseStatus ? "已电放" : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={it.itemStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <ItemActions itemId={it.id} />
                    <RecordFieldsForm
                      itemId={it.id}
                      record={{
                        plannedEtd: it.plannedEtd,
                        bookingStatus: it.bookingStatus,
                        loadingDate: it.loadingDate,
                        docsSentStatus: it.docsSentStatus,
                        docsSentDate: it.docsSentDate,
                        expectedPaymentDate: it.expectedPaymentDate,
                        factoryActualDoneDate: it.factoryActualDoneDate,
                        remark: it.remark,
                      }}
                    />
                  </td>
                </tr>
                <tr className="bg-gray-50/60 dark:bg-gray-800/40">
                  <td colSpan={11} className="px-4 py-2">
                    <details>
                      <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400">
                        更多字段
                      </summary>
                      <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm sm:grid-cols-4">
                        <DetailField
                          label="原始工厂交期"
                          value={it.originalFactoryDate}
                        />
                        <DetailField
                          label="工厂实际完成日"
                          value={it.factoryActualDoneDate}
                        />
                        <DetailField label="计划 ETD" value={it.plannedEtd} />
                        <DetailField
                          label="默认截单日"
                          value={it.cutoffDefaultDate}
                        />
                        <DetailField
                          label="确认截单日"
                          value={it.cutoffConfirmedDate}
                        />
                        <DetailField
                          label="订舱状态"
                          value={it.bookingStatus}
                        />
                        <DetailField label="装柜日期" value={it.loadingDate} />
                        <DetailField
                          label="预计收款日"
                          value={it.expectedPaymentDate}
                        />
                        <DetailField
                          label="电放日期"
                          value={it.telexReleaseDate}
                        />
                        <DetailField label="CBM" value={it.cbm} />
                        <DetailField label="单价" value={it.unitPrice} />
                        <DetailField
                          label="单证已发"
                          value={it.docsSentStatus ? "是" : "否"}
                        />
                        <DetailField label="单证日期" value={it.docsSentDate} />
                        <DetailField label="产品备注" value={it.remark} />
                      </div>
                    </details>
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* 任务时间线 */}
      <h2 className="mt-8 mb-3 text-sm font-semibold text-gray-900 dark:text-white">
        任务
      </h2>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {tasks.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            暂无任务
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">类型</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">计划提醒日</th>
                <th className="px-4 py-3 font-medium">完成日期</th>
                <th className="px-4 py-3 font-medium">业务日期</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">
                    {taskTypeLabel(t.taskType)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {t.plannedRemindDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {t.completedAt ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {t.relatedBusinessDate ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <TaskActions taskId={t.id} status={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 交期变更记录 */}
      {dateLogs.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            交期变更记录
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">原交期</th>
                  <th className="px-4 py-3 font-medium">新交期</th>
                  <th className="px-4 py-3 font-medium">备注</th>
                  <th className="px-4 py-3 font-medium">变更时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {dateLogs.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {l.oldDate}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                      {l.newDate}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {l.remark ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {l.changedAt.toISOString().slice(0, 16).replace("T", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 验货记录 */}
      {inspections.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            验货记录
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">日期</th>
                  <th className="px-4 py-3 font-medium">结果</th>
                  <th className="px-4 py-3 font-medium">失败原因</th>
                  <th className="px-4 py-3 font-medium">处理</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {inspections.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {r.inspectionDate}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.result} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {r.failReason ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {r.retestDecision ?? r.handlingMethod ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PageShell>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className="mt-0.5 text-gray-900 dark:text-white">{value ?? "—"}</p>
    </div>
  );
}
