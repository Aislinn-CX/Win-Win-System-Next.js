import { eq } from "drizzle-orm";
import type { Db, QuoteStatus } from "../db";
import { quote, quoteItem } from "../db";
import { logChange } from "./change-logger";

// ============================================================
// 报价状态机（Step ⑥）
// 草稿自查中 → 待用户确认 → 已确认入库；待用户确认 → 草稿自查中（返回修改）
// 铁律：只能由用户操作触发；AI 翻译/检索不直接改 quote.status。
// ============================================================

/** 校验当前状态并执行状态转换 + audit_log */
async function transitionStatus(
  db: Db,
  quoteId: number,
  from: QuoteStatus,
  to: QuoteStatus,
  action: string,
) {
  const [q] = await db
    .select()
    .from(quote)
    .where(eq(quote.id, quoteId))
    .limit(1);
  if (!q) throw new Error(`quote ${quoteId} 不存在`);
  if (q.status !== from) {
    throw new Error(
      `quote ${quoteId} 当前状态为「${q.status}」，不能${action}`,
    );
  }

  const [updated] = await db
    .update(quote)
    .set({ status: to })
    .where(eq(quote.id, quoteId))
    .returning();

  await logChange(db, {
    entityType: "quote",
    entityId: quoteId,
    fieldName: "status",
    oldValue: q.status,
    newValue: to,
    changedBy: "用户",
  });

  return updated;
}

/**
 * 草稿自查中 → 待用户确认（用户「提交待确认」）。
 * 校验：quote 必填字段 + 至少一个产品 + 每产品必填 + 每产品已执行自查。
 */
export async function submitQuoteForConfirmation(db: Db, quoteId: number) {
  const [q] = await db
    .select()
    .from(quote)
    .where(eq(quote.id, quoteId))
    .limit(1);
  if (!q) throw new Error(`quote ${quoteId} 不存在`);
  if (q.status !== "草稿自查中") {
    throw new Error(
      `quote ${quoteId} 当前状态为「${q.status}」，不能提交待确认`,
    );
  }
  if (!q.quoteNo?.trim()) throw new Error(`quote ${quoteId} 必须填写合同号`);
  if (!q.customerName?.trim()) {
    throw new Error(`quote ${quoteId} 必须填写客户名称`);
  }

  const items = await db
    .select()
    .from(quoteItem)
    .where(eq(quoteItem.quoteId, quoteId));
  if (items.length === 0) {
    throw new Error(`quote ${quoteId} 必须至少包含一个产品`);
  }
  for (const item of items) {
    if (!item.itemNo?.trim()) {
      throw new Error(`产品 ${item.id} 必须填写 itemNo`);
    }
    if (!item.descriptionCn?.trim()) {
      throw new Error(`产品 ${item.id} 必须填写 descriptionCn`);
    }
    if (item.checkFlags == null) {
      throw new Error(`产品 ${item.id} 必须执行报价自查后才能提交`);
    }
  }

  return transitionStatus(
    db,
    quoteId,
    "草稿自查中",
    "待用户确认",
    "提交待确认",
  );
}

/** 待用户确认 → 已确认入库（用户「确认入库」） */
export async function confirmQuote(db: Db, quoteId: number) {
  return transitionStatus(db, quoteId, "待用户确认", "已确认入库", "确认入库");
}

/** 待用户确认 → 草稿自查中（用户「返回修改」） */
export async function returnQuoteForRevision(db: Db, quoteId: number) {
  return transitionStatus(db, quoteId, "待用户确认", "草稿自查中", "返回修改");
}
