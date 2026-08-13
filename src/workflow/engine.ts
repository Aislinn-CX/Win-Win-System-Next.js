import { readItemWithContract, readItemTasks } from "./state-reader";
import { changeFactoryDate, setActualEtd } from "./state-updater";
import { cancelActiveTasks, createTask } from "./task-manager";
import { EVENT_RULES, TASK_RULES } from "./rules";
import { addDays, todayISO, toISODate } from "./date-calculator";
import type { Db, TaskType } from "../db";
import type { RuleContext, WorkflowEvent } from "./types";

// ============================================================
// Workflow Engine — 引擎编排器（SDD 3.1 / 3.2）
// 全系统唯一业务规则中枢。前端/API 不写业务规则，一律调用本模块。
// ============================================================

export interface RecomputeOptions {
  /**
   * 是否跳过"已有已完成任务"的类型（不重新生成）。
   * - factory_date_changed: true（SDD 2.3：已完成任务保留不动、不重复生成）
   * - etd_changed: false（SDD 2.4：已完成或暂不完成均照常推进）
   */
  skipCompleted?: boolean;
}

/**
 * 核心重算循环：
 *   读取状态 → 按事件确定需重算的 task_type → 判断规则 → 计算日期
 *   → 先撤销活动旧任务 → 再生成新任务。
 * 返回 { cancelled, created }。
 */
export async function recomputeItemReminders(
  db: Db,
  contractItemId: number,
  event: WorkflowEvent,
  options: RecomputeOptions = {},
) {
  const { skipCompleted = false } = options;

  // 1. 读取状态
  const result = await readItemWithContract(db, contractItemId);
  if (!result || !result.contract) {
    throw new Error(`contract_item ${contractItemId} 不存在或其合同缺失`);
  }
  const { item, contract } = result;
  const existingTasks = await readItemTasks(db, contractItemId);

  const ctx: RuleContext = {
    contract,
    item,
    existingTasks,
    today: todayISO(),
  };

  // 2. 该事件需重算的 task_type
  const taskTypes = EVENT_RULES[event];
  if (taskTypes.length === 0) {
    return { cancelled: [], created: [] };
  }

  // 3. 筛选适用的规则
  const applicable = TASK_RULES.filter(
    (rule) =>
      taskTypes.includes(rule.taskType) &&
      rule.shouldGenerate(ctx) &&
      rule.resolveBaseDate(ctx) != null,
  );

  // 4. 计算每条规则的目标任务（type + planned_remind_date）
  const planned: { taskType: TaskType; plannedDate: string; baseDate: string }[] = [];
  for (const rule of applicable) {
    // skipCompleted 且已有该类型已完成任务 → 不重新生成
    if (skipCompleted && hasCompleted(ctx, rule.taskType)) continue;

    const baseDate = rule.resolveBaseDate(ctx)!;
    const plannedDate =
      rule.offsetDays == null ? baseDate : addDays(baseDate, rule.offsetDays);
    planned.push({ taskType: rule.taskType, plannedDate, baseDate });
  }

  // 5. 先撤销活动旧任务（永不物理删除）
  const cancelled = await cancelActiveTasks(db, contractItemId, taskTypes);

  // 6. 再生成新任务
  const created = [];
  for (const p of planned) {
    const row = await createTask(db, {
      taskType: p.taskType,
      contractId: contract.id,
      contractItemId,
      relatedBusinessDate: p.baseDate,
      plannedRemindDate: p.plannedDate,
      mergeGroupKey: `${contract.id}-${contractItemId}-${p.taskType}`,
    });
    created.push(row);
  }

  return { cancelled, created };
}

function hasCompleted(ctx: RuleContext, taskType: TaskType): boolean {
  return ctx.existingTasks.some(
    (t) => t.taskType === taskType && t.status === "已完成",
  );
}

/**
 * 处理「工厂交期变更」事件（SDD 4.1）。
 * 顺序：写变更记录 → 更新 current_factory_date → 重算工厂交期相关提醒。
 */
export async function handleFactoryDateChanged(
  db: Db,
  contractItemId: number,
  newDate: string,
  remark: string | null,
) {
  const result = await readItemWithContract(db, contractItemId);
  if (!result) throw new Error(`contract_item ${contractItemId} 不存在`);

  const oldDate = toISODate(result.item.currentFactoryDate);
  if (!oldDate) {
    throw new Error(
      `contract_item ${contractItemId} 的 current_factory_date 为空，无法变更交期`,
    );
  }
  await changeFactoryDate(db, contractItemId, newDate, oldDate, remark);

  const { cancelled, created } = await recomputeItemReminders(
    db,
    contractItemId,
    "factory_date_changed",
    { skipCompleted: true },
  );

  return { updatedItem: result.item, cancelled, created };
}

/**
 * 处理「ETD 录入/修改」事件（SDD 4.2）。
 * 顺序：更新 actual_etd + 置已出运 → 重算截单/收款/电放(OA)相关提醒。
 * 注意：不重算 DP 的 TELEX_DP（由 payment_date_recorded 触发）。
 */
export async function handleEtdChanged(
  db: Db,
  contractItemId: number,
  etd: string,
) {
  await setActualEtd(db, contractItemId, etd);

  const { cancelled, created } = await recomputeItemReminders(
    db,
    contractItemId,
    "etd_changed",
    { skipCompleted: false },
  );

  return { cancelled, created };
}
