import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createConnection } from "../db/connection";
import { runSeed } from "../db/seed";

// tsx 不会自动加载 .env.local，需显式加载
config({ path: ".env.local" });

/**
 * CLI：一键重置数据库。
 * 用法：npx tsx src/tools/db-reset.ts
 * 流程：DROP schema → 重建 → 迁移 → 种子。
 * 危险操作：会删除 Railway PostgreSQL 上的全部数据。
 */
async function main() {
  const db = createConnection();

  console.log("=== 重置数据库 schema ===");
  await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  console.log("=== schema 重建完成 ===");

  console.log("=== 执行迁移 ===");
  await migrate(db, { migrationsFolder: "./drizzle" });

  console.log("=== 写入种子数据 ===");
  await runSeed();

  console.log("=== 数据库重置完成 ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("重置失败：", err);
  process.exit(1);
});
