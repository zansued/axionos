/**
 * Convergence Case Builder — Sprint 50
 * Transforms convergence candidates into formal governance cases.
 * Pure functions. No DB access.
 */

export interface CandidateForCase {
  id: string;
  candidate_type: string;
  convergence_domain: string;
  merge_safety_score: number;
  retention_justification_score: number;
  deprecation_candidate_score: number;
  convergence_expected_value: number;
  convergence_priority_score: number;
  confidence_score: number;
  target_entities: Array<{ key: string; type: string }>;
}

export interface GovernanceCase {
  source_candidate_id: string;
  governance_case_type: string;
  convergence_domain: string;
  proposed_action: string;
  proposed_scope: string;
  beneficial_specialization_score: number;
  fragmentation_risk_score: number;
  redundancy_score: number;
  economic_impact_score: number;
  stability_impact_score: number;
  rollback_complexity_score: number;
  promotion_readiness_score: number;
  retirement_readiness_score: number;
  confidence_score: number;
  evidence_links: Record<string, unknown>;
}

const ACTION_MAP: Record<string, string> = {
  merge: "bounded_merge",
  retire: "retire",
  retain: "retain_local",
  promote: "promote_shared",
};

export function buildGovernanceCases(candidates: CandidateForCase[]): GovernanceCase[] {
  return candidates.map(c => {
    const proposedAction = ACTION_MAP[c.candidate_type] || "retain_local";
    const isPromotion = proposedAction === "promote_shared";
    const isRetirement = proposedAction === "retire" || proposedAction === "deprecate";

    return {
      source_candidate_id: c.id,
      governance_case_type: isPromotion ? "promotion_review" : isRetirement ? "retirement_review" : "convergence_review",
      convergence_domain: c.convergence_domain,
      proposed_action: proposedAction,
      proposed_scope: "organization",
      beneficial_specialization_score: round(c.retention_justification_score),
      fragmentation_risk_score: round(1 - c.merge_safety_score),
      redundancy_score: round(c.deprecation_candidate_score),
      economic_impact_score: round(c.convergence_expected_value),
      stability_impact_score: round(c.convergence_expected_value * 0.8),
      rollback_complexity_score: round(1 - c.merge_safety_score),
      promotion_readiness_score: isPromotion ? round(c.convergence_priority_score * c.confidence_score) : 0,
      retirement_readiness_score: isRetirement ? round(c.deprecation_candidate_score * c.confidence_score) : 0,
      confidence_score: c.confidence_score,
      evidence_links: { candidate_type: c.candidate_type, target_entities: c.target_entities },
    };
  });
}

function round(v: number): number { return Math.round(v * 10000) / 10000; }
