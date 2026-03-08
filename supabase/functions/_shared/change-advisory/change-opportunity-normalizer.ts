/**
 * Change Opportunity Normalizer — Sprint 45
 * Converts heterogeneous advisory signals into comparable change opportunities.
 * Pure functions. No DB access.
 */

export interface RawAdvisorySignal {
  id: string;
  signal_source: string;
  signal_type: string;
  target_scope: string;
  target_entities: Record<string, any>;
  signal_payload: Record<string, any>;
  confidence_score: number | null;
  priority_hint: number | null;
  evidence_refs: any | null;
}

export interface NormalizedChangeOpportunity {
  signal_id: string;
  normalized_change_type: string;
  affected_scope: string;
  urgency_score: number;
  expected_value_score: number;
  risk_score: number;
  dependency_refs: string[];
  rationale_codes: string[];
}

const SOURCE_URGENCY_WEIGHTS: Record<string, number> = {
  architecture_fitness: 0.9,
  migration_outcome: 0.85,
  pilot_outcome: 0.8,
  portfolio_recommendation: 0.75,
  simulation_outcome: 0.7,
  discovery_signal: 0.65,
  stabilization_recommendation: 0.8,
  engineering_advisor: 0.6,
  platform_intelligence: 0.55,
  change_plan: 0.7,
  sandbox_outcome: 0.6,
};

const TYPE_TO_CHANGE_TYPE: Record<string, string> = {
  fitness_degradation: "architecture_remediation",
  conflict_detected: "conflict_resolution",
  blast_radius_warning: "scope_containment",
  migration_failure: "migration_repair",
  pilot_harmful: "pilot_rollback",
  recommendation: "architecture_improvement",
  stabilization_warning: "stabilization_action",
  simulation_risk: "risk_mitigation",
};

export function normalizeSignal(signal: RawAdvisorySignal): NormalizedChangeOpportunity {
  const sourceWeight = SOURCE_URGENCY_WEIGHTS[signal.signal_source] || 0.5;
  const confidence = signal.confidence_score ?? 0.5;
  const priorityHint = signal.priority_hint ?? 0.5;

  const urgency = Math.min(1, sourceWeight * 0.5 + confidence * 0.3 + priorityHint * 0.2);

  const payloadRisk = signal.signal_payload?.risk_score ?? signal.signal_payload?.severity_score ?? 0.3;
  const risk = Math.min(1, Number(payloadRisk) * 0.6 + (1 - confidence) * 0.4);

  const expectedValue = Math.min(1, confidence * 0.4 + priorityHint * 0.3 + sourceWeight * 0.3);

  const normalizedType = TYPE_TO_CHANGE_TYPE[signal.signal_type] || "architecture_improvement";

  const dependencyRefs: string[] = [];
  if (signal.signal_payload?.dependency_refs) {
    dependencyRefs.push(...(signal.signal_payload.dependency_refs as string[]));
  }

  const rationale: string[] = [`source:${signal.signal_source}`, `type:${signal.signal_type}`];
  if (confidence >= 0.8) rationale.push("high_confidence");
  if (urgency >= 0.7) rationale.push("high_urgency");
  if (risk >= 0.7) rationale.push("high_risk");

  return {
    signal_id: signal.id,
    normalized_change_type: normalizedType,
    affected_scope: signal.target_scope,
    urgency_score: Math.round(urgency * 100) / 100,
    expected_value_score: Math.round(expectedValue * 100) / 100,
    risk_score: Math.round(risk * 100) / 100,
    dependency_refs: dependencyRefs,
    rationale_codes: rationale,
  };
}

export function normalizeSignals(signals: RawAdvisorySignal[]): NormalizedChangeOpportunity[] {
  return signals.map(normalizeSignal);
}
