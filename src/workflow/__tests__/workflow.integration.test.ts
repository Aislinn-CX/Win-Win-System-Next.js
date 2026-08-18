import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import {
  auditLog,
  contract,
  contractItem,
  factoryDateChangeLog,
  task,
} from "@/db";
import {
  completeTask,
  confirmContractCompletion,
  createContract,
  handleEtdChanged,
  handleFactoryDateChanged,
  handleInspectionResult,
  recordPayment,
  updateItemRecordFields,
} from "..";
import { cleanupTestData, db, hasDb, trackContract } from "./helpers";

let seq = 0;
function uniqueNo(label: string) {
  return `IT-${label}-${Date.now().toString(36)}-${++seq}`;
}

const itemInput = {
  itemNo: "IT-1",
  description: "集成测试产品",
  orderQty: "100",
  unitPrice: "1",
  amount: "100",
  originalFactoryDate: "2026-09-01",
};

async function createTestContract(
  dbc: Db,
  label: string,
  opts: { paymentType?: "DP" | "OA"; itemCount?: number } = {},
) {
  const {
    contract: c,
    items,
    tasks,
  } = await createContract(dbc, {
    contractNo: uniqueNo(label),
    customerName: "测试客户",
    customerCountry: "TEST",
    paymentType: opts.paymentType ?? "DP",
    items: Array.from({ length: opts.itemCount ?? 1 }, (_, i) => ({
      ...itemInput,
      itemNo: `IT-${i + 1}`,
      originalFactoryDate: `2026-09-${String(i + 1).padStart(2, "0")}`,
    })),
  });
  trackContract(c.id);
  return { contract: c, items, tasks };
}

