import Link from "next/link";
import { TASK_STATUS, TASK_TYPE } from "@/db";
import { taskTypeLabel } from "@/lib/labels";
import { listTasks } from "@/lib/queries";
import PageShell from "../components/PageShell";
import RefreshTasksButton from "../components/RefreshTasksButton";
import StatusBadge from "../components/StatusBadge";
import TaskActions from "../components/TaskActions";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = Object.values(TASK_STATUS);
const TYPE_OPTIONS = Object.values(TASK_TYPE);

const STATUS_ORDER = [
  "已逾期",
  "待处理",
  "待提醒",
  "暂不完成",
  "已完成",
  "无需处理",
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; taskType?: string }>;
}) {
  const { status, taskType } = await searchParams;
  const tasks = await listTasks({ status, taskType });

  const sorted = [...tasks].sort((a, b) => {
    const sa = STATUS_ORDER.indexOf(a.status);
    const sb = STATUS_ORDER.indexOf(b.status);
    if (sa !== sb) return sa - sb;
    return (a.nextRemindDate ?? a.plannedRemindDate ?? "").localeCompare(
      b.nextRemindDate ?? b.plannedRemindDate ?? "",
    );
  });

  return (
    <PageShell
      title="任务中心"
      subtitle={`共 ${sorted.length} 个任务`}
      actions={<RefreshTasksButton />}
    >
      <form
        method="get"
        action="/tasks"
        className="mb-4 flex flex-wrap items-center gap-3"
      >
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="">全部状态</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          name="taskType"
          defaultValue={taskType ?? ""}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="">全部类型</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {taskTypeLabel(t)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          筛选
        </button>
        {(status || taskType) && (
          <Link
            href="/tasks"
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            重置
          </Link>
        )}
      </form>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">类型</th>
              <th className="px-4 py-3 font-medium">合同</th>
              <th className="px-4 py-3 font-medium">产品</th>
              <th className="px-4 py-3 font-medium">提醒日</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-gray-400 dark:text-gray-500"
                >
                  暂无任务
                </td>
              </tr>
            ) : (
              sorted.map((t) => (
                <tr
                  key={t.id}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {taskTypeLabel(t.taskType)}
                  </td>
                  <td className="px-4 py-3">
                    {t.contract ? (
                      <Link
                        href={`/contracts/${t.contract.id}`}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {t.contract.contractNo}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {t.item ? `${t.item.itemNo} · ${t.item.description}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {t.nextRemindDate ?? t.plannedRemindDate ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3">
                    <TaskActions taskId={t.id} status={t.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
