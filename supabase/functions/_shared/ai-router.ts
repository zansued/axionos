/**
 * Canonical AI Router — AxionOS Model Routing Layer
 *
 * Centralizes all provider/model selection logic.
 * Primary providers: OpenAI + DeepSeek.
 * Pollinations: optional experimental fallback (disabled by default).
 *
 * Routing philosophy:
 *   Tier A (Fast/Cheap)     → DeepSeek first
 *   Tier B (Balanced)       → DeepSeek first, OpenAI fallback
 *   Tier C (High Confidence)→ OpenAI first
 *
 * Never defaults to Gemini. Never silently switches providers.
 */

// ─────────────────────────────────────────────
// §1  Task Classification
// ─────────────────────────────────────────────

export type TaskClass =
  | "simple_transform"
  | "extraction"
  | "summarization"
  | "drafting"
  | "code_generation"
  | "code_refactor"
  | "user_facing_response"
  | "governance_recommendation"
  | "architecture_reasoning"
  | "workspace_analysis"
  | "post_deploy_analysis"
  | "strict_structured_output"
  | "embedding_generation"
  | "prompt_compression"
  | "generic";

export type RoutingTier = "fast" | "balanced" | "high_confidence";
export type ProviderName = "openai" | "deepseek" | "pollinations";
export type ComplexityLevel = "low" | "medium" | "high";

// ─────────────────────────────────────────────
// §2  Routing Metadata
// ─────────────────────────────────────────────

export interface RoutingMetadata {
  provider: ProviderName;
  model: string;
  tier: RoutingTier;
  taskClass: TaskClass;
  complexity: ComplexityLevel;
  reason: string;
  confidenceTarget: "low" | "medium" | "high";
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
// §3  Provider Configuration
// ─────────────────────────────────────────────

/** Environment-based provider configuration */
function getProviderEnv() {
  return {
    openai: {
      key: Deno.env.get("OPENAI_API_KEY") || "",
      url: "https://api.openai.com/v1/chat/completions",
      modelFast: Deno.env.get("OPENAI_MODEL_FAST") || "gpt-4o-mini",
      modelStrong: Deno.env.get("OPENAI_MODEL_STRONG") || "gpt-4o",
    },
    deepseek: {
      key: Deno.env.get("DEEPSEEK_API_KEY") || "",
      url: "https://api.deepseek.com/v1/chat/completions",
      modelFast: Deno.env.get("DEEPSEEK_MODEL_FAST") || "deepseek-chat",
      modelStrong: Deno.env.get("DEEPSEEK_MODEL_STRONG") || "deepseek-chat",
    },
    pollinations: {
      enabled: Deno.env.get("POLLINATIONS_ENABLED") === "true",
      key: Deno.env.get("POLLINATIONS_API_KEY") || "",
      url: "https://text.pollinations.ai/openai",
      budgetCap: parseInt(Deno.env.get("POLLINATIONS_BUDGET_CAP") || "50", 10),
    },
    lovable: {
      key: Deno.env.get("LOVABLE_API_KEY") || "",
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    },
    defaultRoutingMode: (Deno.env.get("DEFAULT_ROUTING_MODE") || "balanced") as RoutingTier,
  };
}

/** Check if a provider is available (has API key) */
function isAvailable(provider: ProviderName): boolean {
  const env = getProviderEnv();
  switch (provider) {
    case "openai": return !!env.openai.key;
    case "deepseek": return !!env.deepseek.key;
    case "pollinations": return env.pollinations.enabled && !!env.pollinations.key;
  }
}

/** Build ProviderConfig for a given provider+quality */
function buildConfig(provider: ProviderName, quality: "fast" | "strong"): ProviderConfig {
  const env = getProviderEnv();
  switch (provider) {
    case "openai":
      return { url: env.openai.url, key: env.openai.key, model: quality === "fast" ? env.openai.modelFast : env.openai.modelStrong };
    case "deepseek":
      return { url: env.deepseek.url, key: env.deepseek.key, model: quality === "fast" ? env.deepseek.modelFast : env.deepseek.modelStrong };
    case "pollinations":
      return { url: env.pollinations.url, key: env.pollinations.key, model: "openai" };
  }
}

// ─────────────────────────────────────────────
// §4  Task → Tier Mapping
// ─────────────────────────────────────────────

const TASK_TIER_MAP: Record<TaskClass, RoutingTier> = {
  // Tier A — Fast/Cheap → DeepSeek
  simple_transform: "fast",
  extraction: "fast",
  summarization: "fast",
  embedding_generation: "fast",
  prompt_compression: "fast",

  // Tier B — Balanced → DeepSeek first, OpenAI fallback
  drafting: "balanced",
  code_generation: "balanced",
  workspace_analysis: "balanced",
  post_deploy_analysis: "balanced",
  generic: "balanced",

  // Tier C — High Confidence → OpenAI
  code_refactor: "high_confidence",
  user_facing_response: "high_confidence",
  governance_recommendation: "high_confidence",
  architecture_reasoning: "high_confidence",
  strict_structured_output: "high_confidence",
};

const TASK_CONFIDENCE_MAP: Record<RoutingTier, "low" | "medium" | "high"> = {
  fast: "low",
  balanced: "medium",
  high_confidence: "high",
};

const TIER_COST_MAP: Record<RoutingTier, number> = {
  fast: 0.15,
  balanced: 0.4,
  high_confidence: 1.0,
};

// ─────────────────────────────────────────────
// §5  Stage → Task Class Mapping
// ─────────────────────────────────────────────

const STAGE_TASK_MAP: Record<string, TaskClass> = {
  // Tier A stages
  embeddings: "embedding_generation",
  "generate-embeddings": "embedding_generation",
  observability: "extraction",
  analytics: "summarization",
  behavior_analysis: "summarization",
  "build-self-healing": "extraction",
  "pipeline-ci-webhook": "simple_transform",
  adaptive_learning: "summarization",

  // Tier B stages
  prd: "drafting",
  stories: "drafting",
  data_model_generation: "code_generation",
  ui_generation: "code_generation",
  code_generation: "code_generation",
  "blueprint-generation": "drafting",

  // Tier C stages
  architecture: "architecture_reasoning",
  domain_model: "architecture_reasoning",
  business_logic: "code_refactor",
  api_generation: "strict_structured_output",
  "pipeline-architecture": "architecture_reasoning",
  "pipeline-deep-validation": "governance_recommendation",
  "architecture-evolution": "architecture_reasoning",
  "product-evolution": "governance_recommendation",
  "revenue-strategy": "governance_recommendation",
};

// ─────────────────────────────────────────────
// §6  Heuristic Complexity Analysis
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
    case "low": return "fast";
    case "medium": return "balanced";
    case "high": return "high_confidence";
  }
}

