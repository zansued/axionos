/**
 * Discovery Architecture Recommendation Engine — Sprint 37
 * Generates structured architectural recommendations from opportunities.
 * Pure functions. No DB access.
 */

import { ArchitectureOpportunity } from "./discovery-architecture-opportunity-synthesizer.ts";

export interface DiscoveryArchitectureRecommendation {
  recommendation_type: string;
  target_scope: string;
  target_entities: Record<string, any>;
  rationale_codes: string[];
  evidence_refs: Record<string, any>[];
  expected_impact: Record<string, any>;
  confidence_score: number;
  priority_score: number;
  safety_class: "advisory_only" | "high_review_required";
}

const FORBIDDEN_SCOPES = [
  "pipeline_topology",
  "governance_rules",
  "billing_logic",
  "plan_enforcement",
  "execution_contracts",
  "hard_safety_constraints",
];

const RECOMMENDATION_MAP: Record<string, (o: ArchitectureOpportunity) => DiscoveryArchitectureRecommendation> = {
  bottleneck_workflow_pattern: (o) => ({
    recommendation_type: "split_runtime_path",
    target_scope: o.affected_architecture_scope,
    target_entities: { scope: o.affected_architecture_scope, rationale: o.rationale_codes },
    rationale_codes: o.rationale_codes,
    evidence_refs: o.evidence_refs,
    expected_impact: { type: "reliability_improvement", description: o.expected_value },
    confidence_score: o.confidence_score,
    priority_score: o.review_priority,
    safety_class: "advisory_only",
  }),
  tenant_segmentation_need: (o) => ({
    recommendation_type: "modularize_tenant_architecture",
    target_scope: o.affected_architecture_scope,
    target_entities: { scope: o.affected_architecture_scope },
    rationale_codes: o.rationale_codes,
    evidence_refs: o.evidence_refs,
    expected_impact: { type: "scalability_improvement", description: o.expected_value },
    confidence_score: o.confidence_score,
    priority_score: o.review_priority,
    safety_class: "high_review_required",
  }),
  advisory_cluster_missing_capability: (o) => ({
    recommendation_type: "introduce_system_capability",
    target_scope: o.affected_architecture_scope,
    target_entities: { scope: o.affected_architecture_scope },
    rationale_codes: o.rationale_codes,
    evidence_refs: o.evidence_refs,
    expected_impact: { type: "capability_gap_closure", description: o.expected_value },
    confidence_score: o.confidence_score,
    priority_score: o.review_priority,
    safety_class: "high_review_required",
  }),
  strategy_family_overload: (o) => ({
    recommendation_type: "consolidate_strategy_family",
    target_scope: o.affected_architecture_scope,
    target_entities: { scope: o.affected_architecture_scope },
    rationale_codes: o.rationale_codes,
    evidence_refs: o.evidence_refs,
    expected_impact: { type: "complexity_reduction", description: o.expected_value },
    confidence_score: o.confidence_score,
    priority_score: o.review_priority,
    safety_class: "advisory_only",
  }),
  deploy_critical_pressure: (o) => ({
    recommendation_type: "harden_deploy_path",
    target_scope: o.affected_architecture_scope,
    target_entities: { scope: o.affected_architecture_scope },
    rationale_codes: o.rationale_codes,
    evidence_refs: o.evidence_refs,
    expected_impact: { type: "deploy_safety_improvement", description: o.expected_value },
    confidence_score: o.confidence_score,
    priority_score: o.review_priority,
    safety_class: "advisory_only",
  }),
};

export function generateArchitectureRecommendations(opportunities: ArchitectureOpportunity[]): DiscoveryArchitectureRecommendation[] {
  if (!opportunities.length) return [];

  const recs: DiscoveryArchitectureRecommendation[] = [];

  for (const opp of opportunities) {
    // Guard: never recommend changes to forbidden scopes
    if (FORBIDDEN_SCOPES.some(f => opp.affected_architecture_scope.includes(f))) continue;

    const mapper = RECOMMENDATION_MAP[opp.opportunity_type];
    if (mapper) {
      recs.push(mapper(opp));
    } else {
      recs.push({
        recommendation_type: "review_architecture_" + opp.opportunity_type,
        target_scope: opp.affected_architecture_scope,
        target_entities: { scope: opp.affected_architecture_scope },
        rationale_codes: opp.rationale_codes,
        evidence_refs: opp.evidence_refs,
        expected_impact: { type: "general_review", description: opp.expected_value },
        confidence_score: opp.confidence_score,
        priority_score: opp.review_priority,
        safety_class: "advisory_only",
      });
    }
  }

  return recs.sort((a, b) => b.priority_score - a.priority_score);
}

export function isForbiddenScope(scope: string): boolean {
  return FORBIDDEN_SCOPES.some(f => scope.includes(f));
}
