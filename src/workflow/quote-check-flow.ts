import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { quote, quoteItem } from "../db";
import type { CheckResult } from "./quotation-checker";
import { runQuotationCheck } from "./quotation-checker";

// ============================================================
// 2.1 报价单自查流程（DB 编排）
// 读取报价单产品明细 → 逐条执行 Quotation Checker（纯规则引擎）
// → 回写 check_flags。规则本身在 quotation-checker.ts，此处只做编排。
// ============================================================

/** numeric 列 postgres-js 返回字符串，转 number（空 / 非法 → null） */
function toNumber(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export interface QuoteCheckItemResult extends CheckResult {
  quoteItemId: number;
  itemNo: string;
}

/** 对整张报价单执行自查，回写每个产品的 check_flags。 */
export async function checkQuote(db: Db, quoteId: number) {
  const [q] = await db
    .select()
    .from(quote)
    .where(eq(quote.id, quoteId))
    .limit(1);
  if (!q) throw new Error(`quote ${quoteId} 不存在`);

  const items = await db
    .select()
    .from(quoteItem)
    .where(eq(quoteItem.quoteId, quoteId));

  const results: QuoteCheckItemResult[] = [];
  for (const item of items) {
    const check = runQuotationCheck({
      length: toNumber(item.length),
      width: toNumber(item.width),
      height: toNumber(item.height),
      netWeight: toNumber(item.netWeight),
      grossWeight: toNumber(item.grossWeight),
      cbm: toNumber(item.cbm),
    });

    await db
      .update(quoteItem)
      .set({ checkFlags: check.flags })
      .where(eq(quoteItem.id, item.id));

    results.push({ quoteItemId: item.id, itemNo: item.itemNo, ...check });
  }

  return { quote: q, items: results };
}
