// ============================================================
// Date Calculator — 日期计算器（SDD 3.2）
// 职责：按 6.4 规则表计算 planned_remind_date。
// 设计原则（SDD Bug 修正）：业务日期是"日历日"概念，用 "YYYY-MM-DD"
// 字符串做纯日期运算，避免时区偏移导致的跨日问题。
// ============================================================

/**
 * 将 date 列的值（postgres-js 返回 string，也可能传入 Date）规范化为
 * "YYYY-MM-DD" 字符串。返回 null 表示无值。
 */
export function toISODate(v: string | Date | null | undefined): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v.slice(0, 10);
  return v.toISOString().slice(0, 10);
}

/**
 * 在 ISO 日期上加减天数（可为负）。
 * 例：addDays("2026-08-20", -14) → "2026-08-06"
 */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 今天的 "YYYY-MM-DD"（UTC） */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 计算某任务是否逾期。
 * 依据 SDD Bug 修正：是否逾期由「有效提醒日」与当日比较实时得出，不落库。
 * 有效提醒日 = next_remind_date（有值时）?? planned_remind_date。
 */
export function isOverdue(
  effectiveRemindDate: string | null,
  status: string,
): boolean {
  if (status !== "待处理" && status !== "已逾期") return false;
  if (!effectiveRemindDate) return false;
  return effectiveRemindDate < todayISO();
}
