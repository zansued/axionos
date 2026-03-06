/**
 * Model Router — AI Efficiency Layer
 *
 * Intelligent routing of prompts to appropriate models based on complexity.
 * - low complexity    → google/gemini-2.5-flash-lite (cheapest)
 * - medium complexity → google/gemini-2.5-flash (balanced)
 * - high complexity   → google/gemini-2.5-pro (most capable)
 *
 * Integrates with semantic cache to bypass model calls entirely on cache hits.
 */

export type ComplexityLevel = "low" | "medium" | "high";

export interface RoutingDecision {
  model: string;
  complexity: ComplexityLevel;
  reason: string;
  estimatedCostMultiplier: number;
}

/** Model mapping per complexity tier */
const MODEL_MAP: Record<ComplexityLevel, { model: string; costMultiplier: number }> = {
  low: { model: "google/gemini-2.5-flash-lite", costMultiplier: 0.2 },
  medium: { model: "google/gemini-2.5-flash", costMultiplier: 0.5 },
  high: { model: "google/gemini-2.5-pro", costMultiplier: 1.0 },
};

/** Stages that always need high complexity */
const HIGH_COMPLEXITY_STAGES = new Set([
  "architecture",
  "domain_model",
  "business_logic",
  "api_generation",
  "ui_generation",
  "pipeline-architecture",
  "pipeline-deep-validation",
  "architecture-evolution",
  "product-evolution",
  "revenue-strategy",
]);

/** Stages that can use low complexity */
const LOW_COMPLEXITY_STAGES = new Set([
  "embeddings",
  "generate-embeddings",
  "observability",
  "analytics",
  "behavior_analysis",
  "build-self-healing",
  "pipeline-ci-webhook",
]);

/**
 * Heuristic complexity analysis of a prompt.
 */
function analyzePromptComplexity(
  systemPrompt: string,
  userPrompt: string,
): { level: ComplexityLevel; reason: string } {
  const combined = (systemPrompt + " " + userPrompt).toLowerCase();
  const totalTokens = Math.ceil(combined.length / 4);

  // High complexity indicators
  const highIndicators = [
    /architect/i, /design pattern/i, /data model/i, /schema/i,
    /api contract/i, /business logic/i, /security/i, /migration/i,
    /generate.*code/i, /implement.*component/i, /create.*service/i,
    /refactor/i, /optimize.*performance/i, /strategic/i,
  ];
  const highScore = highIndicators.filter(r => r.test(combined)).length;

  // Low complexity indicators
  const lowIndicators = [
    /summarize/i, /classify/i, /extract/i, /list/i,
    /format/i, /validate/i, /check/i, /count/i,
    /simple/i, /basic/i, /brief/i,
  ];
  const lowScore = lowIndicators.filter(r => r.test(combined)).length;

  // Large context = higher complexity
  if (totalTokens > 8000 && highScore >= 2) {
    return { level: "high", reason: `Large context (${totalTokens} tokens) + ${highScore} high indicators` };
  }

  if (highScore >= 3) {
    return { level: "high", reason: `${highScore} high complexity indicators detected` };
  }

  if (lowScore >= 2 && highScore === 0) {
    return { level: "low", reason: `${lowScore} low complexity indicators, no high indicators` };
  }

  if (totalTokens < 1000 && highScore === 0) {
    return { level: "low", reason: `Short prompt (${totalTokens} tokens), no complex patterns` };
  }

  return { level: "medium", reason: `Balanced complexity (high=${highScore}, low=${lowScore}, tokens=${totalTokens})` };
}

/**
 * Route a prompt to the appropriate model based on complexity analysis.
 *
 * @param systemPrompt - System message
 * @param userPrompt - User message
 * @param stage - Pipeline stage (overrides heuristic if in known lists)
 * @param forceModel - Force a specific model (bypasses routing)
 */
export function routeModel(
  systemPrompt: string,
  userPrompt: string,
  stage?: string,
  forceModel?: string,
): RoutingDecision {
  // Forced model bypasses routing
  if (forceModel) {
    return {
      model: forceModel,
      complexity: "medium",
      reason: `Forced model: ${forceModel}`,
      estimatedCostMultiplier: 0.5,
    };
  }

  // Stage-based routing (known stages)
  if (stage && HIGH_COMPLEXITY_STAGES.has(stage)) {
    const tier = MODEL_MAP.high;
    return {
      model: tier.model,
      complexity: "high",
      reason: `Stage '${stage}' requires high complexity`,
      estimatedCostMultiplier: tier.costMultiplier,
    };
  }

  if (stage && LOW_COMPLEXITY_STAGES.has(stage)) {
    const tier = MODEL_MAP.low;
    return {
      model: tier.model,
      complexity: "low",
      reason: `Stage '${stage}' is low complexity`,
      estimatedCostMultiplier: tier.costMultiplier,
    };
  }

  // Heuristic-based routing
  const { level, reason } = analyzePromptComplexity(systemPrompt, userPrompt);
  const tier = MODEL_MAP[level];

  return {
    model: tier.model,
    complexity: level,
    reason,
    estimatedCostMultiplier: tier.costMultiplier,
  };
}

/**
 * Get routing stats summary for observability.
 */
export function getModelTier(model: string): ComplexityLevel {
  if (model.includes("lite") || model.includes("nano")) return "low";
  if (model.includes("pro") || model.includes("gpt-5.")) return "high";
  return "medium";
}
