import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  parseId,
  readJsonBody,
  requireEnum,
  toErrorResponse,
  validateDate,
} from "@/lib/http";
import { completeTask, postponeTask, updateCompletedAt } from "@/workflow";

// PATCH /api/tasks/{id} —— 5.2 任务状态机（完成 / 延期 / 改完成日期）
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await readJsonBody(req);

    const action = requireEnum(body, "action", [
      "complete",
      "postpone",
      "update_completed_at",
    ] as const);

    const db = getDb();
    const taskId = parseId(id);

    let result: unknown;
    if (action === "complete") {
      const completedAt =
        body.completedAt != null
          ? validateDate(body.completedAt, "completedAt")
          : undefined;
      result = await completeTask(db, taskId, completedAt);
    } else if (action === "postpone") {
      const nextRemindDate = validateDate(
        body.nextRemindDate,
        "nextRemindDate",
      );
      result = await postponeTask(db, taskId, nextRemindDate);
    } else {
      const completedAt = validateDate(body.completedAt, "completedAt");
      result = await updateCompletedAt(db, taskId, completedAt);
    }

    return NextResponse.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
