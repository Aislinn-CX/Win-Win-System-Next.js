import { and, eq } from "drizzle-orm";
import type { Db } from "../db";
import { quoteEnDescSuggestion, quoteImageCandidate, quoteItem } from "../db";
import { logChange } from "./change-logger";

// ============================================================
// 翻译/检索 建议的确认与拒绝（Step ⑥）
// 辅助能力：只写 suggestion/candidate 的 confirmStatus + descriptionEnConfirmed，
// 不直接改 quote.status。
// ============================================================

/**
 * 保存/更新翻译建议（供后续 LLM 生成调用）。
 * 同一 quote_item 同时最多 1 条「待确认」建议：已有待确认则更新其 suggestedText（复用），
 * 无待确认则新增。已确认/已拒绝的历史建议保留，不删除。
 */
export async function saveEnDescriptionSuggestion(
  db: Db,
  quoteItemId: number,
  suggestedText: string,
  generationBasis?: string | null,
) {
  const [item] = await db
    .select()
    .from(quoteItem)
    .where(eq(quoteItem.id, quoteItemId))
    .limit(1);
  if (!item) throw new Error(`quote_item ${quoteItemId} 不存在`);

  const [existing] = await db
    .select()
    .from(quoteEnDescSuggestion)
    .where(
      and(
        eq(quoteEnDescSuggestion.quoteItemId, quoteItemId),
        eq(quoteEnDescSuggestion.confirmStatus, "待确认"),
      ),
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(quoteEnDescSuggestion)
      .set({ suggestedText })
      .where(eq(quoteEnDescSuggestion.id, existing.id))
      .returning();
    return { suggestion: updated, created: false as const };
  }

  const [created] = await db
    .insert(quoteEnDescSuggestion)
    .values({
      quoteItemId,
      suggestedText,
      generationBasis: generationBasis ?? null,
    })
    .returning();
  return { suggestion: created, created: true as const };
}

/**
 * 确认英文描述建议。
 * finalText 为空 → 采纳 suggestedText；否则采纳用户修改后的 finalText。
 * 写 quote_item.descriptionEnConfirmed + 标记建议已确认。
 */
export async function confirmEnDescription(
  db: Db,
  suggestionId: number,
  finalText?: string,
) {
  const [s] = await db
    .select()
    .from(quoteEnDescSuggestion)
    .where(eq(quoteEnDescSuggestion.id, suggestionId))
    .limit(1);
  if (!s) throw new Error(`英文描述建议 ${suggestionId} 不存在`);
  if (s.confirmStatus !== "待确认") {
    throw new Error(
      `英文描述建议 ${suggestionId} 当前状态为「${s.confirmStatus}」，不能确认`,
    );
  }

  const text = finalText?.trim() || s.suggestedText;

  const [item] = await db
    .select()
    .from(quoteItem)
    .where(eq(quoteItem.id, s.quoteItemId))
    .limit(1);
  await db
    .update(quoteItem)
    .set({ descriptionEnConfirmed: text })
    .where(eq(quoteItem.id, s.quoteItemId));

  await db
    .update(quoteEnDescSuggestion)
    .set({ confirmStatus: "已确认" })
    .where(eq(quoteEnDescSuggestion.id, suggestionId));

  await logChange(db, {
    entityType: "quote_en_desc_suggestion",
    entityId: suggestionId,
    fieldName: "confirm_status",
    oldValue: "待确认",
    newValue: "已确认",
    changedBy: "用户",
  });
  await logChange(db, {
    entityType: "quote_item",
    entityId: s.quoteItemId,
    fieldName: "description_en_confirmed",
    oldValue: item?.descriptionEnConfirmed ?? null,
    newValue: text,
    changedBy: "用户",
  });

  return {
    suggestionId,
    quoteItemId: s.quoteItemId,
    descriptionEnConfirmed: text,
  };
}

/** 拒绝英文描述建议（不写 descriptionEnConfirmed） */
export async function rejectEnDescription(db: Db, suggestionId: number) {
  const [s] = await db
    .select()
    .from(quoteEnDescSuggestion)
    .where(eq(quoteEnDescSuggestion.id, suggestionId))
    .limit(1);
  if (!s) throw new Error(`英文描述建议 ${suggestionId} 不存在`);
  if (s.confirmStatus !== "待确认") {
    throw new Error(
      `英文描述建议 ${suggestionId} 当前状态为「${s.confirmStatus}」，不能拒绝`,
    );
  }

  await db
    .update(quoteEnDescSuggestion)
    .set({ confirmStatus: "已拒绝" })
    .where(eq(quoteEnDescSuggestion.id, suggestionId));

  await logChange(db, {
    entityType: "quote_en_desc_suggestion",
    entityId: suggestionId,
    fieldName: "confirm_status",
    oldValue: "待确认",
    newValue: "已拒绝",
    changedBy: "用户",
  });

  return { suggestionId };
}

/** 确认商品检索候选 */
export async function confirmImageCandidate(db: Db, candidateId: number) {
  return setCandidateStatus(db, candidateId, "已确认", "确认");
}

/** 拒绝商品检索候选 */
export async function rejectImageCandidate(db: Db, candidateId: number) {
  return setCandidateStatus(db, candidateId, "已拒绝", "拒绝");
}

async function setCandidateStatus(
  db: Db,
  candidateId: number,
  to: "已确认" | "已拒绝",
  action: string,
) {
  const [c] = await db
    .select()
    .from(quoteImageCandidate)
    .where(eq(quoteImageCandidate.id, candidateId))
    .limit(1);
  if (!c) throw new Error(`检索候选 ${candidateId} 不存在`);
  if (c.confirmStatus !== "待确认") {
    throw new Error(
      `检索候选 ${candidateId} 当前状态为「${c.confirmStatus}」，不能${action}`,
    );
  }

  await db
    .update(quoteImageCandidate)
    .set({ confirmStatus: to })
    .where(eq(quoteImageCandidate.id, candidateId));

  await logChange(db, {
    entityType: "quote_image_candidate",
    entityId: candidateId,
    fieldName: "confirm_status",
    oldValue: "待确认",
    newValue: to,
    changedBy: "用户",
  });

  return { candidateId };
}
