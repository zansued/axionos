/**
 * Tenant Doctrine Explainer
 * Generates human-readable explanations of tenant operating doctrine.
 */

export interface DoctrineExplanation {
  summary: string;
  mode_description: string;
  dimension_explanations: Array<{ dimension: string; score: number; interpretation: string }>;
  divergence_note: string;
  confidence_note: string;
}

export function explainDoctrine(profile: any): DoctrineExplanation {
  const mode = profile.doctrine_mode || 'balanced';
  const confidence = Number(profile.evidence_confidence) || 0;
  const divergence = Number(profile.divergence_score) || 0;

  const dimensions = [
    { dimension: 'risk_tolerance', score: Number(profile.risk_tolerance_score), interpretation: interpretScore('risk tolerance', Number(profile.risk_tolerance_score)) },
    { dimension: 'validation_strictness', score: Number(profile.validation_strictness_score), interpretation: interpretScore('validation strictness', Number(profile.validation_strictness_score)) },
    { dimension: 'rollback_preference', score: Number(profile.rollback_preference_score), interpretation: interpretScore('rollback preference', Number(profile.rollback_preference_score)) },
    { dimension: 'rollout_cadence', score: Number(profile.rollout_cadence_score), interpretation: interpretScore('rollout cadence', Number(profile.rollout_cadence_score)) },
    { dimension: 'incident_escalation', score: Number(profile.incident_escalation_bias), interpretation: interpretScore('escalation bias', Number(profile.incident_escalation_bias)) },
    { dimension: 'autonomy_tolerance', score: Number(profile.autonomy_tolerance_score), interpretation: interpretScore('autonomy tolerance', Number(profile.autonomy_tolerance_score)) },
  ];

  return {
    summary: `This organization operates in ${mode} mode with ${confidence >= 0.7 ? 'high' : confidence >= 0.4 ? 'moderate' : 'low'} evidence confidence.`,
    mode_description: describeDoctrine(mode),
    dimension_explanations: dimensions,
    divergence_note: divergence >= 0.3
      ? `Significant divergence (${divergence.toFixed(2)}) between declared and observed posture. Review recommended.`
      : divergence > 0
        ? `Minor divergence (${divergence.toFixed(2)}) between declared and observed posture.`
        : 'No divergence detected.',
    confidence_note: confidence < 0.3
      ? 'Low evidence confidence — profile is preliminary and may change with more data.'
      : confidence < 0.7
        ? 'Moderate evidence — profile is stabilizing but not yet fully reliable.'
        : 'High evidence confidence — profile reflects consistent organizational behavior.',
  };
}

function describeDoctrine(mode: string): string {
  switch (mode) {
    case 'aggressive': return 'High risk tolerance, minimal validation overhead. Prioritizes speed and experimentation.';
    case 'conservative': return 'Low risk tolerance, strict validation. Prioritizes stability and safety.';
    case 'growth': return 'Elevated risk tolerance with moderate validation. Balances speed with some safety nets.';
    case 'cautious': return 'Moderate risk tolerance with above-average validation. Prefers reliability over speed.';
    default: return 'Standard operating posture. Balances risk, validation, speed, and cost evenly.';
  }
}

function interpretScore(dimension: string, score: number): string {
  if (score >= 0.7) return `High ${dimension}`;
  if (score >= 0.4) return `Moderate ${dimension}`;
  return `Low ${dimension}`;
}
