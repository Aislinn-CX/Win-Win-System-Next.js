import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  badRequest,
  numericString,
  optionalNumericString,
  optionalString,
  readJsonBody,
  requireEnum,
  requireString,
  toErrorResponse,
  validateDate,
} from "@/lib/http";
import { createContract } from "@/workflow";

// POST /api/contracts —— 2.2 订单录入
export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);

    const contractNo = requireString(body, "contractNo");
    const customerName = requireString(body, "customerName");
    const customerCountry = requireString(body, "customerCountry");
    const paymentType = requireEnum(body, "paymentType", ["DP", "OA"] as const);
    const remark = optionalString(body.remark, "remark");

    const itemsRaw = body.items;
    if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
      throw badRequest("INVALID_FIELD", "items 必须是非空数组", "items");
    }

    const items = itemsRaw.map((raw, i) => {
      const it = raw as Record<string, unknown>;
      const field = `items[${i}]`;
      return {
        itemNo: requireString(it, "itemNo"),
        description: requireString(it, "description"),
        orderQty: numericString(it.orderQty, `${field}.orderQty`),
        unitPrice: numericString(it.unitPrice, `${field}.unitPrice`),
        amount: numericString(it.amount, `${field}.amount`),
        cbm: optionalNumericString(it.cbm, `${field}.cbm`),
        originalFactoryDate: validateDate(
          it.originalFactoryDate,
          `${field}.originalFactoryDate`,
        ),
      };
    });

    const result = await createContract(getDb(), {
      contractNo,
      customerName,
      customerCountry,
      paymentType,
      remark,
      items,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
