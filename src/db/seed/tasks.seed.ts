import { task, factoryDateChangeLog, inspectionRecord } from "../schema";
import { daysFromToday, daysAgo, type SeedDb } from "./seed-helpers";
import type { TASK_STATUS } from "../types";

/**
 * 创建示例任务（覆盖全部 6 种状态）+ 交期变更记录 + 验货记录。
 * 依赖 contracts.seed 返回的 contractItem 行。
 */
export async function seedTasks(
  db: SeedDb,
  items: { id: number; contractId: number }[],
) {
  // 取几个有代表性的产品做任务示例
  const [itemA, itemB, itemC, itemD] = items;

  const tasks = await db
    .insert(task)
    .values([
      // 待提醒：FACTORY_14D
      {
        taskType: "FACTORY_14D",
        contractId: itemA.contractId,
        contractItemId: itemA.id,
        relatedBusinessDate: daysFromToday(28),
        plannedRemindDate: daysFromToday(14),
        status: "待提醒" as (typeof TASK_STATUS)[keyof typeof TASK_STATUS],
      },
      // 待处理：FACTORY_DUE 到期
      {
        taskType: "FACTORY_DUE",
        contractId: itemA.contractId,
        contractItemId: itemA.id,
        relatedBusinessDate: daysFromToday(28),
        plannedRemindDate: daysFromToday(0),
        status: "待处理",
      },
      // 已完成
      {
        taskType: "FACTORY_7D",
        contractId: itemB.contractId,
        contractItemId: itemB.id,
        relatedBusinessDate: daysFromToday(35),
        plannedRemindDate: daysAgo(10),
        completedAt: daysAgo(10),
        status: "已完成",
      },
      // 暂不完成：postpone 到 3 天后
      {
        taskType: "PAYMENT_CHECK_7D",
        contractId: itemD.contractId,
        contractItemId: itemD.id,
        relatedBusinessDate: daysAgo(45),
        plannedRemindDate: daysAgo(38),
        nextRemindDate: daysFromToday(3),
        status: "暂不完成",
      },
      // 已逾期
      {
        taskType: "PAYMENT_CHECK_14D",
        contractId: itemD.contractId,
        contractItemId: itemD.id,
        relatedBusinessDate: daysAgo(45),
        plannedRemindDate: daysAgo(31),
        status: "已逾期",
      },
      // 无需处理：基准日期变更后被撤销的旧任务
      {
        taskType: "FACTORY_14D",
        contractId: itemC.contractId,
        contractItemId: itemC.id,
        relatedBusinessDate: daysFromToday(21),
        plannedRemindDate: daysAgo(5),
        status: "无需处理",
      },
    ])
    .returning();

  // ---- 交期变更记录（append-only）----
  await db.insert(factoryDateChangeLog).values([
    {
      contractItemId: itemC.id,
      oldDate: daysFromToday(21),
      newDate: daysFromToday(24),
      changeReason: "模具维修，延期 3 天",
      remark: "客户已知晓并接受",
    },
  ]);

  // ---- 验货记录 ----
  await db.insert(inspectionRecord).values([
    {
      contractItemId: itemB.id,
      inspectionDate: daysAgo(20),
      result: "Pass",
    },
    {
      contractItemId: itemC.id,
      inspectionDate: daysAgo(8),
      result: "Fail",
      failReason: "釉面有气泡",
      retestDecision: "重验",
      retestDate: daysFromToday(5),
    },
  ]);

  console.log(
    `  ✓ task: ${tasks.length} 行, factory_date_change_log: 1 行, inspection_record: 2 行`,
  );
  return { tasks };
}
