import { config } from "dotenv";
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { contract, getDb, quote } from "@/db";

// 集成测试需要 DATABASE_URL；vitest 不会自动加载 .env.local，显式加载。
config({ path: ".env.local" });

/** 是否配置了数据库（无 DB 环境时集成测试整体跳过） */
export function hasDb(): boolean {
  return !!process.env.DATABASE_URL;
}

/** 获取数据库单例 */
export function db(): Db {
  return getDb();
}

// ---- 清理：记录本测试文件创建的合同，afterAll 统一级联删除 ----
const createdContractIds: number[] = [];
const createdQuoteIds: number[] = [];

export function trackContract(id: number) {
  createdContractIds.push(id);
}

export function trackQuote(id: number) {
  createdQuoteIds.push(id);
}

export async function cleanupTestData() {
  const db = getDb();
  for (const id of createdContractIds) {
    await db.delete(contract).where(eq(contract.id, id));
  }
  for (const id of createdQuoteIds) {
    await db.delete(quote).where(eq(quote.id, id));
  }
  createdContractIds.length = 0;
  createdQuoteIds.length = 0;
}
