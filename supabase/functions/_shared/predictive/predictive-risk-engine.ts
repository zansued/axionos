/**
 * Predictive Risk Engine — Sprint 25
 * Scores failure probability using historical patterns, memory, and runtime context.
 * SAFETY: Read-only scoring. Cannot mutate pipeline, governance, billing.
 */

export interface PredictiveContext {
  stage_key: string;
  agent_type?: string;
  model_provider?: string;
  model_name?: string;
  prompt_variant_id?: string;
  context_signature?: string;
  recent_retry_count?: number;
  error_signature?: string;
}

export interface ErrorPatternMatch {
  pattern_id: string;
  error_category: string;
  error_signature: string;
  frequency: number;
  success_rate: number;
  severity: string;
  similarity: number;
}

export interface PredictiveEvidence {
  source: string;
  ref_id: string;
  relevance: number;
  detail: string;
}

export type RiskBand = "low" | "moderate" | "high" | "critical";

export interface RiskAssessment {
  risk_score: number;
  risk_band: RiskBand;
  predicted_failure_types: string[];
  confidence_score: number;
  explanation_codes: string[];
  evidence_refs: PredictiveEvidence[];
  recommended_actions: RecommendedAction[];
}

export interface RecommendedAction {
  action_type: string;
  action_mode: "advisory_only" | "bounded_auto_safe";
  reason: string;
}

export function computeRiskBand(score: number): RiskBand {
  if (score >= 0.8) return "critical";
  if (score >= 0.6) return "high";
  if (score >= 0.35) return "moderate";
  return "low";
}

export function computeRiskScore(
  ctx: PredictiveContext,
  patterns: ErrorPatternMatch[],
  retryCount: number,
  memorySignals: { avg_relevance: number; failure_count: number } | null,
): RiskAssessment {
  const explanations: string[] = [];
  const evidence: PredictiveEvidence[] = [];
  const failureTypes: string[] = [];
  let rawScore = 0;
  let confidenceFactors = 0;
  let confidenceSum = 0;

  // 1. Pattern-based risk
  for (const p of patterns) {
    const patternRisk = (1 - p.success_rate / 100) * p.similarity;
    if (patternRisk > 0.1) {
      rawScore += patternRisk * 0.4;
      failureTypes.push(p.error_category);
      explanations.push(`pattern_match:${p.error_category}`);
      evidence.push({ source: "error_pattern", ref_id: p.pattern_id, relevance: p.similarity, detail: `${p.error_signature} (freq=${p.frequency}, success=${p.success_rate}%)` });
      confidenceFactors++;
      confidenceSum += Math.min(1, p.frequency / 10);
    }
  }

  // 2. Retry escalation
  if (retryCount > 0) {
    const retryRisk = Math.min(retryCount / 5, 1) * 0.3;
    rawScore += retryRisk;
    explanations.push(`retry_escalation:${retryCount}`);
    confidenceFactors++;
    confidenceSum += Math.min(1, retryCount / 3);
  }

  // 3. Memory signals
  if (memorySignals && memorySignals.failure_count > 0) {
    const memRisk = Math.min(memorySignals.failure_count / 10, 1) * 0.2 * memorySignals.avg_relevance;
    rawScore += memRisk;
    explanations.push(`memory_failure_signal:${memorySignals.failure_count}`);
    confidenceFactors++;
    confidenceSum += memorySignals.avg_relevance;
  }

  // 4. Stage-specific sensitivity
  const expensiveStages = ["pipeline-build", "pipeline-deploy", "pipeline-ci", "pipeline-runtime-validation"];
  if (expensiveStages.includes(ctx.stage_key)) {
    rawScore *= 1.15;
    explanations.push("expensive_stage_sensitivity");
  }

  const risk_score = Math.min(Math.round(rawScore * 1000) / 1000, 1.0);
  const confidence_score = confidenceFactors > 0
    ? Math.round((confidenceSum / confidenceFactors) * 1000) / 1000
    : 0;

  const risk_band = computeRiskBand(risk_score);
  const recommended_actions = computeRecommendedActions(risk_band, confidence_score, explanations);

  return {
    risk_score,
    risk_band,
    predicted_failure_types: [...new Set(failureTypes)],
    confidence_score,
    explanation_codes: explanations,
    evidence_refs: evidence,
    recommended_actions,
  };
}

function computeRecommendedActions(band: RiskBand, confidence: number, explanations: string[]): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  if (band === "critical") {
    actions.push({ action_type: "human_review", action_mode: "advisory_only", reason: "critical_risk_threshold" });
    actions.push({ action_type: "pause_execution", action_mode: "advisory_only", reason: "critical_risk_pause" });
  }

  if (band === "high") {
    actions.push({ action_type: "extra_validation", action_mode: "bounded_auto_safe", reason: "high_risk_extra_check" });
    if (confidence >= 0.5) {
      actions.push({ action_type: "strategy_fallback", action_mode: "bounded_auto_safe", reason: "high_confidence_fallback" });
    }
  }

  if (band === "moderate" && explanations.some(e => e.startsWith("retry_escalation"))) {
    actions.push({ action_type: "prompt_fallback", action_mode: "bounded_auto_safe", reason: "retry_prompted_fallback" });
  }

  if (band === "moderate" && confidence < 0.4) {
    actions.push({ action_type: "extra_context", action_mode: "advisory_only", reason: "low_confidence_context_request" });
  }

  return actions;
}
