/**
 * Autonomy Evidence Scorer — Sprint 121
 * Computes composite evidence scores for autonomy domain decisions.
 */

export interface EvidenceInput {
  validation_success_rate: number;
  rollback_count: number;
  incident_count: number;
  total_executions: number;
  doctrine_alignment: number;
  deploy_success_rate: number;
}

export interface EvidenceScore {
  composite: number;
  validation_component: number;
  rollback_component: number;
  incident_component: number;
  doctrine_component: number;
  deploy_component: number;
  confidence: number;
}

export function computeEvidenceScore(input: EvidenceInput): EvidenceScore {
  const minExec = Math.max(input.total_executions, 1);

  const validation_component = input.validation_success_rate;
  const rollback_component = Math.max(0, 1 - (input.rollback_count / minExec));
  const incident_component = Math.max(0, 1 - (input.incident_count / minExec) * 2);
  const doctrine_component = input.doctrine_alignment;
  const deploy_component = input.deploy_success_rate;

  const composite =
    validation_component * 0.25 +
    rollback_component * 0.2 +
    incident_component * 0.2 +
    doctrine_component * 0.15 +
    deploy_component * 0.2;

  const confidence = Math.min(1, input.total_executions / 50);

  return {
    composite: Math.round(composite * 1000) / 1000,
    validation_component: Math.round(validation_component * 1000) / 1000,
    rollback_component: Math.round(rollback_component * 1000) / 1000,
    incident_component: Math.round(incident_component * 1000) / 1000,
    doctrine_component: Math.round(doctrine_component * 1000) / 1000,
    deploy_component: Math.round(deploy_component * 1000) / 1000,
    confidence: Math.round(confidence * 1000) / 1000,
  };
}
