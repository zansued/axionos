/**
 * External Trust Drift Detector — Sprint 58
 * Detects confidence degradation, policy drift, or evidence staleness over time.
 */

export interface TrustSnapshot {
  actor_id: string;
  identity_confidence_score: number;
  evidence_completeness_score: number;
  auditability_score: number;
  policy_alignment_score: number;
  risk_score: number;
  recorded_at: string;
}

export interface DriftSignal {
  actor_id: string;
  drift_type: string;
  drift_magnitude: number;
  trust_drift_score: number;
  drift_direction: 'degrading' | 'improving' | 'stable';
  rationale: string[];
}

export function detectTrustDrift(previous: TrustSnapshot, current: TrustSnapshot): DriftSignal {
  const rationale: string[] = [];
  const deltas: { field: string; delta: number }[] = [];

  const fields: (keyof Omit<TrustSnapshot, 'actor_id' | 'recorded_at'>)[] = [
    'identity_confidence_score', 'evidence_completeness_score',
    'auditability_score', 'policy_alignment_score', 'risk_score',
  ];

  for (const f of fields) {
    const delta = (current[f] as number) - (previous[f] as number);
    const adjustedDelta = f === 'risk_score' ? -delta : delta; // risk increase = degradation
    deltas.push({ field: f, delta: adjustedDelta });
    if (Math.abs(delta) > 0.1) {
      rationale.push(`${f}_changed_by_${(delta * 100).toFixed(0)}`);
    }
  }

  const avgDelta = deltas.reduce((s, d) => s + d.delta, 0) / deltas.length;
  const magnitude = Math.abs(avgDelta);

  let direction: 'degrading' | 'improving' | 'stable' = 'stable';
  if (avgDelta < -0.05) direction = 'degrading';
  else if (avgDelta > 0.05) direction = 'improving';

  let driftType = 'none';
  if (magnitude > 0.2) driftType = 'significant';
  else if (magnitude > 0.1) driftType = 'moderate';
  else if (magnitude > 0.05) driftType = 'minor';

  return {
    actor_id: current.actor_id,
    drift_type: driftType,
    drift_magnitude: Math.round(magnitude * 10000) / 10000,
    trust_drift_score: Math.round(Math.min(1, magnitude * 2) * 10000) / 10000,
    drift_direction: direction,
    rationale,
  };
}
