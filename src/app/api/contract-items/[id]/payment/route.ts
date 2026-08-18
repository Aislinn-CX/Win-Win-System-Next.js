import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  parseId,
  readJsonBody,
  toErrorResponse,
  validateDate,
} from "@/lib/http";
import { recordPayment } from "@/workflow";

// PATCH /api/contract-items/{id}/payment —— 2.5 DP 收款 / 2.6 OA 收款
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await readJsonBody(req);

    const paymentDate = validateDate(body.paymentDate, "paymentDate");

    const result = await recordPayment(getDb(), parseId(id), paymentDate);
    return NextResponse.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
