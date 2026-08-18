import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { contract, contractItem } from "../db";
import { logChange } from "./change-logger";
import { checkContractCompletion } from "./completion";
import { recomputeItemReminders } from "./engine";

// ============================================================
// 2.5 DP 收款流程 与 2.6 OA 收款流程
// SDD 要求：DP/OA 是两套独立节点序列，不共用一套 if 分支，
// 避免后续维护相互污染。故分别实现，由 recordPayment 按 payment_type 分派。
//
// DP：出运 → 收款 → 电放（TELEX_DP 在收款后生成）
// OA：出运 → 电放 → 收款（收款后检查电放已完成则 item 完结）
// ============================================================

/** 读取产品的付款性质（DP/OA） */
async function resolvePaymentType(db: Db, contractItemId: number) {
  const item = await db
    .select()
    .from(contractItem)
    .where(eq(contractItem.id, contractItemId))
    .limit(1);
  if (item.length === 0)
    throw new Error(`contract_item ${contractItemId} 不存在`);

  const c = await db
    .select()
    .from(contract)
    .where(eq(contract.id, item[0].contractId))
    .limit(1);

  return { item: item[0], contract: c[0] };
}

/**
 * 录入客户汇款日期。按付款性质分派到 DP 或 OA 独立流程。
 */
export async function recordPayment(
  db: Db,
  contractItemId: number,
  paymentDate: string,
) {
  const { contract } = await resolvePaymentType(db, contractItemId);

  if (contract.paymentType === "DP") {
    return recordDpPayment(db, contractItemId, paymentDate);
  }
  return recordOaPayment(db, contractItemId, paymentDate);
}

/**
 * DP 收款流程（2.5）：出运 → 收款 → 电放。
 * 录入汇款后生成 TELEX_DP 任务（基准 = 汇款日 + 2 天）。
 */
export async function recordDpPayment(
  db: Db,
  contractItemId: number,
  paymentDate: string,
) {
  await updatePaymentDate(db, contractItemId, paymentDate);

  // 生成 TELEX_DP（EVENT_RULES.payment_date_recorded = ["TELEX_DP"]）
  const { created } = await recomputeItemReminders(
    db,
    contractItemId,
    "payment_date_recorded",
  );

  return { telexTasks: created };
}

/**
 * OA 收款流程（2.6）：出运 → 电放 → 收款。
 * 录入汇款后，若电放已完成，则该产品 item_status = 已完成。
 */
export async function recordOaPayment(
  db: Db,
  contractItemId: number,
  paymentDate: string,
) {
  const updated = await updatePaymentDate(db, contractItemId, paymentDate);

  // 电放已完成 → 该产品完结
  if (updated.telexReleaseStatus) {
    await db
      .update(contractItem)
      .set({ itemStatus: "已完成" })
      .where(eq(contractItem.id, contractItemId));
    await logChange(db, {
      entityType: "contract_item",
      entityId: contractItemId,
      fieldName: "item_status",
      oldValue: "进行中",
      newValue: "已完成",
    });

    // 产品完结后，检查合同是否满足完结条件 → 生成 CONTRACT_COMPLETE_CONFIRM
    await checkContractCompletion(db, updated.contractId);
  }

  return { itemStatus: updated.telexReleaseStatus ? "已完成" : "进行中" };
}

/** 更新实际汇款日期并记录日志 */
async function updatePaymentDate(
  db: Db,
  contractItemId: number,
  paymentDate: string,
) {
  const [before] = await db
    .select()
    .from(contractItem)
    .where(eq(contractItem.id, contractItemId))
    .limit(1);

  const [updated] = await db
    .update(contractItem)
    .set({ actualPaymentDate: paymentDate })
    .where(eq(contractItem.id, contractItemId))
    .returning();

  await logChange(db, {
    entityType: "contract_item",
    entityId: contractItemId,
    fieldName: "actual_payment_date",
    oldValue: before?.actualPaymentDate ?? null,
    newValue: paymentDate,
  });

  return updated;
}
