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

const COMMON_HEADERS = {
  "User-Agent": UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
  Referer: "https://duckduckgo.com/",
};

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
 * 第一優先：lite.duckduckgo.com/lite/ ── 這是 DuckDuckGo 給低頻寬/文字瀏覽器用的
 * 簡化版頁面，結構單純很多，實務上比 html.duckduckgo.com/html/ 更不容易被擋或改版。
 */
async function ddgLiteSearch(
  query: string,
  maxResults = 8
): Promise<RawResult[]> {
  try {
    const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(
      query
    )}&kl=tw-tzh`;
    const res = await fetch(url, { headers: COMMON_HEADERS, cache: "no-store" });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const results: RawResult[] = [];

    $("a.result-link").each((_, el) => {
      if (results.length >= maxResults) return;
      const title = $(el).text().trim();
      if (!title) return;
      const href = decodeDdgHref($(el).attr("href") || "");
      const snippetRow = $(el).closest("tr").next("tr");
      const snippet = snippetRow.find(".result-snippet").text().trim();
      results.push({ title, url: href, snippet, query, source: "duckduckgo" });
    });

    return results;
  } catch {
    return [];
  }
}

/**
 * 第二優先（fallback）：html.duckduckgo.com/html/ 的一般版面。
 * 只有 lite 版沒抓到任何結果時才會用到。
 */
async function ddgHtmlSearch(
  query: string,
  maxResults = 8
): Promise<RawResult[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
      query
    )}&kl=tw-tzh`;
    const res = await fetch(url, { headers: COMMON_HEADERS, cache: "no-store" });
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

async function ddgSearch(query: string, maxResults = 8): Promise<RawResult[]> {
  const lite = await ddgLiteSearch(query, maxResults);
  if (lite.length > 0) return lite;
  // lite 版沒抓到任何東西，才多打一次 html 版當備援
  return ddgHtmlSearch(query, maxResults);
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
