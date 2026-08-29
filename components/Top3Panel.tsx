import { Topic } from "@/lib/types";

export default function Top3Panel({ topics }: { topics: Topic[] }) {
  const top3 = topics.slice(0, 3);
  if (top3.length === 0) return null;
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
      <h2 className="mb-3 text-base font-bold text-amber-400">🔥 今日最值得蹭</h2>
      <div className="space-y-2">
        {top3.map((t, i) => (
          <div key={t.id} className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {medals[i]} {t.title} — {t.totalScore}分
            </span>
            <span className="text-neutral-400">最適合：{t.bestBrandLabel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
