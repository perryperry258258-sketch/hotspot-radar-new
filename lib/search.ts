import * as cheerio from "cheerio";

export interface RawResult {
  title: string;
  url: string;
  snippet: string;
  query: string;
  source: "duckduckgo" | "brave";
}

// 涵蓋題目要求的各種面向：Threads、爆文、迷因、新聞、生活、美食、流行文化
const QUERIES = [
  "今天 台灣 threads 熱門 討論",
  "台灣 threads 熱門話題",
  "台灣 今日 爆文",
  "台灣 迷因 話題",
  "台灣 今天 新聞 討論度",
  "台灣 社群 熱議",
  "台灣 美食 話題 討論",
  "台灣 流行文化 話題",
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function decodeDdgHref(rawHref: string): string {
  if (!rawHref) return rawHref;
  try {
    const full = rawHref.startsWith("http") ? rawHref : `https:${rawHref}`;
    const u = new URL(full);
    const uddg = u.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
    return full;
  } catch {
    return rawHref;
  }
}

/**
 * 使用 DuckDuckGo 的 HTML 版搜尋結果頁（https://html.duckduckgo.com/html/）。
 * 這是免費、不需要任何 API Key 的公開搜尋管道，沒有官方 API 保證，
 * 純粹是解析公開的 HTML 搜尋結果頁面，所以標記為「盡力而為」的資料來源──
 * 如果 DuckDuckGo 改版或暫時擋掉請求，這裡會直接回傳空陣列，不會讓整個流程掛掉。
 */
async function ddgSearch(query: string, maxResults = 8): Promise<RawResult[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
      query
    )}&kl=tw-tzh`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const results: RawResult[] = [];

    $(".result").each((_, el) => {
      if (results.length >= maxResults) return;
      const titleEl = $(el).find(".result__title a.result__a").first();
      const title = titleEl.text().trim();
      if (!title) return;
      const href = decodeDdgHref(titleEl.attr("href") || "");
      const snippet = $(el).find(".result__snippet").text().trim();
      results.push({ title, url: href, snippet, query, source: "duckduckgo" });
    });

    return results;
  } catch {
    return [];
  }
}

/**
 * 選用的 Brave Search 補充來源。只有設定 SEARCH_API_KEY 才會啟用；
 * 沒設定就直接回傳空陣列，完全不影響主流程。
 */
async function braveSearch(query: string, maxResults = 6): Promise<RawResult[]> {
  const apiKey = process.env.SEARCH_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
        query
      )}&count=${maxResults}&country=TW&search_lang=zh-hant`,
      {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": apiKey,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const webResults = data?.web?.results ?? [];
    return webResults
      .filter((r: any) => r?.title && r?.url)
      .map((r: any) => ({
        title: r.title,
        url: r.url,
        snippet: r.description ?? "",
        query,
        source: "brave" as const,
      }));
  } catch {
    return [];
  }
}

function dedupe(results: RawResult[]): RawResult[] {
  const seen = new Set<string>();
  const out: RawResult[] = [];
  for (const r of results) {
    const key = (r.url || r.title).toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export interface SearchSummary {
  results: RawResult[];
  queriesUsed: string[];
  ddgCount: number;
  braveCount: number;
}

/**
 * 依序（平行）打完所有預設查詢，彙整原始搜尋結果。
 * 這裡完全不呼叫任何 LLM，只做「抓資料」這件事。
 */
export async function collectRawResults(): Promise<SearchSummary> {
  const ddgBatches = await Promise.all(QUERIES.map((q) => ddgSearch(q)));
  const braveBatches = await Promise.all(QUERIES.map((q) => braveSearch(q)));

  const ddgResults = ddgBatches.flat();
  const braveResults = braveBatches.flat();
  const merged = dedupe([...ddgResults, ...braveResults]);

  return {
    results: merged,
    queriesUsed: QUERIES,
    ddgCount: ddgResults.length,
    braveCount: braveResults.length,
  };
}
