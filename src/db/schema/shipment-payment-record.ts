import { pgTable, varchar, text, integer, date } from "drizzle-orm/pg-core";
import { contractItem } from "./contract";

// ============================================================
// 6.3.6 shipment_payment_record — 出运收款电放记录表
// V1 预留（建表但不写入），V2 数据报表模块启用。
// ============================================================
export const shipmentPaymentRecord = pgTable("shipment_payment_record", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

  contractItemId: integer("contract_item_id")
    .notNull()
    .references(() => contractItem.id, { onDelete: "cascade" }),

  /** 事件类型：议付资料发送 / 客户汇款 / 电放件发送 */
  eventType: varchar("event_type", { length: 50 }).notNull(),

  /** 业务日期：事件发生日期 */
  eventDate: date("event_date").notNull(),

  remark: text("remark"),
});
