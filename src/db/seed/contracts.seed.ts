import { contract, contractItem } from "../schema";
import { daysFromToday, daysAgo, type SeedDb } from "./seed-helpers";

/**
 * 创建示例合同 + 产品明细。
 * 返回已插入的 contractItem 行（含 id），供 tasks.seed 引用。
 */
export async function seedContracts(db: SeedDb) {
  // ---- 合同 1：美国客户，DP 付款 ----
  const [c1] = await db
    .insert(contract)
    .values({
      contractNo: "WW-2026-001",
      customerName: "Sunrise Trading LLC",
      customerCountry: "USA",
      paymentType: "DP",
      status: "进行中",
      remark: "老客户，季度返单",
    })
    .returning();

  const [c2] = await db
    .insert(contract)
    .values({
      contractNo: "WW-2026-002",
      customerName: "Nordsee Import GmbH",
      customerCountry: "Germany",
      paymentType: "OA",
      status: "进行中",
    })
    .returning();

  const [c3] = await db
    .insert(contract)
    .values({
      contractNo: "WW-2026-003",
      customerName: "Thames Distribution Ltd",
      customerCountry: "UK",
      paymentType: "DP",
      status: "进行中",
    })
    .returning();

  const [c4] = await db
    .insert(contract)
    .values({
      contractNo: "WW-2026-004",
      customerName: "Loire Retail SARL",
      customerCountry: "France",
      paymentType: "OA",
      status: "已完结",
      completedAt: daysAgo(20),
    })
    .returning();

  // ---- 产品明细 ----
  const items = await db
    .insert(contractItem)
    .values([
      {
        contractId: c1.id,
        itemNo: "A-001",
        description: "不锈钢保温杯 500ml",
        orderQty: "2000",
        unitPrice: "3.50",
        amount: "7000.00",
        cbm: "12.5",
        originalFactoryDate: daysFromToday(28),
        currentFactoryDate: daysFromToday(28),
        factoryStatus: "正常",
        inspectionResult: "未验货",
      },
      {
        contractId: c1.id,
        itemNo: "A-002",
        description: "不锈钢保温杯 750ml",
        orderQty: "1500",
        unitPrice: "4.20",
        amount: "6300.00",
        cbm: "9.8",
        originalFactoryDate: daysFromToday(28),
        currentFactoryDate: daysFromToday(28),
        factoryStatus: "正常",
        inspectionResult: "未验货",
      },
      {
        contractId: c2.id,
        itemNo: "B-001",
        description: "陶瓷马克杯 350ml",
        orderQty: "5000",
        unitPrice: "1.80",
        amount: "9000.00",
        cbm: "20.0",
        originalFactoryDate: daysFromToday(35),
        currentFactoryDate: daysFromToday(35),
        factoryStatus: "正常",
        inspectionResult: "Pass",
      },
      {
        contractId: c2.id,
        itemNo: "B-002",
        description: "陶瓷餐盘 10寸",
        orderQty: "3000",
        unitPrice: "2.50",
        amount: "7500.00",
        cbm: "18.5",
        originalFactoryDate: daysFromToday(35),
        currentFactoryDate: daysFromToday(35),
        factoryStatus: "正常",
        inspectionResult: "Pass",
      },
      {
        contractId: c3.id,
        itemNo: "C-001",
        description: "玻璃花瓶 中号",
        orderQty: "1200",
        unitPrice: "6.00",
        amount: "7200.00",
        cbm: "15.0",
        originalFactoryDate: daysFromToday(21),
        currentFactoryDate: daysFromToday(24),
        factoryStatus: "工厂交期异常",
        inspectionResult: "Fail",
      },
      {
        contractId: c4.id,
        itemNo: "D-001",
        description: "竹制餐具套装",
        orderQty: "4000",
        unitPrice: "5.50",
        amount: "22000.00",
        cbm: "25.0",
        originalFactoryDate: daysAgo(60),
        currentFactoryDate: daysAgo(60),
        factoryActualDoneDate: daysAgo(55),
        factoryStatus: "正常",
        inspectionResult: "Pass",
        actualEtd: daysAgo(45),
        shipmentStatus: "已出运",
        itemStatus: "已完成",
        actualPaymentDate: daysAgo(30),
        telexReleaseStatus: true,
        telexReleaseDate: daysAgo(28),
      },
    ])
    .returning();

  console.log(`  ✓ contract: 4 行, contract_item: ${items.length} 行`);
  return { contracts: [c1, c2, c3, c4], items };
}
