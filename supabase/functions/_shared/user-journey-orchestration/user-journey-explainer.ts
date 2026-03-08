// User Journey Explainer
// Returns structured explanations for stage state, next step, approval need, and visible outputs.

import type { JourneyInstanceState } from "./user-journey-instance-orchestrator.ts";
import type { FrictionSignal } from "./journey-friction-analyzer.ts";
import type { DeploymentVisibility } from "./deployment-visibility-orchestrator.ts";

export interface JourneyExplanation {
  current_stage_explanation: string;
  next_step_explanation: string;
  approval_explanation: string | null;
  deployment_explanation: string | null;
  friction_explanation: string | null;
  overall_posture: string;
  confidence: number;
}

export function explainJourney(
  state: JourneyInstanceState,
  frictionSignals: FrictionSignal[],
  deployVisibility: DeploymentVisibility | null,
): JourneyExplanation {
  const stageLabels: Record<string, string> = {
    idea: 'capturing your idea',
    discovery: 'validating the opportunity',
    architecture: 'planning the technical architecture',
    engineering: 'building the software',
    validation: 'validating the build',
    deploy: 'deploying the software',
    delivered: 'delivered and live',
  };

  const currentStageExplanation = `Your initiative is currently in the "${state.current_visible_stage}" stage — ${stageLabels[state.current_visible_stage] || 'processing'}.`;

  const nextStepExplanation = state.next_action_label
    ? `Next step: ${state.next_action_label}.`
    : 'No immediate action needed.';

  const approvalExplanation = state.approval_required
    ? `An approval is required before the journey can advance from ${state.current_visible_stage}. Review the generated outputs and approve or request changes.`
    : null;

  const deploymentExplanation = deployVisibility
    ? `Delivery status: ${deployVisibility.delivery_label}. ${deployVisibility.delivery_description}`
    : null;

  const frictionExplanation = frictionSignals.length > 0
    ? `${frictionSignals.length} friction point(s) detected: ${frictionSignals.map(f => f.friction_label).join(', ')}.`
    : null;

  const overallPosture = deriveOverallPosture(state, frictionSignals);

  return {
    current_stage_explanation: currentStageExplanation,
    next_step_explanation: nextStepExplanation,
    approval_explanation: approvalExplanation,
    deployment_explanation: deploymentExplanation,
    friction_explanation: frictionExplanation,
    overall_posture: overallPosture,
    confidence: state.orchestration_health_score,
  };
}

function deriveOverallPosture(state: JourneyInstanceState, frictionSignals: FrictionSignal[]): string {
  if (state.current_visible_stage === 'delivered') return 'complete';
  if (frictionSignals.some(f => f.severity === 'high')) return 'needs_attention';
  if (state.approval_required) return 'awaiting_approval';
  if (state.journey_progress_score > 0.7) return 'near_completion';
  if (state.journey_progress_score > 0.3) return 'progressing';
  return 'early_stage';
}
