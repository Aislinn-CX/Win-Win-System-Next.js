import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { parseId, toErrorResponse } from "@/lib/http";
import { confirmQuote } from "@/workflow";

// POST /api/quotes/{id}/confirm —— 待用户确认 → 已确认入库
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await confirmQuote(getDb(), parseId(id));
    return NextResponse.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
