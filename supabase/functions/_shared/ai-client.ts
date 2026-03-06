// Unified AI client: handles OpenAI and Lovable AI Gateway with retries, cost tracking,
// and AI Efficiency Layer (prompt compression, semantic cache, model routing)

import { compressPrompt } from "./prompt-compressor.ts";
import { lookupCache, storeInCache } from "./semantic-cache.ts";
import { routeModel, getModelTier } from "./model-router.ts";

export interface AIResult {
  content: string;
  tokens: number;
  durationMs: number;
  costUsd: number;
  model: string;
  /** Efficiency layer metadata */
  efficiency?: {
    cacheHit: boolean;
    compressionRatio: number;
    routedModel: string;
    complexity: string;
    tokensSaved: number;
  };
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
 * Call AI with Efficiency Layer: compression → cache → routing → retry.
 *
 * @param apiKey - Fallback API key
 * @param systemPrompt - System message
 * @param userPrompt - User message
 * @param jsonMode - Request JSON response format
 * @param maxRetries - Max retry attempts (default 3)
 * @param usePro - Use pro model for higher quality (default false)
 * @param stage - Pipeline stage for routing/caching
 * @param orgId - Organization ID for cache scoping
 * @param initiativeId - Initiative ID for cache scoping
 * @param skipEfficiency - Skip efficiency layer entirely
 */
export async function callAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  jsonMode = false,
  maxRetries = 3,
  usePro = false,
  stage?: string,
  orgId?: string,
  initiativeId?: string,
  skipEfficiency = false,
): Promise<AIResult> {
  const config = getAIConfig();
  const effectiveKey = config.key || apiKey;
  const useOpenAI = config.url.includes("openai.com");

  let compressedSystem = systemPrompt;
  let compressedUser = userPrompt;
  let compressionRatio = 1;
  let tokensSaved = 0;

  // ── Efficiency Layer ──
  if (!skipEfficiency && !useOpenAI) {
    // 1. Prompt Compression
    try {
      const combined = systemPrompt + "\n" + userPrompt;
      if (combined.length > 8000) {
        const result = await compressPrompt(userPrompt, effectiveKey, 3000);
        compressedUser = result.compressed;
        compressionRatio = result.ratio;
        tokensSaved = result.originalTokens - result.compressedTokens;
        console.log(`[efficiency] Compression: ${result.originalTokens} → ${result.compressedTokens} tokens (${Math.round((1 - result.ratio) * 100)}% saved, AI=${result.usedAI})`);
      }
    } catch (e) {
      console.warn("[efficiency] Compression failed, using original:", e);
    }

    // 2. Semantic Cache
    if (stage) {
      try {
        const cacheResult = await lookupCache(
          compressedSystem + "\n" + compressedUser,
          stage,
          effectiveKey,
          orgId,
        );

        if (cacheResult.hit) {
          console.log(`[efficiency] Cache HIT (similarity=${cacheResult.similarity.toFixed(3)}, saved=${cacheResult.tokensSaved} tokens)`);
          return {
            content: cacheResult.response,
            tokens: 0,
            durationMs: 0,
            costUsd: 0,
            model: "cache",
            efficiency: {
              cacheHit: true,
              compressionRatio,
              routedModel: "cache",
              complexity: "cached",
              tokensSaved: cacheResult.tokensSaved + tokensSaved,
            },
          };
        }
      } catch (e) {
        console.warn("[efficiency] Cache lookup failed:", e);
      }
    }
  }

  // 3. Model Routing
  let effectiveModel: string;
  let routingDecision;

  if (usePro) {
    effectiveModel = config.proModel;
    routingDecision = { model: config.proModel, complexity: "high" as const, reason: "Forced pro", estimatedCostMultiplier: 1 };
  } else if (!skipEfficiency && !useOpenAI) {
    routingDecision = routeModel(compressedSystem, compressedUser, stage);
    effectiveModel = routingDecision.model;
    console.log(`[efficiency] Routed to ${effectiveModel} (${routingDecision.complexity}: ${routingDecision.reason})`);
  } else {
    effectiveModel = config.model;
    routingDecision = { model: config.model, complexity: "medium" as const, reason: "Default", estimatedCostMultiplier: 0.5 };
  }

  // ── Standard AI Call with Retries ──
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const start = Date.now();
      const body: Record<string, unknown> = {
        model: effectiveModel,
        messages: [
          { role: "system", content: compressedSystem },
          { role: "user", content: compressedUser },
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
      const costUsd = useOpenAI ? tokens * 0.0000004 : tokens * 0.000001;
      const content = data.choices?.[0]?.message?.content || "";

      // Store in semantic cache (async, non-blocking)
      if (!skipEfficiency && stage && !useOpenAI) {
        try {
          const cacheResult = await lookupCache(
            compressedSystem + "\n" + compressedUser,
            stage,
            effectiveKey,
            orgId,
          );
          if (!cacheResult.hit) {
            storeInCache(
              cacheResult.promptHash,
              cacheResult.embedding,
              content,
              stage,
              effectiveModel,
              tokens,
              orgId,
              initiativeId,
            ).catch(e => console.warn("[efficiency] Cache store failed:", e));
          }
        } catch (e) {
          console.warn("[efficiency] Cache store failed:", e);
        }
      }

      return {
        content,
        tokens,
        durationMs,
        costUsd,
        model: effectiveModel,
        efficiency: skipEfficiency ? undefined : {
          cacheHit: false,
          compressionRatio,
          routedModel: effectiveModel,
          complexity: routingDecision.complexity,
          tokensSaved,
        },
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
