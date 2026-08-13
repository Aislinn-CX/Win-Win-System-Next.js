import type { contract, contractItem, task } from "../db";

// ============================================================
// Workflow Engine 内部类型
// ============================================================

/** 规则表上下文：规则判断所需的全部输入 */
export interface RuleContext {
  /** 所属合同 */
  contract: typeof contract.$inferSelect;
  /** 产品明细 */
  item: typeof contractItem.$inferSelect;
  /** 该产品当前已有的任务（用于判断"是否已生成过某任务"） */
  existingTasks: (typeof task.$inferSelect)[];
  /** 今天（"YYYY-MM-DD"） */
  today: string;
}

/** 触发 Workflow Engine 重算的事件（对应 SDD 第 4 章） */
export type WorkflowEvent =
  | "factory_date_changed" // 4.1 工厂交期变更
  | "etd_changed" // 4.2 ETD 录入/修改
  | "payment_date_recorded" // 4.3 客户汇款录入
  | "telex_release_sent" // 4.3 电放发送
  | "inspection_result_changed"; // 4.3 验货结果变更

/** 任务的"活动"状态（可被撤销重建），终态（已完成/无需处理）不在其中 */
export const ACTIVE_TASK_STATUSES = [
  "待提醒",
  "待处理",
  "暂不完成",
  "已逾期",
] as const;
