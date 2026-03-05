// Unified AI client: handles OpenAI and Lovable AI Gateway with retries and cost tracking

export interface AIResult {
  content: string;
  tokens: number;
  durationMs: number;
  costUsd: number;
  model: string;
}

export interface AIConfig {
  url: string;
  key: string;
  model: string;
  proModel: string;
}

/** Get AI configuration based on available API keys */
export function getAIConfig(): AIConfig {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  const useOpenAI = !!OPENAI_API_KEY;

  return {
    url: useOpenAI
      ? "https://api.openai.com/v1/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions",
    key: useOpenAI ? OPENAI_API_KEY! : (Deno.env.get("LOVABLE_API_KEY") || ""),
    model: useOpenAI ? "gpt-4o-mini" : "google/gemini-2.5-flash",
    proModel: useOpenAI ? "gpt-4o-mini" : "google/gemini-2.5-pro",
  };
}

/**
 * Call AI with automatic retry, backoff, and cost tracking.
 * 
 * @param apiKey - Fallback API key (used for Lovable Gateway when no OPENAI_API_KEY)
 * @param systemPrompt - System message
 * @param userPrompt - User message
 * @param jsonMode - Request JSON response format
 * @param maxRetries - Max retry attempts (default 3)
 * @param usePro - Use pro model for higher quality (default false)
 */
export async function callAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  jsonMode = false,
  maxRetries = 3,
  usePro = false
): Promise<AIResult> {
  const config = getAIConfig();
  // If apiKey is provided and config.key is empty (no env), use apiKey
  const effectiveKey = config.key || apiKey;
  const effectiveModel = usePro ? config.proModel : config.model;
  const useOpenAI = config.url.includes("openai.com");

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const start = Date.now();
      const body: Record<string, unknown> = {
        model: effectiveModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      };
      if (jsonMode) body.response_format = { type: "json_object" };

      const resp = await fetch(config.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${effectiveKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (resp.status === 429 || resp.status >= 500) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 15000) + Math.random() * 1000;
        console.warn(`AI ${resp.status}, retry ${attempt + 1}/${maxRetries} after ${Math.round(backoffMs)}ms`);
        await new Promise(r => setTimeout(r, backoffMs));
        lastError = new Error(`AI error ${resp.status}`);
        continue;
      }

      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`AI error ${resp.status}: ${t}`);
      }

      const data = await resp.json();
      const durationMs = Date.now() - start;
      const tokens = data.usage?.total_tokens || 0;
      // Cost estimation: OpenAI ~$0.40/1M tokens avg, Lovable Gateway ~$1/1M tokens
      const costUsd = useOpenAI ? tokens * 0.0000004 : tokens * 0.000001;

      return {
        content: data.choices?.[0]?.message?.content || "",
        tokens,
        durationMs,
        costUsd,
        model: effectiveModel,
      };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < maxRetries - 1) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 15000) + Math.random() * 1000;
        console.warn(`callAI error, retry ${attempt + 1}/${maxRetries} after ${Math.round(backoffMs)}ms:`, lastError.message);
        await new Promise(r => setTimeout(r, backoffMs));
      }
    }
  }
  throw lastError || new Error("callAI failed after retries");
}

/**
 * Simple AI call without retries (for non-critical or streaming use cases).
 * Returns the raw fetch Response for streaming support.
 */
export async function callAIRaw(
  systemPrompt: string,
  userPrompt: string,
  options: { jsonMode?: boolean; stream?: boolean } = {}
): Promise<Response> {
  const config = getAIConfig();
  
  const body: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };
  if (options.jsonMode) body.response_format = { type: "json_object" };
  if (options.stream) body.stream = true;

  return fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
