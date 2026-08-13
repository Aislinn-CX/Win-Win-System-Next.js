import { describe, it, expect } from "vitest";
import { addDays, toISODate, isOverdue } from "../date-calculator";

describe("date-calculator 日期计算器", () => {
  describe("addDays 天数偏移", () => {
    it("负数偏移（工厂交期提前提醒）", () => {
      expect(addDays("2026-08-20", -14)).toBe("2026-08-06");
      expect(addDays("2026-08-20", -7)).toBe("2026-08-13");
      expect(addDays("2026-08-20", -3)).toBe("2026-08-17");
      expect(addDays("2026-08-20", 0)).toBe("2026-08-20");
    });

    it("正数偏移（ETD 后收款检查）", () => {
      expect(addDays("2026-08-25", 7)).toBe("2026-09-01");
      expect(addDays("2026-08-25", 14)).toBe("2026-09-08");
      expect(addDays("2026-08-25", 2)).toBe("2026-08-27");
    });

    it("跨月/跨年边界", () => {
      expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
      expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
      expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    });
  });

  describe("toISODate 规范化", () => {
    it("字符串原样截取", () => {
      expect(toISODate("2026-08-20")).toBe("2026-08-20");
    });

    it("Date 转 ISO", () => {
      expect(toISODate(new Date("2026-08-20T00:00:00Z"))).toBe("2026-08-20");
    });

    it("null/undefined 返回 null", () => {
      expect(toISODate(null)).toBeNull();
      expect(toISODate(undefined)).toBeNull();
    });
  });

  describe("isOverdue 逾期判断（不落库，实时比较）", () => {
    it("过去的日期且状态为待处理 → 逾期", () => {
      expect(isOverdue("2000-01-01", "待处理")).toBe(true);
    });

    it("未来日期 → 未逾期", () => {
      expect(isOverdue("2999-01-01", "待处理")).toBe(false);
    });

    it("非活动状态 → 不判定逾期", () => {
      expect(isOverdue("2000-01-01", "已完成")).toBe(false);
      expect(isOverdue("2000-01-01", "无需处理")).toBe(false);
      expect(isOverdue("2000-01-01", "待提醒")).toBe(false);
    });
  });
});
