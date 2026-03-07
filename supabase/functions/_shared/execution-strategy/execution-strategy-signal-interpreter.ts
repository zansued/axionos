/**
 * Execution Strategy Signal Interpreter (Sprint 32)
 * Detects strategy evolution opportunities from platform signals.
 */

export interface StrategyEvolutionSignal {
  target_family_key: string;
  opportunity_score: number;
  rationale_codes: string[];
  evidence_refs: Record<string, any>[];
  expected_improvement_area: string;
}

export interface StrategySignalInput {
  retry_metrics: { stage: string; retry_rate: number; avg_retries: number }[];
  repair_metrics: { stage: string; repair_rate: number; success_rate: number }[];
  validation_metrics: { stage: string; false_positive_rate: number; false_negative_rate: number }[];
  predictive_metrics: { stage: string; fp_rate: number; fn_rate: number }[];
  review_metrics: { stage: string; escalation_rate: number; avg_review_time_hours: number }[];
  deploy_metrics: { success_rate: number; hardening_cost: number }[];
  cross_stage_spillover: { from_stage: string; to_stage: string; spillover_rate: number }[];
}

const FAMILY_SIGNAL_MAP: Record<string, (input: StrategySignalInput) => StrategyEvolutionSignal | null> = {
  repair_escalation_sequencing: (input) => {
    const highRepair = input.repair_metrics.filter(m => m.repair_rate > 0.3);
    if (highRepair.length === 0) return null;
    const avgRate = highRepair.reduce((s, m) => s + m.repair_rate, 0) / highRepair.length;
    return {
      target_family_key: "repair_escalation_sequencing",
      opportunity_score: Math.min(1, avgRate * 1.5),
      rationale_codes: ["high_repair_burden", "repair_concentration"],
      evidence_refs: highRepair.map(m => ({ stage: m.stage, repair_rate: m.repair_rate })),
      expected_improvement_area: "repair_burden_reduction",
    };
  },
  retry_switching_heuristics: (input) => {
    const highRetry = input.retry_metrics.filter(m => m.retry_rate > 0.25);
    if (highRetry.length === 0) return null;
    const avgRetries = highRetry.reduce((s, m) => s + m.avg_retries, 0) / highRetry.length;
    return {
      target_family_key: "retry_switching_heuristics",
      opportunity_score: Math.min(1, avgRetries / 5),
      rationale_codes: ["retry_inefficiency", "retry_cascade"],
      evidence_refs: highRetry.map(m => ({ stage: m.stage, retry_rate: m.retry_rate, avg_retries: m.avg_retries })),
      expected_improvement_area: "retry_efficiency",
    };
  },
  validation_intensity_ladders: (input) => {
    const imbalanced = input.validation_metrics.filter(m => m.false_positive_rate > 0.2 || m.false_negative_rate > 0.15);
    if (imbalanced.length === 0) return null;
    const maxFP = Math.max(...imbalanced.map(m => m.false_positive_rate));
    const maxFN = Math.max(...imbalanced.map(m => m.false_negative_rate));
    return {
      target_family_key: "validation_intensity_ladders",
      opportunity_score: Math.min(1, (maxFP + maxFN) * 1.5),
      rationale_codes: maxFP > maxFN ? ["validation_overfire"] : ["validation_underfire"],
      evidence_refs: imbalanced.map(m => ({ stage: m.stage, fp: m.false_positive_rate, fn: m.false_negative_rate })),
      expected_improvement_area: "validation_precision",
    };
  },
  predictive_checkpoint_ordering: (input) => {
    const poor = input.predictive_metrics.filter(m => m.fp_rate > 0.25 || m.fn_rate > 0.2);
    if (poor.length === 0) return null;
    return {
      target_family_key: "predictive_checkpoint_ordering",
      opportunity_score: Math.min(1, poor.length * 0.2),
      rationale_codes: ["predictive_imbalance"],
      evidence_refs: poor,
      expected_improvement_area: "predictive_accuracy",
    };
  },
  review_escalation_timing: (input) => {
    const slow = input.review_metrics.filter(m => m.avg_review_time_hours > 4 || m.escalation_rate > 0.4);
    if (slow.length === 0) return null;
    return {
      target_family_key: "review_escalation_timing",
      opportunity_score: Math.min(1, slow.length * 0.25),
      rationale_codes: slow[0].escalation_rate > 0.4 ? ["escalation_too_early"] : ["escalation_too_late"],
      evidence_refs: slow,
      expected_improvement_area: "review_efficiency",
    };
  },
  deploy_hardening_sequencing: (input) => {
    const poor = input.deploy_metrics.filter(m => m.success_rate < 0.85);
    if (poor.length === 0) return null;
    return {
      target_family_key: "deploy_hardening_sequencing",
      opportunity_score: Math.min(1, (1 - poor[0].success_rate) * 2),
      rationale_codes: ["deploy_hardening_gap"],
      evidence_refs: poor,
      expected_improvement_area: "deploy_reliability",
    };
  },
};

export function interpretStrategySignals(input: StrategySignalInput): StrategyEvolutionSignal[] {
  const signals: StrategyEvolutionSignal[] = [];
  for (const [, detector] of Object.entries(FAMILY_SIGNAL_MAP)) {
    const signal = detector(input);
    if (signal && signal.opportunity_score > 0.1) {
      signals.push(signal);
    }
  }
  return signals.sort((a, b) => b.opportunity_score - a.opportunity_score);
}
