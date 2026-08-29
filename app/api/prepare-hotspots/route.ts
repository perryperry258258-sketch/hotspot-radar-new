import { NextResponse } from "next/server";
import { collectRawResults } from "@/lib/search";
import { buildAnalysisPrompt } from "@/lib/prompt";
import { getRecentUsedPhrases, todayTaipei } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // Vercel Hobby（免費方案）預設可設定到 60 秒，30 秒足夠這裡的純搜尋工作

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

    return NextResponse.json({
      date,
      generatedAt: new Date().toISOString(),
      prompt,
      rawResultCount: search.results.length,
      ddgCount: search.ddgCount,
      braveCount: search.braveCount,
      queriesUsed: search.queriesUsed,
    });
  } catch (err: any) {
    console.error("prepare-hotspots error:", err);
    return NextResponse.json(
      {
        date,
        generatedAt: new Date().toISOString(),
        error: `⚠️ 資料收集失敗（${err?.message || "未知錯誤"}），請稍後再試一次。`,
      },
      { status: 500 }
    );
  }
}
