import {
  quote,
  quoteItem,
  quoteEnDescSuggestion,
  quoteImageCandidate,
} from "../schema";
import { type SeedDb } from "./seed-helpers";

/**
 * 创建示例报价单 + 产品明细 + AI 建议 + 检索候选。
 */
export async function seedQuotes(db: SeedDb) {
  const [q1] = await db
    .insert(quote)
    .values({
      quoteNo: "QT-2026-001",
      customerName: "Pacific Home Goods",
      status: "待用户确认",
    })
    .returning();

  const [q2] = await db
    .insert(quote)
    .values({
      quoteNo: "QT-2026-002",
      customerName: "Alpen Living AG",
      status: "草稿自查中",
    })
    .returning();

  const [qi1] = await db
    .insert(quoteItem)
    .values({
      quoteId: q1.id,
      itemNo: "Q-A-001",
      descriptionCn: "双层真空保温杯 400ml",
      length: "7.0",
      width: "7.0",
      height: "18.0",
      netWeight: "0.28",
      grossWeight: "0.35",
      cbm: "0.000882",
      checkFlags: ["体积需核对"],
    })
    .returning();

  const [qi2] = await db
    .insert(quoteItem)
    .values({
      quoteId: q1.id,
      itemNo: "Q-A-002",
      descriptionCn: "不锈钢饭盒 1L",
      length: "18.0",
      width: "12.0",
      height: "6.0",
      netWeight: "0.45",
      grossWeight: "0.55",
      cbm: "0.001296",
      checkFlags: [],
    })
    .returning();

  const [qi3] = await db
    .insert(quoteItem)
    .values({
      quoteId: q2.id,
      itemNo: "Q-B-001",
      descriptionCn: "陶瓷调味罐 3件套",
      length: "15.0",
      width: "15.0",
      height: "20.0",
      netWeight: "0.90",
      grossWeight: "1.20",
      cbm: "0.004500",
      checkFlags: ["重量逻辑错误"],
    })
    .returning();

  // AI 英文描述建议（暂存，待确认）
  await db.insert(quoteEnDescSuggestion).values([
    {
      quoteItemId: qi1.id,
      suggestedText:
        "Double-wall vacuum insulated tumbler, 400ml, stainless steel",
      generationBasis: "参考历史同类产品表达",
      confirmStatus: "待确认",
    },
    {
      quoteItemId: qi2.id,
      suggestedText: "Stainless steel lunch box, 1L capacity",
      generationBasis: "参考历史同类产品表达",
      confirmStatus: "待确认",
    },
  ]);

  // 商品检索候选（暂存，待确认）
  await db.insert(quoteImageCandidate).values([
    {
      quoteItemId: qi1.id,
      imageUrl: "https://example.com/candidates/tumbler-01.jpg",
      source: "Amazon 检索候选",
      confirmStatus: "待确认",
    },
    {
      quoteItemId: qi1.id,
      imageUrl: "https://example.com/candidates/tumbler-02.jpg",
      source: "eBay 检索候选",
      confirmStatus: "待确认",
    },
  ]);

  console.log(
    `  ✓ quote: 2 行, quote_item: 3 行, en_desc_suggestion: 2 行, image_candidate: 2 行`,
  );
  return { quotes: [q1, q2] };
}
