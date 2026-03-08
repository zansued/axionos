/**
 * Architecture Recommendation Linker — Sprint 38
 * Maps discovery recommendations to change proposals.
 * Pure functions. No DB access.
 */

export interface RecommendationLinkInput {
  recommendation_id: string;
  recommendation_type: string;
  target_scope: string;
  target_entities: Record<string, any>;
  rationale_codes: string[];
  evidence_refs: Record<string, any>[];
  confidence_score: number;
  priority_score: number;
  safety_class: string;
}

export interface ChangeProposalDraft {
  proposal_type: string;
  target_scope: string;
  target_entities: Record<string, any>;
  proposal_payload: Record<string, any>;
  source_recommendation_id: string;
  confidence_score: number;
  priority_score: number;
  safety_class: string;
}

const REC_TO_PROPOSAL_MAP: Record<string, string> = {
  split_runtime_path: "runtime_path_split",
  semantic_domain_support: "semantic_domain_support",
  modularize_subsystem: "subsystem_modularization",
  isolate_context: "context_isolation",
  consolidate_observability: "observability_consolidation",
  tenant_boundary: "tenant_boundary_specialization",
  strategy_consolidation: "strategy_consolidation",
  memory_domain_promotion: "memory_domain_promotion",
};

export function linkRecommendationToProposal(input: RecommendationLinkInput): ChangeProposalDraft {
  const proposalType = REC_TO_PROPOSAL_MAP[input.recommendation_type] || input.recommendation_type;

  return {
    proposal_type: proposalType,
    target_scope: input.target_scope,
    target_entities: input.target_entities,
    proposal_payload: {
      source_rationale_codes: input.rationale_codes,
      source_evidence_refs: input.evidence_refs,
      linked_recommendation_type: input.recommendation_type,
    },
    source_recommendation_id: input.recommendation_id,
    confidence_score: input.confidence_score,
    priority_score: input.priority_score,
    safety_class: input.safety_class === "high_review_required" ? "high_review_required" : "advisory_only",
  };
}

export function isDuplicateProposal(
  existing: { proposal_type: string; target_scope: string; status: string }[],
  draft: ChangeProposalDraft
): boolean {
  return existing.some(
    (e) =>
      e.proposal_type === draft.proposal_type &&
      e.target_scope === draft.target_scope &&
      !["rejected", "dismissed"].includes(e.status)
  );
}

export function isStaleProposal(
  createdAt: string,
  maxAgeDays: number = 30
): boolean {
  const age = Date.now() - new Date(createdAt).getTime();
  return age > maxAgeDays * 24 * 60 * 60 * 1000;
}
