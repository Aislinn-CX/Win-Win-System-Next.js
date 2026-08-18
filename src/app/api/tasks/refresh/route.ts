import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { toErrorResponse } from "@/lib/http";
import { refreshTaskStatuses } from "@/workflow";

// POST /api/tasks/refresh —— 手动触发与未来 Cron 共用的任务状态扫描入口。
// 业务规则只在 workflow.refreshTaskStatuses，本入口只做转发 + 统一错误。
// 未来接入 Cron 时，可在此增加 CRON_SECRET 校验（如 Vercel Cron 的
// `Authorization: Bearer ${CRON_SECRET}` 请求头）。
export async function POST() {
  try {
    const result = await refreshTaskStatuses(getDb());
    return NextResponse.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
