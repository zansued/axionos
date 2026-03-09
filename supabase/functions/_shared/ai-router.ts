/**
 * Canonical AI Router — AxionOS Model Routing Layer
 *
 * Delegates all routing policy to the Canonical Routing Matrix
 * (ai-routing-matrix.ts). This module handles runtime resolution:
 *   - provider availability checks
 *   - environment-based config
 *   - fallback chain assembly
 *   - observability logging
 *
 * Primary providers: OpenAI + DeepSeek.
 * Pollinations: optional experimental fallback (disabled by default).
 * Gemini: explicitly removed. Never defaults to Gemini.
 */

import {
  type TaskClass,
  type RoutingTier,
  type ProviderName,
  type ComplexityLevel,
  type RoutingMatrixEntry,
  ROUTING_MATRIX,
  STAGE_TASK_MAP,
  CANONICAL_MODELS,
  ROUTING_CONFIG,
  DEFAULT_ESCALATION_POLICY,
  TIER_COST_MULTIPLIER,
  TIER_CONFIDENCE_MAP,
  resolveRoute,
  taskClassForStage,
  getModelTier as matrixGetModelTier,
  estimateTokenCost,
} from "./ai-routing-matrix.ts";

// Re-export types for consumers
export type { TaskClass, RoutingTier, ProviderName, ComplexityLevel };

// ─────────────────────────────────────────────
// §1  Routing Metadata
// ─────────────────────────────────────────────

export interface RoutingMetadata {
  provider: ProviderName;
  model: string;
  tier: RoutingTier;
  taskClass: TaskClass;
  complexity: ComplexityLevel;
  reason: string;
  confidenceTarget: string;
  fallbackUsed: boolean;
  fallbackProvider?: ProviderName;
  estimatedCostMultiplier: number;
}

export interface ProviderConfig {
  url: string;
  key: string;
  model: string;
}

export interface RoutingResult {
  primary: ProviderConfig;
  fallback?: ProviderConfig;
  metadata: RoutingMetadata;
}

// ─────────────────────────────────────────────
// §2  Provider Environment
// ─────────────────────────────────────────────

function getProviderEnv() {
  return {
    openai: {
      key: Deno.env.get("OPENAI_API_KEY") || "",
      url: "https://api.openai.com/v1/chat/completions",
      modelConfidence: Deno.env.get("OPENAI_MODEL_FAST") || CANONICAL_MODELS.GPT5_MINI,
      modelPremium: Deno.env.get("OPENAI_MODEL_STRONG") || CANONICAL_MODELS.GPT5_4,
    },
    deepseek: {
      key: Deno.env.get("DEEPSEEK_API_KEY") || "",
      url: "https://api.deepseek.com/v1/chat/completions",
      modelEconomy: Deno.env.get("DEEPSEEK_MODEL_FAST") || CANONICAL_MODELS.DEEPSEEK_CHAT,
      modelReasoner: Deno.env.get("DEEPSEEK_MODEL_STRONG") || CANONICAL_MODELS.DEEPSEEK_REASONER,
    },
    pollinations: {
      enabled: (Deno.env.get("POLLINATIONS_ENABLED") === "true") && DEFAULT_ESCALATION_POLICY.pollinations.enabled,
      key: Deno.env.get("POLLINATIONS_API_KEY") || "",
      url: "https://text.pollinations.ai/openai",
      budgetCap: parseInt(Deno.env.get("POLLINATIONS_BUDGET_CAP") || String(DEFAULT_ESCALATION_POLICY.pollinations.dailyBudgetCap), 10),
    },
    lovable: {
      key: Deno.env.get("LOVABLE_API_KEY") || "",
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    },
  };
}

function isAvailable(provider: ProviderName): boolean {
  const env = getProviderEnv();
  switch (provider) {
    case "openai": return !!env.openai.key;
    case "deepseek": return !!env.deepseek.key;
    case "pollinations": return env.pollinations.enabled && !!env.pollinations.key;
  }
}

