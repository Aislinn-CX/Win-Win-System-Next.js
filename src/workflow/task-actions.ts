import { eq, inArray } from "drizzle-orm";
import type { Db, TaskStatus } from "../db";
import { contractItem, task } from "../db";
import { logChange } from "./change-logger";
import { checkContractCompletion } from "./completion";
import { todayISO, toISODate } from "./date-calculator";
import { ACTIVE_TASK_STATUSES } from "./types";

// ============================================================
// 5.2 Reminder / Task 状态机
// 处理用户对任务的两个操作：完成（complete）与 延期（postpone）。
// 核心规则（SDD 8.2.4）：
//   - complete 必填 completed_at
//   - postpone 必填 next_remind_date，缺则强制拒绝
//   - 已完成任务可修改 completed_at，但不重新触发业务流程
// ============================================================

/** 可被"完成"的状态（终态 已完成/无需处理 不可再完成） */
const COMPLETABLE_STATUSES = ["待处理", "已逾期"] as const;

/**
 * 每日扫描（SDD 3.2 T3 定时任务）：根据日期推进任务状态。
 * - 待提醒 → 待处理：到达 planned_remind_date
 * - 待处理 → 已逾期：超过 planned_remind_date 未处理
 * - 暂不完成 → 待处理：到达 next_remind_date
 * 有效提醒日 = next_remind_date（有值时）?? planned_remind_date。
 */
export async function refreshTaskStatuses(db: Db) {
  const today = todayISO();
  const active = await db
    .select()
    .from(task)
    .where(inArray(task.status, [...ACTIVE_TASK_STATUSES]));

  let changed = 0;
  for (const t of active) {
    const effective =
      toISODate(t.nextRemindDate) ?? toISODate(t.plannedRemindDate);
    if (!effective) continue;

    let nextStatus: TaskStatus | null = null;
    if (t.status === "待提醒" && effective <= today) {
      nextStatus = "待处理";
    } else if (t.status === "待处理" && effective < today) {
      nextStatus = "已逾期";
    } else if (t.status === "暂不完成" && effective <= today) {
      nextStatus = "待处理";
    }

    if (nextStatus) {
      await db
        .update(task)
        .set({ status: nextStatus })
        .where(eq(task.id, t.id));
      changed++;
    }
  }

  return { changed };
}

/** 完成任务。返回更新后的 task。 */
export async function completeTask(
  db: Db,
  taskId: number,
  completedAt?: string,
) {
  const rows = await db.select().from(task).where(eq(task.id, taskId)).limit(1);
  if (rows.length === 0) throw new Error(`task ${taskId} 不存在`);

  const current = rows[0];
  if (
    !COMPLETABLE_STATUSES.includes(
      current.status as (typeof COMPLETABLE_STATUSES)[number],
    )
  ) {
    throw new Error(`task ${taskId} 当前状态为「${current.status}」，不可完成`);
  }

  const completedDate = completedAt ?? todayISO();

  const [updated] = await db
    .update(task)
    .set({ status: "已完成", completedAt: completedDate })
    .where(eq(task.id, taskId))
    .returning();

  await logChange(db, {
    entityType: "task",
    entityId: taskId,
    fieldName: "status",
    oldValue: current.status,
    newValue: "已完成",
  });

  // 类型相关的副作用（如 TELEX_* 完成 → 电放状态置真）
  await applyCompletionSideEffects(
    db,
    current.taskType,
    current.contractId,
    current.contractItemId,
    completedDate,
  );

  return updated;
}

/**
 * 延期（暂不完成）。next_remind_date 必填，否则拒绝（SDD 硬性规则）。
 */
export async function postponeTask(
  db: Db,
  taskId: number,
  nextRemindDate: string,
) {
  if (!nextRemindDate) {
    throw new Error("postpone 必须填写 next_remind_date");
  }

  const rows = await db.select().from(task).where(eq(task.id, taskId)).limit(1);
  if (rows.length === 0) throw new Error(`task ${taskId} 不存在`);

  const current = rows[0];
  const [updated] = await db
    .update(task)
    .set({ status: "暂不完成", nextRemindDate })
    .where(eq(task.id, taskId))
    .returning();

  await logChange(db, {
    entityType: "task",
    entityId: taskId,
    fieldName: "status",
    oldValue: current.status,
    newValue: "暂不完成",
  });

  return updated;
}

/**
 * 修改已完成任务的 completed_at（SDD Bug 修正：允许改，但不重新触发流程）。
 */
export async function updateCompletedAt(
  db: Db,
  taskId: number,
  completedAt: string,
) {
  const rows = await db.select().from(task).where(eq(task.id, taskId)).limit(1);
  if (rows.length === 0) throw new Error(`task ${taskId} 不存在`);
  if (rows[0].status !== "已完成") {
    throw new Error(`task ${taskId} 非「已完成」状态，不能修改 completed_at`);
  }

  const [updated] = await db
    .update(task)
    .set({ completedAt })
    .where(eq(task.id, taskId))
    .returning();

  await logChange(db, {
    entityType: "task",
    entityId: taskId,
    fieldName: "completed_at",
    oldValue: toISODate(rows[0].completedAt),
    newValue: completedAt,
  });

  return updated;
}

/**
 * 任务完成后的类型相关副作用。
 * DP：电放是最后一步 → telex_release 置真 + item_status=已完成（SDD 2.5）
 * OA：电放在收款前 → 仅 telex_release 置真，item 完结等收款（SDD 2.6）
 */
async function applyCompletionSideEffects(
  db: Db,
  taskType: string,
  contractId: number,
  contractItemId: number | null,
  completedDate: string,
) {
  if (!contractItemId) return;

  if (taskType === "TELEX_DP") {
    // DP：收款已录入，电放完成即产品完结
    await db
      .update(contractItem)
      .set({
        telexReleaseStatus: true,
        telexReleaseDate: completedDate,
        itemStatus: "已完成",
      })
      .where(eq(contractItem.id, contractItemId));

    await logChange(db, {
      entityType: "contract_item",
      entityId: contractItemId,
      fieldName: "telex_release_status",
      oldValue: "false",
      newValue: "true",
    });
    await logChange(db, {
      entityType: "contract_item",
      entityId: contractItemId,
      fieldName: "item_status",
      oldValue: "进行中",
      newValue: "已完成",
    });

    // 产品完结后，检查合同是否满足完结条件 → 生成 CONTRACT_COMPLETE_CONFIRM
    await checkContractCompletion(db, contractId);
  } else if (taskType === "TELEX_OA") {
    // OA：仅电放置真，item 完结等收款
    await db
      .update(contractItem)
      .set({ telexReleaseStatus: true, telexReleaseDate: completedDate })
      .where(eq(contractItem.id, contractItemId));

    await logChange(db, {
      entityType: "contract_item",
      entityId: contractItemId,
      fieldName: "telex_release_status",
      oldValue: "false",
      newValue: "true",
    });
  }
}
