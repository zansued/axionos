/**
 * Model Router — AI Efficiency Layer
 *
 * Intelligent routing of prompts to appropriate models based on complexity.
 * Primary providers: OpenAI + DeepSeek (no Gemini defaults).
 *
 * - low complexity    → DeepSeek (cheapest)
 * - medium complexity → DeepSeek (balanced)
 * - high complexity   → OpenAI (most capable)
 *
 * Integrates with canonical AI Router and semantic cache.
 */

import { routeRequest, getModelTier as routerGetModelTier, type ComplexityLevel, type RoutingMetadata } from "./ai-router.ts";

export type { ComplexityLevel };

export interface RoutingDecision {
  model: string;
  complexity: ComplexityLevel;
  reason: string;
  estimatedCostMultiplier: number;
}

/**
 * Route a prompt to the appropriate model based on complexity analysis.
 * Delegates to the canonical AI Router.
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
  const result = routeRequest({
    systemPrompt,
    userPrompt,
    stage,
    forceModel,
  });

  return {
    model: result.primary.model,
    complexity: result.metadata.complexity,
    reason: result.metadata.reason,
    estimatedCostMultiplier: result.metadata.estimatedCostMultiplier,
  };
}

/**
 * Get routing stats summary for observability.
 */
export function getModelTier(model: string): ComplexityLevel {
  return routerGetModelTier(model);
}
