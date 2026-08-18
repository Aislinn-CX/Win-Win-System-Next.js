import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import {
  contract,
  contractItem,
  quote,
  quoteImageCandidate,
  quoteItem,
} from "@/db";
import {
  confirmImageCandidate,
  generateImageCandidates,
  rejectImageCandidate,
  SOURCE_HISTORICAL_CONTRACT,
  SOURCE_HISTORICAL_QUOTE,
} from "..";
import {
  cleanupTestData,
  db,
  hasDb,
  trackContract,
  trackQuote,
} from "./helpers";

let seq = 0;
function uniqueNo(label: string) {
  return `IT-R-${label}-${Date.now().toString(36)}-${++seq}`;
}

/** 唯一字符串，用于 itemNo / 描述，避免与 seed 或历史遗留数据碰撞 */
function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${++seq}`;
}

/** 当前报价单 + 一个产品（检索目标） */
async function createCurrentItem(
  dbc: Db,
  label: string,
  itemNo: string,
  desc: string,
) {
  const [q] = await dbc
    .insert(quote)
    .values({ quoteNo: uniqueNo(label), customerName: "当前客户" })
    .returning();
  const [item] = await dbc
    .insert(quoteItem)
    .values({ quoteId: q.id, itemNo, descriptionCn: desc, checkFlags: [] })
    .returning();
  trackQuote(q.id);
  return { quote: q, item };
}

/** 历史合同（含一个产品） */
async function createHistoricalContractItem(
  dbc: Db,
  label: string,
  itemNo: string,
  desc: string,
) {
  const [c] = await dbc
    .insert(contract)
    .values({
      contractNo: uniqueNo(`histc-${label}`),
      customerName: "历史客户",
      customerCountry: "HIST",
      paymentType: "DP",
    })
    .returning();
  const [item] = await dbc
    .insert(contractItem)
    .values({
      contractId: c.id,
      itemNo,
      description: desc,
      orderQty: "100",
      unitPrice: "5",
      amount: "500",
      originalFactoryDate: "2025-01-01",
    })
    .returning();
  trackContract(c.id);
  return { contract: c, item };
}

/** 历史报价单 + 一个产品 */
async function createHistoricalQuoteItem(
  dbc: Db,
  label: string,
  itemNo: string,
  desc: string,
) {
  const [q] = await dbc
    .insert(quote)
    .values({
      quoteNo: uniqueNo(`histq-${label}`),
      customerName: "历史报价客户",
    })
    .returning();
  const [item] = await dbc
    .insert(quoteItem)
    .values({ quoteId: q.id, itemNo, descriptionCn: desc, checkFlags: [] })
    .returning();
  trackQuote(q.id);
  return { quote: q, item };
}

async function candidatesOf(dbc: Db, quoteItemId: number) {
  return dbc
    .select()
    .from(quoteImageCandidate)
    .where(eq(quoteImageCandidate.quoteItemId, quoteItemId));
}

describe.skipIf(!hasDb())(
  "历史商品检索 集成测试（DB）",
  () => {
    afterAll(cleanupTestData, 60000);

    it("itemNo 精确命中历史合同 + 记录 source/sourceEntityId", async () => {
      const dbc = db();
      const no = uid("NO");
      const { item } = await createCurrentItem(dbc, "itemno", no, uid("DESC"));
      const { item: hist } = await createHistoricalContractItem(
        dbc,
        "itemno",
        no,
        uid("OTHER"),
      );

      const { createdCount } = await generateImageCandidates(dbc, item.id);

      expect(createdCount).toBe(1);
      const cands = await candidatesOf(dbc, item.id);
      expect(cands).toHaveLength(1);
      expect(cands[0].source).toBe(SOURCE_HISTORICAL_CONTRACT);
      expect(cands[0].sourceEntityId).toBe(hist.id);
      expect(cands[0].confirmStatus).toBe("待确认");
      expect(cands[0].imageUrl).toBe("");
    });

    it("description 文本包含命中历史合同（itemNo 不同）", async () => {
      const dbc = db();
      const desc = uid("DESC");
      const { item } = await createCurrentItem(dbc, "desc", uid("NOA"), desc);
      await createHistoricalContractItem(
        dbc,
        "desc",
        uid("NOB"),
        `前缀${desc}后缀`,
      );

      const { createdCount } = await generateImageCandidates(dbc, item.id);
      expect(createdCount).toBe(1);
    });

    it("历史报价命中 + 排除当前报价单其它产品", async () => {
      const dbc = db();
      const desc = uid("TARGET");
      const { quote: q, item: itemA } = await createCurrentItem(
        dbc,
        "exclude",
        uid("NOA"),
        desc,
      );
      // 同一报价单下的第二个产品，描述相同，应被排除
      await dbc
        .insert(quoteItem)
        .values({
          quoteId: q.id,
          itemNo: uid("NOB"),
          descriptionCn: desc,
          checkFlags: [],
        });
      // 历史报价产品，描述相同，应命中
      const { item: histC } = await createHistoricalQuoteItem(
        dbc,
        "exclude",
        uid("NOC"),
        desc,
      );

      const { createdCount } = await generateImageCandidates(dbc, itemA.id);

      expect(createdCount).toBe(1);
      const cands = await candidatesOf(dbc, itemA.id);
      expect(cands[0].source).toBe(SOURCE_HISTORICAL_QUOTE);
      expect(cands[0].sourceEntityId).toBe(histC.id);
    });

    it("无命中不产生候选", async () => {
      const dbc = db();
      const { item } = await createCurrentItem(
        dbc,
        "nomatch",
        uid("NOX"),
        uid("DESCX"),
      );
      await createHistoricalContractItem(
        dbc,
        "nomatch",
        uid("NOY"),
        uid("DESCY"),
      );

      const { createdCount } = await generateImageCandidates(dbc, item.id);
      expect(createdCount).toBe(0);
      expect(await candidatesOf(dbc, item.id)).toHaveLength(0);
    });

    it("二次检索：历史不再命中时删除旧待确认候选", async () => {
      const dbc = db();
      const desc = uid("TARGET");
      const { item } = await createCurrentItem(dbc, "clear", uid("NO"), desc);
      const { item: hist } = await createHistoricalContractItem(
        dbc,
        "clear",
        uid("NOH"),
        `${desc}产品`,
      );

      await generateImageCandidates(dbc, item.id);
      expect(await candidatesOf(dbc, item.id)).toHaveLength(1);

      // 历史描述改为不匹配，重新检索应清空旧待确认
      await dbc
        .update(contractItem)
        .set({ description: uid("UNRELATED") })
        .where(eq(contractItem.id, hist.id));

      await generateImageCandidates(dbc, item.id);
      expect(await candidatesOf(dbc, item.id)).toHaveLength(0);
    });

    it("已确认候选在重新检索后保留（不再命中时）", async () => {
      const dbc = db();
      const desc = uid("TARGET");
      const { item } = await createCurrentItem(
        dbc,
        "keep-confirm",
        uid("NO"),
        desc,
      );
      const { item: hist } = await createHistoricalContractItem(
        dbc,
        "keep-confirm",
        uid("NOH"),
        `${desc}产品`,
      );

      await generateImageCandidates(dbc, item.id);
      const [c] = await candidatesOf(dbc, item.id);
      await confirmImageCandidate(dbc, c.id);

      await dbc
        .update(contractItem)
        .set({ description: uid("UNRELATED") })
        .where(eq(contractItem.id, hist.id));

      await generateImageCandidates(dbc, item.id);

      const cands = await candidatesOf(dbc, item.id);
      expect(cands).toHaveLength(1);
      expect(cands[0].confirmStatus).toBe("已确认");
    });

    it("已拒绝候选在重新检索后保留（不再命中时）", async () => {
      const dbc = db();
      const desc = uid("TARGET");
      const { item } = await createCurrentItem(
        dbc,
        "keep-reject",
        uid("NO"),
        desc,
      );
      const { item: hist } = await createHistoricalContractItem(
        dbc,
        "keep-reject",
        uid("NOH"),
        `${desc}产品`,
      );

      await generateImageCandidates(dbc, item.id);
      const [c] = await candidatesOf(dbc, item.id);
      await rejectImageCandidate(dbc, c.id);

      await dbc
        .update(contractItem)
        .set({ description: uid("UNRELATED") })
        .where(eq(contractItem.id, hist.id));

      await generateImageCandidates(dbc, item.id);

      const cands = await candidatesOf(dbc, item.id);
      expect(cands).toHaveLength(1);
      expect(cands[0].confirmStatus).toBe("已拒绝");
    });

    it("已确认候选在重新检索且仍命中时跳过（不重复生成待确认）", async () => {
      const dbc = db();
      const desc = uid("TARGET");
      const { item } = await createCurrentItem(dbc, "skip", uid("NO"), desc);
      await createHistoricalContractItem(dbc, "skip", uid("NOH"), `${desc}产品`);

      await generateImageCandidates(dbc, item.id);
      const [c] = await candidatesOf(dbc, item.id);
      await confirmImageCandidate(dbc, c.id);

      const { createdCount, skippedCount } = await generateImageCandidates(
        dbc,
        item.id,
      );

      expect(createdCount).toBe(0);
      expect(skippedCount).toBe(1);
      const cands = await candidatesOf(dbc, item.id);
      expect(cands).toHaveLength(1);
      expect(cands[0].confirmStatus).toBe("已确认");
    });

    it("已决策跳过同时比较 source + sourceEntityId（多态不互相跳过）", async () => {
      const dbc = db();
      const desc = uid("TARGET");
      const { item } = await createCurrentItem(dbc, "poly", uid("NO"), desc);
      const { item: histQ } = await createHistoricalQuoteItem(
        dbc,
        "poly",
        uid("NOQ"),
        desc,
      );

      // 手动插入「已确认」候选：source=历史合同，sourceEntityId 恰好等于历史报价命中的 id
      await dbc.insert(quoteImageCandidate).values({
        quoteItemId: item.id,
        imageUrl: "",
        source: SOURCE_HISTORICAL_CONTRACT,
        sourceEntityId: histQ.id,
        confirmStatus: "已确认",
      });

      const { createdCount, skippedCount } = await generateImageCandidates(
        dbc,
        item.id,
      );

      // 历史报价命中（sourceEntityId = histQ.id）不应被「历史合同」已确认记录跳过
      expect(createdCount).toBe(1);
      expect(skippedCount).toBe(0);
    });
  },
  60000,
);
