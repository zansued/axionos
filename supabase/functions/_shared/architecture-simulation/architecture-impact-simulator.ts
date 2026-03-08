/**
 * Architecture Impact Simulator — Sprint 38
 * Estimates likely impact of a proposed architectural change across system dimensions.
 * Pure functions. No DB access.
 */

export interface SimulationInput {
  proposal_type: string;
  target_scope: string;
  target_entities: Record<string, any>;
  proposal_payload: Record<string, any>;
  confidence_score: number;
}

export interface ImpactDimension {
  dimension: string;
  direction: "positive" | "negative" | "neutral";
  magnitude: number; // 0-1
  rationale: string;
}

export interface SimulationResult {
  affected_layers: string[];
  expected_benefits: ImpactDimension[];
  expected_tradeoffs: ImpactDimension[];
  risk_flags: string[];
  confidence_score: number;
  simulation_summary: Record<string, any>;
}

const IMPACT_DIMENSIONS = [
  "execution_latency",
  "repair_burden",
  "strategy_churn",
  "policy_complexity",
  "tenant_divergence",
  "semantic_retrieval_pressure",
  "observability_clarity",
  "stabilization_frequency",
  "platform_health",
  "recommendation_density",
];

const PROPOSAL_LAYER_MAP: Record<string, string[]> = {
  runtime_path_split: ["execution", "control", "data"],
  semantic_domain_support: ["data", "execution"],
  subsystem_modularization: ["execution", "control"],
  context_isolation: ["execution", "control", "data"],
  observability_consolidation: ["data"],
  tenant_boundary_specialization: ["control", "data"],
  strategy_consolidation: ["control"],
  memory_domain_promotion: ["data"],
};

function inferLayers(proposalType: string): string[] {
  return PROPOSAL_LAYER_MAP[proposalType] || ["execution"];
}

function estimateDimension(
  dim: string,
  input: SimulationInput
): ImpactDimension {
  const payload = input.proposal_payload;
  const entityCount = Object.keys(input.target_entities).length;
  const baseConfidence = input.confidence_score || 0.5;

  // Heuristic impact estimation based on proposal type and dimension
  let direction: "positive" | "negative" | "neutral" = "neutral";
  let magnitude = 0;
  let rationale = "";

  if (dim === "execution_latency") {
    if (input.proposal_type === "runtime_path_split") {
      direction = "positive";
      magnitude = 0.6 * baseConfidence;
      rationale = "Specialized runtime paths reduce contention";
    } else if (input.proposal_type === "observability_consolidation") {
      direction = "positive";
      magnitude = 0.3 * baseConfidence;
      rationale = "Fewer observability flows reduce overhead";
    } else {
      magnitude = 0.1;
      rationale = "Minimal latency impact expected";
    }
  } else if (dim === "repair_burden") {
    if (input.proposal_type === "subsystem_modularization") {
      direction = "positive";
      magnitude = 0.5 * baseConfidence;
      rationale = "Isolated subsystems reduce repair scope";
    } else if (entityCount > 5) {
      direction = "negative";
      magnitude = 0.3;
      rationale = "Broad scope may increase repair surface during transition";
    }
  } else if (dim === "policy_complexity") {
    if (input.proposal_type === "strategy_consolidation") {
      direction = "positive";
      magnitude = 0.4 * baseConfidence;
      rationale = "Fewer overlapping strategies simplify policy decisions";
    } else if (input.proposal_type === "tenant_boundary_specialization") {
      direction = "negative";
      magnitude = 0.3;
      rationale = "Tenant-specific boundaries add policy surface";
    }
  } else if (dim === "tenant_divergence") {
    if (input.proposal_type === "tenant_boundary_specialization") {
      direction = "negative";
      magnitude = 0.4;
      rationale = "Specialized boundaries increase tenant divergence";
    }
  } else if (dim === "observability_clarity") {
    if (input.proposal_type === "observability_consolidation") {
      direction = "positive";
      magnitude = 0.7 * baseConfidence;
      rationale = "Consolidated flows improve signal clarity";
    }
  } else if (dim === "semantic_retrieval_pressure") {
    if (input.proposal_type === "semantic_domain_support" || input.proposal_type === "memory_domain_promotion") {
      direction = "positive";
      magnitude = 0.5 * baseConfidence;
      rationale = "First-class domain support reduces retrieval overhead";
    }
  } else if (dim === "stabilization_frequency") {
    if (input.proposal_type === "context_isolation") {
      direction = "positive";
      magnitude = 0.4 * baseConfidence;
      rationale = "Isolation reduces cross-context instability";
    }
  }

  return {
    dimension: dim,
    direction,
    magnitude: Math.min(1, Math.max(0, magnitude)),
    rationale: rationale || `No significant ${dim} impact detected`,
  };
}

function detectRiskFlags(input: SimulationInput, dimensions: ImpactDimension[]): string[] {
  const flags: string[] = [];
  const negatives = dimensions.filter((d) => d.direction === "negative");

  if (negatives.length >= 3) flags.push("multiple_negative_tradeoffs");
  if (input.confidence_score < 0.3) flags.push("low_confidence_simulation");
  if (Object.keys(input.target_entities).length > 10) flags.push("broad_scope_risk");

  const highMagNeg = negatives.filter((d) => d.magnitude > 0.5);
  if (highMagNeg.length > 0) flags.push("high_magnitude_tradeoff");

  if (input.proposal_type === "tenant_boundary_specialization") {
    flags.push("tenant_isolation_sensitivity");
  }

  return flags;
}

export function simulateArchitectureImpact(input: SimulationInput): SimulationResult {
  const dimensions = IMPACT_DIMENSIONS.map((dim) => estimateDimension(dim, input));
  const benefits = dimensions.filter((d) => d.direction === "positive");
  const tradeoffs = dimensions.filter((d) => d.direction === "negative");
  const riskFlags = detectRiskFlags(input, dimensions);
  const affectedLayers = inferLayers(input.proposal_type);

  const avgBenefit = benefits.length > 0
    ? benefits.reduce((s, d) => s + d.magnitude, 0) / benefits.length
    : 0;
  const avgTradeoff = tradeoffs.length > 0
    ? tradeoffs.reduce((s, d) => s + d.magnitude, 0) / tradeoffs.length
    : 0;

  const simConfidence = Math.max(0, Math.min(1,
    (input.confidence_score || 0.5) * (1 - riskFlags.length * 0.1)
  ));

  return {
    affected_layers: affectedLayers,
    expected_benefits: benefits,
    expected_tradeoffs: tradeoffs,
    risk_flags: riskFlags,
    confidence_score: simConfidence,
    simulation_summary: {
      proposal_type: input.proposal_type,
      target_scope: input.target_scope,
      benefit_count: benefits.length,
      tradeoff_count: tradeoffs.length,
      avg_benefit_magnitude: Number(avgBenefit.toFixed(3)),
      avg_tradeoff_magnitude: Number(avgTradeoff.toFixed(3)),
      risk_flag_count: riskFlags.length,
      net_impact_estimate: Number((avgBenefit - avgTradeoff).toFixed(3)),
    },
  };
}
