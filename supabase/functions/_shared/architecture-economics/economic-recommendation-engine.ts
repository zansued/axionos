// Economic Recommendation Engine — Sprint 48
// Produces advisory-first recommendations ranked by expected value under governance constraints.

export interface EconomicRecommendation {
  recommendation_type: string;
  target_scope: string;
  expected_value: number;
  confidence_score: number;
  priority_score: number;
  rationale: string;
  risk_flags: string[];
  assumptions: string[];
}

export function generateRecommendations(params: {
  assessments: Array<{
    change_type: string;
    projected_change_cost: number;
    projected_operational_cost_delta: number;
    projected_reliability_gain: number;
    projected_stability_gain: number;
    economic_tradeoff_score: number;
    economic_confidence_score: number;
    migration_roi_30d: number;
    tenant_divergence_cost: number;
    change_ref?: Record<string, unknown>;
  }>;
  maxRecommendations?: number;
}): EconomicRecommendation[] {
  const { assessments, maxRecommendations = 10 } = params;
  const recommendations: EconomicRecommendation[] = [];

  for (const a of assessments) {
    const riskFlags: string[] = [];
    const assumptions: string[] = [];

    // Expected value = savings * confidence, penalized by rollback risk
    const savingsSignal = Math.max(0, a.projected_operational_cost_delta);
    const expectedValue = round(savingsSignal * a.economic_confidence_score);

    // Priority = EV * tradeoff score (higher is better)
    const priorityScore = round(expectedValue * a.economic_tradeoff_score);

    // Generate recommendation type based on assessment
    let recType = "optimize_cost";
    let rationale = "";

    if (a.migration_roi_30d > 0.5 && a.economic_confidence_score > 0.5) {
      recType = "accelerate_migration";
      rationale = `High 30d ROI (${(a.migration_roi_30d * 100).toFixed(0)}%) with adequate confidence. Migration likely justified.`;
    } else if (a.projected_reliability_gain > 0.3 && a.projected_change_cost < savingsSignal * 2) {
      recType = "invest_in_reliability";
      rationale = `Reliability gain (${(a.projected_reliability_gain * 100).toFixed(0)}%) outweighs cost within 2x savings window.`;
    } else if (a.tenant_divergence_cost > savingsSignal * 0.5) {
      recType = "reduce_fragmentation";
      rationale = `Tenant divergence cost ($${a.tenant_divergence_cost.toFixed(4)}) consuming >50% of projected savings.`;
      riskFlags.push("fragmentation_dominates_savings");
    } else if (savingsSignal > 0) {
      recType = "optimize_cost";
      rationale = `Projected savings of $${savingsSignal.toFixed(4)} with ${(a.economic_confidence_score * 100).toFixed(0)}% confidence.`;
    } else {
      recType = "defer_change";
      rationale = `No clear savings signal. Recommend deferring until evidence improves.`;
      riskFlags.push("no_savings_signal");
    }

    if (a.economic_confidence_score < 0.4) {
      riskFlags.push("low_confidence");
      assumptions.push("Confidence below threshold — recommendation weight reduced.");
    }

    assumptions.push("Based on current telemetry and bounded heuristics.");
    assumptions.push("Advisory-only — no automated action taken.");

    const targetScope = (a.change_ref as any)?.scope || a.change_type || "platform";

    recommendations.push({
      recommendation_type: recType,
      target_scope: targetScope,
      expected_value: expectedValue,
      confidence_score: a.economic_confidence_score,
      priority_score: priorityScore,
      rationale,
      risk_flags: riskFlags,
      assumptions,
    });
  }

  // Sort by priority descending, take top N
  recommendations.sort((a, b) => b.priority_score - a.priority_score);
  return recommendations.slice(0, maxRecommendations);
}

function round(v: number): number {
  return Math.round(v * 10000) / 10000;
}
