import type { TaskType } from "../db";
import { toISODate, addDays } from "./date-calculator";
import type { RuleContext, WorkflowEvent } from "./types";

// ============================================================
// 6.4 任务类型规则表（Rule Table）
// 全系统业务规则的唯一真相来源。
// 新增 task_type 只需在此追加一条规则，不改引擎核心循环。
// ============================================================

export interface TaskRule {
  taskType: TaskType;
  /** 相对基准日期的偏移天数；null 表示无基准日期（合同级任务） */
  offsetDays: number | null;
  /** 解析基准日期（"YYYY-MM-DD"）；返回 null 表示当前不适用 */
  resolveBaseDate: (ctx: RuleContext) => string | null;
  /** 是否应生成该任务 */
  shouldGenerate: (ctx: RuleContext) => boolean;
}

/** 产品是否未完成出运 */
function notShipped(ctx: RuleContext): boolean {
  return ctx.item.shipmentStatus !== "已出运";
}

export const TASK_RULES: TaskRule[] = [
  // ---- 工厂交期前流程（SDD 2.3）----
  {
    taskType: "FACTORY_14D",
    offsetDays: -14,
    resolveBaseDate: (ctx) => toISODate(ctx.item.currentFactoryDate),
    shouldGenerate: (ctx) => notShipped(ctx) && ctx.item.currentFactoryDate != null,
  },
  {
    taskType: "FACTORY_7D",
    offsetDays: -7,
    resolveBaseDate: (ctx) => toISODate(ctx.item.currentFactoryDate),
    shouldGenerate: (ctx) => notShipped(ctx) && ctx.item.currentFactoryDate != null,
  },
  {
    taskType: "FACTORY_3D",
    offsetDays: -3,
    resolveBaseDate: (ctx) => toISODate(ctx.item.currentFactoryDate),
    shouldGenerate: (ctx) => notShipped(ctx) && ctx.item.currentFactoryDate != null,
  },
  {
    taskType: "FACTORY_DUE",
    offsetDays: 0,
    resolveBaseDate: (ctx) => toISODate(ctx.item.currentFactoryDate),
    shouldGenerate: (ctx) => notShipped(ctx) && ctx.item.currentFactoryDate != null,
  },

  // ---- ETD 后续流程（SDD 2.4）----
  {
    taskType: "CUTOFF_DOC",
    offsetDays: 0,
    // 基准 = 用户确认截单日 ?? 系统默认截单日（ETD - 5）
    resolveBaseDate: (ctx) => {
      const etd = toISODate(ctx.item.actualEtd);
      if (!etd) return null;
      const confirmed = toISODate(ctx.item.cutoffConfirmedDate);
      const defaultCutoff = toISODate(ctx.item.cutoffDefaultDate) ?? addDays(etd, -5);
      return confirmed ?? defaultCutoff;
    },
    shouldGenerate: (ctx) => ctx.item.actualEtd != null,
  },
  {
    taskType: "PAYMENT_CHECK_7D",
    offsetDays: 7,
    resolveBaseDate: (ctx) => toISODate(ctx.item.actualEtd),
    shouldGenerate: (ctx) => ctx.item.actualEtd != null,
  },
  {
    taskType: "PAYMENT_CHECK_14D",
    offsetDays: 14,
    resolveBaseDate: (ctx) => toISODate(ctx.item.actualEtd),
    // 触发条件：SDD 2.4「14D 不等待 7D 是否完成，ETD 后照常推进」。
    // 与 7D 一同生成，条件同为"已录入 actual_etd"。
    shouldGenerate: (ctx) => ctx.item.actualEtd != null,
  },

  // ---- 收款电放流程（SDD 2.5 / 2.6）----
  {
    taskType: "TELEX_DP",
    offsetDays: 2,
    resolveBaseDate: (ctx) => toISODate(ctx.item.actualPaymentDate),
    // 仅 DP 且已录入汇款日期（SDD Bug 修正：由 actual_payment_date 触发，非 ETD）
    shouldGenerate: (ctx) =>
      ctx.contract.paymentType === "DP" && ctx.item.actualPaymentDate != null,
  },
  {
    taskType: "TELEX_OA",
    offsetDays: 7,
    resolveBaseDate: (ctx) => toISODate(ctx.item.actualEtd),
    shouldGenerate: (ctx) =>
      ctx.contract.paymentType === "OA" && ctx.item.actualEtd != null,
  },
];

/**
 * 事件 → 需重算的 task_type 映射（对应 SDD 第 4 章 Event Flow）。
 * 关键（SDD Bug 修正）：etd_changed 不重算 DP 的 TELEX_DP；
 * TELEX_DP 只由 payment_date_recorded 触发。
 */
export const EVENT_RULES: Record<WorkflowEvent, TaskType[]> = {
  factory_date_changed: ["FACTORY_14D", "FACTORY_7D", "FACTORY_3D", "FACTORY_DUE"],
  etd_changed: ["CUTOFF_DOC", "PAYMENT_CHECK_7D", "PAYMENT_CHECK_14D", "TELEX_OA"],
  payment_date_recorded: ["TELEX_DP"],
  telex_release_sent: [],
  inspection_result_changed: [],
};
