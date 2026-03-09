// Unified AI client: handles OpenAI and DeepSeek with retries, cost tracking,
// and AI Efficiency Layer (prompt compression, semantic cache, model routing).
// Primary providers: OpenAI + DeepSeek. No Gemini defaults.

import { compressPrompt } from "./prompt-compressor.ts";
import { lookupCache, storeInCache } from "./semantic-cache.ts";
import { routeModel, getModelTier } from "./model-router.ts";
import { routeRequest, getFastConfig, getStrongConfig, logRoutingDecision, type RoutingTier, type TaskClass } from "./ai-router.ts";

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

/** Get AI configuration based on available API keys.
 *  Priority: OpenAI > DeepSeek > Lovable Gateway (last resort).
 *  No Gemini defaults.
 */
export function getAIConfig(): AIConfig {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");

  if (OPENAI_API_KEY) {
    const modelFast = Deno.env.get("OPENAI_MODEL_FAST") || "gpt-4o-mini";
    const modelStrong = Deno.env.get("OPENAI_MODEL_STRONG") || "gpt-4o";
    return {
      url: "https://api.openai.com/v1/chat/completions",
      key: OPENAI_API_KEY,
      model: modelFast,
      proModel: modelStrong,
    };
  }

  if (DEEPSEEK_API_KEY) {
    const modelFast = Deno.env.get("DEEPSEEK_MODEL_FAST") || "deepseek-chat";
    const modelStrong = Deno.env.get("DEEPSEEK_MODEL_STRONG") || "deepseek-chat";
    return {
      url: "https://api.deepseek.com/v1/chat/completions",
      key: DEEPSEEK_API_KEY,
      model: modelFast,
      proModel: modelStrong,
    };
  }

  // Last resort: Lovable AI Gateway (no Gemini model names — uses gateway defaults)
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
  return {
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    key: LOVABLE_KEY,
    model: "openai/gpt-5-nano",
    proModel: "openai/gpt-5",
  };
}

/**
 * Call AI with Efficiency Layer: compression → cache → routing → retry.
 * Uses canonical AI Router for provider selection.
 *
 * @param apiKey - Fallback API key
 * @param systemPrompt - System message
 * @param userPrompt - User message
 * @param jsonMode - Request JSON response format
 * @param maxRetries - Max retry attempts (default 3)
 * @param usePro - Use pro/strong model for higher quality (default false)
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
  // Use canonical router for provider selection
  const routing = routeRequest({
    systemPrompt,
    userPrompt,
    stage,
    forceTier: usePro ? "high_confidence" : undefined,
  });
  logRoutingDecision(routing.metadata);

  const effectiveUrl = routing.primary.url;
  const effectiveKey = routing.primary.key || apiKey;
  const isExternalProvider = !effectiveUrl.includes("lovable.dev");

  let compressedSystem = systemPrompt;
  let compressedUser = userPrompt;
  let compressionRatio = 1;
  let tokensSaved = 0;

  // ── Efficiency Layer ──
  if (!skipEfficiency) {
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

  // 3. Model from routing decision
  const effectiveModel = routing.primary.model;
  const routingDecision = {
    model: effectiveModel,
    complexity: routing.metadata.complexity,
    reason: routing.metadata.reason,
    estimatedCostMultiplier: routing.metadata.estimatedCostMultiplier,
  };

  console.log(`[efficiency] Routed to ${effectiveModel} via ${routing.metadata.provider} (${routingDecision.complexity}: ${routingDecision.reason})`);

  // ── AI Call with Retries + Fallback ──
  let lastError: Error | null = null;
  const configs = [
    { url: effectiveUrl, key: effectiveKey, model: effectiveModel },
    ...(routing.fallback ? [{ url: routing.fallback.url, key: routing.fallback.key, model: routing.fallback.model }] : []),
  ];

  for (const cfg of configs) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const start = Date.now();
        const body: Record<string, unknown> = {
          model: cfg.model,
          messages: [
            { role: "system", content: compressedSystem },
            { role: "user", content: compressedUser },
          ],
        };
        if (jsonMode) body.response_format = { type: "json_object" };

        const resp = await fetch(cfg.url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cfg.key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (resp.status === 429 || resp.status >= 500) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 15000) + Math.random() * 1000;
          console.warn(`AI ${resp.status} from ${cfg.model}, retry ${attempt + 1}/${maxRetries} after ${Math.round(backoffMs)}ms`);
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
        const costUsd = estimateCost(cfg.model, tokens);
        const content = data.choices?.[0]?.message?.content || "";
        const isFallback = cfg.model !== effectiveModel;

        // Store in semantic cache (async, non-blocking)
        if (!skipEfficiency && stage) {
          try {
            const cacheResult = await lookupCache(
              compressedSystem + "\n" + compressedUser,
              stage,
              cfg.key,
              orgId,
            );
            if (!cacheResult.hit) {
              storeInCache(
                cacheResult.promptHash,
                cacheResult.embedding,
                content,
                stage,
                cfg.model,
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
          model: cfg.model,
          efficiency: skipEfficiency ? undefined : {
            cacheHit: false,
            compressionRatio,
            routedModel: cfg.model,
            complexity: routingDecision.complexity,
            tokensSaved,
          },
        };
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (attempt < maxRetries - 1) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 15000) + Math.random() * 1000;
          console.warn(`callAI error on ${cfg.model}, retry ${attempt + 1}/${maxRetries} after ${Math.round(backoffMs)}ms:`, lastError.message);
          await new Promise(r => setTimeout(r, backoffMs));
        }
      }
    }
    // If primary provider exhausted retries, try fallback
    if (configs.indexOf(cfg) < configs.length - 1) {
      console.warn(`[ai-router] Primary provider ${cfg.model} exhausted, falling back to next provider`);
    }
  }
  throw lastError || new Error("callAI failed after retries across all providers");
}

/**
 * Simple AI call without retries (for non-critical or streaming use cases).
 * Returns the raw fetch Response for streaming support.
 * Uses canonical router for provider selection.
 */
export async function callAIRaw(
  systemPrompt: string,
  userPrompt: string,
  options: { jsonMode?: boolean; stream?: boolean; stage?: string; tier?: RoutingTier } = {}
): Promise<Response> {
  const routing = routeRequest({
    systemPrompt,
    userPrompt,
    stage: options.stage,
    forceTier: options.tier,
  });
  logRoutingDecision(routing.metadata);

  const body: Record<string, unknown> = {
    model: routing.primary.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };
  if (options.jsonMode) body.response_format = { type: "json_object" };
  if (options.stream) body.stream = true;

  return fetch(routing.primary.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${routing.primary.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

/** Estimate cost per token by model */
function estimateCost(model: string, tokens: number): number {
  if (model.includes("deepseek")) return tokens * 0.00000027; // ~$0.27/M tokens
  if (model.includes("gpt-4o-mini")) return tokens * 0.0000004;
  if (model.includes("gpt-4o")) return tokens * 0.000005;
  if (model.includes("gpt-5")) return tokens * 0.000003;
  return tokens * 0.000001; // generic fallback
}
