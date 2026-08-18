// ============================================================
// 客户端 fetch 助手（供 "use client" 组件调用）
// 统一解析后端的 { error_code, message, field? } 错误结构。
// 不包含业务规则——只负责请求与错误提示。
// ============================================================

export type ApiResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; message: string; field?: string };

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const json = (await res.json().catch(() => ({}))) as {
      message?: string;
      field?: string;
    };

    if (!res.ok) {
      return {
        ok: false,
        message: json.message ?? `请求失败 (${res.status})`,
        field: json.field,
      };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, message: "网络错误，请重试" };
  }
}

export const postJson = <T = unknown>(path: string, body?: unknown) =>
  apiFetch<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export const patchJson = <T = unknown>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) });
