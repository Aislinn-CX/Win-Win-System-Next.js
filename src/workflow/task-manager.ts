import { eq, inArray, and } from "drizzle-orm";
import { task } from "../db";
import type { Db, TaskType } from "../db";
import { ACTIVE_TASK_STATUSES } from "./types";

// ============================================================
// Task Manager — 任务管理器（SDD 3.2）
// 职责：增/改 task。核心铁律：永不物理 DELETE，撤销一律标记"无需处理"。
// ============================================================

export interface CreateTaskInput {
  taskType: TaskType;
  contractId: number;
  /** 产品级任务必填；合同级任务为 null */
  contractItemId: number | null;
  /** 任务依据的业务日期（业务日期 ≠ 提醒日期） */
  relatedBusinessDate: string | null;
  /** 由 Date Calculator 计算出的原始计划提醒日，写入后终身不变 */
  plannedRemindDate: string;
  mergeGroupKey?: string;
}

/** 创建任务。planned_remind_date 在此唯一写入，之后永不再改。 */
export async function createTask(db: Db, input: CreateTaskInput) {
  const [row] = await db
    .insert(task)
    .values({
      taskType: input.taskType,
      contractId: input.contractId,
      contractItemId: input.contractItemId,
      relatedBusinessDate: input.relatedBusinessDate,
      plannedRemindDate: input.plannedRemindDate,
      status: "待提醒",
      mergeGroupKey: input.mergeGroupKey ?? null,
    })
    .returning();
  return row;
}

/**
 * 撤销（标记"无需处理"）指定产品的某些类型任务。
 * 只撤销"活动"状态（待提醒/待处理/暂不完成/已逾期）的任务；
 * 已完成/无需处理 的任务不动。
 */
export async function cancelActiveTasks(
  db: Db,
  contractItemId: number,
  taskTypes: TaskType[],
) {
  if (taskTypes.length === 0) return [];

  const rows = await db
    .update(task)
    .set({ status: "无需处理" })
    .where(
      and(
        eq(task.contractItemId, contractItemId),
        inArray(task.taskType, taskTypes),
        inArray(task.status, [...ACTIVE_TASK_STATUSES]),
      ),
    )
    .returning();

  return rows;
}

/**
 * 查询某产品的"活动"任务（未被撤销、未完成）。
 * 供 StateReader / 去重判断使用。
 */
export async function findActiveTasks(db: Db, contractItemId: number) {
  return db
    .select()
    .from(task)
    .where(
      and(
        eq(task.contractItemId, contractItemId),
        inArray(task.status, [...ACTIVE_TASK_STATUSES]),
      ),
    );
}
