/**
 * Predictive Outcome Tracker — Sprint 25
 * Compares predicted risk against actual runtime outcome.
 * SAFETY: Read/write bounded. Cannot auto-tune prediction rules.
 */

import type { RiskBand } from "./predictive-risk-engine.ts";

export type PredictionOutcome = "accurate" | "false_positive" | "false_negative" | "helpful_inconclusive" | "harmful_friction";

export interface OutcomeComparison {
  prediction_outcome: PredictionOutcome;
  risk_band: RiskBand;
  actual_failed: boolean;
  action_was_applied: boolean;
  action_outcome: string | null;
}

export function classifyOutcome(
  riskBand: RiskBand,
  actualFailed: boolean,
  actionApplied: boolean,
  actionOutcome: string | null,
): PredictionOutcome {
  const predicted_failure = riskBand === "high" || riskBand === "critical";

  if (predicted_failure && actualFailed) return "accurate";
  if (predicted_failure && !actualFailed) {
    if (actionApplied && actionOutcome === "helpful") return "accurate"; // prevented
    return "false_positive";
  }
  if (!predicted_failure && actualFailed) return "false_negative";
  if (actionApplied && actionOutcome === "harmful") return "harmful_friction";
  if (actionApplied && actionOutcome === "neutral") return "helpful_inconclusive";
  return "accurate"; // low risk, no failure
}

export interface PredictionQualityMetrics {
  total: number;
  accurate: number;
  false_positive: number;
  false_negative: number;
  harmful: number;
  precision_proxy: number;
  false_positive_rate: number;
  false_negative_rate: number;
}

export function computeQualityMetrics(outcomes: PredictionOutcome[]): PredictionQualityMetrics {
  const total = outcomes.length;
  if (total === 0) return { total: 0, accurate: 0, false_positive: 0, false_negative: 0, harmful: 0, precision_proxy: 0, false_positive_rate: 0, false_negative_rate: 0 };

  const accurate = outcomes.filter((o) => o === "accurate").length;
  const fp = outcomes.filter((o) => o === "false_positive").length;
  const fn = outcomes.filter((o) => o === "false_negative").length;
  const harmful = outcomes.filter((o) => o === "harmful_friction").length;

  return {
    total,
    accurate,
    false_positive: fp,
    false_negative: fn,
    harmful,
    precision_proxy: total > 0 ? Math.round((accurate / total) * 1000) / 1000 : 0,
    false_positive_rate: total > 0 ? Math.round((fp / total) * 1000) / 1000 : 0,
    false_negative_rate: total > 0 ? Math.round((fn / total) * 1000) / 1000 : 0,
  };
}
