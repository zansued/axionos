/**
 * Recovery Path Synthesizer — Sprint 46
 * Synthesizes safe recovery paths from instability.
 * Pure functions. No DB access.
 */

export interface RecoveryStep {
  step_number: number;
  action: string;
  checkpoint: string;
  confidence: number;
}

export interface RecoveryPath {
  path_id: string;
  scope: string;
  steps: RecoveryStep[];
  estimated_confidence: number;
  rollback_dependencies: string[];
  re_entry_conditions: string[];
}

export function synthesizeRecoveryPath(
  scope: string,
  unstableLayerCount: number,
  pressureScore: number,
  activeEnvelopeCount: number
): RecoveryPath {
  const steps: RecoveryStep[] = [];
  let stepNum = 1;

  // Phase 1: contain
  steps.push({ step_number: stepNum++, action: "Activate stabilization envelope for scope", checkpoint: "Verify envelope is applied", confidence: 0.9 });

  // Phase 2: reduce pressure
  if (pressureScore > 0.5) {
    steps.push({ step_number: stepNum++, action: "Reduce concurrent adaptive actions", checkpoint: "Verify pressure below 0.5", confidence: 0.8 });
  }

  // Phase 3: validate stability
  steps.push({ step_number: stepNum++, action: "Monitor stability signals for decay", checkpoint: "No critical signals for 1 cycle", confidence: 0.7 });

  // Phase 4: gradual re-enable
  if (unstableLayerCount > 2) {
    steps.push({ step_number: stepNum++, action: "Re-enable one adaptation family at a time", checkpoint: "Verify no regression after each re-enable", confidence: 0.6 });
  }

  // Phase 5: release envelope
  steps.push({ step_number: stepNum++, action: "Release stabilization envelope", checkpoint: "Confirm sustained stability", confidence: 0.7 });

  const estimatedConfidence = steps.reduce((s, st) => s + st.confidence, 0) / steps.length;

  const rollbackDeps = activeEnvelopeCount > 0 ? ["Prior envelope state must be preserved"] : [];

  const reEntryConditions = [
    "No critical stability signals for at least 2 evaluation cycles",
    "Adaptive pressure below 0.4",
    "No active freeze actions in target scope",
  ];

  return {
    path_id: `recovery-${scope}-${Date.now()}`,
    scope,
    steps,
    estimated_confidence: Math.round(estimatedConfidence * 100) / 100,
    rollback_dependencies: rollbackDeps,
    re_entry_conditions: reEntryConditions,
  };
}
