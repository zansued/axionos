/**
 * Architecture Simulation Explainer — Sprint 38
 * Generates human-readable explanations for simulation outcomes.
 * Pure functions. No DB access.
 */

export interface SimExplainerInput {
  proposal_type: string;
  target_scope: string;
  target_entities: Record<string, any>;
  affected_layers: string[];
  expected_benefits: { dimension: string; direction: string; magnitude: number; rationale: string }[];
  expected_tradeoffs: { dimension: string; direction: string; magnitude: number; rationale: string }[];
  risk_flags: string[];
  confidence_score: number;
  source_recommendation_id?: string;
}

export interface SimExplanation {
  summary: string;
  what_is_simulated: string;
  why_proposed: string;
  affected_layers_explanation: string;
  expected_upside: string;
  expected_downside: string;
  review_guidance: string[];
  confidence_label: string;
}

function confidenceLabel(score: number): string {
  if (score >= 0.8) return "high";
  if (score >= 0.5) return "moderate";
  if (score >= 0.3) return "low";
  return "very_low";
}

export function explainSimulation(input: SimExplainerInput): SimExplanation {
  const entityNames = Object.keys(input.target_entities).join(", ") || "unspecified";
  const layerList = input.affected_layers.join(", ") || "none identified";
  const confLabel = confidenceLabel(input.confidence_score);

  const benefitSummaries = input.expected_benefits.map(
    (b) => `${b.dimension}: ${b.rationale} (magnitude ${(b.magnitude * 100).toFixed(0)}%)`
  );
  const tradeoffSummaries = input.expected_tradeoffs.map(
    (t) => `${t.dimension}: ${t.rationale} (magnitude ${(t.magnitude * 100).toFixed(0)}%)`
  );

  const guidance: string[] = [];
  if (input.risk_flags.includes("multiple_negative_tradeoffs")) {
    guidance.push("Multiple negative tradeoffs detected — verify each before approval");
  }
  if (input.risk_flags.includes("low_confidence_simulation")) {
    guidance.push("Simulation confidence is low — consider gathering more evidence");
  }
  if (input.risk_flags.includes("broad_scope_risk")) {
    guidance.push("Broad scope — consider splitting into smaller proposals");
  }
  if (input.risk_flags.includes("tenant_isolation_sensitivity")) {
    guidance.push("Tenant isolation boundary affected — requires security review");
  }
  if (guidance.length === 0) {
    guidance.push("No critical risks detected — standard review recommended");
  }

  return {
    summary: `Simulation of "${input.proposal_type}" targeting "${input.target_scope}" with ${confLabel} confidence`,
    what_is_simulated: `Architecture change of type "${input.proposal_type}" affecting entities: ${entityNames}`,
    why_proposed: input.source_recommendation_id
      ? `Derived from discovery architecture recommendation ${input.source_recommendation_id}`
      : "Manually proposed architecture change",
    affected_layers_explanation: `This change would affect the following architectural layers: ${layerList}`,
    expected_upside: benefitSummaries.length > 0
      ? benefitSummaries.join("; ")
      : "No significant positive impact detected",
    expected_downside: tradeoffSummaries.length > 0
      ? tradeoffSummaries.join("; ")
      : "No significant negative tradeoffs detected",
    review_guidance: guidance,
    confidence_label: confLabel,
  };
}
