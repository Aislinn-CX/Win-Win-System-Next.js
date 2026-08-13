import { eq } from "drizzle-orm";
import { inspectionRecord, contractItem } from "../db";
import type { Db } from "../db";
import { logChange } from "./change-logger";

// ============================================================
// 2.7 验货流程
// 创建 inspection_record → 同步 contract_item.inspection_result。
// Pass → 进入出运流程；Fail → 必填 fail_reason + 重验决策。
// ============================================================

export interface InspectionInput {
  inspectionDate: string;
  result: "Pass" | "Fail";
  /** Fail 时必填 */
  failReason?: string | null;
  /** Fail 时必填 */
  retestDecision?: "重验" | "不重验" | null;
  /** 选重验时必填 */
  retestDate?: string | null;
  /** 选不重验时必填 */
  handlingMethod?: string | null;
}

/**
 * 提交验货结果。
 * 校验必填字段，写入 inspection_record，同步 inspection_result。
 */
export async function handleInspectionResult(
  db: Db,
  contractItemId: number,
  input: InspectionInput,
) {
  // 校验（对应 SDD 8.2.5 异常返回）
  if (input.result === "Fail") {
    if (!input.failReason) throw new Error("MISSING_FAIL_REASON");
    if (!input.retestDecision) throw new Error("MISSING_RETEST_DECISION");
    if (input.retestDecision === "重验" && !input.retestDate) {
      throw new Error("MISSING_RETEST_DATE");
    }
    if (input.retestDecision === "不重验" && !input.handlingMethod) {
      throw new Error("MISSING_HANDLING_METHOD");
    }
  }

  // ① 写入验货记录
  const [record] = await db
    .insert(inspectionRecord)
    .values({
      contractItemId,
      inspectionDate: input.inspectionDate,
      result: input.result,
      failReason: input.result === "Fail" ? input.failReason : null,
      retestDecision: input.result === "Fail" ? input.retestDecision : null,
      retestDate:
        input.result === "Fail" && input.retestDecision === "重验"
          ? input.retestDate
          : null,
      handlingMethod:
        input.result === "Fail" && input.retestDecision === "不重验"
          ? input.handlingMethod
          : null,
    })
    .returning();

  // ② 同步 contract_item.inspection_result 为最新一条结果（先读旧值再更新）
  const [before] = await db
    .select()
    .from(contractItem)
    .where(eq(contractItem.id, contractItemId))
    .limit(1);

  const [updated] = await db
    .update(contractItem)
    .set({ inspectionResult: input.result })
    .where(eq(contractItem.id, contractItemId))
    .returning();

  await logChange(db, {
    entityType: "contract_item",
    entityId: contractItemId,
    fieldName: "inspection_result",
    oldValue: before?.inspectionResult ?? null,
    newValue: input.result,
  });

  return { record, updatedItem: updated };
}
