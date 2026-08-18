import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { parseId, toErrorResponse } from "@/lib/http";
import { confirmImageCandidate } from "@/workflow";

// POST /api/quote-image-candidates/{id}/confirm —— 确认商品检索候选
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await confirmImageCandidate(getDb(), parseId(id));
    return NextResponse.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
