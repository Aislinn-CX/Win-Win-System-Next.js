import { describe, it, expect } from "vitest";
import { runQuotationCheck, type QuoteItemDimensions } from "../quotation-checker";

describe("quotation-checker 报价单自查（纯规则）", () => {
  describe("体积检查", () => {
    it("体积一致 → 无体积标记", () => {
      const dim: QuoteItemDimensions = {
        length: 18,
        width: 12,
        height: 6,
        netWeight: null,
        grossWeight: null,
        cbm: 0.001296,
      };
      expect(runQuotationCheck(dim).flags).not.toContain("体积需核对");
    });

    it("体积不一致 → 体积需核对", () => {
      const dim: QuoteItemDimensions = {
        length: 10,
        width: 10,
        height: 10, // 0.001 m³
        netWeight: null,
        grossWeight: null,
        cbm: 0.002, // 偏差 100%
      };
      expect(runQuotationCheck(dim).flags).toContain("体积需核对");
    });
  });

  describe("重量检查", () => {
    it("毛重 < 净重 → 重量逻辑错误", () => {
      const dim: QuoteItemDimensions = {
        length: null,
        width: null,
        height: null,
        netWeight: 2,
        grossWeight: 1,
        cbm: null,
      };
      expect(runQuotationCheck(dim).flags).toContain("重量逻辑错误");
    });
  });

  describe("周长检查（新公式 max + mid×2 + min×2，阈值 300）", () => {
    it("三边 10/8/6 → 周长 38，不报警", () => {
      const dim: QuoteItemDimensions = {
        length: 10,
        width: 8,
        height: 6,
        netWeight: null,
        grossWeight: null,
        cbm: null,
      };
      expect(runQuotationCheck(dim).flags).not.toContain("周长异常");
    });

    it("三边 100/80/60 → 周长 380 > 300，报警", () => {
      const dim: QuoteItemDimensions = {
        length: 100,
        width: 80,
        height: 60,
        netWeight: null,
        grossWeight: null,
        cbm: null,
      };
      // 100 + 80×2 + 60×2 = 380
      expect(runQuotationCheck(dim).flags).toContain("周长异常");
    });

    it("长边动态判断（顺序无关，结果一致）", () => {
      const a: QuoteItemDimensions = {
        length: 60,
        width: 80,
        height: 100,
        netWeight: null,
        grossWeight: null,
        cbm: null,
      };
      const b: QuoteItemDimensions = {
        length: 100,
        width: 80,
        height: 60,
        netWeight: null,
        grossWeight: null,
        cbm: null,
      };
      // 两者周长应相同（max=100, mid=80, min=60）
      const ra = runQuotationCheck(a).flags;
      const rb = runQuotationCheck(b).flags;
      expect(ra).toEqual(rb);
      expect(ra).toContain("周长异常");
    });
  });

  describe("装柜量检查（三种柜型 28/58/68）", () => {
    it("无 CBM → 理论值全 null，不报警", () => {
      const dim: QuoteItemDimensions = {
        length: null,
        width: null,
        height: null,
        netWeight: null,
        grossWeight: null,
        cbm: null,
      };
      const r = runQuotationCheck(dim);
      expect(r.containerQuantities).toEqual({
        "20C": null,
        "40C": null,
        "40HQ": null,
      });
      expect(r.flags).toEqual([]);
    });

    it("有 CBM=0.5 → 输出三柜型理论值 56/116/136", () => {
      const dim: QuoteItemDimensions = {
        length: null,
        width: null,
        height: null,
        netWeight: null,
        grossWeight: null,
        cbm: 0.5,
      };
      const r = runQuotationCheck(dim);
      expect(r.containerQuantities["20C"]).toBeCloseTo(56);
      expect(r.containerQuantities["40C"]).toBeCloseTo(116);
      expect(r.containerQuantities["40HQ"]).toBeCloseTo(136);
    });

    it("无表格装柜量 → 不报警，只输出理论值", () => {
      const dim: QuoteItemDimensions = {
        length: null,
        width: null,
        height: null,
        netWeight: null,
        grossWeight: null,
        cbm: 0.5,
      };
      const r = runQuotationCheck(dim);
      expect(r.flags).toEqual([]);
      expect(r.containerQuantities["20C"]).toBeCloseTo(56);
    });

    it("表格装柜量匹配（误差 <5%）→ 不报警", () => {
      const dim: QuoteItemDimensions = {
        length: null,
        width: null,
        height: null,
        netWeight: null,
        grossWeight: null,
        cbm: 0.5,
        containerQty: { "20C": 58 }, // 58 vs 理论 56，偏差约 3.6%
      };
      expect(runQuotationCheck(dim).flags).toEqual([]);
    });

    it("表格装柜量偏差 ≥5% → 报警", () => {
      const dim: QuoteItemDimensions = {
        length: null,
        width: null,
        height: null,
        netWeight: null,
        grossWeight: null,
        cbm: 0.5,
        containerQty: { "20C": 60 }, // 60 vs 理论 56，偏差约 7.1%
      };
      expect(runQuotationCheck(dim).flags).toContain("20C装柜量需核对");
    });

    it("多个柜型同时偏差 → 多个标记", () => {
      const dim: QuoteItemDimensions = {
        length: null,
        width: null,
        height: null,
        netWeight: null,
        grossWeight: null,
        cbm: 0.5,
        containerQty: { "20C": 60, "40HQ": 200 }, // 均偏差
      };
      const flags = runQuotationCheck(dim).flags;
      expect(flags).toContain("20C装柜量需核对");
      expect(flags).toContain("40HQ装柜量需核对");
    });
  });
});
