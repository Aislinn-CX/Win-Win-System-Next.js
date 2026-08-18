import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  parseId,
  readJsonBody,
  toErrorResponse,
  validateDate,
} from "@/lib/http";
import { handleEtdChanged } from "@/workflow";

// PATCH /api/contract-items/{id}/actual-etd —— 2.4 / 4.2 ETD 录入/修改
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await readJsonBody(req);

    const etd = validateDate(body.etd, "etd");

    const result = await handleEtdChanged(getDb(), parseId(id), etd);
    return NextResponse.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
