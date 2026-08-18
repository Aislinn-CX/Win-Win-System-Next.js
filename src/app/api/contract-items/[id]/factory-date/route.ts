import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  optionalString,
  parseId,
  readJsonBody,
  toErrorResponse,
  validateDate,
} from "@/lib/http";
import { handleFactoryDateChanged } from "@/workflow";

// PATCH /api/contract-items/{id}/factory-date —— 2.3 / 4.1 工厂交期变更
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await readJsonBody(req);

    const newDate = validateDate(body.newDate, "newDate");
    const remark = optionalString(body.remark, "remark");

    const result = await handleFactoryDateChanged(
      getDb(),
      parseId(id),
      newDate,
      remark,
    );
    return NextResponse.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
