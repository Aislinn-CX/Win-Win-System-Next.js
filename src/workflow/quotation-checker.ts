// ============================================================
// Quotation Checker — 报价单自查引擎（SDD 2.1 / 9.2.3）
// 定位：纯数学规则引擎，不依赖 AI 模型。四类检查：体积/装柜量/周长/重量。
// 输出：check_flags 数组 + 理论装柜量（每柜型一个）。
// 注意：体积/重量公式与阈值仍需对照 PRD 3.5 确认。
// ============================================================

export type ContainerType = "20C" | "40C" | "40HQ";

/** 报价单产品明细中参与自查的尺寸字段 */
export interface QuoteItemDimensions {
  length: number | null; // cm
  width: number | null; // cm
  height: number | null; // cm
  netWeight: number | null; // kg
  grossWeight: number | null; // kg
  cbm: number | null; // m³
  /**
   * 表格中已有的装柜量（每柜型一个，可选）。
   * 有值时与理论装柜量对比（误差 ≥ 5% 报警）；无值时不报警，仅输出理论值。
   */
  containerQty?: Partial<Record<ContainerType, number | null>>;
}

/** 自查配置（阈值可按 PRD 3.5 调整） */
export interface CheckConfig {
  /** 体积偏差容忍度（比例），默认 5% */
  cbmTolerance: number;
  /** 周长报警阈值（cm），默认 300 */
  maxPerimeter: number;
  /** 三种柜型标准体积（m³）：20'C=28 / 40'C=58 / 40'HQ=68 */
  containerVolumes: Record<ContainerType, number>;
  /** 装柜量偏差容忍度（比例），默认 5% */
  containerQtyTolerance: number;
}

const DEFAULT_CONFIG: CheckConfig = {
  cbmTolerance: 0.05,
  maxPerimeter: 300,
  containerVolumes: { "20C": 28, "40C": 58, "40HQ": 68 },
  containerQtyTolerance: 0.05,
};

const CONTAINER_TYPES: ContainerType[] = ["20C", "40C", "40HQ"];

/** 自查结果 */
export interface CheckResult {
  /** 报警标记（为空表示通过） */
  flags: string[];
  /** 理论装柜量（每柜型一个）；单箱 CBM 缺失或 ≤0 时为 null */
  containerQuantities: Record<ContainerType, number | null>;
}

/**
 * 执行报价单自查。
 * 纯函数，无副作用，便于单元测试。
 */
export function runQuotationCheck(
  dim: QuoteItemDimensions,
  config: CheckConfig = DEFAULT_CONFIG,
): CheckResult {
  const flags: string[] = [];

  // ① 体积检查：长×宽×高 折算的 CBM 是否与填写值一致
  if (dim.length != null && dim.width != null && dim.height != null) {
    const calculatedCbm = (dim.length * dim.width * dim.height) / 1_000_000;
    if (dim.cbm != null) {
      const denominator = Math.max(calculatedCbm, dim.cbm, Number.EPSILON);
      const diff = Math.abs(calculatedCbm - dim.cbm) / denominator;
      if (diff > config.cbmTolerance) {
        flags.push("体积需核对");
      }
    }
  }

  // ② 重量检查：毛重应 >= 净重（毛重 = 净重 + 包装）
  if (
    dim.netWeight != null &&
    dim.grossWeight != null &&
    dim.grossWeight < dim.netWeight
  ) {
    flags.push("重量逻辑错误");
  }

  // ③ 周长检查（修改）：长取三边最大值（动态判断），周长 = max + mid×2 + min×2
  if (dim.length != null && dim.width != null && dim.height != null) {
    const [minSide, midSide, maxSide] = [dim.length, dim.width, dim.height].sort(
      (a, b) => a - b,
    );
    const perimeter = maxSide + midSide * 2 + minSide * 2;
    if (perimeter > config.maxPerimeter) {
      flags.push("周长异常");
    }
  }

  // ④ 装柜量检查（修改）：三种柜型理论装柜量 + 与表格值对比
  const containerQuantities = computeContainerQuantities(dim.cbm, config);
  for (const type of CONTAINER_TYPES) {
    const userQty = dim.containerQty?.[type] ?? null;
    const theoretical = containerQuantities[type];
    // 有表格值才对比；无表格值只输出理论值、不报警
    if (userQty != null && theoretical != null && theoretical > 0) {
      const diff = Math.abs(userQty - theoretical) / theoretical;
      if (diff >= config.containerQtyTolerance) {
        flags.push(`${type}装柜量需核对`);
      }
    }
  }

  return { flags, containerQuantities };
}

/** 计算三种柜型的理论装柜量（标准体积 ÷ 单箱 CBM） */
function computeContainerQuantities(
  cbm: number | null,
  config: CheckConfig,
): Record<ContainerType, number | null> {
  if (cbm == null || cbm <= 0) {
    return { "20C": null, "40C": null, "40HQ": null };
  }
  return {
    "20C": config.containerVolumes["20C"] / cbm,
    "40C": config.containerVolumes["40C"] / cbm,
    "40HQ": config.containerVolumes["40HQ"] / cbm,
  };
}
