export function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  return { apiKey, model };
}

/**
 * 呼叫 Google Gemini 的免費 API 做「分析＋評分＋文案」這一步。
 * 完全不需要額外的 SDK，直接打 REST API。
 * 如果沒有設定 GEMINI_API_KEY，會拋出 MISSING_GEMINI_KEY，
 * 讓呼叫端可以優雅地退回「手動複製貼上」模式。
 */
export async function callGemini(prompt: string): Promise<string> {
  const { apiKey, model } = getGeminiConfig();
  if (!apiKey) {
    throw new Error("MISSING_GEMINI_KEY");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 6000,
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API 錯誤 (HTTP ${res.status})：${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const text: string =
    candidate?.content?.parts?.map((p: any) => p.text ?? "").join("\n") ?? "";

  if (!text.trim()) {
    const finishReason = candidate?.finishReason;
    throw new Error(
      `Gemini 沒有回傳內容${finishReason ? `（finishReason: ${finishReason}）` : ""}`
    );
  }

  return text;
}
