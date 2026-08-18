import { NextResponse } from "next/server";

// ============================================================
// API 层统一响应与参数校验工具
// 铁律（SDD 第 10 章）：API 只做参数校验 / 鉴权 / 转发，业务规则
// 一律在 src/workflow/。统一错误结构：{ error_code, message, field? }
// ============================================================

export class HttpError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number = 400,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function badRequest(
  code: string,
  message: string,
  field?: string,
): HttpError {
  return new HttpError(code, message, 400, field);
}

// ---- 读取 / 解析 ----

/** 解析请求体 JSON；空 body 视为 {}，非法 JSON → 400 */
export async function readJsonBody(
  req: Request,
): Promise<Record<string, unknown>> {
  try {
    const text = await req.text();
    if (!text) return {};
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw badRequest("INVALID_JSON", "请求体必须是合法的 JSON");
  }
}

/** 解析路径参数中的正整数 id */
export function parseId(value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw badRequest("INVALID_ID", `非法的资源 id：「${value}」`);
  }
  return n;
}

// ---- 字段校验 ----

/** 校验 YYYY-MM-DD 日期 */
export function validateDate(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw badRequest("INVALID_DATE", `${field} 必须是 YYYY-MM-DD 格式`, field);
  }
  return value;
}

/** 必填字符串字段（首尾空白去除后不能为空） */
export function requireString(
  body: Record<string, unknown>,
  field: string,
): string {
  const v = body[field];
  if (typeof v !== "string" || v.trim() === "") {
    throw badRequest("MISSING_FIELD", `缺少必填字段 ${field}`, field);
  }
  return v.trim();
}

/** 必填枚举字段 */
export function requireEnum<T extends string>(
  body: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
): T {
  const v = body[field];
  if (typeof v !== "string" || !(allowed as readonly string[]).includes(v)) {
    throw badRequest(
      "INVALID_FIELD",
      `${field} 必须是 ${allowed.join(" / ")}`,
      field,
    );
  }
  return v as T;
}

/** 可选枚举字段 */
export function optionalEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): T | undefined {
  if (value == null || value === "") return undefined;
  if (
    typeof value !== "string" ||
    !(allowed as readonly string[]).includes(value)
  ) {
    throw badRequest(
      "INVALID_FIELD",
      `${field} 必须是 ${allowed.join(" / ")}`,
      field,
    );
  }
  return value as T;
}

/**
 * 数值字段 → 字符串（numeric 列 postgres-js 要求字符串传入）。
 * 接受 number 或 "123.45" 形式的字符串。
 */
export function numericString(value: unknown, field: string): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim())) {
    return value.trim();
  }
  throw badRequest("INVALID_NUMBER", `${field} 必须是数字`, field);
}

/** 可选数值字段 → 字符串 | null */
export function optionalNumericString(
  value: unknown,
  field: string,
): string | null {
  if (value == null || value === "") return null;
  return numericString(value, field);
}

/** 可选字符串字段（null / 空串归一为 null） */
export function optionalString(value: unknown, field: string): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") {
    throw badRequest("INVALID_FIELD", `${field} 必须是字符串`, field);
  }
  const t = value.trim();
  return t === "" ? null : t;
}

// ---- 异常 → 统一错误响应 ----

/** 引擎抛出的裸错误码 → { 中文提示, HTTP 状态 } */
const ENGINE_CODE_MESSAGES: Record<
  string,
  { message: string; status: number }
> = {
  MISSING_FAIL_REASON: { message: "验货失败时必须填写失败原因", status: 400 },
  MISSING_RETEST_DECISION: {
    message: "验货失败时必须选择是否重验",
    status: 400,
  },
  MISSING_RETEST_DATE: { message: "选择重验时必须填写重验日期", status: 400 },
  MISSING_HANDLING_METHOD: {
    message: "选择不重验时必须填写处理方式",
    status: 400,
  },
  NOT_ALL_ITEMS_COMPLETED: {
    message: "合同下存在未完成的产品，不能完结",
    status: 400,
  },
};

/** 将任意异常转为统一错误响应 { error_code, message, field? } */
export function toErrorResponse(e: unknown): NextResponse {
  if (e instanceof HttpError) {
    const body: Record<string, unknown> = {
      error_code: e.code,
      message: e.message,
    };
    if (e.field) body.field = e.field;
    return NextResponse.json(body, { status: e.httpStatus });
  }

  if (e instanceof Error) {
    const msg = e.message;
    // 引擎直接抛裸错误码（如 MISSING_FAIL_REASON）
    if (/^[A-Z][A-Z0-9_]*$/.test(msg)) {
      const mapped = ENGINE_CODE_MESSAGES[msg];
      if (mapped) {
        return NextResponse.json(
          { error_code: msg, message: mapped.message },
          { status: mapped.status },
        );
      }
      return NextResponse.json(
        { error_code: msg, message: msg },
        { status: 400 },
      );
    }
    // 引擎抛「xx 不存在」等中文提示 → 404
    if (msg.includes("不存在")) {
      return NextResponse.json(
        { error_code: "NOT_FOUND", message: msg },
        { status: 404 },
      );
    }
    // 业务校验类错误 → 400
    if (/不可|必须|不能|为空|状态为|非「已完成」/.test(msg)) {
      return NextResponse.json(
        { error_code: "VALIDATION_ERROR", message: msg },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error_code: "INTERNAL_ERROR", message: msg },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { error_code: "INTERNAL_ERROR", message: "服务器内部错误" },
    { status: 500 },
  );
}
