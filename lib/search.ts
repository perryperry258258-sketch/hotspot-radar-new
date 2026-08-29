import * as cheerio from "cheerio";

export interface RawResult {
  title: string;
  url: string;
  snippet: string;
  query: string;
  source: "duckduckgo" | "brave";
}

export interface DebugEntry {
  engine: string;
  query: string;
  ok: boolean;
  httpStatus?: number;
  resultCount: number;
  error?: string;
}

// 涵蓋題目要求的各種面向：Threads、爆文、迷因、新聞、生活、美食、流行文化
// 數量刻意精簡（原本 8 組），避免整個流程在 Vercel 免費方案的執行時間限制內逾時。
const QUERIES = [
  "今天 台灣 threads 熱門 討論",
  "台灣 今日 爆文",
  "台灣 迷因 話題",
  "台灣 今天 新聞 討論度",
  "台灣 社群 熱議",
  "台灣 美食 話題 討論",
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

interface EngineOutcome {
  results: RawResult[];
  debug: DebugEntry;
}

async function ddgLiteSearch(query: string, maxResults = 8): Promise<EngineOutcome> {
  const engine = "duckduckgo-lite";
  try {
    const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}&kl=tw-tzh`;
    const res = await fetch(url, { headers: COMMON_HEADERS, cache: "no-store" });
    if (!res.ok) {
      return {
        results: [],
        debug: { engine, query, ok: false, httpStatus: res.status, resultCount: 0 },
      };
    }
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

    return {
      results,
      debug: { engine, query, ok: true, httpStatus: res.status, resultCount: results.length },
    };
  } catch (err: any) {
    return {
      results: [],
      debug: { engine, query, ok: false, resultCount: 0, error: String(err?.message || err) },
    };
  }
}

async function ddgHtmlSearch(query: string, maxResults = 8): Promise<EngineOutcome> {
  const engine = "duckduckgo-html";
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=tw-tzh`;
    const res = await fetch(url, { headers: COMMON_HEADERS, cache: "no-store" });
    if (!res.ok) {
      return {
        results: [],
        debug: { engine, query, ok: false, httpStatus: res.status, resultCount: 0 },
      };
    }
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

    return {
      results,
      debug: { engine, query, ok: true, httpStatus: res.status, resultCount: results.length },
    };
  } catch (err: any) {
    return {
      results: [],
      debug: { engine, query, ok: false, resultCount: 0, error: String(err?.message || err) },
    };
  }
}

async function ddgSearch(
  query: string,
  maxResults = 8
): Promise<{ results: RawResult[]; debug: DebugEntry[] }> {
  const lite = await ddgLiteSearch(query, maxResults);
  if (lite.results.length > 0) {
    return { results: lite.results, debug: [lite.debug] };
  }
  const html = await ddgHtmlSearch(query, maxResults);
  return { results: html.results, debug: [lite.debug, html.debug] };
}

/**
 * 選用的 Brave Search 補充來源。只有設定 SEARCH_API_KEY 才會啟用；
 * 沒設定就直接回傳空陣列，完全不影響主流程。
 */
async function braveSearch(
  query: string,
  maxResults = 6
): Promise<{ results: RawResult[]; debug: DebugEntry }> {
  const apiKey = process.env.SEARCH_API_KEY;
  if (!apiKey) {
    return { results: [], debug: { engine: "brave", query, ok: true, resultCount: 0, error: "no key configured" } };
  }
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
    if (!res.ok) {
      return { results: [], debug: { engine: "brave", query, ok: false, httpStatus: res.status, resultCount: 0 } };
    }
    const data = await res.json();
    const webResults = data?.web?.results ?? [];
    const results = webResults
      .filter((r: any) => r?.title && r?.url)
      .map((r: any) => ({
        title: r.title,
        url: r.url,
        snippet: r.description ?? "",
        query,
        source: "brave" as const,
      }));
    return {
      results,
      debug: { engine: "brave", query, ok: true, httpStatus: res.status, resultCount: results.length },
    };
  } catch (err: any) {
    return {
      results: [],
      debug: { engine: "brave", query, ok: false, resultCount: 0, error: String(err?.message || err) },
    };
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
  debug: DebugEntry[];
}

/**
 * 依序（平行）打完所有預設查詢，彙整原始搜尋結果。
 * 這裡完全不呼叫任何 LLM，只做「抓資料」這件事。
 * 同時回傳 debug 陣列，方便診斷是連線失敗、被擋、還是格式跑掉。
 *
 * 如果有設定 SEARCH_API_KEY（Brave），就完全跳過 DuckDuckGo：
 * Brave 是正式 API，比較快也比較穩，跳過 DDG 可以大幅縮短整個流程的時間，
 * 避免在 Vercel 免費方案的執行時間限制內逾時。
 */
export async function collectRawResults(): Promise<SearchSummary> {
  const hasBrave = Boolean(process.env.SEARCH_API_KEY);

  const ddgBatches = hasBrave
    ? []
    : await Promise.all(QUERIES.map((q) => ddgSearch(q)));
  const braveBatches = await Promise.all(QUERIES.map((q) => braveSearch(q)));

  const ddgResults = ddgBatches.flatMap((b) => b.results);
  const braveResults = braveBatches.flatMap((b) => b.results);
  const merged = dedupe([...ddgResults, ...braveResults]);

  const debug: DebugEntry[] = [
    ...ddgBatches.flatMap((b) => b.debug),
    ...braveBatches.map((b) => b.debug),
  ];

  return {
    results: merged,
    queriesUsed: QUERIES,
    ddgCount: ddgResults.length,
    braveCount: braveResults.length,
    debug,
  };
}
