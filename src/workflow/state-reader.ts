import { eq } from "drizzle-orm";
import { contract, contractItem, task } from "../db";
import type { Db } from "../db";

// ============================================================
// State Reader — 状态读取器（SDD 3.2）
// 职责：读取 contract、contract_item、task 的当前业务字段，
// 供 Node Resolver 判断当前节点。只读，不做任何业务判断。
// ============================================================

/** 读取单个产品明细（含其所属合同） */
export async function readItemWithContract(db: Db, contractItemId: number) {
  const item = await db
    .select()
    .from(contractItem)
    .where(eq(contractItem.id, contractItemId))
    .limit(1);

  if (item.length === 0) return null;

  const c = await db
    .select()
    .from(contract)
    .where(eq(contract.id, item[0].contractId))
    .limit(1);

  return {
    item: item[0],
    contract: c[0] ?? null,
  };
}

/** 读取某产品的全部任务（含终态，用于完整跟单轨迹） */
export async function readItemTasks(db: Db, contractItemId: number) {
  return db
    .select()
    .from(task)
    .where(eq(task.contractItemId, contractItemId));
}

/** 读取合同下全部产品明细 */
export async function readContractItems(db: Db, contractId: number) {
  return db
    .select()
    .from(contractItem)
    .where(eq(contractItem.contractId, contractId));
}
