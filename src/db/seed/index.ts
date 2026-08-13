import { sql } from "drizzle-orm";
import { createConnection } from "../connection";
import { seedContracts } from "./contracts.seed";
import { seedTasks } from "./tasks.seed";
import { seedQuotes } from "./quotes.seed";

/**
 * 种子编排器：清空所有表 → 按依赖顺序写入 → 打印摘要。
 * 幂等：可重复运行，每次先 TRUNCATE。
 */
export async function runSeed() {
  const db = createConnection();

  console.log("\n=== 清空所有表 ===");
  await db.execute(sql`
    TRUNCATE TABLE
      factory_date_change_log,
      inspection_record,
      task,
      shipment_payment_record,
      contract_item,
      contract,
      quote_en_desc_suggestion,
      quote_image_candidate,
      quote_item,
      quote_feedback_log,
      quote,
      audit_log,
      customer
    RESTART IDENTITY CASCADE
  `);

  console.log("=== 写入种子数据 ===");
  const { items } = await seedContracts(db);
  await seedTasks(db, items);
  await seedQuotes(db);

  console.log("\n=== 种子数据写入完成 ===");
}
