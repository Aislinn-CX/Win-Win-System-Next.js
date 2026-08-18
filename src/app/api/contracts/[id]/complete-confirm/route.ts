import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  parseId,
  readJsonBody,
  requireEnum,
  toErrorResponse,
} from "@/lib/http";
import { confirmContractCompletion } from "@/workflow";

// POST /api/contracts/{id}/complete-confirm —— 2.8 合同完结确认
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await readJsonBody(req);

    const decision = requireEnum(body, "decision", [
      "agree",
      "reject",
    ] as const);

    const result = await confirmContractCompletion(
      getDb(),
      parseId(id),
      decision,
    );
    return NextResponse.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
