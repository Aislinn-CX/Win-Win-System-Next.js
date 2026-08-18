import Sidebar from "./Sidebar";

export default function PageShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1">
      <Sidebar />

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
        {/* 顶栏 */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-200 bg-white/80 px-6 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <span className="text-sm text-gray-400 dark:text-gray-500">
                {subtitle}
              </span>
            )}
          </div>
          {actions}
        </header>

        {/* 内容 */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
