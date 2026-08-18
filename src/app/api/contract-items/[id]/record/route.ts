import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  badRequest,
  parseId,
  readJsonBody,
  toErrorResponse,
  validateDate,
} from "@/lib/http";
import { updateItemRecordFields } from "@/workflow";

// PATCH /api/contract-items/{id}/record —— 更新纯记录字段（无任务/状态联动）
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await readJsonBody(req);

    const input = {
      plannedEtd: optionalDate(body, "plannedEtd"),
      bookingStatus: optionalText(body, "bookingStatus"),
      loadingDate: optionalDate(body, "loadingDate"),
      docsSentStatus: optionalBool(body, "docsSentStatus"),
      docsSentDate: optionalDate(body, "docsSentDate"),
      expectedPaymentDate: optionalDate(body, "expectedPaymentDate"),
      factoryActualDoneDate: optionalDate(body, "factoryActualDoneDate"),
      remark: optionalText(body, "remark"),
    };

    const result = await updateItemRecordFields(getDb(), parseId(id), input);
    return NextResponse.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}

/** 可选日期：undefined=不改，null/""=清空，字符串=校验后写入 */
function optionalDate(
  body: Record<string, unknown>,
  key: string,
): string | null | undefined {
  const v = body[key];
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  return validateDate(v, key);
}

/** 可选文本：undefined=不改，null/""=清空，字符串=trim 后写入 */
function optionalText(
  body: Record<string, unknown>,
  key: string,
): string | null | undefined {
  const v = body[key];
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  if (typeof v !== "string") {
    throw badRequest("INVALID_FIELD", `${key} 必须是字符串`, key);
  }
  return v.trim() || null;
}

/** 可选布尔：undefined=不改，null=清空，布尔=写入 */
function optionalBool(
  body: Record<string, unknown>,
  key: string,
): boolean | null | undefined {
  const v = body[key];
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "boolean") {
    throw badRequest("INVALID_FIELD", `${key} 必须是布尔值`, key);
  }
  return v;
}