/** Resolve provider config for a specific model requirement */
function buildConfig(provider: ProviderName, model: string, matrixEntry: RoutingMatrixEntry): ProviderConfig {
  const env = getProviderEnv();

  switch (provider) {
    case "openai":
      if (env.openai.key) {
        return { url: env.openai.url, key: env.openai.key, model };
      }
      // Fall through to Lovable Gateway with explicit OpenAI model
      return { url: env.lovable.url, key: env.lovable.key, model: matrixEntry.gatewayModel };

    case "deepseek":
      if (env.deepseek.key) {
        return { url: env.deepseek.url, key: env.deepseek.key, model };
      }
      // No DeepSeek key: use Lovable Gateway with OpenAI model (never Gemini)
      return { url: env.lovable.url, key: env.lovable.key, model: matrixEntry.gatewayModel };

    case "pollinations":
      return { url: env.pollinations.url, key: env.pollinations.key, model: "openai" };
  }
}

// ─────────────────────────────────────────────
// §3  Heuristic Complexity Analysis
// ─────────────────────────────────────────────

function analyzeComplexity(systemPrompt: string, userPrompt: string): { level: ComplexityLevel; reason: string } {
  const combined = (systemPrompt + " " + userPrompt).toLowerCase();
  const totalTokens = Math.ceil(combined.length / 4);

  const highIndicators = [
    /architect/i, /design pattern/i, /data model/i, /schema/i,
    /api contract/i, /business logic/i, /security/i, /migration/i,
    /generate.*code/i, /implement.*component/i, /create.*service/i,
    /refactor/i, /optimize.*performance/i, /strategic/i, /governance/i,
  ];
  const highScore = highIndicators.filter(r => r.test(combined)).length;

  const lowIndicators = [
    /summarize/i, /classify/i, /extract/i, /list/i,
    /format/i, /validate/i, /check/i, /count/i,
    /simple/i, /basic/i, /brief/i, /tag/i,
  ];
  const lowScore = lowIndicators.filter(r => r.test(combined)).length;

  if (totalTokens > 8000 && highScore >= 2) return { level: "high", reason: `Large context (${totalTokens} tokens) + ${highScore} high indicators` };
  if (highScore >= 3) return { level: "high", reason: `${highScore} high complexity indicators` };
  if (lowScore >= 2 && highScore === 0) return { level: "low", reason: `${lowScore} low complexity indicators, no high indicators` };
  if (totalTokens < 1000 && highScore === 0) return { level: "low", reason: `Short prompt (${totalTokens} tokens), no complex patterns` };
  return { level: "medium", reason: `Balanced (high=${highScore}, low=${lowScore}, tokens=${totalTokens})` };
}

function complexityToTier(level: ComplexityLevel): RoutingTier {
  switch (level) {
    case "low": return "economy";
    case "medium": return "balanced";
    case "high": return "high_confidence";
    case "critical": return "premium";
  }
}

// ─────────────────────────────────────────────
// §4  Core Routing Logic
// ─────────────────────────────────────────────

export interface RouteOptions {
  stage?: string;
  forceTier?: RoutingTier;
  forceProvider?: ProviderName;
  forceModel?: string;
  taskClass?: TaskClass;
  systemPrompt?: string;
  userPrompt?: string;
}

/**
 * Route a request using the Canonical Routing Matrix.
 *
 * Decision order:
 * 1. Force model → bypass everything
 * 2. Task class (explicit or from stage mapping) → matrix lookup
 * 3. Heuristic complexity analysis → tier → provider
 * 4. Provider availability → fallback chain
 */
