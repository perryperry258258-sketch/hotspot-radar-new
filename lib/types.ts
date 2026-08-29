export type BrandId = "dongdong" | "yunan" | "renxing";

export interface BrandProfile {
  id: BrandId;
  name: string;
  emoji: string;
  positioning: string[];
  toneNotes: string[];
  example: string;
}

export interface TopicScore {
  heat: number; // 話題熱度
  audience: number; // 客群重疊度
  tone: number; // 調性契合度
  feasibility: number; // 執行難易度
  safety: number; // 風險安全度（分數越高越安全）
}

export interface CopyVariant {
  brand: BrandId;
  brandName: string;
  content: string;
}

export interface SourceRef {
  name: string;
  url?: string;
}

export type TimingLevel = "immediate" | "today" | "watch" | "no";

export interface Topic {
  id: string;
  title: string;
  whatHappened: string;
  whyTrending: string;
  scores: TopicScore;
  totalScore: number;
  bestBrand: BrandId | "all";
  bestBrandLabel: string;
  copyVariants: CopyVariant[];
  sources: SourceRef[];
  timing: TimingLevel;
  timingReason: string;
  usedBefore: boolean;
  usedBeforeNote?: string;
}

export interface NoGoTopic {
  title: string;
  reason: string;
}

export interface HotspotReport {
  date: string; // YYYY-MM-DD (Asia/Taipei)
  generatedAt: string; // ISO timestamp
  topics: Topic[];
  noGoTopics: NoGoTopic[];
  status: "ok" | "failed";
  failureMessage?: string;
}

export interface HistorySummary {
  date: string;
  topicCount: number;
  topTopicTitle?: string;
  topBrand?: string;
  status: "ok" | "failed";
}
