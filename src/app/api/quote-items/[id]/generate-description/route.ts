import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { parseId, toErrorResponse } from "@/lib/http";
import { generateEnDescription } from "@/workflow";

// POST /api/quote-items/{id}/generate-description —— 调 LLM 生成英文描述建议
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await generateEnDescription(getDb(), parseId(id));
    return NextResponse.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
