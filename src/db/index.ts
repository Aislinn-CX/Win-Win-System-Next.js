import { createConnection } from "./connection";

let dbInstance: ReturnType<typeof createConnection> | null = null;

/**
 * 获取数据库单例。
 * 懒加载——首次调用时才建立连接，避免 build 阶段因 DATABASE_URL 不存在而报错。
 */
export function getDb() {
  if (!dbInstance) {
    dbInstance = createConnection();
  }
  return dbInstance;
}

export * from "./schema";
export * from "./types";
