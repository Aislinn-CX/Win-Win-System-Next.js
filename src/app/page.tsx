import Link from "next/link";
import { taskTypeLabel } from "@/lib/labels";
import {
  getDashboardStats,
  listContracts,
  listDueTodayTasks,
} from "@/lib/queries";
import PageShell from "./components/PageShell";
import StatCard from "./components/StatCard";
import StatusBadge from "./components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function Home() {
  const stats = await getDashboardStats();
  const contracts = await listContracts();
  const dueToday = await listDueTodayTasks();

  const activeContracts = contracts
    .filter((c) => c.status !== "已完结")
    .slice(0, 5);

  const overdueCount = dueToday.filter((t) => t.status === "已逾期").length;
  const pendingCount = dueToday.length - overdueCount;

  return (
    <PageShell title="Dashboard" subtitle="Win-Win System">
      {/* 统计卡片网格 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="进行中合同"
          value={stats.inProgress}
          accent="blue"
          subtitle={`待确认完结 ${stats.pendingConfirm}`}
        />
        <StatCard
          title="待处理任务"
          value={stats.pendingProcess}
          accent="green"
          subtitle={`待跟进共 ${stats.activeTaskCount}`}
        />
        <StatCard
          title="已逾期任务"
          value={stats.overdue}
          accent="orange"
          subtitle="需尽快处理"
        />
        <StatCard
          title="已完成合同"
          value={stats.completed}
          accent="purple"
          subtitle={`合同总数 ${stats.totalContracts}`}
        />
      </div>

      {/* 最近合同 + 今日到期任务 */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              最近合同
            </h2>
            <Link
              href="/contracts"
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              查看全部
            </Link>
          </div>
          {activeContracts.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
              暂无进行中合同
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
              {activeContracts.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <Link
                    href={`/contracts/${c.id}`}
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {c.contractNo}
                  </Link>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {c.customerName}
                  </span>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              今日到期任务
            </h2>
            <Link
              href="/tasks"
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              查看全部
            </Link>
          </div>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {pendingCount} 待处理 · {overdueCount} 已逾期
          </p>
          {dueToday.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
              今日暂无到期任务
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
              {dueToday.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href="/tasks"
                      className="block truncate text-sm font-medium text-gray-900 hover:text-blue-600 dark:text-white"
                    >
                      {taskTypeLabel(t.taskType)}
                    </Link>
                    {t.item && (
                      <p className="truncate text-xs text-gray-400 dark:text-gray-500">
                        {t.item.itemNo} · {t.item.description}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    {t.contract && (
                      <Link
                        href={`/contracts/${t.contract.id}`}
                        className="block text-xs text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {t.contract.contractNo}
                      </Link>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {t.nextRemindDate ?? t.plannedRemindDate ?? "—"}
                    </span>
                  </div>
                  <StatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PageShell>
  );
}
