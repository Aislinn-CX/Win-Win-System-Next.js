// ============================================================
// 全系统共享的枚举类型定义
// 对应 SDD 第 6 章各表的 ENUM 字段
// Drizzle schema 中用 .$type<>() 引用这些类型获得编译时安全
// ============================================================

// --- contract ---
export type PaymentType = "DP" | "OA";
export type ContractStatus = "进行中" | "待确认完结" | "已完结";

// --- contract_item ---
export type FactoryStatus = "正常" | "工厂交期异常";
export type InspectionResult = "未验货" | "Pass" | "Fail";
export type ShipmentStatus = "未出运" | "已出运";
export type ItemStatus = "进行中" | "已完成";

// --- task ---
export const TASK_TYPE = {
  FACTORY_14D: "FACTORY_14D",
  FACTORY_7D: "FACTORY_7D",
  FACTORY_3D: "FACTORY_3D",
  FACTORY_DUE: "FACTORY_DUE",
  CUTOFF_DOC: "CUTOFF_DOC",
  PAYMENT_CHECK_7D: "PAYMENT_CHECK_7D",
  PAYMENT_CHECK_14D: "PAYMENT_CHECK_14D",
  TELEX_DP: "TELEX_DP",
  TELEX_OA: "TELEX_OA",
  CONTRACT_COMPLETE_CONFIRM: "CONTRACT_COMPLETE_CONFIRM",
} as const;
export type TaskType = (typeof TASK_TYPE)[keyof typeof TASK_TYPE];

export const TASK_STATUS = {
  PENDING_REMIND: "待提醒",
  PENDING_PROCESS: "待处理",
  COMPLETED: "已完成",
  TEMPORARILY_SKIP: "暂不完成",
  OVERDUE: "已逾期",
  NO_NEED: "无需处理",
} as const;
export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

// --- quote ---
export type QuoteStatus = "草稿自查中" | "待用户确认" | "已确认入库";
export type ConfirmStatus = "待确认" | "已确认" | "已拒绝";

// --- inspection ---
export type RetestDecision = "重验" | "不重验";
