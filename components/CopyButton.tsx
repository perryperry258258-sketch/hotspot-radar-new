"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard API 不可用時的 fallback
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        copied
          ? "bg-emerald-600 text-white"
          : "bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
      }`}
    >
      {copied ? "✅ 已複製" : "📋 複製文案"}
    </button>
  );
}
