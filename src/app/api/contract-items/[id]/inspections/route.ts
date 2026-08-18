import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  optionalEnum,
  optionalString,
  parseId,
  readJsonBody,
  requireEnum,
  toErrorResponse,
  validateDate,
} from "@/lib/http";
import { handleInspectionResult } from "@/workflow";

// POST /api/contract-items/{id}/inspections —— 2.7 验货
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await readJsonBody(req);

    const inspectionDate = validateDate(body.inspectionDate, "inspectionDate");
    const result = requireEnum(body, "result", ["Pass", "Fail"] as const);

    const input = {
      inspectionDate,
      result,
      failReason: optionalString(body.failReason, "failReason"),
      retestDecision: optionalEnum(body.retestDecision, "retestDecision", [
        "重验",
        "不重验",
      ] as const),
      retestDate:
        body.retestDate != null
          ? validateDate(body.retestDate, "retestDate")
          : null,
      handlingMethod: optionalString(body.handlingMethod, "handlingMethod"),
    };

    const out = await handleInspectionResult(getDb(), parseId(id), input);
    return NextResponse.json(out, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
