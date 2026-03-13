// Unified AI client: handles OpenAI and DeepSeek with retries, cost tracking,
// and AI Efficiency Layer (prompt compression, semantic cache, model routing).
// Primary providers: OpenAI + DeepSeek. No Gemini defaults.
// Routing delegated to Canonical AI Router + Routing Matrix.

import { compressPrompt } from "./prompt-compressor.ts";
import { lookupCache, storeInCache } from "./semantic-cache.ts";
import { routeModel, getModelTier } from "./model-router.ts";
import { routeRequest, getFastConfig, getStrongConfig, getPremiumConfig, logRoutingDecision, type RoutingTier, type TaskClass } from "./ai-router.ts";
import { estimateTokenCost, CANONICAL_MODELS } from "./ai-routing-matrix.ts";

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
    return {
      url: "https://api.openai.com/v1/chat/completions",
      key: OPENAI_API_KEY,
      model: Deno.env.get("OPENAI_MODEL_FAST") || CANONICAL_MODELS.GPT5_MINI,
      proModel: Deno.env.get("OPENAI_MODEL_STRONG") || CANONICAL_MODELS.GPT5_4,
    };
  }

  if (DEEPSEEK_API_KEY) {
    return {
      url: "https://api.deepseek.com/v1/chat/completions",
      key: DEEPSEEK_API_KEY,
      model: Deno.env.get("DEEPSEEK_MODEL_FAST") || CANONICAL_MODELS.DEEPSEEK_CHAT,
      proModel: Deno.env.get("DEEPSEEK_MODEL_STRONG") || CANONICAL_MODELS.DEEPSEEK_REASONER,
    };
  }

  // Last resort: Lovable AI Gateway — explicit OpenAI models, never Gemini
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
  return {
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    key: LOVABLE_KEY,
    model: CANONICAL_MODELS.GATEWAY_GPT5_NANO,
    proModel: CANONICAL_MODELS.GATEWAY_GPT5_MINI,
  };
}

/**
 * Call AI with Efficiency Layer: compression → cache → routing → retry.
 * Uses canonical AI Router for provider selection.
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
  abortSignal?: AbortSignal,
): Promise<AIResult> {
  const callStartMs = Date.now();

  const routing = routeRequest({
    systemPrompt,
    userPrompt,
    stage,
    forceTier: usePro ? "high_confidence" : undefined,
  });
  logRoutingDecision(routing.metadata);

  const effectiveUrl = routing.primary.url;
  const effectiveKey = routing.primary.key || apiKey;

  if (!effectiveKey) {
    throw new Error(
      "AI API key não configurada. Defina LOVABLE_API_KEY ou OPENAI_API_KEY nas variáveis de ambiente do Supabase."
    );
  }

  let compressedSystem = systemPrompt;
  let compressedUser = userPrompt;
  let compressionRatio = 1;
  let tokensSaved = 0;
  let efficiencyOverheadMs = 0;

  // ── Efficiency Layer ──
  // OX-2: Skipped in execution stage — verified overhead (up to 3 extra AI calls per invocation)
  // exceeds benefit when cache hit rate is near-zero (unique code gen prompts).
  if (!skipEfficiency) {
    // 1. Prompt Compression
    const compressionStart = Date.now();
    try {
      const combined = systemPrompt + "\n" + userPrompt;
      if (combined.length > 8000) {
        const result = await compressPrompt(userPrompt, effectiveKey, 3000);
        compressedUser = result.compressed;
        compressionRatio = result.ratio;
        tokensSaved = result.originalTokens - result.compressedTokens;
        const compressionMs = Date.now() - compressionStart;
        efficiencyOverheadMs += compressionMs;
        console.log(`[efficiency] Compression: ${result.originalTokens} → ${result.compressedTokens} tokens (${Math.round((1 - result.ratio) * 100)}% saved, AI=${result.usedAI}, ${compressionMs}ms)`);
      }
    } catch (e) {
      efficiencyOverheadMs += Date.now() - compressionStart;
      console.warn("[efficiency] Compression failed, using original:", e);
    }

    // 2. Semantic Cache
    if (stage) {
      const cacheStart = Date.now();
      try {
        const cacheResult = await lookupCache(
          compressedSystem + "\n" + compressedUser,
          stage,
          effectiveKey,
          orgId,
        );

        const cacheMs = Date.now() - cacheStart;
        efficiencyOverheadMs += cacheMs;

        if (cacheResult.hit) {
          console.log(`[efficiency] Cache HIT (similarity=${cacheResult.similarity.toFixed(3)}, saved=${cacheResult.tokensSaved} tokens, lookup=${cacheMs}ms)`);
          return {
            content: cacheResult.response,
            tokens: 0,
            durationMs: cacheMs,
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
        // OX-2: Preserve embedding from cache miss for post-call store (avoids double lookup)
        var cacheMissData = cacheResult;
        console.log(`[efficiency] Cache MISS (lookup=${cacheMs}ms)`);
      } catch (e) {
        efficiencyOverheadMs += Date.now() - cacheStart;
        console.warn("[efficiency] Cache lookup failed:", e);
      }
    }
  }

  if (efficiencyOverheadMs > 0) {
    console.log(`[efficiency] Total pre-call overhead: ${efficiencyOverheadMs}ms (stage=${stage || "unknown"}, skipEfficiency=${skipEfficiency})`);
  }

  // 3. Model from routing decision
  const effectiveModel = routing.primary.model;
  const routingDecision = {
    model: effectiveModel,
    complexity: routing.metadata.complexity,
    reason: routing.metadata.reason,
    estimatedCostMultiplier: routing.metadata.estimatedCostMultiplier,
  };

  console.log(`[ai-client] Routed to ${effectiveModel} via ${routing.metadata.provider} (${routingDecision.complexity}: ${routingDecision.reason})`);

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
          signal: abortSignal,
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
        const costUsd = estimateTokenCost(cfg.model, tokens);
        const content = data.choices?.[0]?.message?.content || "";

        // Store in semantic cache (async, non-blocking)
        // OX-2 FIX: Reuse embedding from pre-call cache miss instead of calling lookupCache again
        if (!skipEfficiency && stage) {
          try {
            // @ts-ignore — cacheMissData is set via var in cache miss branch above
            const missData = typeof cacheMissData !== "undefined" ? cacheMissData : null;
            if (missData && !missData.hit) {
              storeInCache(
                missData.promptHash,
                missData.embedding,
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
    if (configs.indexOf(cfg) < configs.length - 1) {
      console.warn(`[ai-router] Primary provider ${cfg.model} exhausted, falling back to next provider`);
    }
  }
  throw lastError || new Error("callAI failed after retries across all providers");
}

/**
 * Simple AI call without retries (for non-critical or streaming use cases).
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
