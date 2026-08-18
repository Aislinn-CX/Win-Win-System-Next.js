import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  optionalString,
  parseId,
  readJsonBody,
  toErrorResponse,
} from "@/lib/http";
import { confirmEnDescription } from "@/workflow";

// POST /api/quote-en-suggestions/{id}/confirm —— 确认英文描述建议（可带 finalText 覆盖）
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await readJsonBody(req);
    const finalText = optionalString(body.finalText, "finalText");

    const result = await confirmEnDescription(
      getDb(),
      parseId(id),
      finalText ?? undefined,
    );
    return NextResponse.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
