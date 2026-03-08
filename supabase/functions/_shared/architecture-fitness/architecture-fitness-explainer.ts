/**
 * Architecture Fitness Explainability — Sprint 44
 */

export interface FitnessExplanation {
  dimension_key: string;
  dimension_score: number;
  degradation_status: string;
  contributing_signals: string[];
  trend: string;
  affected_scopes: string[];
  recommendation_summary: string;
  validation_notes: string[];
  safety_notes: string[];
}

export function buildFitnessExplanation(params: {
  dimension_key: string;
  score: number;
  degradation_status: string;
  signals: string[];
  trend: string;
  scopes: string[];
  recommendation?: string;
}): FitnessExplanation {
  return {
    dimension_key: params.dimension_key,
    dimension_score: params.score,
    degradation_status: params.degradation_status,
    contributing_signals: params.signals,
    trend: params.trend,
    affected_scopes: params.scopes,
    recommendation_summary: params.recommendation || "No action required",
    validation_notes: ["Validate before any architectural intervention"],
    safety_notes: [
      "Cannot mutate topology directly",
      "Cannot alter governance/billing/enforcement",
      "Cannot auto-approve architecture changes",
      "Cannot override tenant isolation",
      "All outputs advisory-first and review-driven",
    ],
  };
}
