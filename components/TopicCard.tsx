"use client";

import { Topic } from "@/lib/types";
import CopyButton from "./CopyButton";

const TIMING_LABEL: Record<Topic["timing"], string> = {
  immediate: "🟢 建議立即發布",
  today: "🟡 今天可以發",
  watch: "🟠 可以觀察",
  no: "🔴 不建議發布",
};

const TIMING_COLOR: Record<Topic["timing"], string> = {
  immediate: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  today: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  watch: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  no: "bg-red-500/15 text-red-400 border-red-500/30",
};

function ScoreRow({ label, emoji, value }: { label: string; emoji: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-neutral-400">
        {emoji} {label}
      </span>
      <span className="font-medium text-neutral-100">{value}/5</span>
    </div>
  );
}

export default function TopicCard({
  topic,
  rank,
}: {
  topic: Topic;
  rank?: number;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold leading-snug">
          {rank ? `${["🥇", "🥈", "🥉"][rank - 1] ?? `#${rank}`} ` : ""}
          {topic.title}
        </h3>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${TIMING_COLOR[topic.timing]}`}
        >
          {TIMING_LABEL[topic.timing]}
        </span>
      </div>

      {topic.usedBefore && (
        <div className="mt-2 inline-block rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-400">
          ⚠️ 近期已使用過類似話題{topic.usedBeforeNote ? `：${topic.usedBeforeNote}` : ""}
        </div>
      )}

      <div className="mt-3 space-y-2 text-sm text-neutral-300">
        <p>
          <span className="text-neutral-500">發生什麼事：</span>
          {topic.whatHappened}
        </p>
        <p>
          <span className="text-neutral-500">為什麼現在熱門：</span>
          {topic.whyTrending}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 rounded-xl bg-neutral-950/60 p-3">
        <ScoreRow emoji="🔥" label="話題熱度" value={topic.scores.heat} />
        <ScoreRow emoji="🎯" label="客群重疊" value={topic.scores.audience} />
        <ScoreRow emoji="🎨" label="調性契合" value={topic.scores.tone} />
        <ScoreRow emoji="⚙️" label="執行難易" value={topic.scores.feasibility} />
        <ScoreRow emoji="⚠️" label="安全度" value={topic.scores.safety} />
        <div className="flex items-center justify-between text-sm font-semibold">
          <span className="text-neutral-400">總分</span>
          <span>{topic.totalScore}/25</span>
        </div>
      </div>

      <div className="mt-3 text-sm">
        <span className="text-neutral-500">最適合品牌：</span>
        <span className="font-semibold">{topic.bestBrandLabel}</span>
      </div>
      <p className="mt-1 text-xs text-neutral-500">{topic.timingReason}</p>

      <div className="mt-4 space-y-3">
        {topic.copyVariants.map((v, i) => (
          <div key={i} className="rounded-xl border border-neutral-800 bg-black/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400">
                {v.brandName}
              </span>
              <CopyButton text={v.content} />
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-100">
              {v.content}
            </p>
          </div>
        ))}
      </div>

      {topic.sources.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {topic.sources.map((s, i) =>
            s.url ? (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-neutral-700 px-2.5 py-1 text-xs text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
              >
                🔗 {s.name}
              </a>
            ) : (
              <span
                key={i}
                className="rounded-full border border-neutral-800 px-2.5 py-1 text-xs text-neutral-500"
              >
                {s.name}
              </span>
            )
          )}
        </div>
      )}
    </div>
  );
}
