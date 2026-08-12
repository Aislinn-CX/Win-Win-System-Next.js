interface StatCardProps {
  title: string;
  value: string | number;
  /** 左侧 accent 条颜色 */
  accent?: "blue" | "green" | "purple" | "orange";
  /** 辅助说明，如 "较上月 +12%" */
  subtitle?: string;
}

const accentBorder: Record<string, string> = {
  blue: "border-l-blue-500",
  green: "border-l-green-500",
  purple: "border-l-purple-500",
  orange: "border-l-orange-500",
};

export default function StatCard({
  title,
  value,
  accent = "blue",
  subtitle,
}: StatCardProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm
        border-l-4 transition-shadow hover:shadow-md
        dark:border-gray-700 dark:bg-gray-900 ${accentBorder[accent]}`}
    >
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
      {subtitle && (
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}