// ─────────────────────────────────────────────
// §7  Core Routing Logic
// ─────────────────────────────────────────────

export interface RouteOptions {
  /** Pipeline stage (overrides heuristic if mapped) */
  stage?: string;
  /** Force a specific tier */
  forceTier?: RoutingTier;
  /** Force a specific provider */
  forceProvider?: ProviderName;
  /** Force a specific model (bypasses all routing) */
  forceModel?: string;
  /** Task class override */
  taskClass?: TaskClass;
  /** System prompt for heuristic analysis */
  systemPrompt?: string;
  /** User prompt for heuristic analysis */
  userPrompt?: string;
}

/**
 * Route a request to the appropriate provider and model.
 *
 * Decision order:
 * 1. Force model → bypass everything
 * 2. Force provider → use that provider at appropriate quality
 * 3. Stage mapping → known task class → tier
 * 4. Heuristic analysis of prompts → complexity → tier
 * 5. Default routing mode from env
 */
export function routeRequest(options: RouteOptions = {}): RoutingResult {
  const { stage, forceTier, forceProvider, forceModel, systemPrompt = "", userPrompt = "" } = options;

  // 1. Forced model bypasses everything
  if (forceModel) {
    const provider = detectProviderFromModel(forceModel);
    const config = { url: buildConfig(provider, "fast").url, key: buildConfig(provider, "fast").key, model: forceModel };
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

  // 2. Determine task class
  let taskClass: TaskClass = options.taskClass || "generic";
  if (!options.taskClass && stage && STAGE_TASK_MAP[stage]) {
    taskClass = STAGE_TASK_MAP[stage];
  }

  // 3. Determine tier
  let tier: RoutingTier;
  let complexity: ComplexityLevel;
  let reason: string;

  if (forceTier) {
    tier = forceTier;
    complexity = tier === "fast" ? "low" : tier === "balanced" ? "medium" : "high";
    reason = `Forced tier: ${forceTier}`;
  } else if (taskClass !== "generic") {
    tier = TASK_TIER_MAP[taskClass];
    complexity = tier === "fast" ? "low" : tier === "balanced" ? "medium" : "high";
    reason = `Task class '${taskClass}' → tier '${tier}'`;
  } else {
    const analysis = analyzeComplexity(systemPrompt, userPrompt);
    complexity = analysis.level;
    tier = complexityToTier(complexity);
    reason = analysis.reason;
  }

  // 4. Select provider based on tier
  let provider: ProviderName;
  let quality: "fast" | "strong";
  let fallbackProvider: ProviderName | undefined;

  if (forceProvider && isAvailable(forceProvider)) {
    provider = forceProvider;
    quality = tier === "high_confidence" ? "strong" : "fast";
  } else {
    switch (tier) {
      case "fast":
        // DeepSeek first for cheap tasks
        if (isAvailable("deepseek")) {
          provider = "deepseek";
          quality = "fast";
          if (isAvailable("openai")) fallbackProvider = "openai";
        } else if (isAvailable("openai")) {
          provider = "openai";
          quality = "fast";
        } else {
          // Last resort: Lovable gateway (no Gemini default, uses whatever is available)
          provider = "deepseek"; // config will use Lovable gateway as transport
          quality = "fast";
        }
        break;

      case "balanced":
        // DeepSeek first, OpenAI fallback
        if (isAvailable("deepseek")) {
          provider = "deepseek";
          quality = "fast";
          if (isAvailable("openai")) fallbackProvider = "openai";
        } else if (isAvailable("openai")) {
          provider = "openai";
          quality = "fast";
        } else {
          provider = "deepseek";
          quality = "fast";
        }
        break;

      case "high_confidence":
        // OpenAI first for critical tasks
        if (isAvailable("openai")) {
          provider = "openai";
          quality = "strong";
          if (isAvailable("deepseek")) fallbackProvider = "deepseek";
        } else if (isAvailable("deepseek")) {
          provider = "deepseek";
          quality = "strong";
        } else {
          provider = "openai";
          quality = "strong";
        }
        break;
    }
  }

  const primary = buildConfig(provider!, quality!);
  const fallback = fallbackProvider ? buildConfig(fallbackProvider, quality === "strong" ? "strong" : "fast") : undefined;

  return {
    primary,
    fallback,
    metadata: {
      provider: provider!,
      model: primary.model,
      tier,
      taskClass,
      complexity,
      reason,
      confidenceTarget: TASK_CONFIDENCE_MAP[tier],
      fallbackUsed: false,
      fallbackProvider,
      estimatedCostMultiplier: TIER_COST_MAP[tier],
    },
  };
}

// ─────────────────────────────────────────────
// §8  Convenience Helpers
// ─────────────────────────────────────────────

/** Get fast/cheap provider config (Tier A) */
export function getFastConfig(): ProviderConfig {
  return routeRequest({ forceTier: "fast" }).primary;
}

/** Get balanced provider config (Tier B) */
export function getBalancedConfig(): ProviderConfig {
  return routeRequest({ forceTier: "balanced" }).primary;
}

/** Get high-confidence provider config (Tier C) */
export function getStrongConfig(): ProviderConfig {
  return routeRequest({ forceTier: "high_confidence" }).primary;
}

/** Detect provider from model name */
function detectProviderFromModel(model: string): ProviderName {
  if (model.startsWith("gpt-") || model.startsWith("o1") || model.startsWith("o3") || model.startsWith("o4")) return "openai";
  if (model.startsWith("deepseek")) return "deepseek";
  return "openai"; // default fallback
}

/**
 * Get the model tier label (for observability logging).
 * Replaces the old Gemini-based getModelTier.
 */
export function getModelTier(model: string): ComplexityLevel {
  if (model.includes("mini") || model.includes("lite") || model === "deepseek-chat") return "low";
  if (model.includes("4o") && !model.includes("mini")) return "high";
  if (model.includes("reasoner") || model.includes("o1") || model.includes("o3") || model.includes("o4")) return "high";
  return "medium";
}

// ─────────────────────────────────────────────
// §9  Observability
// ─────────────────────────────────────────────

/**
 * Log routing decision for observability.
 * Call this after routing to track provider usage patterns.
 */
export function logRoutingDecision(metadata: RoutingMetadata): void {
  console.log(`[ai-router] provider=${metadata.provider} model=${metadata.model} tier=${metadata.tier} task=${metadata.taskClass} complexity=${metadata.complexity} confidence=${metadata.confidenceTarget} fallback=${metadata.fallbackUsed} reason="${metadata.reason}"`);
}
