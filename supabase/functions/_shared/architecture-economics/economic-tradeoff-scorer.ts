// Economic Tradeoff Scorer — Sprint 48
// Scores tradeoffs between reliability, stability, speed, complexity, divergence, and cost.

export interface TradeoffScore {
  tradeoff_score: number;
  dimension_scores: Record<string, number>;
  dominant_dimension: string;
  risk_flags: string[];
  rationale_codes: string[];
}

const DIMENSION_WEIGHTS: Record<string, number> = {
  reliability: 0.25,
  stability: 0.20,
  cost_efficiency: 0.20,
  rollback_safety: 0.15,
  tenant_coherence: 0.10,
  implementation_speed: 0.10,
};

export function scoreTradeoff(params: {
  reliabilityGain: number;
  stabilityGain: number;
  costEfficiency: number; // savings / investment, higher is better
  rollbackSafety: number; // 0-1, 1 = very safe
  tenantCoherence: number; // 0-1, 1 = fully coherent
  implementationSpeed: number; // 0-1, 1 = fast
  confidence: number;
}): TradeoffScore {
  const {
    reliabilityGain, stabilityGain, costEfficiency,
    rollbackSafety, tenantCoherence, implementationSpeed, confidence,
  } = params;

  const riskFlags: string[] = [];
  const rationale: string[] = [];

  const dimensions: Record<string, number> = {
    reliability: clamp(reliabilityGain, 0, 1),
    stability: clamp(stabilityGain, 0, 1),
    cost_efficiency: clamp(costEfficiency, 0, 1),
    rollback_safety: clamp(rollbackSafety, 0, 1),
    tenant_coherence: clamp(tenantCoherence, 0, 1),
    implementation_speed: clamp(implementationSpeed, 0, 1),
  };

  // Weighted sum
  let weightedSum = 0;
  for (const [dim, weight] of Object.entries(DIMENSION_WEIGHTS)) {
    weightedSum += (dimensions[dim] || 0) * weight;
  }

  // Apply confidence discount
  const confidenceDiscount = 0.5 + (confidence * 0.5); // range [0.5, 1.0]
  const finalScore = round(weightedSum * confidenceDiscount);

  // Risk flags
  if (rollbackSafety < 0.3) riskFlags.push("high_rollback_risk");
  if (tenantCoherence < 0.4) riskFlags.push("tenant_fragmentation_risk");
  if (costEfficiency < 0.2) riskFlags.push("poor_cost_efficiency");
  if (confidence < 0.4) riskFlags.push("low_confidence");

  // Dominant dimension
  let dominant = "cost_efficiency";
  let maxScore = 0;
  for (const [dim, score] of Object.entries(dimensions)) {
    if (score > maxScore) { maxScore = score; dominant = dim; }
  }

  rationale.push(`dominant_dimension_${dominant}`);
  if (riskFlags.length > 0) rationale.push(`risk_flags_${riskFlags.length}`);

  return {
    tradeoff_score: finalScore,
    dimension_scores: dimensions,
    dominant_dimension: dominant,
    risk_flags: riskFlags,
    rationale_codes: rationale,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round(v: number): number {
  return Math.round(v * 10000) / 10000;
}
