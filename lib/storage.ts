import fs from "fs/promises";
import path from "path";
import { HistorySummary, HotspotReport } from "./types";

function dataDir(): string {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  // Vercel 的部署檔案（包含 process.cwd() 底下的東西）是唯讀的，
  // 只有 /tmp 可以寫入。這代表在 Vercel 上歷史紀錄只是暫時性的
  // （跟 README 裡說明的限制一致），但至少不會讓整個請求爆掉。
  if (process.env.VERCEL) return "/tmp/data";
  return path.join(process.cwd(), "data");
}

function historyDir(): string {
  return path.join(dataDir(), "history");
}

async function ensureDir() {
  await fs.mkdir(historyDir(), { recursive: true });
}

/** Today's date string in Asia/Taipei, format YYYY-MM-DD */
export function todayTaipei(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

export async function saveReport(report: HotspotReport): Promise<void> {
  await ensureDir();
  const file = path.join(historyDir(), `${report.date}.json`);
  await fs.writeFile(file, JSON.stringify(report, null, 2), "utf-8");
}

export async function getReport(date: string): Promise<HotspotReport | null> {
  try {
    const file = path.join(historyDir(), `${date}.json`);
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as HotspotReport;
  } catch {
    return null;
  }
}

export async function listHistory(): Promise<HistorySummary[]> {
  await ensureDir();
  const files = await fs.readdir(historyDir());
  const dates = files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort((a, b) => (a < b ? 1 : -1)); // newest first

  const summaries: HistorySummary[] = [];
  for (const date of dates) {
    const report = await getReport(date);
    if (!report) continue;
    const top = report.topics[0];
    summaries.push({
      date,
      topicCount: report.topics.length,
      topTopicTitle: top?.title,
      topBrand: top?.bestBrandLabel,
      status: report.status,
    });
  }
  return summaries;
}

/**
 * 收集最近 N 天已經使用過的話題標題 / 文案關鍵句，
 * 用來提示模型「這個已經用過，除非聲量再度大幅上升，否則降低推薦」。
 */
export async function getRecentUsedPhrases(
  days = 5
): Promise<{ date: string; title: string; snippet: string }[]> {
  const summaries = await listHistory();
  const recentDates = summaries.slice(0, days).map((s) => s.date);
  const out: { date: string; title: string; snippet: string }[] = [];

  for (const date of recentDates) {
    const report = await getReport(date);
    if (!report) continue;
    for (const t of report.topics) {
      const firstLine = t.copyVariants[0]?.content?.split("\n")[0] ?? "";
      out.push({ date, title: t.title, snippet: firstLine });
    }
  }
  return out;
}
