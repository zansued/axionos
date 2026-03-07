/**
 * Execution Strategy Lineage (Sprint 32)
 * Preserves full provenance and explainability for strategy variants.
 */

export interface StrategyLineageRecord {
  variant_id: string;
  family_key: string;
  source_signals: Record<string, any>[];
  baseline_definition: Record<string, any>;
  mutation_delta: Record<string, any>;
  hypothesis: string;
  experiment_id?: string;
  rollout_decision?: string;
  outcome_summary?: Record<string, any>;
  rollback_reason?: Record<string, any>;
  created_at: string;
}

export function buildLineageRecord(params: {
  variant_id: string;
  family_key: string;
  source_signals: Record<string, any>[];
  baseline_definition: Record<string, any>;
  mutation_delta: Record<string, any>;
  hypothesis: string;
  experiment_id?: string;
  rollout_decision?: string;
  outcome_summary?: Record<string, any>;
  rollback_reason?: Record<string, any>;
}): StrategyLineageRecord {
  return {
    ...params,
    created_at: new Date().toISOString(),
  };
}

export function buildExplainability(lineage: StrategyLineageRecord): Record<string, any> {
  return {
    what_changed: {
      family: lineage.family_key,
      mutations: lineage.mutation_delta,
    },
    why_proposed: {
      hypothesis: lineage.hypothesis,
      source_signals: lineage.source_signals.length,
      signal_summary: lineage.source_signals.map(s => s.rationale_codes || s.type || "unknown"),
    },
    how_performed: lineage.outcome_summary || { status: "pending" },
    rollback_info: lineage.rollback_reason || null,
    experiment_ref: lineage.experiment_id || null,
    rollout_decision: lineage.rollout_decision || "pending",
    advisory_first: true,
  };
}
