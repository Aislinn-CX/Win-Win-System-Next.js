import { afterAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { quote, quoteItem } from "@/db";
import {
  confirmQuote,
  returnQuoteForRevision,
  submitQuoteForConfirmation,
} from "..";
import { cleanupTestData, db, hasDb, trackQuote } from "./helpers";

let seq = 0;
function uniqueNo(label: string) {
  return `IT-Q-${label}-${Date.now().toString(36)}-${++seq}`;
}

/** 建一个已自查通过（checkFlags=[]）的草稿报价单 */
async function createCheckedQuote(dbc: Db, label: string) {
  const [q] = await dbc
    .insert(quote)
    .values({ quoteNo: uniqueNo(label), customerName: "测试客户" })
    .returning();
  await dbc.insert(quoteItem).values({
    quoteId: q.id,
    itemNo: "IT-1",
    descriptionCn: "测试产品",
    checkFlags: [],
  });
  trackQuote(q.id);
  return q;
}

describe.skipIf(!hasDb())(
  "报价状态机 集成测试（DB）",
  () => {
    afterAll(cleanupTestData);

    it("提交待确认：校验通过 → 待用户确认", async () => {
      const dbc = db();
      const q = await createCheckedQuote(dbc, "submit-ok");
      const updated = await submitQuoteForConfirmation(dbc, q.id);
      expect(updated.status).toBe("待用户确认");
    });

    it("提交待确认：无产品 → 报错且状态不变", async () => {
      const dbc = db();
      const [q] = await dbc
        .insert(quote)
        .values({ quoteNo: uniqueNo("no-item"), customerName: "测试客户" })
        .returning();
      trackQuote(q.id);
      await expect(submitQuoteForConfirmation(dbc, q.id)).rejects.toThrow(
        "至少包含一个产品",
      );
    });

    it("提交待确认：有未自查产品 → 报错", async () => {
      const dbc = db();
      const [q] = await dbc
        .insert(quote)
        .values({ quoteNo: uniqueNo("unchecked"), customerName: "测试客户" })
        .returning();
      await dbc
        .insert(quoteItem)
        .values({ quoteId: q.id, itemNo: "IT-1", descriptionCn: "测试产品" });
      trackQuote(q.id);
      await expect(submitQuoteForConfirmation(dbc, q.id)).rejects.toThrow(
        "必须执行报价自查",
      );
    });

    it("确认入库：待用户确认 → 已确认入库", async () => {
      const dbc = db();
      const q = await createCheckedQuote(dbc, "confirm-ok");
      await submitQuoteForConfirmation(dbc, q.id);
      const updated = await confirmQuote(dbc, q.id);
      expect(updated.status).toBe("已确认入库");
    });

    it("确认入库：草稿自查中 → 报错", async () => {
      const dbc = db();
      const q = await createCheckedQuote(dbc, "confirm-fail");
      await expect(confirmQuote(dbc, q.id)).rejects.toThrow("不能确认入库");
    });

    it("返回修改：待用户确认 → 草稿自查中", async () => {
      const dbc = db();
      const q = await createCheckedQuote(dbc, "return-ok");
      await submitQuoteForConfirmation(dbc, q.id);
      const updated = await returnQuoteForRevision(dbc, q.id);
      expect(updated.status).toBe("草稿自查中");
    });
  },
  60000,
);
