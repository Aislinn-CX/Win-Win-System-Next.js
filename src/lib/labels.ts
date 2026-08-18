import type { TaskType } from "@/db";

// ============================================================
// 枚举 → 中文展示标签（纯展示，无业务规则）
// ============================================================

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  FACTORY_14D: "交期前 14 天提醒",
  FACTORY_7D: "交期前 7 天提醒",
  FACTORY_3D: "交期前 3 天提醒",
  FACTORY_DUE: "工厂交期到期",
  CUTOFF_DOC: "截单文件",
  PAYMENT_CHECK_7D: "收款检查（ETD+7）",
  PAYMENT_CHECK_14D: "收款检查（ETD+14）",
  TELEX_DP: "DP 电放",
  TELEX_OA: "OA 电放",
  CONTRACT_COMPLETE_CONFIRM: "合同完结确认",
};

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  DP: "DP（付款交单）",
  OA: "OA（赊销）",
};

export function taskTypeLabel(taskType: string): string {
  return TASK_TYPE_LABELS[taskType as TaskType] ?? taskType;
}
