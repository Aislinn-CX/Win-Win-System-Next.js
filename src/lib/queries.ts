import { desc, eq, inArray } from "drizzle-orm";
import {
  contract,
  contractItem,
  factoryDateChangeLog,
  getDb,
  inspectionRecord,
  quote,
  quoteEnDescSuggestion,
  quoteImageCandidate,
  quoteItem,
  task,
} from "@/db";
import {
  ACTIVE_TASK_STATUSES,
  runQuotationCheck,
  SOURCE_HISTORICAL_CONTRACT,
  SOURCE_HISTORICAL_QUOTE,
} from "@/workflow";

/** numeric 列 postgres-js 返回字符串，转 number（空/非法 → null） */
function toNumber(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

// ============================================================
// 只读查询层（供 Server Components 使用）
// 铁律：这里只做数据读取与轻量聚合，不含任何业务规则。
// 业务规则一律在 src/workflow/。
// ============================================================

export interface ContractRow {
  id: number;
  contractNo: string;
  customerName: string;
  customerCountry: string;
  paymentType: string;
  status: string;
  completedAt: string | null;
  itemCount: number;
  activeTaskCount: number;
}

export interface ContractFilters {
  search?: string;
  status?: string;
  paymentType?: string;
}

/** 合同列表（含产品数 + 活动任务数），支持按合同号/客户名搜索、按状态筛选 */
export async function listContracts(
  filters: ContractFilters = {},
): Promise<ContractRow[]> {
  const db = getDb();
  const contracts = await db.select().from(contract).orderBy(desc(contract.id));
  const items = await db.select().from(contractItem);
  const activeTasks = await db
    .select()
    .from(task)
    .where(inArray(task.status, [...ACTIVE_TASK_STATUSES]));

  const itemCount = new Map<number, number>();
  for (const i of items)
    itemCount.set(i.contractId, (itemCount.get(i.contractId) ?? 0) + 1);

  const activeTaskCount = new Map<number, number>();
  for (const t of activeTasks) {
    activeTaskCount.set(
      t.contractId,
      (activeTaskCount.get(t.contractId) ?? 0) + 1,
    );
  }

  const keyword = filters.search?.trim().toLowerCase();

  return contracts
    .filter((c) => (filters.status ? c.status === filters.status : true))
    .filter((c) =>
      filters.paymentType ? c.paymentType === filters.paymentType : true,
    )
    .filter((c) =>
      keyword
        ? c.contractNo.toLowerCase().includes(keyword) ||
          c.customerName.toLowerCase().includes(keyword)
        : true,
    )
    .map((c) => ({
      id: c.id,
      contractNo: c.contractNo,
      customerName: c.customerName,
      customerCountry: c.customerCountry,
      paymentType: c.paymentType,
      status: c.status,
      completedAt: c.completedAt,
      itemCount: itemCount.get(c.id) ?? 0,
      activeTaskCount: activeTaskCount.get(c.id) ?? 0,
    }));
}

/** 合同详情（合同 + 产品 + 任务 + 交期变更记录 + 验货记录） */
export async function getContractDetail(id: number) {
  const db = getDb();
  const [c] = await db.select().from(contract).where(eq(contract.id, id));
  if (!c) return null;

  const items = await db
    .select()
    .from(contractItem)
    .where(eq(contractItem.contractId, id));

  const tasks = await db
    .select()
    .from(task)
    .where(eq(task.contractId, id))
    .orderBy(desc(task.id));

  const itemIds = items.map((i) => i.id);
  const dateLogs =
    itemIds.length === 0
      ? []
      : await db
          .select()
          .from(factoryDateChangeLog)
          .where(inArray(factoryDateChangeLog.contractItemId, itemIds));
  const inspections =
    itemIds.length === 0
      ? []
      : await db
          .select()
          .from(inspectionRecord)
          .where(inArray(inspectionRecord.contractItemId, itemIds));

  return { contract: c, items, tasks, dateLogs, inspections };
}

export interface TaskFilters {
  status?: string;
  taskType?: string;
}

/** 任务中心：全部任务（附带合同/产品上下文），支持按状态、按类型筛选 */
export async function listTasks(filters: TaskFilters = {}) {
  const db = getDb();
  const tasks = await db.select().from(task).orderBy(desc(task.id));
  const contracts = await db.select().from(contract);
  const items = await db.select().from(contractItem);

  const contractMap = new Map(contracts.map((c) => [c.id, c]));
  const itemMap = new Map(items.map((i) => [i.id, i]));

  return tasks
    .filter((t) => (filters.status ? t.status === filters.status : true))
    .filter((t) => (filters.taskType ? t.taskType === filters.taskType : true))
    .map((t) => ({
      ...t,
      contract: contractMap.get(t.contractId) ?? null,
      item:
        t.contractItemId != null
          ? (itemMap.get(t.contractItemId) ?? null)
          : null,
    }));
}

/** 今日到期任务：待处理 + 已逾期（今天需要处理），已逾期优先 */
export async function listDueTodayTasks() {
  const tasks = await listTasks();
  return tasks
    .filter((t) => t.status === "待处理" || t.status === "已逾期")
    .sort((a, b) => {
      if (a.status === b.status) {
        return (a.nextRemindDate ?? a.plannedRemindDate ?? "").localeCompare(
          b.nextRemindDate ?? b.plannedRemindDate ?? "",
        );
      }
      return a.status === "已逾期" ? -1 : 1;
    });
}

/** 报价单列表（含产品明细） */
export async function listQuotes() {
  const db = getDb();
  const quotes = await db.select().from(quote).orderBy(desc(quote.id));
  const items = await db.select().from(quoteItem);

  const byQuote = new Map<number, (typeof items)[number][]>();
  for (const i of items) {
    const arr = byQuote.get(i.quoteId) ?? [];
    arr.push(i);
    byQuote.set(i.quoteId, arr);
  }

  return quotes.map((q) => ({
    ...q,
    items: (byQuote.get(q.id) ?? []).map((it) => {
      const cbm = toNumber(it.cbm);
      return {
        ...it,
        cbmMissing: cbm == null || cbm <= 0,
        theoreticalContainerQty: runQuotationCheck({
          length: toNumber(it.length),
          width: toNumber(it.width),
          height: toNumber(it.height),
          netWeight: toNumber(it.netWeight),
          grossWeight: toNumber(it.grossWeight),
          cbm,
        }).containerQuantities,
      };
    }),
  }));
}

export interface CandidateSource {
  itemNo: string;
  description: string;
  descriptionEnConfirmed: string | null;
  unitPrice: number | null;
}

/** 报价详情（报价单 + 产品 + 翻译建议 + 检索候选 + 候选来源解析） */
export async function getQuoteDetail(id: number) {
  const db = getDb();
  const [q] = await db.select().from(quote).where(eq(quote.id, id)).limit(1);
  if (!q) return null;

  const items = await db
    .select()
    .from(quoteItem)
    .where(eq(quoteItem.quoteId, id));
  const itemIds = items.map((i) => i.id);
  const suggestions =
    itemIds.length === 0
      ? []
      : await db
          .select()
          .from(quoteEnDescSuggestion)
          .where(inArray(quoteEnDescSuggestion.quoteItemId, itemIds));
  const candidates =
    itemIds.length === 0
      ? []
      : await db
          .select()
          .from(quoteImageCandidate)
          .where(inArray(quoteImageCandidate.quoteItemId, itemIds));

  // 候选来源实体解析（纯展示读取，不含业务规则）
  const contractSrcIds = candidates
    .filter(
      (c) =>
        c.source === SOURCE_HISTORICAL_CONTRACT && c.sourceEntityId != null,
    )
    .map((c) => c.sourceEntityId as number);
  const quoteSrcIds = candidates
    .filter(
      (c) => c.source === SOURCE_HISTORICAL_QUOTE && c.sourceEntityId != null,
    )
    .map((c) => c.sourceEntityId as number);

  const srcContractItems =
    contractSrcIds.length === 0
      ? []
      : await db
          .select()
          .from(contractItem)
          .where(inArray(contractItem.id, contractSrcIds));
  const srcQuoteItems =
    quoteSrcIds.length === 0
      ? []
      : await db
          .select()
          .from(quoteItem)
          .where(inArray(quoteItem.id, quoteSrcIds));

  const contractMap = new Map(srcContractItems.map((i) => [i.id, i]));
  const quoteMap = new Map(srcQuoteItems.map((i) => [i.id, i]));

  const candidateSources = new Map<number, CandidateSource>();
  for (const c of candidates) {
    if (c.sourceEntityId == null) continue;
    if (c.source === SOURCE_HISTORICAL_CONTRACT) {
      const src = contractMap.get(c.sourceEntityId);
      if (src) {
        candidateSources.set(c.id, {
          itemNo: src.itemNo,
          description: src.description,
          descriptionEnConfirmed: null,
          unitPrice: toNumber(src.unitPrice),
        });
      }
    } else if (c.source === SOURCE_HISTORICAL_QUOTE) {
      const src = quoteMap.get(c.sourceEntityId);
      if (src) {
        candidateSources.set(c.id, {
          itemNo: src.itemNo,
          description: src.descriptionCn,
          descriptionEnConfirmed: src.descriptionEnConfirmed,
          unitPrice: null,
        });
      }
    }
  }

  return { quote: q, items, suggestions, candidates, candidateSources };
}

export interface DashboardStats {
  totalContracts: number;
  inProgress: number;
  pendingConfirm: number;
  completed: number;
  activeTaskCount: number;
  pendingProcess: number;
  overdue: number;
}

/** Dashboard 统计 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const db = getDb();
  const contracts = await db.select().from(contract);
  const tasks = await db.select().from(task);

  const inProgress = contracts.filter((c) => c.status === "进行中").length;
  const pendingConfirm = contracts.filter(
    (c) => c.status === "待确认完结",
  ).length;
  const completed = contracts.filter((c) => c.status === "已完结").length;

  const activeTasks = tasks.filter((t) =>
    ACTIVE_TASK_STATUSES.includes(
      t.status as (typeof ACTIVE_TASK_STATUSES)[number],
    ),
  );
  const pendingProcess = activeTasks.filter(
    (t) => t.status === "待处理",
  ).length;
  const overdue = activeTasks.filter((t) => t.status === "已逾期").length;

  return {
    totalContracts: contracts.length,
    inProgress,
    pendingConfirm,
    completed,
    activeTaskCount: activeTasks.length,
    pendingProcess,
    overdue,
  };
}
