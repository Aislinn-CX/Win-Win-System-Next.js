import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * 创建数据库连接。
 * 仅在运行时调用——build 阶段（静态生成）不应触发此函数。
 */
export function createConnection(databaseUrl?: string) {
  const url = databaseUrl ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to connect to Railway PostgreSQL");
  }

  // postgres 包自带连接池，max 控制并发连接上限
  const client = postgres(url, { max: 10 });

  return drizzle(client, { schema });
}
