export interface AIProviderConfig {
  provider: "server-gemini" | "claude" | "openai" | "gemini" | "emergent" | "replit" | "other";
  apiKey?: string;
  customBase?: string;
  model?: string;
}

export async function callAI(
  prompt: string,
  systemInstruction?: string,
  config?: AIProviderConfig,
  maxTokens: number = 3000
): Promise<string> {
  const provider = config?.provider || "server-gemini";
  const apiKey = config?.apiKey || "";
  const customBase = config?.customBase || "";

  // 1. Server-side Gemini endpoint (built-in default, requires no client key)
  if (provider === "server-gemini" || (!apiKey && provider === "gemini")) {
    const res = await fetch("/api/gemini/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        systemInstruction,
        model: "gemini-3.7-flash",
        maxOutputTokens: maxTokens,
        temperature: 0.3,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || `Server error (${res.status})`);
    }
    return data.text || "";
  }

  // 2. Direct Anthropic Claude
  if (provider === "claude") {
    if (!apiKey) throw new Error("Claude API key is required.");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: config?.model || "claude-sonnet-4-6",
        max_tokens: maxTokens,
        system: systemInstruction || "",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || "Claude API error");
    return (data.content || []).map((b: any) => b.text || "").join("\n");
  }

  // 3. Direct Gemini (Client key)
  if (provider === "gemini" && apiKey) {
    const sysText = systemInstruction ? systemInstruction + "\n\n" : "";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: sysText + prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
        }),
      }
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || "Gemini API error");
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  // 4. OpenAI-compatible providers
  const BASE_URLS: Record<string, string> = {
    openai: "https://api.openai.com/v1",
    emergent: "https://api.emergent.sh/v1",
    replit: "https://inference.replit.com/v1",
    other: customBase || "https://api.openai.com/v1",
  };
  const MODELS: Record<string, string> = {
    openai: "gpt-4o-mini",
    emergent: "claude-sonnet-4-5",
    replit: "replit-code-v1-3b",
    other: config?.model || "gpt-4o-mini",
  };

  const base = BASE_URLS[provider] || BASE_URLS.other;
  const model = config?.model || MODELS[provider] || "gpt-4o-mini";
  const messages: any[] = [];
  if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
  messages.push({ role: "user", content: prompt });

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.3 }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "API error");
  return data.choices?.[0]?.message?.content || "";
}

export function parseJSONLoose(text: string): any {
  if (!text) return null;
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const startObj = cleaned.indexOf("{");
  const startArr = cleaned.indexOf("[");
  let start = -1;
  if (startObj !== -1 && startArr !== -1) {
    start = Math.min(startObj, startArr);
  } else if (startObj !== -1) {
    start = startObj;
  } else if (startArr !== -1) {
    start = startArr;
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    if (start !== -1) {
      try {
        return JSON.parse(cleaned.slice(start));
      } catch {
        // Try finding last closing bracket
        const lastObj = cleaned.lastIndexOf("}");
        const lastArr = cleaned.lastIndexOf("]");
        const end = Math.max(lastObj, lastArr);
        if (end > start) {
          try {
            return JSON.parse(cleaned.slice(start, end + 1));
          } catch {
            return null;
          }
        }
        return null;
      }
    }
    return null;
  }
}
