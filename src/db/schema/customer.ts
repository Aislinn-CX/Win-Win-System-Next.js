import { pgTable, varchar, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

// ============================================================
// 6.3.13 customer — 客户表
// V1 预留（建表但不接业务逻辑），V2 启用。
// 注意：V1 的 contract.customer_name 是字符串，不是 customer.id 的 FK。
//       V2 升级时才新增 customerId 列。
// ============================================================
export const customer = pgTable("customer", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

  name: varchar("name", { length: 200 }).notNull(),

  country: varchar("country", { length: 100 }),

  /** JSON：电话、邮箱、微信等联系方式 */
  contactInfo: jsonb("contact_info"),

  remark: text("remark"),

  // ---- 系统时间 ----
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
