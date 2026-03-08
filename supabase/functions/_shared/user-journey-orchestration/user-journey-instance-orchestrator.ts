// User Journey Instance Orchestrator
// Maps internal pipeline state into user-facing journey state.

import { mapInternalStageToVisible, calculateJourneyProgress, getStageOrder } from "./user-journey-model-manager.ts";

export interface JourneyInstanceState {
  initiative_id: string;
  current_visible_stage: string;
  current_internal_stage: string;
  journey_progress_score: number;
  clarity_score: number;
  next_action_type: string;
  next_action_label: string;
  approval_required: boolean;
  approval_state: string;
  visible_artifact_count: number;
  deployment_visibility_score: number;
  handoff_readiness_score: number;
  orchestration_health_score: number;
  journey_friction_score: number;
}

export function computeJourneyInstanceState(
  initiative: { id: string; stage_status: string; deploy_url?: string | null; repo_url?: string | null },
  artifactCount: number,
  pendingApprovals: number,
): JourneyInstanceState {
  const internalStage = initiative.stage_status || 'draft';
  const visibleStage = mapInternalStageToVisible(internalStage);
  const progress = calculateJourneyProgress(visibleStage);

  const approvalRequired = pendingApprovals > 0;
  const approvalState = approvalRequired ? 'pending' : 'none';

  const hasDeployUrl = !!initiative.deploy_url;
  const hasRepoUrl = !!initiative.repo_url;
  const deploymentVisibility = hasDeployUrl ? 1.0 : hasRepoUrl ? 0.5 : 0;

  const { nextActionType, nextActionLabel } = deriveNextAction(visibleStage, approvalRequired, hasDeployUrl);

  const clarityScore = computeClarityScore(visibleStage, artifactCount, approvalRequired, nextActionLabel);
  const frictionScore = computeFrictionScore(approvalRequired, artifactCount, visibleStage);
  const healthScore = computeOrchestrationHealth(clarityScore, frictionScore, progress);
  const handoffReadiness = visibleStage === 'delivered' ? 1.0 : visibleStage === 'deploy' ? 0.7 : 0;

  return {
    initiative_id: initiative.id,
    current_visible_stage: visibleStage,
    current_internal_stage: internalStage,
    journey_progress_score: progress / 100,
    clarity_score: clarityScore,
    next_action_type: nextActionType,
    next_action_label: nextActionLabel,
    approval_required: approvalRequired,
    approval_state: approvalState,
    visible_artifact_count: artifactCount,
    deployment_visibility_score: deploymentVisibility,
    handoff_readiness_score: handoffReadiness,
    orchestration_health_score: healthScore,
    journey_friction_score: frictionScore,
  };
}

function deriveNextAction(visibleStage: string, approvalRequired: boolean, hasDeployUrl: boolean): { nextActionType: string; nextActionLabel: string } {
  if (approvalRequired) {
    return { nextActionType: 'approve', nextActionLabel: `Approve ${visibleStage} to continue` };
  }
  switch (visibleStage) {
    case 'idea': return { nextActionType: 'start', nextActionLabel: 'Start Discovery' };
    case 'discovery': return { nextActionType: 'review', nextActionLabel: 'Review Discovery results' };
    case 'architecture': return { nextActionType: 'review', nextActionLabel: 'Review Architecture plan' };
    case 'engineering': return { nextActionType: 'wait', nextActionLabel: 'Building your software...' };
    case 'validation': return { nextActionType: 'wait', nextActionLabel: 'Validating build quality...' };
    case 'deploy': return { nextActionType: 'deploy', nextActionLabel: hasDeployUrl ? 'View deployed app' : 'Publishing to repository...' };
    case 'delivered': return { nextActionType: 'complete', nextActionLabel: 'Your software is live!' };
    default: return { nextActionType: 'none', nextActionLabel: '' };
  }
}

function computeClarityScore(visibleStage: string, artifactCount: number, approvalRequired: boolean, nextActionLabel: string): number {
  let score = 0.5;
  if (nextActionLabel.length > 0) score += 0.2;
  if (artifactCount > 0) score += 0.15;
  if (!approvalRequired || visibleStage !== 'idea') score += 0.1;
  if (getStageOrder(visibleStage) > 0) score += 0.05;
  return Math.min(1, score);
}

function computeFrictionScore(approvalRequired: boolean, artifactCount: number, visibleStage: string): number {
  let score = 0;
  if (approvalRequired) score += 0.3;
  if (artifactCount === 0 && getStageOrder(visibleStage) > 1) score += 0.3;
  return Math.min(1, score);
}

function computeOrchestrationHealth(clarity: number, friction: number, progressPercent: number): number {
  return Math.max(0, Math.min(1, (clarity * 0.4) + ((1 - friction) * 0.3) + ((progressPercent / 100) * 0.3)));
}
