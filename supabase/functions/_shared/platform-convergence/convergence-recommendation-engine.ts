/**
 * Convergence Recommendation Engine — Sprint 49
 * Produces advisory-first ranked recommendations for convergence actions.
 * Pure functions. No DB access.
 */

import type { ConvergenceCandidate } from "./convergence-candidate-builder.ts";

export interface ConvergenceRecommendation {
  recommendation_type: string;
  convergence_domain: string;
  target_scope: string;
  target_entities: Array<{ key: string; type: string }>;
  recommendation_reason: Record<string, unknown>;
  expected_impact: Record<string, unknown>;
  priority_score: number;
  confidence_score: number;
  safety_class: "advisory_only" | "high_review_required";
  rationale_codes: string[];
}

const TYPE_MAP: Record<string, { type: string; safety: "advisory_only" | "high_review_required" }> = {
  merge: { type: "merge_convergence", safety: "high_review_required" },
  retire: { type: "retire_specialization", safety: "high_review_required" },
  retain: { type: "retain_specialization", safety: "advisory_only" },
  promote: { type: "promote_to_default", safety: "high_review_required" },
};

export function generateConvergenceRecommendations(
  candidates: ConvergenceCandidate[],
  confidenceScores: Map<string, number>,
): ConvergenceRecommendation[] {
  if (!candidates.length) return [];

  return candidates
    .filter(c => c.convergence_expected_value > 0 || c.candidate_type === "retain")
    .map(c => {
      const mapped = TYPE_MAP[c.candidate_type] || { type: `review_${c.candidate_type}`, safety: "advisory_only" as const };
      const entityKey = c.target_entities.map(e => e.key).join("+");
      const confidence = confidenceScores.get(entityKey) || 0.5;
      const priority = Math.round(Math.min(1, c.convergence_expected_value * 0.5 + c.deprecation_candidate_score * 0.3 + confidence * 0.2) * 100) / 100;

      return {
        recommendation_type: mapped.type,
        convergence_domain: c.convergence_domain,
        target_scope: "organization",
        target_entities: c.target_entities,
        recommendation_reason: {
          candidate_type: c.candidate_type,
          merge_safety: c.merge_safety_score,
          retention_justification: c.retention_justification_score,
          deprecation_score: c.deprecation_candidate_score,
        },
        expected_impact: {
          convergence_expected_value: c.convergence_expected_value,
        },
        priority_score: priority,
        confidence_score: confidence,
        safety_class: mapped.safety,
        rationale_codes: c.rationale_codes,
      };
    })
    .sort((a, b) => b.priority_score - a.priority_score);
}
