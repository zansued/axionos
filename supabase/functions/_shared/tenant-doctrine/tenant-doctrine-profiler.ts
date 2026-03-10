/**
 * Tenant Doctrine Profiler
 * Derives operating profiles from runtime signals and behavioral evidence.
 */

export interface DoctrineProfile {
  doctrine_mode: string;
  risk_tolerance_score: number;
  validation_strictness_score: number;
  rollback_preference_score: number;
  rollout_cadence_score: number;
  incident_escalation_bias: number;
  autonomy_tolerance_score: number;
  evidence_confidence: number;
}

export function computeDoctrineProfile(signals: any[]): DoctrineProfile {
  if (signals.length === 0) {
    return {
      doctrine_mode: 'balanced',
      risk_tolerance_score: 0.5,
      validation_strictness_score: 0.5,
      rollback_preference_score: 0.5,
      rollout_cadence_score: 0.5,
      incident_escalation_bias: 0.5,
      autonomy_tolerance_score: 0.5,
      evidence_confidence: 0,
    };
  }

  const dims: Record<string, number[]> = {};
  for (const s of signals) {
    const d = s.affected_dimension || 'general';
    if (!dims[d]) dims[d] = [];
    dims[d].push(Number(s.strength) * Number(s.confidence));
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const get = (key: string) => dims[key] ? Math.round(avg(dims[key]) * 100) / 100 : 0.5;

  const confidence = Math.min(signals.length / 50, 1);

  const profile: DoctrineProfile = {
    doctrine_mode: deriveMode(get('risk_tolerance'), get('validation_strictness')),
    risk_tolerance_score: get('risk_tolerance'),
    validation_strictness_score: get('validation_strictness'),
    rollback_preference_score: get('rollback_preference'),
    rollout_cadence_score: get('rollout_cadence'),
    incident_escalation_bias: get('incident_escalation'),
    autonomy_tolerance_score: get('autonomy_tolerance'),
    evidence_confidence: Math.round(confidence * 100) / 100,
  };

  return profile;
}

function deriveMode(riskTolerance: number, validationStrictness: number): string {
  if (riskTolerance >= 0.7 && validationStrictness <= 0.3) return 'aggressive';
  if (riskTolerance <= 0.3 && validationStrictness >= 0.7) return 'conservative';
  if (riskTolerance >= 0.6) return 'growth';
  if (validationStrictness >= 0.6) return 'cautious';
  return 'balanced';
}

export function computeDivergence(declared: Record<string, number>, observed: Record<string, number>): number {
  const keys = new Set([...Object.keys(declared), ...Object.keys(observed)]);
  if (keys.size === 0) return 0;
  let totalDelta = 0;
  for (const k of keys) {
    totalDelta += Math.abs((declared[k] || 0.5) - (observed[k] || 0.5));
  }
  return Math.round((totalDelta / keys.size) * 100) / 100;
}
