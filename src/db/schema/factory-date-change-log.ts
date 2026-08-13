import { pgTable, varchar, text, integer, date, timestamp } from "drizzle-orm/pg-core";
import { contractItem } from "./contract";

// ============================================================
// 6.3.3 factory_date_change_log — 工厂交期变更记录表
// Append-only：只允许 INSERT，禁止 UPDATE / DELETE（服务层强制）
// ============================================================
export const factoryDateChangeLog = pgTable("factory_date_change_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

  contractItemId: integer("contract_item_id")
    .notNull()
    .references(() => contractItem.id, { onDelete: "cascade" }),

  /** 业务日期：变更前的交期 */
  oldDate: date("old_date").notNull(),

  /** 业务日期：变更后的交期 */
  newDate: date("new_date").notNull(),

  /** 延期原因（SDD Bug 修正：只要求 remark，不强制填写原因——但此字段仍保留用于业务追溯） */
  changeReason: varchar("change_reason", { length: 500 }),

  remark: text("remark"),

  // ---- 系统时间 ----
  changedAt: timestamp("changed_at").notNull().defaultNow(),
});
