/**
 * Discovery Architecture Explainer — Sprint 37
 * Generates explainability payloads for architecture recommendations.
 * Pure functions. No DB access.
 */

import { DiscoveryArchitectureRecommendation } from "./discovery-architecture-recommendation-engine.ts";

export interface ArchitectureExplanation {
  recommendation_type: string;
  target_scope: string;
  what_triggered: string[];
  which_layers_contributed: string[];
  why_architectural: string;
  expected_tradeoff: string;
  what_to_review: string[];
  confidence_level: string;
  priority_level: string;
}

export function explainRecommendation(rec: DiscoveryArchitectureRecommendation): ArchitectureExplanation {
  const layers = new Set<string>();
  for (const code of rec.rationale_codes) {
    if (code.includes("bottleneck")) layers.add("platform_intelligence");
    if (code.includes("tenant")) layers.add("tenant_adaptive_tuning");
    if (code.includes("advisory")) layers.add("engineering_advisor");
    if (code.includes("strategy")) layers.add("strategy_evolution");
    if (code.includes("deploy")) layers.add("execution_governance");
    if (code.includes("stability")) layers.add("platform_stabilization");
    if (code.includes("retrieval")) layers.add("semantic_retrieval");
  }
  if (!layers.size) layers.add("discovery_signals");

  const confLevel = rec.confidence_score >= 0.7 ? "high" : rec.confidence_score >= 0.4 ? "moderate" : "low";
  const prioLevel = rec.priority_score >= 0.7 ? "high" : rec.priority_score >= 0.4 ? "moderate" : "low";

  return {
    recommendation_type: rec.recommendation_type,
    target_scope: rec.target_scope,
    what_triggered: rec.rationale_codes,
    which_layers_contributed: [...layers],
    why_architectural: `This recommendation targets structural scope "${rec.target_scope}" — operational fixes alone would not resolve the underlying pattern.`,
    expected_tradeoff: rec.expected_impact?.description || "Trade-off analysis requires human review.",
    what_to_review: [
      `Verify that "${rec.target_scope}" is the correct architectural boundary`,
      "Assess blast radius of proposed change",
      "Confirm evidence quality and recurrence",
      rec.safety_class === "high_review_required" ? "This requires high-level architecture review before implementation" : "Standard advisory review is sufficient",
    ],
    confidence_level: confLevel,
    priority_level: prioLevel,
  };
}

export function explainBatch(recs: DiscoveryArchitectureRecommendation[]): ArchitectureExplanation[] {
  return recs.map(explainRecommendation);
}
