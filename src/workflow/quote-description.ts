import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { quoteItem } from "../db";
import { HttpError } from "../lib/http";
import { generateEnglishDescription } from "../lib/llm";
import { saveEnDescriptionSuggestion } from "./quote-suggestion";

// ============================================================
// 英文描述 LLM 生成（Step ⑦）
// 职责：读 quote_item → 构建 prompt → 调 LLM → 校验非空 → 落库为「待确认」建议。
// 不变量：永不写 quote_item.descriptionEnConfirmed（仅用户确认动作 confirmEnDescription 写入）。
// AI 属辅助模块，不阻塞报价确认主流程。
// ============================================================

const SYSTEM_PROMPT =
  "你是一名专业的外贸跟单员，负责将中文商品描述改写成准确、规范的英文产品描述。";

/** 生成英文描述建议（调 LLM + 落库；LLM 生成后唯一落库入口为 saveEnDescriptionSuggestion） */
export async function generateEnDescription(db: Db, quoteItemId: number) {
  const [item] = await db
    .select()
    .from(quoteItem)
    .where(eq(quoteItem.id, quoteItemId))
    .limit(1);
  if (!item) throw new Error(`quote_item ${quoteItemId} 不存在`);

  const suggestedText = await generateEnglishDescription(
    buildPrompt(item),
    SYSTEM_PROMPT,
  );

  if (!suggestedText.trim()) {
    throw new HttpError("LLM_EMPTY_RESPONSE", "LLM 返回空内容", 502);
  }

  return saveEnDescriptionSuggestion(
    db,
    quoteItemId,
    suggestedText,
    "DeepSeek LLM 基于中文描述及尺寸/重量生成",
  );
}

/** 用现有 quote_item 字段构建 prompt（不新增字段） */
function buildPrompt(item: typeof quoteItem.$inferSelect): string {
  const lines: string[] = [
    `货号：${item.itemNo}`,
    `中文描述：${item.descriptionCn}`,
  ];
  if (item.length != null || item.width != null || item.height != null) {
    lines.push(
      `尺寸（长×宽×高 cm）：${item.length ?? "-"} × ${item.width ?? "-"} × ${item.height ?? "-"}`,
    );
  }
  if (item.netWeight != null) lines.push(`净重（kg）：${item.netWeight}`);
  if (item.grossWeight != null) lines.push(`毛重（kg）：${item.grossWeight}`);
  if (item.cbm != null) lines.push(`体积（CBM）：${item.cbm}`);
  lines.push(
    "",
    "要求：",
    "- 只输出英文描述正文，不要任何解释、前缀、标题或 Markdown。",
    "- 使用规范的外贸产品描述用语，完整保留关键规格。",
    "- 中文描述未提及的规格不要凭空编造。",
  );
  return lines.join("\n");
}
