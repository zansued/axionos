// Journey Friction Analyzer
// Detects confusing transitions, unclear states, and user-facing friction points.

export interface FrictionSignal {
  friction_type: string;
  friction_label: string;
  severity: 'low' | 'medium' | 'high';
  stage_key: string;
  description: string;
  suggestion: string;
}

export function analyzeFriction(
  visibleStage: string,
  approvalRequired: boolean,
  approvalState: string,
  artifactCount: number,
  blockedTransitions: number,
  nextActionLabel: string,
): FrictionSignal[] {
  const signals: FrictionSignal[] = [];

  if (!nextActionLabel || nextActionLabel.trim().length === 0) {
    signals.push({
      friction_type: 'unclear_next_step',
      friction_label: 'No clear next step',
      severity: 'high',
      stage_key: visibleStage,
      description: 'The user has no visible next action at this stage.',
      suggestion: 'Ensure every stage surfaces a clear next action label.',
    });
  }

  if (approvalRequired && approvalState === 'pending') {
    signals.push({
      friction_type: 'approval_blocking',
      friction_label: 'Approval is blocking progress',
      severity: 'medium',
      stage_key: visibleStage,
      description: `An approval is required before advancing from ${visibleStage}.`,
      suggestion: 'Review the outputs and approve or request adjustments.',
    });
  }

  if (artifactCount === 0 && ['discovery', 'architecture', 'engineering'].includes(visibleStage)) {
    signals.push({
      friction_type: 'missing_artifacts',
      friction_label: 'No generated outputs visible',
      severity: 'medium',
      stage_key: visibleStage,
      description: `No artifacts are visible at the ${visibleStage} stage yet.`,
      suggestion: 'Processing may still be in progress. Wait for results or check pipeline status.',
    });
  }

  if (blockedTransitions > 0) {
    signals.push({
      friction_type: 'blocked_transition',
      friction_label: 'Transition blocked',
      severity: 'high',
      stage_key: visibleStage,
      description: `${blockedTransitions} transition(s) are currently blocked.`,
      suggestion: 'Review the block reason and resolve the pending requirement.',
    });
  }

  return signals;
}

export function computeOverallFrictionScore(signals: FrictionSignal[]): number {
  if (signals.length === 0) return 0;
  const weights = { low: 0.1, medium: 0.3, high: 0.6 };
  const total = signals.reduce((sum, s) => sum + weights[s.severity], 0);
  return Math.min(1, total);
}
