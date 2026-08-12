import {
  pgTable,
  varchar,
  text,
  integer,
  date,
  timestamp,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";
import type {
  PaymentType,
  ContractStatus,
  FactoryStatus,
  InspectionResult,
  ShipmentStatus,
  ItemStatus,
} from "../types";

// ============================================================
// 6.3.1 contract — 合同表
// ============================================================
export const contract = pgTable("contract", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

  contractNo: varchar("contract_no", { length: 50 }).notNull().unique(),

  customerName: varchar("customer_name", { length: 200 }).notNull(),

  customerCountry: varchar("customer_country", { length: 100 }).notNull(),

  /** DP 还是 OA —— 决定 Workflow Engine 走 2.5 还是 2.6 分支 */
  paymentType: varchar("payment_type", { length: 10 })
    .$type<PaymentType>()
    .notNull(),

  /** 只能由 Workflow Engine 在完结判断节点写入，其余任何环节不得直接修改 */
  status: varchar("status", { length: 20 })
    .$type<ContractStatus>()
    .notNull()
    .default("进行中"),

  /** 业务日期：合同实际完结日期 */
  completedAt: date("completed_at"),

  remark: text("remark"),

  // ---- 系统时间 ----
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================================
// 6.3.2 contract_item — 合同产品明细表（全系统事实记录中枢）
// ============================================================
export const contractItem = pgTable("contract_item", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

  contractId: integer("contract_id")
    .notNull()
    .references(() => contract.id, { onDelete: "cascade" }),

  itemNo: varchar("item_no", { length: 50 }).notNull(),

  description: text("description").notNull(),

  orderQty: numeric("order_qty", { precision: 12, scale: 2 }).notNull(),

  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),

  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),

  cbm: numeric("cbm", { precision: 10, scale: 4 }),

  // ---- 工厂交期相关（均为业务日期） ----

  /**
   * 原始工厂交期。
   * 写入后永久不可修改（服务层强制）。
   * 唯一写入入口：订单录入流程（SDD 2.2）。
   */
  originalFactoryDate: date("original_factory_date").notNull(),

  /** 当前有效工厂可交货日期。延期时更新此字段，不碰 original_factory_date */
  currentFactoryDate: date("current_factory_date"),

  /** 实际工厂完成日期 */
  factoryActualDoneDate: date("factory_actual_done_date"),

  factoryStatus: varchar("factory_status", { length: 20 })
    .$type<FactoryStatus>()
    .default("正常"),

  // ---- 验货 ----
  inspectionResult: varchar("inspection_result", { length: 10 })
    .$type<InspectionResult>()
    .default("未验货"),

  // ---- ETD / 出运 ----
  plannedEtd: date("planned_etd"),

  actualEtd: date("actual_etd"),

  /** 系统默认截单日期（ETD-5天） */
  cutoffDefaultDate: date("cutoff_default_date"),

  /** 用户确认的当前有效截单日期 */
  cutoffConfirmedDate: date("cutoff_confirmed_date"),

  bookingStatus: varchar("booking_status", { length: 50 }),

  loadingDate: date("loading_date"),

  docsSentStatus: boolean("docs_sent_status").default(false),

  docsSentDate: date("docs_sent_date"),

  // ---- 收款 ----
  expectedPaymentDate: date("expected_payment_date"),

  actualPaymentDate: date("actual_payment_date"),

  // ---- 电放 ----
  telexReleaseStatus: boolean("telex_release_status").default(false),

  telexReleaseDate: date("telex_release_date"),

  // ---- 状态 ----
  shipmentStatus: varchar("shipment_status", { length: 10 })
    .$type<ShipmentStatus>()
    .default("未出运"),

  /** 每个产品的独立完结状态。全部产品完成才触发 2.8 合同完结流程 */
  itemStatus: varchar("item_status", { length: 10 })
    .$type<ItemStatus>()
    .default("进行中"),

  remark: text("remark"),
});
