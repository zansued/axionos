// Journey Transition Engine
// Governs visible transitions, stage advancement, pauses, and resumes.

import { DEFAULT_TRANSITION_RULES, getStageOrder } from "./user-journey-model-manager.ts";

export interface TransitionEvaluation {
  can_transition: boolean;
  from_stage: string;
  to_stage: string;
  blocked: boolean;
  block_reason: string | null;
  approval_required: boolean;
  trigger_type: string;
  trigger_label: string;
}

export function evaluateTransition(
  currentVisibleStage: string,
  targetVisibleStage: string,
  approvalState: string,
  approvalRequired: boolean,
): TransitionEvaluation {
  const allowedTargets = DEFAULT_TRANSITION_RULES[currentVisibleStage] || [];
  const isAllowed = allowedTargets.includes(targetVisibleStage);
  const targetOrder = getStageOrder(targetVisibleStage);
  const currentOrder = getStageOrder(currentVisibleStage);
  const isForward = targetOrder > currentOrder;

  if (!isAllowed) {
    return {
      can_transition: false,
      from_stage: currentVisibleStage,
      to_stage: targetVisibleStage,
      blocked: true,
      block_reason: `Transition from ${currentVisibleStage} to ${targetVisibleStage} is not allowed`,
      approval_required: false,
      trigger_type: 'blocked',
      trigger_label: 'Transition not available',
    };
  }

  if (approvalRequired && approvalState !== 'approved') {
    return {
      can_transition: false,
      from_stage: currentVisibleStage,
      to_stage: targetVisibleStage,
      blocked: true,
      block_reason: `Approval required before advancing from ${currentVisibleStage}`,
      approval_required: true,
      trigger_type: 'approval_pending',
      trigger_label: `Approve ${currentVisibleStage} to continue`,
    };
  }

  return {
    can_transition: true,
    from_stage: currentVisibleStage,
    to_stage: targetVisibleStage,
    blocked: false,
    block_reason: null,
    approval_required: false,
    trigger_type: isForward ? 'automatic' : 'manual',
    trigger_label: `Advance to ${targetVisibleStage}`,
  };
}

export function getBlockedTransitions(
  currentVisibleStage: string,
  approvalState: string,
  approvalRequired: boolean,
): TransitionEvaluation[] {
  const targets = DEFAULT_TRANSITION_RULES[currentVisibleStage] || [];
  return targets
    .map(t => evaluateTransition(currentVisibleStage, t, approvalState, approvalRequired))
    .filter(e => e.blocked);
}
