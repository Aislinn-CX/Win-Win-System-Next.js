import { config } from "dotenv";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createConnection } from "../db/connection";

// tsx 不会自动加载 .env.local，需显式加载
config({ path: ".env.local" });

/**
 * CLI：运行迁移。
 * 用法：npx tsx src/tools/db-migrate.ts
 * 执行 ./drizzle/ 目录中未应用的迁移文件。
 */
async function main() {
  const db = createConnection();

  console.log("=== 执行数据库迁移 ===");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("=== 迁移完成 ===");

  process.exit(0);
}

main().catch((err) => {
  console.error("迁移失败：", err);
  process.exit(1);
});
