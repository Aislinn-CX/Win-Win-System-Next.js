import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { parseId, toErrorResponse } from "@/lib/http";
import { checkQuote } from "@/workflow";

// POST /api/quotes/{id}/check —— 2.1 报价单自查
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await checkQuote(getDb(), parseId(id));
    return NextResponse.json(result);
  } catch (e) {
    return toErrorResponse(e);
  }
}
