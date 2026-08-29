"use client";

import { useEffect, useState } from "react";
import { HistorySummary, HotspotReport } from "@/lib/types";
import TopicCard from "./TopicCard";

export default function HistoryPanel({ onClose }: { onClose: () => void }) {
  const [history, setHistory] = useState<HistorySummary[]>([]);
  const [selected, setSelected] = useState<HotspotReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((d) => setHistory(d.history || []))
      .finally(() => setLoading(false));
  }, []);

  async function openDate(date: string) {
    const res = await fetch(`/api/history/${date}`);
    if (res.ok) {
      setSelected(await res.json());
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <div className="h-full w-full max-w-md overflow-y-auto bg-neutral-950 p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">📚 歷史紀錄</h2>
          <button
            onClick={onClose}
            className="rounded-full bg-neutral-800 px-3 py-1 text-sm hover:bg-neutral-700"
          >
            關閉
          </button>
        </div>

        {selected ? (
          <div>
            <button
              onClick={() => setSelected(null)}
              className="mb-4 text-sm text-neutral-400 hover:text-neutral-200"
            >
              ← 返回列表
            </button>
            <p className="mb-4 text-sm text-neutral-500">{selected.date}</p>
            {selected.status === "failed" ? (
              <p className="text-sm text-red-400">{selected.failureMessage}</p>
            ) : (
              <div className="space-y-4">
                {selected.topics.map((t, i) => (
                  <TopicCard key={t.id} topic={t} rank={i < 3 ? i + 1 : undefined} />
                ))}
              </div>
            )}
          </div>
        ) : loading ? (
          <p className="text-sm text-neutral-500">載入中...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-neutral-500">還沒有歷史紀錄。</p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <button
                key={h.date}
                onClick={() => openDate(h.date)}
                className="block w-full rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 text-left hover:border-neutral-600"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{h.date}</span>
                  <span className="text-xs text-neutral-500">
                    {h.status === "ok" ? `${h.topicCount} 個話題` : "搜尋失敗"}
                  </span>
                </div>
                {h.topTopicTitle && (
                  <p className="mt-1 text-sm text-neutral-400">
                    🥇 {h.topTopicTitle}（{h.topBrand}）
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
