import Sidebar from "./components/Sidebar";
import StatCard from "./components/StatCard";

const stats = [
  { title: "客户总数", value: 0, accent: "blue" as const, subtitle: "活跃客户 0" },
  { title: "本月询盘", value: 0, accent: "green" as const, subtitle: "较上月 0%" },
  { title: "进行中订单", value: 0, accent: "purple" as const, subtitle: "待处理 0 笔" },
  { title: "待跟进事项", value: 0, accent: "orange" as const, subtitle: "今日到期 0" },
];

export default function Home() {
  return (
    <div className="flex min-h-0 flex-1">
      <Sidebar />

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
        {/* 顶栏 */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-200 bg-white/80 px-6 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Win-Win System
          </span>
        </header>

        {/* 内容 */}
        <div className="p-6">
          {/* 统计卡片网格 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <StatCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                accent={stat.accent}
                subtitle={stat.subtitle}
              />
            ))}
          </div>

          {/* 占位：后续可放图表、列表等 */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                最近询盘
              </h2>
              <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
                暂无数据
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                最近订单
              </h2>
              <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
                暂无数据
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
