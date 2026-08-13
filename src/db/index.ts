import { createConnection } from "./connection";

/** 数据库实例类型，供 Workflow Engine 等服务层函数显式传参使用 */
export type Db = ReturnType<typeof createConnection>;

let dbInstance: Db | null = null;

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
