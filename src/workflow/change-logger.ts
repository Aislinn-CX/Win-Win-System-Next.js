import { auditLog } from "../db";
import type { Db } from "../db";

// ============================================================
// Change Logger — 变更日志记录器（SDD 3.2）
// 职责：对所有状态写入无差别记录 audit_log（SDD 开发规范第 5 条）。
// 业务代码不手动埋点，统一由本组件 + StateUpdater 处理。
// ============================================================

export interface ChangeEntry {
  entityType: string;
  entityId: number;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  /** 操作来源：用户 / Workflow Engine 自动 / AI建议确认 */
  changedBy?: string;
}

/** 写入单条审计日志（追加，永久保留） */
export async function logChange(db: Db, entry: ChangeEntry) {
  await db.insert(auditLog).values({
    entityType: entry.entityType,
    entityId: entry.entityId,
    fieldName: entry.fieldName,
    oldValue: entry.oldValue,
    newValue: entry.newValue,
    changedBy: entry.changedBy ?? "Workflow Engine",
  });
}

/** 批量写入审计日志 */
export async function logChanges(db: Db, entries: ChangeEntry[]) {
  if (entries.length === 0) return;
  await db.insert(auditLog).values(
    entries.map((e) => ({
      entityType: e.entityType,
      entityId: e.entityId,
      fieldName: e.fieldName,
      oldValue: e.oldValue,
      newValue: e.newValue,
      changedBy: e.changedBy ?? "Workflow Engine",
    })),
  );
}
