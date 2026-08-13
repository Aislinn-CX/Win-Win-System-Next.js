import { pgTable, varchar, text, integer, date, timestamp } from "drizzle-orm/pg-core";
import { contractItem } from "./contract";
import type { InspectionResult, RetestDecision } from "../types";

// ============================================================
// 6.3.4 inspection_record — 验货记录表
// 一个产品可有多条记录，支持多轮重验
// ============================================================
export const inspectionRecord = pgTable("inspection_record", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

  contractItemId: integer("contract_item_id")
    .notNull()
    .references(() => contractItem.id, { onDelete: "cascade" }),

  /** 业务日期：验货日期 */
  inspectionDate: date("inspection_date").notNull(),

  result: varchar("result", { length: 10 })
    .$type<InspectionResult>()
    .notNull(),

  /** Fail 时必填（服务层校验） */
  failReason: text("fail_reason"),

  /** Fail 时必填：是否重验 */
  retestDecision: varchar("retest_decision", { length: 10 })
    .$type<RetestDecision>(),

  /** 业务日期：重验日期（选重验时必填） */
  retestDate: date("retest_date"),

  /** 不重验时的处理方式（选不重验时必填） */
  handlingMethod: text("handling_method"),

  // ---- 系统时间 ----
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
