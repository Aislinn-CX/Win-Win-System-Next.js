import { and, eq } from "drizzle-orm";
import type { Db } from "../db";
import { quoteImageCandidate, quoteItem } from "../db";
import { readAllContractItems, readAllQuoteItems } from "./state-reader";

// ============================================================
// 历史商品检索（Step ⑥，暂不做 LLM / OCR）
// 职责：根据当前报价产品，检索历史合同/历史报价中的同类产品，
// 生成「待确认」候选写入 quote_image_candidate。
// 业务规则（itemNo 精确 / 描述包含 / 排除当前报价单 / 删旧待确认）全部集中于此。
// ============================================================

/** 候选来源字面值（与 schema 注释一致，imageUrl 不承载实体 id） */
export const SOURCE_HISTORICAL_QUOTE = "历史报价";
export const SOURCE_HISTORICAL_CONTRACT = "历史合同";

export interface RetrievedMatch {
  source: string;
  sourceEntityId: number;
}

/**
 * 检索历史产品并刷新候选。
 * 规则：删除该 quote_item 现有「待确认」候选（已确认/已拒绝保留），
 * 再按匹配结果写入新的「待确认」候选；已决策（已确认/已拒绝）的历史实体跳过，
 * 不重复生成待确认（按 source + sourceEntityId 去重，多态引用须同时比较）。
 * 删除属系统刷新临时检索结果，不写 audit_log。
 */
export async function generateImageCandidates(
  db: Db,
  quoteItemId: number,
): Promise<{
  createdCount: number;
  skippedCount: number;
  matches: RetrievedMatch[];
}> {
  // 1. 校验当前报价产品，取匹配基准字段
  const [item] = await db
    .select()
    .from(quoteItem)
    .where(eq(quoteItem.id, quoteItemId))
    .limit(1);
  if (!item) throw new Error(`quote_item ${quoteItemId} 不存在`);

  const itemNo = item.itemNo.trim();
  const desc = item.descriptionCn.trim();

  // 2. 纯读历史数据（不做匹配/排除）
  const [contractItems, quoteItems] = await Promise.all([
    readAllContractItems(db),
    readAllQuoteItems(db),
  ]);

  // 3. 匹配规则：itemNo 精确匹配 OR 历史描述包含当前中文描述；
  //    历史报价排除当前报价单的全部产品。
  const matches: RetrievedMatch[] = [];
  for (const ci of contractItems) {
    if (matchesItem(ci.itemNo, ci.description, itemNo, desc)) {
      matches.push({
        source: SOURCE_HISTORICAL_CONTRACT,
        sourceEntityId: ci.id,
      });
    }
  }
  for (const qi of quoteItems) {
    if (qi.quoteId === item.quoteId) continue;
    if (matchesItem(qi.itemNo, qi.descriptionCn, itemNo, desc)) {
      matches.push({
        source: SOURCE_HISTORICAL_QUOTE,
        sourceEntityId: qi.id,
      });
    }
  }

  // 4. 已决策集合：当前 quote_item 下「已确认/已拒绝」候选的 source + sourceEntityId。
  //    多态引用须同时比较两者，不能只比 sourceEntityId（历史报价与历史合同 id 可能相同）。
  const existing = await db
    .select()
    .from(quoteImageCandidate)
    .where(eq(quoteImageCandidate.quoteItemId, quoteItemId));
  const decided = new Set<string>();
  for (const c of existing) {
    if (
      c.sourceEntityId != null &&
      (c.confirmStatus === "已确认" || c.confirmStatus === "已拒绝")
    ) {
      decided.add(`${c.source}|${c.sourceEntityId}`);
    }
  }

  // 5. 删除旧「待确认」候选（已确认/已拒绝保留）。
  //    内部历史候选无图片，imageUrl 存空字符串（字段 NOT NULL）。
  await db
    .delete(quoteImageCandidate)
    .where(
      and(
        eq(quoteImageCandidate.quoteItemId, quoteItemId),
        eq(quoteImageCandidate.confirmStatus, "待确认"),
      ),
    );

  // 6. 跳过已决策命中，仅对从未决策的历史实体新建「待确认」候选。
  const freshMatches = matches.filter(
    (m) => !decided.has(`${m.source}|${m.sourceEntityId}`),
  );
  const skippedCount = matches.length - freshMatches.length;

  if (freshMatches.length > 0) {
    await db
      .insert(quoteImageCandidate)
      .values(
        freshMatches.map((m) => ({
          quoteItemId,
          imageUrl: "",
          source: m.source,
          sourceEntityId: m.sourceEntityId,
        })),
      )
      .returning();
  }

  return {
    createdCount: freshMatches.length,
    skippedCount,
    matches: freshMatches,
  };
}

/**
 * 单条匹配规则：itemNo 精确匹配，或历史描述文本包含当前中文描述（忽略大小写）。
 * 空 itemNo/描述不参与匹配，避免空串导致全量命中。
 */
function matchesItem(
  histItemNo: string,
  histDesc: string,
  itemNo: string,
  desc: string,
): boolean {
  if (itemNo && histItemNo.trim() === itemNo) return true;
  if (desc && histDesc.toLowerCase().includes(desc.toLowerCase())) return true;
  return false;
}
