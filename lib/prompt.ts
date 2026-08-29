import { BRAND_LIST } from "./brands";
import { RawResult } from "./search";

interface BuildPromptArgs {
  todayLabel: string;
  recentUsed: { date: string; title: string; snippet: string }[];
  rawResults: RawResult[];
}

/**
 * 產生「一整包可以直接貼到 Claude 對話視窗」的分析 Prompt。
 * 這個函式完全不呼叫任何 AI API──只是把品牌設定、規則、
 * 我們已經抓好的搜尋原始資料，組成一段文字。
 */
export function buildAnalysisPrompt({
  todayLabel,
  recentUsed,
  rawResults,
}: BuildPromptArgs): string {
  const brandBlock = BRAND_LIST.map(
    (b) => `【${b.emoji} ${b.name}】(id: "${b.id}")
定位：${b.positioning.join("、")}
語氣：${b.toneNotes.join("；")}
範例文案：
${b.example}`
  ).join("\n\n");

  const usedBlock =
    recentUsed.length > 0
      ? recentUsed
          .slice(0, 40)
          .map((u) => `- ${u.date}：《${u.title}》｜開頭句："${u.snippet}"`)
          .join("\n")
      : "（目前沒有歷史紀錄）";

  const rawBlock =
    rawResults.length > 0
      ? rawResults
          .map(
            (r, i) =>
              `${i + 1}. [查詢詞:「${r.query}」／來源:${r.source}]\n   標題：${r.title}\n   摘要：${r.snippet || "（無摘要）"}\n   網址：${r.url}`
          )
          .join("\n\n")
      : "（這次沒有抓到任何搜尋結果）";

  return `你現在要協助一個「餐飲品牌每日熱點雷達」做分析。
我不是要你自己上網搜尋，而是我已經用公開搜尋工具幫你收集好「今天」台灣網路上的原始搜尋結果
（標題／摘要／來源網址），你的任務是**只根據下面提供的這些資料**做判斷，不要用你自己記憶中的
舊資料假裝是今天的熱門話題。如果你自己也有即時上網搜尋的能力，可以拿來交叉驗證，
但不能取代下面提供的資料、也不能編造下面沒有出現過的來源或數字。

今天日期：${todayLabel}（台灣）

# 三個餐飲品牌
${brandBlock}

# 最近幾天已經用過的話題／文案開頭（避免重複推薦，除非今天聲量又明顯再度上升）
${usedBlock}

# 我幫你收集好的今日原始搜尋結果（唯一可以拿來判斷「今日熱門」的依據）
${rawBlock}

# 你要做的事情（依序執行）

## 1. 從上面的原始搜尋結果中，整理候選話題
把重複、講同一件事的搜尋結果合併成同一個話題。
如果某個話題只是被你自己聯想出來、上面的搜尋結果完全沒有支撐，就不可以列入。

## 2. 篩選與去重
- 移除明顯已經退燒、或無法從上面資料判斷是「最近／今天」還在討論的話題
- 移除與台灣使用者無關的話題
- 最後保留最多 8～10 個話題（如果上面的資料不足以支撐 8 個，寧可少列，也不要瞎編）

## 3. 風險過濾（非常重要）
以下類型必須大幅降低安全分數，甚至直接不列入最終話題清單，而是放進 noGoTopics：
政治、政治人物攻防、選舉、政黨、戰爭、死亡、犯罪、命案、災難、天災、重大事故、悲劇、
性侵、家暴、未成年案件、種族爭議、宗教爭議、仇恨言論、品牌炎上、個人醜聞。
除非該話題已經完全轉變成安全的純迷因、且完全不涉及受害者或爭議本身，
否則不要推薦餐飲品牌蹭這類話題。
把「聲量很高但不建議蹭」的話題放進 noGoTopics，並簡短說明原因。

## 4. 評分（每個保留下來的話題都要評分，1～5 分，總分 25）
- heat 話題熱度：5=今天正在大量討論／4=今天明顯熱門／3=有一定聲量／2=小眾／1=幾乎沒人討論
- audience 客群重疊度（討論這話題的人跟會吃火鍋/生魚片/Pizza/熱狗堡的18-40歲台灣消費者重疊嗎）：
  5=高度重疊／4=明顯重疊／3=普通／2=偏低／1=幾乎完全不同
- tone 調性契合度（能不能自然轉成品牌內容）：5=非常自然／4=很好轉／3=需要加工／2=很勉強／1=完全不適合
- feasibility 執行難易度（分數越高越容易執行）：5=直接發文字或現有照片即可／4=簡單做一張圖／
  3=需要簡單拍攝／2=需要活動或設計／1=需要大量製作或跨品牌合作
- safety 風險安全度（分數越高越安全）：5=完全安全／4=低風險／3=有些敏感／2=容易引戰／1=高度政治或悲劇或爭議

totalScore = heat + audience + tone + feasibility + safety（滿分 25），依此排序。

## 5. 品牌匹配
判斷每個話題最適合：dongdong（東東）、yunan（魚男）、renxing（任性俱樂部）、或 all（三店皆宜）。
如果三間都適合，可以在 copyVariants 給三個版本；但不要為了湊三個硬寫，
如果話題明顯只適合任性俱樂部，就只給任性俱樂部的版本。

## 6. 文案（每個話題至少 1 篇，最多 3 篇，依 bestBrand 決定要幾篇）
文案規則：
- 要像台灣真人在 Threads 隨手發文，不要像 AI 寫的
- 不要出現「作為一個品牌」「歡迎蒞臨」這類官方用語，不要寫成廣告文案
- 不要過度使用 emoji，不要硬塞產品
- 可以短、可以白爛、可以故意不完整、可以有反差、可以用台灣網路用語，但不要刻意裝年輕
- 每個品牌要符合各自的語氣範例的感覺（見上方品牌區塊）

## 7. 現在發不發（timing）
綜合「即時熱度／話題生命週期是否上升或退燒／品牌風險／是否需要圖片影片／現在的時間點」判斷：
- "immediate" = 🟢 建議立即發布
- "today" = 🟡 今天可以發
- "watch" = 🟠 可以觀察
- "no" = 🔴 不建議發布
並在 timingReason 用一句話說明依據。

## 8. 是否重複使用過
比對「最近幾天已經用過的話題」清單，如果這個話題本質上重複出現過，
usedBefore=true，並在 usedBeforeNote 簡短說明（例如「昨天已使用類似梗」），
除非今天聲量又明顯再度大幅上升，此時可以 usedBefore=false 並在 whyTrending 說明聲量回升。

## 9. 來源
每個話題的 sources 只能填「我幫你收集好的原始搜尋結果」裡面真的出現過的標題與網址，
不能虛構來源、不能虛構網址、也不能虛構精確的討論量數字
（例如不能寫「討論量 3.9 萬」這種你編出來的數字；如果原始資料沒有精確數字，
只能用「近期討論明顯增加」這類描述性說法）。

# 輸出格式（非常重要：只能輸出這個 JSON，不要有其他文字說明，不要用 markdown code fence 包起來）

{
  "status": "ok" | "failed",
  "failureMessage": "只有 status=failed 時才需要，說明為什麼沒有足夠即時資料",
  "topics": [
    {
      "id": "字串，簡短英數 slug",
      "title": "話題名稱",
      "whatHappened": "1~3句話說明發生什麼事",
      "whyTrending": "說明今天的社群聲量與來源依據",
      "scores": { "heat": 1-5, "audience": 1-5, "tone": 1-5, "feasibility": 1-5, "safety": 1-5 },
      "totalScore": 加總,
      "bestBrand": "dongdong" | "yunan" | "renxing" | "all",
      "bestBrandLabel": "例如：🔥 東東 或 🐟 魚男 或 🌭 任性俱樂部 或 三店皆宜",
      "copyVariants": [ { "brand": "dongdong", "brandName": "東東石頭火鍋", "content": "文案內容" } ],
      "sources": [ { "name": "來源標題，來自上面提供的搜尋結果", "url": "對應網址" } ],
      "timing": "immediate" | "today" | "watch" | "no",
      "timingReason": "一句話說明",
      "usedBefore": true | false,
      "usedBeforeNote": "選填"
    }
  ],
  "noGoTopics": [
    { "title": "話題名稱", "reason": "為什麼不建議蹭" }
  ]
}

如果上面提供的原始搜尋資料完全不足以判斷任何一個可靠的「今日熱門」話題，請回傳：
{ "status": "failed", "failureMessage": "說明原因", "topics": [], "noGoTopics": [] }

再次強調：這個 App 的核心原則是「即時性 > 文案華麗程度、真實資料 > AI 猜測、
品牌適配 > 單純熱門、安全性 > 流量」。寧可少列幾個話題，也絕對不可以編造。
分析完成後，只回覆上面規定的 JSON，不要有任何開場白或結尾說明。`;
}
