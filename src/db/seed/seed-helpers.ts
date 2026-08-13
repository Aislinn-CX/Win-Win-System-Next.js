import type { createConnection } from "../connection";

/** 各 seeder 统一使用的数据库实例类型 */
export type SeedDb = ReturnType<typeof createConnection>;

/**
 * 种子数据共享工具。
 * 注意：业务日期（date 列）返回 "YYYY-MM-DD" 字符串；
 * 系统时间（timestamp 列）交由 schema 的 defaultNow() 处理，种子不手动赋值。
 */

/** 返回 n 天后的日期字符串（YYYY-MM-DD） */
export function daysFromToday(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** 返回 n 天前的日期字符串（YYYY-MM-DD） */
export function daysAgo(n: number): string {
  return daysFromToday(-n);
}

/** 将 Date 格式化为 YYYY-MM-DD */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 从数组中随机取一项 */
export function randomPick<T>(arr: readonly T[]): T {
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx];
}
