import {
  pgTable,
  varchar,
  text,
  integer,
  numeric,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import type { QuoteStatus, ConfirmStatus } from "../types";

// ============================================================
// 6.3.8 quote — 报价单表
// ============================================================
export const quote = pgTable("quote", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

  quoteNo: varchar("quote_no", { length: 50 }).notNull().unique(),

  customerName: varchar("customer_name", { length: 200 }).notNull(),

  /** 对应 SDD 2.1 报价单检查流程状态机 */
  status: varchar("status", { length: 20 })
    .$type<QuoteStatus>()
    .notNull()
    .default("草稿自查中"),

  remark: text("remark"),

  // ---- 系统时间 ----
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================================
// 6.3.9 quote_item — 报价单产品明细表
// ============================================================
export const quoteItem = pgTable("quote_item", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

  quoteId: integer("quote_id")
    .notNull()
    .references(() => quote.id, { onDelete: "cascade" }),

  itemNo: varchar("item_no", { length: 50 }).notNull(),

  descriptionCn: text("description_cn").notNull(),

  /** 用户确认后的正式英文描述（只能由用户确认动作写入） */
  descriptionEnConfirmed: text("description_en_confirmed"),

  // ---- 自查所需的尺寸/重量/体积字段 ----
  length: numeric("length", { precision: 10, scale: 3 }),
  width: numeric("width", { precision: 10, scale: 3 }),
  height: numeric("height", { precision: 10, scale: 3 }),
  netWeight: numeric("net_weight", { precision: 10, scale: 3 }),
  grossWeight: numeric("gross_weight", { precision: 10, scale: 3 }),
  cbm: numeric("cbm", { precision: 10, scale: 4 }),

  /**
   * 自查标记，由 Quotation Checker（纯规则引擎）写入。
   * 存数组，如 ["体积需核对", "重量逻辑错误"]
   */
  checkFlags: jsonb("check_flags").$type<string[]>(),
});

// ============================================================
// 6.3.10 quote_en_desc_suggestion — AI 英文描述建议表（暂存区）
// ============================================================
export const quoteEnDescSuggestion = pgTable("quote_en_desc_suggestion", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

  quoteItemId: integer("quote_item_id")
    .notNull()
    .references(() => quoteItem.id, { onDelete: "cascade" }),

  suggestedText: text("suggested_text").notNull(),

  /** 生成依据（如"参考历史同类产品表达"） */
  generationBasis: text("generation_basis"),

  confirmStatus: varchar("confirm_status", { length: 10 })
    .$type<ConfirmStatus>()
    .notNull()
    .default("待确认"),

  // ---- 系统时间 ----
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================================
// 6.3.11 quote_image_candidate — 商品检索候选表（暂存区）
// ============================================================
export const quoteImageCandidate = pgTable("quote_image_candidate", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

  quoteItemId: integer("quote_item_id")
    .notNull()
    .references(() => quoteItem.id, { onDelete: "cascade" }),

  imageUrl: text("image_url").notNull(),

  source: varchar("source", { length: 200 }).notNull(),

  confirmStatus: varchar("confirm_status", { length: 10 })
    .$type<ConfirmStatus>()
    .notNull()
    .default("待确认"),

  // ---- 系统时间 ----
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================================
// 6.3.12 quote_feedback_log — 历史报价反馈日志表
// ============================================================
export const quoteFeedbackLog = pgTable("quote_feedback_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

  quoteId: integer("quote_id")
    .notNull()
    .references(() => quote.id, { onDelete: "cascade" }),

  feedbackNote: text("feedback_note").notNull(),

  // ---- 系统时间 ----
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
