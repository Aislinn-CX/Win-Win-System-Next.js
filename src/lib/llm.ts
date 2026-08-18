import { HttpError } from "./http";

// ============================================================
// LLM Service — 纯 I/O 层（V1：DeepSeek，raw fetch，无 SDK）
// 职责：读配置、发请求、超时控制、状态码/JSON 解析、错误映射。
// 不含业务规则、不碰数据库。后续换 provider 只改本文件。
// AI 属辅助模块，不阻塞报价确认主流程。
// ============================================================

const BASE_URL = process.env.LLM_BASE_URL ?? "https://api.deepseek.com";
const MODEL = process.env.LLM_MODEL ?? "deepseek-chat";
const TIMEOUT_MS = 30_000;

/**
 * 调 LLM 生成英文描述正文。
 * 返回 trim 后的文本（可能为空串）；出错抛 HttpError（LLM_* 错误码）。
 */
export async function generateEnglishDescription(
  prompt: string,
  system?: string,
): Promise<string> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new HttpError("LLM_CONFIG_MISSING", "未配置 LLM API Key", 503);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof Error && e.name === "AbortError") {
      throw new HttpError("LLM_TIMEOUT", "LLM 请求超时", 504);
    }
    throw new HttpError("LLM_REQUEST_FAILED", "LLM 请求失败，请检查网络", 502);
  }
  clearTimeout(timer);

  if (res.status === 429) {
    throw new HttpError(
      "LLM_RATE_LIMITED",
      "LLM 请求过于频繁，请稍后重试",
      429,
    );
  }
  if (!res.ok) {
    throw new HttpError(
      "LLM_REQUEST_FAILED",
      `LLM 请求失败（HTTP ${res.status}）`,
      502,
    );
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new HttpError("LLM_INVALID_FORMAT", "LLM 返回格式异常", 502);
  }

  const content = (data as { choices?: { message?: { content?: unknown } }[] })
    ?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new HttpError("LLM_INVALID_FORMAT", "LLM 返回格式异常", 502);
  }
  return content.trim();
}