export function routeRequest(options: RouteOptions = {}): RoutingResult {
  const { stage, forceTier, forceProvider, forceModel, systemPrompt = "", userPrompt = "" } = options;

  // 1. Forced model bypass
  if (forceModel) {
    const provider = detectProviderFromModel(forceModel);
    const matrixEntry = resolveRoute(options.taskClass || "generic");
    const config = buildConfig(provider, forceModel, matrixEntry);
    config.model = forceModel; // ensure exact model
    return {
      primary: config,
      metadata: {
        provider, model: forceModel, tier: "balanced",
        taskClass: options.taskClass || "generic", complexity: "medium",
        reason: `Forced model: ${forceModel}`, confidenceTarget: "medium",
        fallbackUsed: false, estimatedCostMultiplier: 0.5,
      },
    };
  }

  // 2. Determine task class from explicit, stage mapping, or generic
  let taskClass: TaskClass = options.taskClass || "generic";
  if (!options.taskClass && stage) {
    taskClass = taskClassForStage(stage);
  }

  // 3. Resolve from canonical matrix
  const matrixEntry = resolveRoute(taskClass);

  // 4. Determine tier (forced or from matrix)
  let tier: RoutingTier;
  let complexity: ComplexityLevel;
  let reason: string;

  if (forceTier) {
    tier = forceTier;
    complexity = tier === "economy" ? "low" : tier === "balanced" ? "medium" : tier === "high_confidence" ? "high" : "critical";
    reason = `Forced tier: ${forceTier}`;
  } else if (taskClass !== "generic") {
    tier = matrixEntry.tier;
    complexity = matrixEntry.complexity;
    reason = `Matrix: ${taskClass} → ${tier} (${matrixEntry.notes})`;
  } else {
    const analysis = analyzeComplexity(systemPrompt, userPrompt);
    complexity = analysis.level;
    tier = complexityToTier(complexity);
    reason = analysis.reason;
  }

  // 5. Provider selection from matrix + availability
  let selectedProvider = matrixEntry.defaultProvider;
  let selectedModel = matrixEntry.defaultModel;
  let fallbackProvider = matrixEntry.fallbackProvider;
  let fallbackModel = matrixEntry.fallbackModel;

  // Force provider override
  if (forceProvider && isAvailable(forceProvider)) {
    selectedProvider = forceProvider;
    if (forceProvider === "openai") {
      selectedModel = tier === "premium" ? CANONICAL_MODELS.GPT5_4 : CANONICAL_MODELS.GPT5_MINI;
    } else if (forceProvider === "deepseek") {
      selectedModel = tier === "high_confidence" || tier === "premium"
        ? CANONICAL_MODELS.DEEPSEEK_REASONER : CANONICAL_MODELS.DEEPSEEK_CHAT;
    }
  }

  // If default provider unavailable, swap to fallback
  if (!isAvailable(selectedProvider) && fallbackProvider && isAvailable(fallbackProvider)) {
    selectedProvider = fallbackProvider;
    selectedModel = fallbackModel || CANONICAL_MODELS.GPT5_MINI;
    fallbackProvider = null;
    fallbackModel = null;
    reason += " (primary unavailable, using fallback)";
  }

  const primary = buildConfig(selectedProvider, selectedModel, matrixEntry);
  const fallback = fallbackProvider
    ? buildConfig(fallbackProvider, fallbackModel || CANONICAL_MODELS.GPT5_MINI, matrixEntry)
    : undefined;

  return {
    primary,
    fallback,
    metadata: {
      provider: selectedProvider,
      model: primary.model,
      tier,
      taskClass,
      complexity,
      reason,
      confidenceTarget: TIER_CONFIDENCE_MAP[tier],
      fallbackUsed: false,
      fallbackProvider: fallbackProvider || undefined,
      estimatedCostMultiplier: TIER_COST_MULTIPLIER[tier],
    },
  };
}

// ─────────────────────────────────────────────
// §5  Convenience Helpers
// ─────────────────────────────────────────────

export function getFastConfig(): ProviderConfig {
  return routeRequest({ forceTier: "economy" }).primary;
}

export function getBalancedConfig(): ProviderConfig {
  return routeRequest({ forceTier: "balanced" }).primary;
}

export function getStrongConfig(): ProviderConfig {
  return routeRequest({ forceTier: "high_confidence" }).primary;
}

export function getPremiumConfig(): ProviderConfig {
  return routeRequest({ forceTier: "premium" }).primary;
}

function detectProviderFromModel(model: string): ProviderName {
  if (model.startsWith("deepseek")) return "deepseek";
  return "openai";
}

export function getModelTier(model: string): ComplexityLevel {
  return matrixGetModelTier(model);
}

// ─────────────────────────────────────────────
// §6  Observability
// ─────────────────────────────────────────────

export function logRoutingDecision(metadata: RoutingMetadata): void {
  console.log(`[ai-router] provider=${metadata.provider} model=${metadata.model} tier=${metadata.tier} task=${metadata.taskClass} complexity=${metadata.complexity} confidence=${metadata.confidenceTarget} fallback=${metadata.fallbackUsed} reason="${metadata.reason}"`);
}
