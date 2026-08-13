import { contract, contractItem } from "../db";
import type { Db, PaymentType } from "../db";
import { recomputeItemReminders } from "./engine";

// ============================================================
// 2.2 订单录入流程
// 录入合同 → 录入产品明细 → 写 current_factory_date=original_factory_date
// → 生成工厂交期前流程全部 Reminder。
// 关键：original_factory_date 是唯一写入入口，写入后终身不可变。
// ============================================================

export interface CreateContractItemInput {
  itemNo: string;
  description: string;
  orderQty: string;
  unitPrice: string;
  amount: string;
  cbm?: string | null;
  /** 原始工厂交期，必填（NOT NULL），写入后不可覆盖 */
  originalFactoryDate: string;
}

export interface CreateContractInput {
  contractNo: string;
  customerName: string;
  customerCountry: string;
  paymentType: PaymentType;
  remark?: string | null;
  items: CreateContractItemInput[];
}

/**
 * 创建合同 + 产品明细 + 初始工厂交期提醒。
 * 返回 { contract, items, tasks }。
 */
export async function createContract(db: Db, input: CreateContractInput) {
  // ① 创建合同，status = 进行中
  const [createdContract] = await db
    .insert(contract)
    .values({
      contractNo: input.contractNo,
      customerName: input.customerName,
      customerCountry: input.customerCountry,
      paymentType: input.paymentType,
      status: "进行中",
      remark: input.remark ?? null,
    })
    .returning();

  // ② 逐个创建产品明细 + 生成工厂交期提醒
  const items = [];
  const tasks = [];

  for (const itemInput of input.items) {
    const [createdItem] = await db
      .insert(contractItem)
      .values({
        contractId: createdContract.id,
        itemNo: itemInput.itemNo,
        description: itemInput.description,
        orderQty: itemInput.orderQty,
        unitPrice: itemInput.unitPrice,
        amount: itemInput.amount,
        cbm: itemInput.cbm ?? null,
        // 唯一写入入口：original_factory_date 与 current_factory_date 同时写入
        originalFactoryDate: itemInput.originalFactoryDate,
        currentFactoryDate: itemInput.originalFactoryDate,
        factoryStatus: "正常",
        inspectionResult: "未验货",
        shipmentStatus: "未出运",
        itemStatus: "进行中",
      })
      .returning();

    items.push(createdItem);

    // ③ 生成工厂交期前流程全部 Reminder（FACTORY_14D/7D/3D/DUE）
    const { created } = await recomputeItemReminders(
      db,
      createdItem.id,
      "factory_date_changed",
      { skipCompleted: true },
    );
    tasks.push(...created);
  }

  return { contract: createdContract, items, tasks };
}
