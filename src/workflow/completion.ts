import { eq, and, inArray } from "drizzle-orm";
import { contract, contractItem, task } from "../db";
import type { Db } from "../db";
import { todayISO } from "./date-calculator";
import { logChange } from "./change-logger";
import { createTask } from "./task-manager";
import { ACTIVE_TASK_STATUSES } from "./types";

// ============================================================
// 2.8 合同完结流程 与 2.9 历史归档流程
// 全部产品 item_status=已完成 → 生成 CONTRACT_COMPLETE_CONFIRM 任务
// 用户 agree → contract.status=已完结（进入归档）；reject → 待确认完结
// ============================================================

/**
 * 检查合同是否满足完结条件（全部产品已完成），若满足则生成完结询问任务。
 * 供 item 完结后调用。返回 { completed, task? }。
 */
export async function checkContractCompletion(db: Db, contractId: number) {
  const items = await db
    .select()
    .from(contractItem)
    .where(eq(contractItem.contractId, contractId));

  const allCompleted =
    items.length > 0 && items.every((i) => i.itemStatus === "已完成");
  if (!allCompleted) return { completed: false as const };

  // 已存在活动的完结确认任务则不再重复生成
  const existing = await db
    .select()
    .from(task)
    .where(
      and(
        eq(task.contractId, contractId),
        eq(task.taskType, "CONTRACT_COMPLETE_CONFIRM"),
        inArray(task.status, [...ACTIVE_TASK_STATUSES]),
      ),
    );

  if (existing.length > 0) {
    return { completed: true as const, alreadyGenerated: true as const };
  }

  // 合同级任务：contractItemId = null
  const created = await createTask(db, {
    taskType: "CONTRACT_COMPLETE_CONFIRM",
    contractId,
    contractItemId: null,
    relatedBusinessDate: null,
    plannedRemindDate: todayISO(),
  });

  return { completed: true as const, task: created };
}

/**
 * 处理合同完结确认（SDD 2.8）。
 * agree → 已完结（completed_at 写入，进入 2.9 归档）
 * reject → 待确认完结（保留在当前跟单列表）
 */
export async function confirmContractCompletion(
  db: Db,
  contractId: number,
  decision: "agree" | "reject",
) {
  // 校验：全部产品已完成才允许完结
  const items = await db
    .select()
    .from(contractItem)
    .where(eq(contractItem.contractId, contractId));
  const allCompleted = items.every((i) => i.itemStatus === "已完成");
  if (!allCompleted) {
    throw new Error("NOT_ALL_ITEMS_COMPLETED");
  }

  const [before] = await db
    .select()
    .from(contract)
    .where(eq(contract.id, contractId))
    .limit(1);

  const status = decision === "agree" ? "已完结" : "待确认完结";
  const completedAt = decision === "agree" ? todayISO() : null;

  const [updated] = await db
    .update(contract)
    .set({ status, completedAt })
    .where(eq(contract.id, contractId))
    .returning();

  await logChange(db, {
    entityType: "contract",
    entityId: contractId,
    fieldName: "status",
    oldValue: before?.status ?? null,
    newValue: status,
  });

  return updated;
}
