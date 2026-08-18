import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import {
  quote,
  quoteEnDescSuggestion,
  quoteImageCandidate,
  quoteItem,
} from "@/db";
import {
  confirmEnDescription,
  confirmImageCandidate,
  rejectEnDescription,
  rejectImageCandidate,
  saveEnDescriptionSuggestion,
} from "..";
import { cleanupTestData, db, hasDb, trackQuote } from "./helpers";

let seq = 0;
function uniqueNo(label: string) {
  return `IT-S-${label}-${Date.now().toString(36)}-${++seq}`;
}

async function createQuoteWithSuggestion(
  dbc: Db,
  label: string,
  suggestedText = "英文描述",
) {
  const [q] = await dbc
    .insert(quote)
    .values({ quoteNo: uniqueNo(label), customerName: "测试客户" })
    .returning();
  const [item] = await dbc
    .insert(quoteItem)
    .values({
      quoteId: q.id,
      itemNo: "IT-1",
      descriptionCn: "中文描述",
      checkFlags: [],
    })
    .returning();
  const [s] = await dbc
    .insert(quoteEnDescSuggestion)
    .values({ quoteItemId: item.id, suggestedText })
    .returning();
  trackQuote(q.id);
  return { item, s };
}

async function createQuoteWithCandidate(dbc: Db, label: string) {
  const [q] = await dbc
    .insert(quote)
    .values({ quoteNo: uniqueNo(label), customerName: "测试客户" })
    .returning();
  const [item] = await dbc
    .insert(quoteItem)
    .values({
      quoteId: q.id,
      itemNo: "IT-1",
      descriptionCn: "中文描述",
      checkFlags: [],
    })
    .returning();
  const [c] = await dbc
    .insert(quoteImageCandidate)
    .values({
      quoteItemId: item.id,
      imageUrl: "http://example.com/1.jpg",
      source: "历史检索",
    })
    .returning();
  trackQuote(q.id);
  return { c };
}

async function createQuoteWithItem(dbc: Db, label: string) {
  const [q] = await dbc
    .insert(quote)
    .values({ quoteNo: uniqueNo(label), customerName: "测试客户" })
    .returning();
  const [item] = await dbc
    .insert(quoteItem)
    .values({
      quoteId: q.id,
      itemNo: "IT-1",
      descriptionCn: "中文描述",
      checkFlags: [],
    })
    .returning();
  trackQuote(q.id);
  return { item };
}

describe.skipIf(!hasDb())(
  "翻译/检索建议确认 集成测试（DB）",
  () => {
    afterAll(cleanupTestData);

    it("确认英文描述：写 descriptionEnConfirmed + 标记已确认", async () => {
      const dbc = db();
      const { item, s } = await createQuoteWithSuggestion(dbc, "confirm-en");
      await confirmEnDescription(dbc, s.id);

      const [updatedItem] = await dbc
        .select()
        .from(quoteItem)
        .where(eq(quoteItem.id, item.id));
      expect(updatedItem.descriptionEnConfirmed).toBe("英文描述");
      const [updatedS] = await dbc
        .select()
        .from(quoteEnDescSuggestion)
        .where(eq(quoteEnDescSuggestion.id, s.id));
      expect(updatedS.confirmStatus).toBe("已确认");
    });

    it("确认英文描述：finalText 覆盖建议文本", async () => {
      const dbc = db();
      const { item, s } = await createQuoteWithSuggestion(
        dbc,
        "confirm-en-edit",
        "原始",
      );
      await confirmEnDescription(dbc, s.id, "修改后文本");

      const [updatedItem] = await dbc
        .select()
        .from(quoteItem)
        .where(eq(quoteItem.id, item.id));
      expect(updatedItem.descriptionEnConfirmed).toBe("修改后文本");
    });

    it("拒绝英文描述：标记已拒绝，不写 descriptionEnConfirmed", async () => {
      const dbc = db();
      const { item, s } = await createQuoteWithSuggestion(dbc, "reject-en");
      await rejectEnDescription(dbc, s.id);

      const [updatedItem] = await dbc
        .select()
        .from(quoteItem)
        .where(eq(quoteItem.id, item.id));
      expect(updatedItem.descriptionEnConfirmed).toBeNull();
      const [updatedS] = await dbc
        .select()
        .from(quoteEnDescSuggestion)
        .where(eq(quoteEnDescSuggestion.id, s.id));
      expect(updatedS.confirmStatus).toBe("已拒绝");
    });

    it("确认检索候选：已确认", async () => {
      const dbc = db();
      const { c } = await createQuoteWithCandidate(dbc, "confirm-cand");
      await confirmImageCandidate(dbc, c.id);

      const [updated] = await dbc
        .select()
        .from(quoteImageCandidate)
        .where(eq(quoteImageCandidate.id, c.id));
      expect(updated.confirmStatus).toBe("已确认");
    });

    it("拒绝检索候选：已拒绝", async () => {
      const dbc = db();
      const { c } = await createQuoteWithCandidate(dbc, "reject-cand");
      await rejectImageCandidate(dbc, c.id);

      const [updated] = await dbc
        .select()
        .from(quoteImageCandidate)
        .where(eq(quoteImageCandidate.id, c.id));
      expect(updated.confirmStatus).toBe("已拒绝");
    });
    it("同一 item 只保留一条待确认 suggestion（重新生成复用）", async () => {
      const dbc = db();
      const { item } = await createQuoteWithItem(dbc, "upsert-reuse");
      await saveEnDescriptionSuggestion(dbc, item.id, "第一版");
      await saveEnDescriptionSuggestion(dbc, item.id, "第二版");

      const suggestions = await dbc
        .select()
        .from(quoteEnDescSuggestion)
        .where(eq(quoteEnDescSuggestion.quoteItemId, item.id));
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].confirmStatus).toBe("待确认");
      expect(suggestions[0].suggestedText).toBe("第二版");
    });

    it("已确认历史 suggestion 保留，重新生成新增一条待确认", async () => {
      const dbc = db();
      const { item } = await createQuoteWithItem(dbc, "upsert-after-confirm");
      const first = await saveEnDescriptionSuggestion(dbc, item.id, "第一版");
      await confirmEnDescription(dbc, first.suggestion.id);

      await saveEnDescriptionSuggestion(dbc, item.id, "第二版");

      const suggestions = await dbc
        .select()
        .from(quoteEnDescSuggestion)
        .where(eq(quoteEnDescSuggestion.quoteItemId, item.id));
      expect(suggestions).toHaveLength(2);
      expect(
        suggestions.filter((s) => s.confirmStatus === "已确认"),
      ).toHaveLength(1);
      expect(
        suggestions.filter((s) => s.confirmStatus === "待确认"),
      ).toHaveLength(1);
    });

    it("新 suggestion 确认后覆盖旧 descriptionEnConfirmed", async () => {
      const dbc = db();
      const { item } = await createQuoteWithItem(dbc, "upsert-overwrite");
      const first = await saveEnDescriptionSuggestion(dbc, item.id, "旧英文");
      await confirmEnDescription(dbc, first.suggestion.id);

      const second = await saveEnDescriptionSuggestion(dbc, item.id, "新英文");
      await confirmEnDescription(dbc, second.suggestion.id);

      const [updatedItem] = await dbc
        .select()
        .from(quoteItem)
        .where(eq(quoteItem.id, item.id));
      expect(updatedItem.descriptionEnConfirmed).toBe("新英文");
    });
  },
  60000,
);
