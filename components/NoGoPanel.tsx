import { NoGoTopic } from "@/lib/types";

export default function NoGoPanel({ topics }: { topics: NoGoTopic[] }) {
  if (topics.length === 0) return null;

  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
      <h2 className="mb-3 text-base font-bold text-red-400">🚫 今日不要蹭</h2>
      <div className="space-y-2">
        {topics.map((t, i) => (
          <div key={i} className="text-sm">
            <span className="font-medium">🚫 {t.title}</span>
            <p className="text-neutral-400">原因：{t.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
