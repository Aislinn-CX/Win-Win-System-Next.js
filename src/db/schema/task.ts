import {
  pgTable,
  varchar,
  text,
  integer,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { contract } from "./contract";
import { contractItem } from "./contract";
import type { TaskType, TaskStatus } from "../types";

// ============================================================
// 6.3.5 task — 任务表
// 全系统唯一的提醒/待办容器。
// 核心约束（服务层强制）：
//   1. 永不物理 DELETE → status 改为 "无需处理"
//   2. planned_remind_date 由 Workflow Engine 写入，终身不变
//   3. next_remind_date 由用户 postpone 写入，可覆盖
//   4. contractItemId：产品级任务必填，合同级任务为 NULL
// ============================================================
export const task = pgTable("task", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

  /** 任务类型，对应 SDD 6.4 规则表 */
  taskType: varchar("task_type", { length: 50 }).$type<TaskType>().notNull(),

  contractId: integer("contract_id")
    .notNull()
    .references(() => contract.id, { onDelete: "cascade" }),

  /**
   * 关联产品明细。
   * - 产品级任务（FACTORY_*, CUTOFF_DOC, PAYMENT_CHECK_*, TELEX_*）：必填
   * - 合同级任务（CONTRACT_COMPLETE_CONFIRM）：必须为 NULL
   */
  contractItemId: integer("contract_item_id").references(() => contractItem.id, {
    onDelete: "cascade",
  }),

  // ---- 业务日期 ----

  /**
   * 该任务依据的业务日期。
   * 例如 FACTORY_14D 的基准是 current_factory_date。
   * 业务日期 ≠ 提醒日期。
   */
  relatedBusinessDate: date("related_business_date"),

  /**
   * Workflow Engine 按 6.4 规则表计算的"原始计划提醒日"。
   * 终身不变——即使被 postpone 多次也不修改。
   * 用于追溯"最初计划哪天提醒"。
   */
  plannedRemindDate: date("planned_remind_date"),

  /**
   * 用户选择"暂不完成"时填写的下一次提醒日。
   * 每次 postpone 覆盖为本轮新值。
   * 仅在 status = "暂不完成" 时有值，其余状态为 NULL。
   */
  nextRemindDate: date("next_remind_date"),

  /** 业务日期：任务完成日期 */
  completedAt: date("completed_at"),

  status: varchar("status", { length: 20 })
    .$type<TaskStatus>()
    .notNull()
    .default("待提醒"),

  remark: text("remark"),

  /** 合并同类任务的分组键（如按合同+产品+task_type 合并为同一提醒） */
  mergeGroupKey: varchar("merge_group_key", { length: 200 }),

  // ---- 系统时间 ----
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
