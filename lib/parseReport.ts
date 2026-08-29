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

/**
 * 當 JSON 被截斷或格式有小瑕疵、直接解析失敗時，嘗試「搶救」：
 * 找到最後一個語法上完整、安全的截斷點（例如某個逗號、或某個
 * } / ] 結束的地方），把後面不完整的內容丟掉，再自動補上對應的
 * 收尾括號。這樣至少能保留前面已經產生好的話題，而不是整份作廢。
 */
function repairTruncatedJson(text: string): string | null {
  let inString = false;
  let escaped = false;
  let lastSafeIndex = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "," || ch === "}" || ch === "]") {
      lastSafeIndex = i;
    }
  }

  if (lastSafeIndex === -1) return null;

  let truncated = text.slice(0, lastSafeIndex + 1).replace(/,\s*$/, "");

  const stack: string[] = [];
  let inString2 = false;
  let escaped2 = false;
  for (let i = 0; i < truncated.length; i++) {
    const ch = truncated[i];
    if (inString2) {
      if (escaped2) {
        escaped2 = false;
        continue;
      }
      if (ch === "\\") {
        escaped2 = true;
        continue;
      }
      if (ch === '"') inString2 = false;
      continue;
    }
    if (ch === '"') {
      inString2 = true;
      continue;
    }
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }

  const closers = stack
    .reverse()
    .map((c) => (c === "{" ? "}" : "]"))
    .join("");

  return truncated + closers;
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

  // 依序嘗試：直接解析 → 修正字串內換行後解析 → 搶救截斷後解析（兩種版本都試）
  const attempts = [
    () => JSON.parse(jsonSlice),
    () => JSON.parse(escapeRawControlCharsInStrings(jsonSlice)),
    () => {
      const repaired = repairTruncatedJson(jsonSlice);
      if (!repaired) throw new Error("no safe truncation point");
      return JSON.parse(repaired);
    },
    () => {
      const repaired = repairTruncatedJson(escapeRawControlCharsInStrings(jsonSlice));
      if (!repaired) throw new Error("no safe truncation point");
      return JSON.parse(repaired);
    },
  ];

  let lastErr: any;
  for (const attempt of attempts) {
    try {
      return attempt();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
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
