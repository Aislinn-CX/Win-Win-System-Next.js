import { pgTable, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";

// ============================================================
// 6.3.7 audit_log — 审计日志表
// 记录所有状态变更，是多人/多 AI 协同开发排查问题的唯一依据。
// 核心约束：
//   - entity_id 为逻辑关联，不建 FK（SDD Bug 修正）
//   - 永久保留，不因合同归档而清理
// ============================================================
export const auditLog = pgTable("audit_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

  /** 被修改实体类型：contract / contract_item / task / quote 等 */
  entityType: varchar("entity_type", { length: 50 }).notNull(),

  /**
   * 被修改实体的主键。
   * 逻辑关联，不建外键约束——即使实体被删除，日志也必须保留。
   */
  entityId: integer("entity_id").notNull(),

  /** 被修改的字段名 */
  fieldName: varchar("field_name", { length: 100 }).notNull(),

  oldValue: text("old_value"),

  newValue: text("new_value"),

  /** 操作来源：用户 / Workflow Engine 自动 / AI建议确认 */
  changedBy: varchar("changed_by", { length: 100 }).notNull().default("system"),

  // ---- 系统时间 ----
  changedAt: timestamp("changed_at").notNull().defaultNow(),
});
