/**
 * Marketplace Pilot Program Manager — Sprint 60
 * Manages pilot definitions, scope, activation status, and lifecycle.
 */

export type PilotActivationStatus = 'draft' | 'approved' | 'active' | 'paused' | 'completed' | 'rolled_back' | 'archived';

const VALID_TRANSITIONS: Record<PilotActivationStatus, PilotActivationStatus[]> = {
  draft: ['approved', 'archived'],
  approved: ['active', 'archived'],
  active: ['paused', 'completed', 'rolled_back'],
  paused: ['active', 'rolled_back', 'archived'],
  completed: ['archived'],
  rolled_back: ['archived'],
  archived: [],
};

export function canTransitionPilot(current: PilotActivationStatus, target: PilotActivationStatus): boolean {
  return (VALID_TRANSITIONS[current] || []).includes(target);
}

export function validatePilotTransition(current: string, target: string): { valid: boolean; reason: string } {
  const allowed = VALID_TRANSITIONS[current as PilotActivationStatus];
  if (!allowed) return { valid: false, reason: `unknown_status_${current}` };
  if (!allowed.includes(target as PilotActivationStatus)) return { valid: false, reason: `transition_${current}_to_${target}_not_allowed` };
  return { valid: true, reason: 'valid_transition' };
}

export interface PilotHealthSummary {
  pilot_activation_readiness_score: number;
  bounded_marketplace_health_score: number;
  pilot_scope_integrity_score: number;
  active_capabilities: number;
  active_participants: number;
  total_interactions: number;
  policy_violations: number;
  rationale: string[];
}

export function computePilotHealth(
  capCount: number, partCount: number, interactionCount: number,
  violationCount: number, maxCap: number, maxPart: number
): PilotHealthSummary {
  const rationale: string[] = [];
  const capRatio = maxCap > 0 ? Math.min(1, capCount / maxCap) : 0;
  const partRatio = maxPart > 0 ? Math.min(1, partCount / maxPart) : 0;
  const scopeIntegrity = 1 - (capRatio * 0.5 + partRatio * 0.5) * 0.3;
  const violationPenalty = Math.min(1, violationCount * 0.1);

  if (violationCount > 0) rationale.push(`${violationCount}_policy_violations`);
  if (capRatio > 0.8) rationale.push('near_capability_limit');
  if (partRatio > 0.8) rationale.push('near_participant_limit');

  const health = Math.max(0, Math.min(1, scopeIntegrity - violationPenalty));
  const readiness = capCount > 0 && partCount > 0 ? Math.min(1, health + 0.1) : 0;

  return {
    pilot_activation_readiness_score: Math.round(readiness * 10000) / 10000,
    bounded_marketplace_health_score: Math.round(health * 10000) / 10000,
    pilot_scope_integrity_score: Math.round(scopeIntegrity * 10000) / 10000,
    active_capabilities: capCount,
    active_participants: partCount,
    total_interactions: interactionCount,
    policy_violations: violationCount,
    rationale,
  };
}