describe.skipIf(!hasDb())(
  "Workflow 集成测试（DB）",
  () => {
    afterAll(cleanupTestData);

    it("订单录入：生成合同 + 产品 + 工厂交期提醒", async () => {
      const dbc = db();
      const {
        contract: c,
        items,
        tasks,
      } = await createTestContract(dbc, "create", {
        itemCount: 2,
      });

      expect(c.status).toBe("进行中");
      expect(items).toHaveLength(2);
      const factoryTasks = tasks.filter((t) =>
        ["FACTORY_14D", "FACTORY_7D", "FACTORY_3D", "FACTORY_DUE"].includes(
          t.taskType,
        ),
      );
      expect(factoryTasks).toHaveLength(8);
      expect(items[0].originalFactoryDate).toBe("2026-09-01");
      expect(items[0].currentFactoryDate).toBe("2026-09-01");
    });

    it("工厂交期变更：写变更记录 + 更新当前交期 + 重算，不碰原始交期", async () => {
      const dbc = db();
      const { items } = await createTestContract(dbc, "factory-date");
      const itemId = items[0].id;

      const { cancelled, created } = await handleFactoryDateChanged(
        dbc,
        itemId,
        "2026-10-01",
        "延期",
      );

      const [item] = await dbc
        .select()
        .from(contractItem)
        .where(eq(contractItem.id, itemId));
      expect(item.currentFactoryDate).toBe("2026-10-01");
      expect(item.originalFactoryDate).toBe("2026-09-01");

      const logs = await dbc
        .select()
        .from(factoryDateChangeLog)
        .where(eq(factoryDateChangeLog.contractItemId, itemId));
      expect(logs).toHaveLength(1);
      expect(logs[0].oldDate).toBe("2026-09-01");
      expect(logs[0].newDate).toBe("2026-10-01");
      expect(cancelled).toHaveLength(4);
      expect(created).toHaveLength(4);
    });

    it("ETD 录入：置已出运 + 生成截单/收款任务（DP 不生成 OA 电放）", async () => {
      const dbc = db();
      const { items } = await createTestContract(dbc, "etd");
      const itemId = items[0].id;

      await handleEtdChanged(dbc, itemId, "2026-10-10");

      const [item] = await dbc
        .select()
        .from(contractItem)
        .where(eq(contractItem.id, itemId));
      expect(item.actualEtd).toBe("2026-10-10");
      expect(item.shipmentStatus).toBe("已出运");

      const tasks = await dbc
        .select()
        .from(task)
        .where(eq(task.contractItemId, itemId));
      const types = tasks.map((t) => t.taskType);
      expect(types).toContain("CUTOFF_DOC");
      expect(types).toContain("PAYMENT_CHECK_7D");
      expect(types).toContain("PAYMENT_CHECK_14D");
      expect(types).not.toContain("TELEX_OA");
    });

    it("DP 收款：生成 TELEX_DP 任务", async () => {
      const dbc = db();
      const { items } = await createTestContract(dbc, "dp-payment");
      const itemId = items[0].id;
      await handleEtdChanged(dbc, itemId, "2026-10-10");

      await recordPayment(dbc, itemId, "2026-10-20");

      const telexTasks = await dbc
        .select()
        .from(task)
        .where(
          and(eq(task.contractItemId, itemId), eq(task.taskType, "TELEX_DP")),
        );
      expect(telexTasks).toHaveLength(1);
      expect(telexTasks[0].taskType).toBe("TELEX_DP");
    });

    it("验货：写验货记录 + 同步 inspection_result", async () => {
      const dbc = db();
      const { items } = await createTestContract(dbc, "inspection");
      const itemId = items[0].id;

      const { record } = await handleInspectionResult(dbc, itemId, {
        inspectionDate: "2026-09-05",
        result: "Pass",
      });

      expect(record.result).toBe("Pass");
      const [item] = await dbc
        .select()
        .from(contractItem)
        .where(eq(contractItem.id, itemId));
      expect(item.inspectionResult).toBe("Pass");
    });

    it("DP 完整流程：出运 → 收款 → 完成电放 → 产品完结 → 合同完结确认", async () => {
      const dbc = db();
      const { contract: c, items } = await createTestContract(dbc, "dp-flow");
      const itemId = items[0].id;

      await handleEtdChanged(dbc, itemId, "2026-10-10");
      await recordPayment(dbc, itemId, "2026-10-20");

      const [telex] = await dbc
        .select()
        .from(task)
        .where(
          and(eq(task.contractItemId, itemId), eq(task.taskType, "TELEX_DP")),
        );
      expect(telex).toBeTruthy();
      await dbc
        .update(task)
        .set({ status: "待处理" })
        .where(eq(task.id, telex.id));
      await completeTask(dbc, telex.id);

      const [item] = await dbc
        .select()
        .from(contractItem)
        .where(eq(contractItem.id, itemId));
      expect(item.itemStatus).toBe("已完成");
      expect(item.telexReleaseStatus).toBe(true);

      const completeConfirm = await dbc
        .select()
        .from(task)
        .where(
          and(
            eq(task.contractId, c.id),
            eq(task.taskType, "CONTRACT_COMPLETE_CONFIRM"),
          ),
        );
      expect(completeConfirm).toHaveLength(1);

      await confirmContractCompletion(dbc, c.id, "agree");
      const [updated] = await dbc
        .select()
        .from(contract)
        .where(eq(contract.id, c.id));
      expect(updated.status).toBe("已完结");
    });

    it("纯记录字段：更新字段 + 写 audit_log，不触发任务", async () => {
      const dbc = db();
      const { items } = await createTestContract(dbc, "record");
      const itemId = items[0].id;
      const tasksBefore = await dbc
        .select()
        .from(task)
        .where(eq(task.contractItemId, itemId));

      await updateItemRecordFields(dbc, itemId, {
        bookingStatus: "已订舱",
        remark: "测试备注",
        docsSentStatus: true,
      });

      const [item] = await dbc
        .select()
        .from(contractItem)
        .where(eq(contractItem.id, itemId));
      expect(item.bookingStatus).toBe("已订舱");
      expect(item.remark).toBe("测试备注");
      expect(item.docsSentStatus).toBe(true);

      const logs = await dbc
        .select()
        .from(auditLog)
        .where(eq(auditLog.entityId, itemId));
      expect(logs.some((l) => l.fieldName === "booking_status")).toBe(true);

      const tasksAfter = await dbc
        .select()
        .from(task)
        .where(eq(task.contractItemId, itemId));
      expect(tasksAfter).toHaveLength(tasksBefore.length);
    });
  },
  60000,
);
