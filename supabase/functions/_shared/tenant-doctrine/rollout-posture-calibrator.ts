/**
 * Rollout Posture Calibrator
 * Calibrates deployment and rollout risk profiles from observed behavior.
 */

export interface RolloutPosture {
  rollout_strategy: string;
  risk_appetite: string;
  canary_preference: number;
  rollback_trigger_threshold: number;
  deploy_frequency_score: number;
}

export function calibrateRolloutPosture(
  deployEvents: any[],
  rollbackEvents: any[],
  incidentEvents: any[]
): RolloutPosture {
  const totalDeploys = deployEvents.length || 1;
  const rollbackRate = rollbackEvents.length / totalDeploys;
  const incidentRate = incidentEvents.length / totalDeploys;

  const canaryPreference = rollbackRate > 0.2 ? 0.8 : rollbackRate > 0.1 ? 0.6 : 0.4;
  const rollbackThreshold = incidentRate > 0.3 ? 0.2 : incidentRate > 0.1 ? 0.3 : 0.5;
  const deployFrequency = Math.min(totalDeploys / 30, 1); // normalize to ~monthly

  return {
    rollout_strategy: rollbackRate > 0.15 ? 'staged' : 'direct',
    risk_appetite: incidentRate > 0.2 ? 'conservative' : incidentRate > 0.1 ? 'moderate' : 'aggressive',
    canary_preference: Math.round(canaryPreference * 100) / 100,
    rollback_trigger_threshold: Math.round(rollbackThreshold * 100) / 100,
    deploy_frequency_score: Math.round(deployFrequency * 100) / 100,
  };
}
