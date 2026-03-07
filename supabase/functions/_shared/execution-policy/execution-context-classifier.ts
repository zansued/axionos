// Execution Context Classifier — AxionOS Sprint 27
// Classifies the current execution context and recommends a policy mode.

export interface ClassificationInput {
  organization_id: string;
  initiative_type?: string;
  workspace_tier?: string;
  historical_failure_rate?: number;
  predictive_risk_score?: number;
  downstream_sensitivity?: number;
  recent_repair_burden?: number;
  quality_requirements?: "standard" | "high" | "critical";
  deployment_criticality?: "low" | "medium" | "high" | "critical";
  cost_pressure?: "none" | "moderate" | "high";
  memory_signals?: Record<string, unknown>;
  recent_retries?: number;
  recent_validation_failures?: number;
}

export interface ClassificationResult {
  context_class: string;
  recommended_policy_mode: string;
  confidence_score: number;
  reason_codes: string[];
  evidence_refs: Record<string, unknown>[];
}

const CONTEXT_CLASSES = [
  "balanced_default",
  "high_quality",
  "cost_optimized",
  "rapid_iteration",
  "risk_sensitive",
  "deploy_hardened",
  "repair_conservative",
  "validation_heavy",
] as const;

export type ContextClass = typeof CONTEXT_CLASSES[number];

/**
 * Classify execution context deterministically based on input signals.
 */
export function classifyExecutionContext(input: ClassificationInput): ClassificationResult {
  const reasons: string[] = [];
  const evidence: Record<string, unknown>[] = [];
  const scores: Record<string, number> = {};

  // Initialize all classes
  for (const cls of CONTEXT_CLASSES) scores[cls] = 0;

  // Default baseline
  scores.balanced_default = 0.3;

  // Deployment criticality
  if (input.deployment_criticality === "critical") {
    scores.deploy_hardened += 0.5;
    scores.high_quality += 0.3;
    reasons.push("critical_deployment");
    evidence.push({ signal: "deployment_criticality", value: "critical" });
  } else if (input.deployment_criticality === "high") {
    scores.deploy_hardened += 0.3;
    scores.high_quality += 0.2;
    reasons.push("high_deployment_criticality");
  }

  // Quality requirements
  if (input.quality_requirements === "critical") {
    scores.high_quality += 0.5;
    scores.validation_heavy += 0.3;
    reasons.push("critical_quality_requirements");
    evidence.push({ signal: "quality_requirements", value: "critical" });
  } else if (input.quality_requirements === "high") {
    scores.high_quality += 0.3;
    scores.validation_heavy += 0.2;
    reasons.push("high_quality_requirements");
  }

  // Cost pressure
  if (input.cost_pressure === "high") {
    scores.cost_optimized += 0.5;
    scores.rapid_iteration += 0.2;
    reasons.push("high_cost_pressure");
    evidence.push({ signal: "cost_pressure", value: "high" });
  } else if (input.cost_pressure === "moderate") {
    scores.cost_optimized += 0.2;
    reasons.push("moderate_cost_pressure");
  }

  // Predictive risk
  if (input.predictive_risk_score !== undefined) {
    if (input.predictive_risk_score > 0.7) {
      scores.risk_sensitive += 0.5;
      scores.repair_conservative += 0.3;
      scores.validation_heavy += 0.2;
      reasons.push("high_predictive_risk");
      evidence.push({ signal: "predictive_risk_score", value: input.predictive_risk_score });
    } else if (input.predictive_risk_score > 0.4) {
      scores.risk_sensitive += 0.2;
      reasons.push("moderate_predictive_risk");
    }
  }

  // Historical failure rate
  if (input.historical_failure_rate !== undefined) {
    if (input.historical_failure_rate > 0.5) {
      scores.repair_conservative += 0.4;
      scores.risk_sensitive += 0.3;
      reasons.push("high_historical_failure_rate");
      evidence.push({ signal: "historical_failure_rate", value: input.historical_failure_rate });
    } else if (input.historical_failure_rate > 0.25) {
      scores.repair_conservative += 0.2;
      reasons.push("moderate_historical_failure_rate");
    }
  }

  // Recent repair burden
  if (input.recent_repair_burden !== undefined && input.recent_repair_burden > 3) {
    scores.repair_conservative += 0.4;
    scores.validation_heavy += 0.2;
    reasons.push("high_repair_burden");
    evidence.push({ signal: "recent_repair_burden", value: input.recent_repair_burden });
  }

  // Recent retries
  if (input.recent_retries !== undefined && input.recent_retries > 5) {
    scores.repair_conservative += 0.3;
    scores.risk_sensitive += 0.2;
    reasons.push("high_retry_count");
    evidence.push({ signal: "recent_retries", value: input.recent_retries });
  }

  // Recent validation failures
  if (input.recent_validation_failures !== undefined && input.recent_validation_failures > 3) {
    scores.validation_heavy += 0.4;
    reasons.push("frequent_validation_failures");
    evidence.push({ signal: "recent_validation_failures", value: input.recent_validation_failures });
  }

  // Downstream sensitivity
  if (input.downstream_sensitivity !== undefined && input.downstream_sensitivity > 0.7) {
    scores.deploy_hardened += 0.3;
    scores.validation_heavy += 0.2;
    reasons.push("high_downstream_sensitivity");
    evidence.push({ signal: "downstream_sensitivity", value: input.downstream_sensitivity });
  }

  // Find winning class
  let bestClass: ContextClass = "balanced_default";
  let bestScore = 0;
  for (const cls of CONTEXT_CLASSES) {
    if (scores[cls] > bestScore) {
      bestScore = scores[cls];
      bestClass = cls;
    }
  }

  // Confidence based on margin above second best
  const sortedScores = Object.values(scores).sort((a, b) => b - a);
  const margin = sortedScores.length > 1 ? sortedScores[0] - sortedScores[1] : sortedScores[0];
  const confidence = Math.min(1, Math.max(0.1, margin + 0.3));

  if (reasons.length === 0) {
    reasons.push("no_strong_signals_default_balanced");
  }

  return {
    context_class: bestClass,
    recommended_policy_mode: bestClass,
    confidence_score: Math.round(confidence * 100) / 100,
    reason_codes: reasons,
    evidence_refs: evidence,
  };
}
