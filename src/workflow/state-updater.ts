import { eq } from "drizzle-orm";
import { contractItem, factoryDateChangeLog } from "../db";
import type { Db } from "../db";
import { logChange } from "./change-logger";
import { toISODate } from "./date-calculator";

// ============================================================
// State Updater — 状态更新器（SDD 3.2）
// 职责：更新 contract / contract_item / task 状态字段，
// 且每次写入同步记录 audit_log（开发规范第 5 条）。
// 不包含业务判断（那是 Node Resolver / Engine 的职责）。
// ============================================================

/**
 * 更新产品明细的单个字段，并写入审计日志。
 * 返回更新后的行。
 */
export async function updateItemField(
  db: Db,
  itemId: number,
  fieldName: string,
  newValue: string | null,
  oldValue: string | null,
  entityType = "contract_item",
) {
  const [updated] = await db
    .update(contractItem)
    .set({ [fieldName]: newValue } as Partial<typeof contractItem.$inferInsert>)
    .where(eq(contractItem.id, itemId))
    .returning();

  await logChange(db, {
    entityType,
    entityId: itemId,
    fieldName,
    oldValue,
    newValue,
  });

  return updated;
}

/**
 * 工厂交期变更（SDD 4.1 Factory Date Changed 事件的核心写入）。
 * 顺序不可颠倒：先写 factory_date_change_log → 再更新 current_factory_date。
 * 注意：绝不触碰 original_factory_date（终身不可变）。
 * old_date 必填（变更记录必然有"变更前"的值）。
 */
export async function changeFactoryDate(
  db: Db,
  itemId: number,
  newDate: string,
  oldDate: string,
  remark: string | null,
) {
  // ① 先追加变更记录（append-only）。SDD Bug 修正：只要求 remark，不强制原因。
  await db.insert(factoryDateChangeLog).values({
    contractItemId: itemId,
    oldDate,
    newDate,
    remark,
  });

  // ② 再更新当前有效交期
  const [updated] = await db
    .update(contractItem)
    .set({ currentFactoryDate: newDate })
    .where(eq(contractItem.id, itemId))
    .returning();

  // ③ 审计
  await logChange(db, {
    entityType: "contract_item",
    entityId: itemId,
    fieldName: "current_factory_date",
    oldValue: oldDate,
    newValue: newDate,
  });

  return updated;
}

/**
 * 录入/修改实际 ETD（SDD 4.2 ETD Changed 事件的核心写入）。
 * 同时将 shipment_status 置为"已出运"。
 */
export async function setActualEtd(db: Db, itemId: number, etd: string) {
  const oldEtd = toISODate(
    (await db.select().from(contractItem).where(eq(contractItem.id, itemId)).limit(1))[0]
      ?.actualEtd,
  );

  const [updated] = await db
    .update(contractItem)
    .set({ actualEtd: etd, shipmentStatus: "已出运" })
    .where(eq(contractItem.id, itemId))
    .returning();

  await logChange(db, {
    entityType: "contract_item",
    entityId: itemId,
    fieldName: "actual_etd",
    oldValue: oldEtd,
    newValue: etd,
  });

  return updated;
}
