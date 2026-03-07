/**
 * Execution Strategy Variant Synthesizer (Sprint 32)
 * Proposes bounded variants of existing strategies within mutation envelopes.
 */

export interface StrategyFamily {
  id: string;
  strategy_family_key: string;
  baseline_strategy_definition: Record<string, any>;
  allowed_mutation_envelope: Record<string, any>;
  evaluation_metrics: any[];
  rollout_mode: string;
  status: string;
}

export interface StrategyVariantProposal {
  strategy_family_id: string;
  baseline_definition: Record<string, any>;
  variant_definition: Record<string, any>;
  mutation_delta: Record<string, any>;
  hypothesis: string;
  expected_impact: Record<string, any>;
  confidence_score: number;
  variant_mode: string;
  rollback_guard: Record<string, any>;
}

export interface EvolutionSignal {
  target_family_key: string;
  opportunity_score: number;
  rationale_codes: string[];
  evidence_refs: Record<string, any>[];
  expected_improvement_area: string;
}

const MAX_DELTA = 0.25;

export function synthesizeVariant(
  family: StrategyFamily,
  signal: EvolutionSignal
): StrategyVariantProposal | null {
  if (family.status === "frozen" || family.status === "deprecated") return null;

  const baseline = family.baseline_strategy_definition;
  const envelope = family.allowed_mutation_envelope;
  const variant: Record<string, any> = { ...baseline };
  const delta: Record<string, any> = {};

  // Apply bounded mutations based on signal rationale
  for (const key of Object.keys(envelope)) {
    const range = envelope[key];
    if (!range || typeof range.min !== "number" || typeof range.max !== "number") continue;

    const currentVal = typeof baseline[key] === "number" ? baseline[key] : (range.min + range.max) / 2;
    let adjustment = 0;

    if (signal.rationale_codes.includes("high_repair_burden") || signal.rationale_codes.includes("retry_inefficiency")) {
      adjustment = -Math.min(MAX_DELTA, (currentVal - range.min) * 0.3);
    } else if (signal.rationale_codes.includes("validation_overfire") || signal.rationale_codes.includes("escalation_too_early")) {
      adjustment = -Math.min(MAX_DELTA, (currentVal - range.min) * 0.2);
    } else if (signal.rationale_codes.includes("validation_underfire") || signal.rationale_codes.includes("deploy_hardening_gap")) {
      adjustment = Math.min(MAX_DELTA, (range.max - currentVal) * 0.2);
    } else {
      adjustment = Math.min(MAX_DELTA, (range.max - currentVal) * 0.15);
    }

    const newVal = Math.max(range.min, Math.min(range.max, currentVal + adjustment));
    variant[key] = Number(newVal.toFixed(4));
    delta[key] = Number((newVal - currentVal).toFixed(4));
  }

  // Skip if delta is negligible
  const totalDelta = Object.values(delta).reduce((s: number, d: any) => s + Math.abs(d), 0);
  if (totalDelta < 0.01) return null;

  const hypothesis = generateHypothesis(signal, delta);
  const confidence = Math.min(0.9, signal.opportunity_score * 0.8);

  return {
    strategy_family_id: family.id,
    baseline_definition: baseline,
    variant_definition: variant,
    mutation_delta: delta,
    hypothesis,
    expected_impact: {
      area: signal.expected_improvement_area,
      estimated_improvement_pct: Math.round(signal.opportunity_score * 15),
      rationale_codes: signal.rationale_codes,
    },
    confidence_score: Number(confidence.toFixed(3)),
    variant_mode: family.rollout_mode === "bounded_experiment" ? "bounded_experiment_candidate" : "advisory_candidate",
    rollback_guard: {
      max_degradation_pct: 10,
      min_sample_size: 20,
      auto_rollback_on_harmful: true,
      evaluation_window_hours: 48,
    },
  };
}

function generateHypothesis(signal: EvolutionSignal, delta: Record<string, any>): string {
  const changes = Object.entries(delta).filter(([, v]) => Math.abs(v) > 0.001).map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`).join(", ");
  return `Adjusting ${changes} in ${signal.target_family_key} should improve ${signal.expected_improvement_area} based on ${signal.rationale_codes.join(", ")} signals.`;
}
