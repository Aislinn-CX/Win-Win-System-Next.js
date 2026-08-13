import { config } from "dotenv";
import { runSeed } from "../db/seed";

// tsx 不会自动加载 .env.local，需显式加载
config({ path: ".env.local" });

/**
 * CLI：写入种子数据。
 * 用法：npx tsx src/tools/db-seed.ts
 */
async function main() {
  await runSeed();
  process.exit(0);
}

main().catch((err) => {
  console.error("种子写入失败：", err);
  process.exit(1);
});
