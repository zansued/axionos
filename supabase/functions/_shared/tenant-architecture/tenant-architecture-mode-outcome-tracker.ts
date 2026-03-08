/**
 * Tenant Architecture Mode Outcome Tracker — Sprint 47
 * Tracks outcomes for tenant-aware architecture mode usage.
 */

export interface ModeOutcome {
  mode_key: string;
  organization_id: string;
  workspace_id?: string;
  baseline: OutcomeMetrics;
  current: OutcomeMetrics;
}

export interface OutcomeMetrics {
  architecture_fitness?: number;
  stability_score?: number;
  migration_readiness?: number;
  observability_fitness?: number;
  retrieval_performance?: number;
  strategy_churn?: number;
  tenant_divergence?: number;
  change_density?: number;
}

export interface OutcomeAnalysis {
  outcome_status: "helpful" | "neutral" | "harmful" | "inconclusive";
  delta_summary: Record<string, number>;
  evidence_refs: string[];
  rationale: string;
}

export function analyzeOutcome(outcome: ModeOutcome): OutcomeAnalysis {
  const deltas: Record<string, number> = {};
  const evidence: string[] = [];
  let improvement_count = 0;
  let degradation_count = 0;
  let total_keys = 0;

  const keys: (keyof OutcomeMetrics)[] = [
    "architecture_fitness", "stability_score", "migration_readiness",
    "observability_fitness", "retrieval_performance", "strategy_churn",
    "tenant_divergence", "change_density",
  ];

  for (const key of keys) {
    const b = outcome.baseline[key];
    const c = outcome.current[key];
    if (b !== undefined && c !== undefined) {
      const delta = c - b;
      deltas[key] = delta;
      total_keys++;

      // For churn/divergence/density, lower is better
      const lowerIsBetter = key === "strategy_churn" || key === "tenant_divergence" || key === "change_density";
      const improved = lowerIsBetter ? delta < -0.05 : delta > 0.05;
      const degraded = lowerIsBetter ? delta > 0.05 : delta < -0.05;

      if (improved) {
        improvement_count++;
        evidence.push(`${key}_improved_by_${Math.abs(delta).toFixed(2)}`);
      } else if (degraded) {
        degradation_count++;
        evidence.push(`${key}_degraded_by_${Math.abs(delta).toFixed(2)}`);
      }
    }
  }

  if (total_keys === 0) {
    return { outcome_status: "inconclusive", delta_summary: deltas, evidence_refs: evidence, rationale: "insufficient_data" };
  }

  let status: OutcomeAnalysis["outcome_status"];
  if (improvement_count > degradation_count && improvement_count >= 2) {
    status = "helpful";
  } else if (degradation_count > improvement_count && degradation_count >= 2) {
    status = "harmful";
  } else if (total_keys >= 3 && improvement_count === 0 && degradation_count === 0) {
    status = "neutral";
  } else {
    status = "inconclusive";
  }

  return {
    outcome_status: status,
    delta_summary: deltas,
    evidence_refs: evidence,
    rationale: `improvements=${improvement_count}_degradations=${degradation_count}_total=${total_keys}`,
  };
}
