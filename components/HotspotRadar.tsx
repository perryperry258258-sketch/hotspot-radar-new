"use client";

import { useEffect, useRef, useState } from "react";
import { HotspotReport } from "@/lib/types";
import { buildReportFromPastedText } from "@/lib/parseReport";
import Top3Panel from "./Top3Panel";
import NoGoPanel from "./NoGoPanel";
import TopicCard from "./TopicCard";
import HistoryPanel from "./HistoryPanel";
import CopyButton from "./CopyButton";

const LOADING_MESSAGES = [
  "🔎 正在用 DuckDuckGo 搜尋今日話題...",
  "📰 正在整理新聞與社群結果...",
  "🧹 正在合併重複資料...",
  "✍️ 正在組合分析 Prompt...",
];

function todayLabel(): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

function todayKey(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

type Stage = "idle" | "collecting" | "prompt-ready" | "result";

export default function HotspotRadar() {
  const [stage, setStage] = useState<Stage>("idle");
  const [msgIndex, setMsgIndex] = useState(0);
  const [prompt, setPrompt] = useState<string>("");
  const [rawResultCount, setRawResultCount] = useState(0);
  const [collectError, setCollectError] = useState<string | null>(null);

  const [pasteText, setPasteText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [report, setReport] = useState<HotspotReport | null>(null);

  const [showHistory, setShowHistory] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // 進頁面時，如果今天已經解析並儲存過報告，先顯示出來，重整不會消失
    fetch(`/api/history/${todayKey()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setReport(d);
          setStage("result");
        }
      })
      .finally(() => setInitialLoad(false));
  }, []);

  async function handleCollect() {
    setStage("collecting");
    setCollectError(null);
    setMsgIndex(0);
    intervalRef.current = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
    }, 900);

    try {
      const res = await fetch("/api/prepare-hotspots", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "資料收集失敗");
      }
      setPrompt(data.prompt);
      setRawResultCount(data.rawResultCount ?? 0);
      setStage("prompt-ready");
    } catch (err: any) {
      setCollectError(err?.message || "資料收集失敗，請稍後再試一次。");
      setStage("idle");
    } finally {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }

  async function handleParse() {
    setParseError(null);
    try {
      const parsed = buildReportFromPastedText(pasteText, todayKey());
      setReport(parsed);
      setStage("result");

      // 存進歷史紀錄（同時也讓下次的「避免重複」判斷抓得到今天的話題）
      await fetch("/api/save-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: parsed }),
      });
    } catch (err: any) {
      setParseError(
        err?.message ||
          "解析失敗，請確認貼上的是 Claude 回覆的完整 JSON 內容。"
      );
    }
  }

  function handleReset() {
    setStage("idle");
    setPrompt("");
    setPasteText("");
    setParseError(null);
    setCollectError(null);
    setReport(null);
  }

  const bestTopic = report?.topics?.[0];

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-24 pt-8">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">
          🔥 餐飲品牌每日熱點雷達
        </h1>
        <p className="mt-1 text-sm text-neutral-400">{todayLabel()}</p>
        <p className="mt-1 text-xs text-neutral-600">
          純網頁搜尋整理 + 手動貼到 Claude 分析，完全不需要 API 費用
        </p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 text-center text-sm">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
          <p className="text-neutral-500">上次更新時間</p>
          <p className="mt-1 font-medium">
            {report
              ? new Date(report.generatedAt).toLocaleTimeString("zh-TW", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "尚未產生"}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
          <p className="text-neutral-500">今日已分析話題</p>
          <p className="mt-1 font-medium">{report?.topics?.length ?? 0} 個</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
          <p className="text-neutral-500">今日最佳話題</p>
          <p className="mt-1 truncate font-medium">{bestTopic?.title ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
          <p className="text-neutral-500">系統狀態</p>
          <p className="mt-1 font-medium">
            {stage === "collecting"
              ? "🟡 收集資料中"
              : stage === "prompt-ready"
              ? "🟠 等待貼回分析結果"
              : report?.status === "failed"
              ? "🔴 資料不足"
              : report
              ? "🟢 正常"
              : "⚪️ 待啟動"}
          </p>
        </div>
      </div>

      {/* Step 1：收集資料 */}
      {(stage === "idle" || stage === "collecting") && (
        <div className="mb-6 flex flex-col items-center gap-3">
          <button
            onClick={handleCollect}
            disabled={stage === "collecting"}
            className="w-full max-w-xs rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 px-6 py-5 text-lg font-bold shadow-lg shadow-red-900/30 transition active:scale-95 disabled:opacity-60"
          >
            {stage === "collecting" ? "收集中..." : "🔍 收集今日資料＋產生分析 Prompt"}
          </button>
          {collectError && (
            <p className="text-sm text-red-400">{collectError}</p>
          )}
        </div>
      )}

      {stage === "collecting" && (
        <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 text-center">
          <p className="animate-pulse text-base font-medium">
            {LOADING_MESSAGES[msgIndex]}
          </p>
        </div>
      )}

      {/* Step 2：把 Prompt 複製到 Claude，並貼回結果 */}
      {stage === "prompt-ready" && (
        <div className="mb-6 space-y-4">
          {rawResultCount > 0 ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
              ✅ 已收集到 {rawResultCount} 筆原始搜尋結果，Prompt 已經產生好了。
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300">
              ⚠️ 這次沒有抓到任何搜尋結果（免費的 DuckDuckGo 搜尋這次被擋掉或暫時失敗了，
              這是免費方案偶爾會遇到的狀況）。Prompt 還是會產生，但 Claude 會因為資料不足
              而回覆「資料不足」。建議：稍等一下再重新收集一次；如果常常發生，可以申請
              免費的 Brave Search API Key 填進 <code>SEARCH_API_KEY</code> 當備援
              （README 有申請連結）。
            </div>
          )}

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold">① 複製下面這段 Prompt</h2>
              <CopyBut
