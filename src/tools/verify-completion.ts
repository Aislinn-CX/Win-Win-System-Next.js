import { and, eq } from "drizzle-orm";
import { config } from "dotenv";
import { contract, contractItem, task } from "../db";
import { createConnection } from "../db/connection";
import {
  checkContractCompletion,
  completeTask,
  createContract,
  handleEtdChanged,
  recordPayment,
} from "../workflow";
import type { Db, TaskType } from "../db";

// tsx 不会自动加载 .env.local，需显式加载
config({ path: ".env.local" });

const db = createConnection();

let failures = 0;
function assert(name: string, cond: boolean, detail?: string) {
  const mark = cond ? "✓ PASS" : "✗ FAIL";
  console.log(`${mark}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!cond) failures++;
}

const ACTIVE = ["待提醒", "待处理", "暂不完成", "已逾期"];

/** 统计某合同的 CONTRACT_COMPLETE_CONFIRM 任务数 */
async function countCompleteTasks(d: Db, contractId: number) {
  const rows = await d
    .select()
    .from(task)
    .where(and(eq(task.contractId, contractId), eq(task.taskType, "CONTRACT_COMPLETE_CONFIRM")));
  return rows.length;
}

/** 把某产品的活动任务推进到「待处理」并走引擎 completeTask（触发副作用） */
async function forceCompleteItemTask(d: Db, contractItemId: number, taskType: TaskType) {
  const rows = await d
    .select()
    .from(task)
    .where(and(eq(task.contractItemId, contractItemId), eq(task.taskType, taskType)));
  const active = rows.filter((t) => ACTIVE.includes(t.status));
  if (active.length === 0) throw new Error(`未找到活动任务 ${taskType}`);
  await d.update(task).set({ status: "待处理" }).where(eq(task.id, active[0].id));
  await completeTask(d, active[0].id);
}

async function readItem(d: Db, itemId: number) {
  const [row] = await d.select().from(contractItem).where(eq(contractItem.id, itemId));
  return row;
}

function makeInput(paymentType: "DP" | "OA", itemCount: number, ts: string) {
  return {
    contractNo: `VERIFY-${paymentType}-${ts}-${itemCount}`,
    customerName: `验证客户-${paymentType}`,
    customerCountry: "TEST",
    paymentType,
    items: Array.from({ length: itemCount }, (_, i) => ({
      itemNo: `V-${i + 1}`,
      description: "验证产品",
      orderQty: "100",
      unitPrice: "1",
      amount: "100",
      originalFactoryDate: "2026-09-01",
    })),
  };
}

async function main() {
  const ts = String(Date.now()).slice(-8);
  const created: number[] = [];

  try {
    // ---- 场景 1：DP 单产品完成 → 生成 CONTRACT_COMPLETE_CONFIRM ----
    const c1 = await createContract(db, makeInput("DP", 1, ts));
    created.push(c1.contract.id);
    const i1 = c1.items[0];
    await handleEtdChanged(db, i1.id, "2026-09-10");
    await recordPayment(db, i1.id, "2026-09-15");
    await forceCompleteItemTask(db, i1.id, "TELEX_DP");
    const i1After = await readItem(db, i1.id);
    assert("场景1 DP 完成后 item_status=已完成", i1After.itemStatus === "已完成");
    assert("场景1 生成 CONTRACT_COMPLETE_CONFIRM", (await countCompleteTasks(db, c1.contract.id)) === 1);

    // ---- 场景 2：OA 电放 + 收款 → 生成任务 ----
    const c2 = await createContract(db, makeInput("OA", 1, ts));
    created.push(c2.contract.id);
    const i2 = c2.items[0];
    await handleEtdChanged(db, i2.id, "2026-09-10");
    await forceCompleteItemTask(db, i2.id, "TELEX_OA");
    const i2AfterTelex = await readItem(db, i2.id);
    assert("场景2 OA 电放后 item 仍未完成", i2AfterTelex.itemStatus === "进行中");
    assert("场景2 OA 电放后未生成完结任务", (await countCompleteTasks(db, c2.contract.id)) === 0);
    await recordPayment(db, i2.id, "2026-09-20");
    const i2AfterPayment = await readItem(db, i2.id);
    assert("场景2 OA 收款后 item_status=已完成", i2AfterPayment.itemStatus === "已完成");
    assert("场景2 生成 CONTRACT_COMPLETE_CONFIRM", (await countCompleteTasks(db, c2.contract.id)) === 1);

    // ---- 场景 3：两产品，仅一个完成 → 不生成 ----
    const c3 = await createContract(db, makeInput("DP", 2, ts));
    created.push(c3.contract.id);
    const [a, b] = c3.items;
    await handleEtdChanged(db, a.id, "2026-09-10");
    await recordPayment(db, a.id, "2026-09-15");
    await forceCompleteItemTask(db, a.id, "TELEX_DP");
    assert("场景3 仅一个产品完成时不生成完结任务", (await countCompleteTasks(db, c3.contract.id)) === 0);

    // ---- 场景 4：最后一个产品完成 → 生成 ----
    await handleEtdChanged(db, b.id, "2026-09-10");
    await recordPayment(db, b.id, "2026-09-15");
    await forceCompleteItemTask(db, b.id, "TELEX_DP");
    assert("场景4 最后一个产品完成时生成完结任务", (await countCompleteTasks(db, c3.contract.id)) === 1);

    // ---- 场景 5：已存在活动任务 → 不重复生成 ----
    const retry = await checkContractCompletion(db, c3.contract.id);
    assert("场景5 二次检查返回 completed=true", retry.completed === true);
    assert("场景5 不重复生成（仍为 1 条）", (await countCompleteTasks(db, c3.contract.id)) === 1);

    console.log(
      failures === 0 ? "\n=== 全部验证通过 ✅ ===" : `\n=== ${failures} 项验证失败 ❌ ===`,
    );
  } finally {
    for (const id of created) {
      await db.delete(contract).where(eq(contract.id, id));
    }
    console.log(`已清理 ${created.length} 个测试合同（级联）`);
  }

  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("验证脚本执行失败：", err);
  process.exit(1);
});
