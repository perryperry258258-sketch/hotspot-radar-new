import { NextResponse } from "next/server";
import { collectRawResults } from "@/lib/search";
import { buildAnalysisPrompt } from "@/lib/prompt";
import { callGemini } from "@/lib/gemini";
import { buildReportFromPastedText } from "@/lib/parseReport";
import { getRecentUsedPhrases, saveReport, todayTaipei } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 比純搜尋久一點，因為多了 AI 分析這步

export async function POST() {
  const date = todayTaipei();

  try {
    const [recentUsed, search] = await Promise.all([
      getRecentUsedPhrases(5),
      collectRawResults(),
    ]);

    const todayLabel = new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    }).format(new Date());

    const prompt = buildAnalysisPrompt({
      todayLabel,
      recentUsed,
      rawResults: search.results,
    });

    const searchMeta = {
      date,
      generatedAt: new Date().toISOString(),
      prompt,
      rawResultCount: search.results.length,
      ddgCount: search.ddgCount,
      braveCount: search.braveCount,
      debug: search.debug,
    };

    // 第一步：呼叫 Gemini 做分析。失敗（沒設定 Key、額度用完、暫時性錯誤都算）
    // 就整包退回「手動複製貼上」模式，Prompt 已經準備好，使用者可以自己貼到任何 AI。
    let geminiText: string;
    try {
      geminiText = await callGemini(prompt);
    } catch (err: any) {
      const isMissingKey = err?.message === "MISSING_GEMINI_KEY";
      return NextResponse.json({
        mode: "manual",
        ...searchMeta,
        fallbackReason: isMissingKey
          ? "尚未設定 GEMINI_API_KEY，改用手動複製貼上模式。"
          : `AI 分析暫時失敗（${err?.message || "未知錯誤"}），改用手動複製貼上模式，你可以把下面的 Prompt 貼到 Claude 或其他 AI 對話視窗。`,
      });
    }

    // 第二步：解析 Gemini 回覆。萬一格式跑掉，一樣退回手動模式，
    // 但這次連 Gemini 的回覆一起附上，方便你直接複製去問別的 AI 或除錯。
    let report;
    try {
      report = buildReportFromPastedText(geminiText, date);
    } catch (err: any) {
      return NextResponse.json({
        mode: "manual",
        ...searchMeta,
        fallbackReason: `AI 回覆格式無法解析（${err?.message || "未知錯誤"}），改用手動模式。`,
      });
    }

    await saveReport(report);

    return NextResponse.json({ mode: "auto", date, generatedAt: new Date().toISOString(), report });
  } catch (err: any) {
    return NextResponse.json(
      {
        mode: "error",
        error: `⚠️ 資料收集失敗（${err?.message || "未知錯誤"}），請稍後再試一次。`,
      },
      { status: 500 }
    );
  }
}
