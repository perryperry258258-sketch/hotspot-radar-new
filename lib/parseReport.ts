import { HotspotReport, Topic } from "./types";

/**
 * AI 產生的文案常常會有「真的換行」而不是 JSON 要求的 \n 跳脫符號，
 * 這會讓 JSON.parse 直接失敗。這個函式只在字串值「裡面」把換行、
 * Tab 等控制字元轉成正確跳脫過的版本，字串以外的地方完全不動，
 * 所以不會破壞原本合法的 JSON 結構。
 */
function escapeRawControlCharsInStrings(text: string): string {
  let inString = false;
  let escaped = false;
  let out = "";

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      continue;
    }

    // inString === true
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = false;
      out += ch;
      continue;
    }
    if (ch === "\n") {
      out += "\\n";
      continue;
    }
    if (ch === "\r") {
      out += "\\r";
      continue;
    }
    if (ch === "\t") {
      out += "\\t";
      continue;
    }
    out += ch;
  }

  return out;
}

export function extractJson(text: string): any {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("貼上的內容裡找不到 JSON 物件，請確認有把 Claude 的完整回覆貼上來。");
  }
  const jsonSlice = cleaned.slice(start, end + 1);

  try {
    return JSON.parse(jsonSlice);
  } catch {
    // 第一次解析失敗，很可能是字串裡面有沒跳脫的換行，修正後再試一次
    return JSON.parse(escapeRawControlCharsInStrings(jsonSlice));
  }
}

function normalizeTopic(raw: any, index: number): Topic {
  const scores = raw.scores || {};
  const heat = Number(scores.heat) || 0;
  const audience = Number(scores.audience) || 0;
  const tone = Number(scores.tone) || 0;
  const feasibility = Number(scores.feasibility) || 0;
  const safety = Number(scores.safety) || 0;
  return {
    id: String(raw.id || `topic-${index}`),
    title: String(raw.title || "未命名話題"),
    whatHappened: String(raw.whatHappened || ""),
    whyTrending: String(raw.whyTrending || ""),
    scores: { heat, audience, tone, feasibility, safety },
    totalScore:
      typeof raw.totalScore === "number"
        ? raw.totalScore
        : heat + audience + tone + feasibility + safety,
    bestBrand: raw.bestBrand || "all",
    bestBrandLabel: String(raw.bestBrandLabel || ""),
    copyVariants: Array.isArray(raw.copyVariants) ? raw.copyVariants : [],
    sources: Array.isArray(raw.sources) ? raw.sources : [],
    timing: raw.timing || "watch",
    timingReason: String(raw.timingReason || ""),
    usedBefore: Boolean(raw.usedBefore),
    usedBeforeNote: raw.usedBeforeNote,
  };
}

/**
 * 把使用者貼回來的 Claude 回覆文字，轉成前端可以直接渲染、
 * 也可以存進歷史紀錄的 HotspotReport。
 */
export function buildReportFromPastedText(
  rawText: string,
  date: string
): HotspotReport {
  const parsed = extractJson(rawText);

  if (parsed.status === "failed" || !Array.isArray(parsed.topics)) {
    return {
      date,
      generatedAt: new Date().toISOString(),
      topics: [],
      noGoTopics: Array.isArray(parsed.noGoTopics) ? parsed.noGoTopics : [],
      status: "failed",
      failureMessage:
        parsed.failureMessage ||
        "⚠️ 這次沒有足夠即時資料，因此沒有產生推薦。",
    };
  }

  const topics = parsed.topics
    .map((t: any, i: number) => normalizeTopic(t, i))
    .sort((a: Topic, b: Topic) => b.totalScore - a.totalScore);

  return {
    date,
    generatedAt: new Date().toISOString(),
    topics,
    noGoTopics: Array.isArray(parsed.noGoTopics) ? parsed.noGoTopics : [],
    status: "ok",
  };
}
