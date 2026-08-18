import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import { quote, quoteEnDescSuggestion, quoteItem } from "@/db";
import { HttpError } from "@/lib/http";
import { generateEnglishDescription } from "@/lib/llm";
import { generateEnDescription } from "..";
import { cleanupTestData, db, hasDb, trackQuote } from "./helpers";

vi.mock("@/lib/llm", () => ({
  generateEnglishDescription: vi.fn(),
}));

const mockedGenerate = vi.mocked(generateEnglishDescription);

let seq = 0;
function uniqueNo(label: string) {
  return `IT-G-${label}-${Date.now().toString(36)}-${++seq}`;
}

async function createItem(dbc: Db, label: string) {
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
  return item;
}

describe.skipIf(!hasDb())(
  "英文描述 LLM 生成 集成测试（DB，mock LLM）",
  () => {
    afterAll(cleanupTestData);
    beforeEach(() => {
      mockedGenerate.mockReset();
    });

    it("生成：调 LLM + 落库为待确认建议", async () => {
      const dbc = db();
      const item = await createItem(dbc, "gen");
      mockedGenerate.mockResolvedValueOnce("Vacuum insulated tumbler 400ml");

      const { suggestion, created } = await generateEnDescription(dbc, item.id);

      expect(created).toBe(true);
      expect(suggestion.suggestedText).toBe("Vacuum insulated tumbler 400ml");
      expect(suggestion.confirmStatus).toBe("待确认");
      expect(mockedGenerate).toHaveBeenCalledTimes(1);
      const promptArg = mockedGenerate.mock.calls[0][0];
      expect(promptArg).toContain("中文描述");
      expect(promptArg).toContain("IT-1");

      const [saved] = await dbc
        .select()
        .from(quoteEnDescSuggestion)
        .where(eq(quoteEnDescSuggestion.quoteItemId, item.id));
      expect(saved.suggestedText).toBe("Vacuum insulated tumbler 400ml");
    });

    it("LLM 返回空文本：抛 LLM_EMPTY_RESPONSE，不落库", async () => {
      const dbc = db();
      const item = await createItem(dbc, "empty");
      mockedGenerate.mockResolvedValueOnce("   ");

      await expect(generateEnDescription(dbc, item.id)).rejects.toMatchObject({
        code: "LLM_EMPTY_RESPONSE",
      });

      const rows = await dbc
        .select()
        .from(quoteEnDescSuggestion)
        .where(eq(quoteEnDescSuggestion.quoteItemId, item.id));
      expect(rows).toHaveLength(0);
    });

    it("LLM 服务抛错：错误向上传播，不落库", async () => {
      const dbc = db();
      const item = await createItem(dbc, "llm-error");
      mockedGenerate.mockRejectedValueOnce(
        new HttpError("LLM_CONFIG_MISSING", "未配置 LLM API Key", 503),
      );

      await expect(generateEnDescription(dbc, item.id)).rejects.toMatchObject({
        code: "LLM_CONFIG_MISSING",
      });

      const rows = await dbc
        .select()
        .from(quoteEnDescSuggestion)
        .where(eq(quoteEnDescSuggestion.quoteItemId, item.id));
      expect(rows).toHaveLength(0);
    });

    it("quote_item 不存在：抛「不存在」，不调 LLM", async () => {
      const dbc = db();
      await expect(generateEnDescription(dbc, 999999999)).rejects.toThrow(
        "不存在",
      );
      expect(mockedGenerate).not.toHaveBeenCalled();
    });
  },
  60000,
);
