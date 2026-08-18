type Tone = "green" | "blue" | "red" | "amber" | "gray";

const TONES: Record<Tone, string> = {
  green:
    "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300",
  red: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400",
  amber:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400",
  gray: "bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_TONES: Record<string, Tone> = {
  // 合同
  进行中: "blue",
  待确认完结: "amber",
  已完结: "green",
  // 任务
  待提醒: "blue",
  待处理: "blue",
  已完成: "green",
  暂不完成: "amber",
  已逾期: "red",
  无需处理: "gray",
  // 验货
  未验货: "gray",
  Pass: "green",
  Fail: "red",
  // 出运
  未出运: "gray",
  已出运: "green",
  // 工厂
  正常: "green",
  工厂交期异常: "red",
  // 报价
  草稿自查中: "blue",
  待用户确认: "amber",
  已确认入库: "green",
};

export default function StatusBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  if (status == null) return null;
  const tone = STATUS_TONES[status] ?? "gray";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}
    >
      {status}
    </span>
  );
}
