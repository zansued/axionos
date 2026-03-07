/**
 * Prompt Rollout Engine — Sprint 22
 *
 * Manages rollout progression for promoted prompt variants.
 * Supports immediate and phased (10→25→50→100) strategies.
 * No automatic kernel mutation — only prompt control assignment.
 */

export type RolloutMode = "manual_confirmed" | "bounded_auto";
export type RolloutStrategy = "immediate" | "phased_10_25_50_100";
export type RolloutStatus = "active" | "paused" | "completed" | "rolled_back";

export interface RolloutWindow {
  id: string;
  organization_id: string;
  stage_key: string;
  promoted_variant_id: string;
  previous_control_variant_id: string | null;
  rollout_mode: RolloutMode;
  rollout_strategy: RolloutStrategy;
  rollout_status: RolloutStatus;
  current_exposure_percent: number;
  started_at: string;
  completed_at: string | null;
}

export interface PhaseAdvanceResult {
  advanced: boolean;
  new_exposure_percent: number;
  reason: string;
  rollout_completed: boolean;
}

/** Phased rollout progression steps */
const PHASED_STEPS = [10, 25, 50, 100];

/** Minimum executions required per phase before advancing */
const MIN_EXECUTIONS_PER_PHASE = 15;

/**
 * Determine the next exposure percent in a phased rollout.
 */
export function getNextPhasePercent(currentPercent: number): number | null {
  const idx = PHASED_STEPS.indexOf(currentPercent);
  if (idx === -1) {
    // Find next step above current
    const next = PHASED_STEPS.find((s) => s > currentPercent);
    return next ?? null;
  }
  if (idx >= PHASED_STEPS.length - 1) return null; // Already at 100
  return PHASED_STEPS[idx + 1];
}

/**
 * Evaluate whether a phased rollout can advance to the next phase.
 */
export function evaluatePhaseAdvance(
  window: RolloutWindow,
  healthStatus: string,
  executionsSinceLastPhase: number,
  confidenceLevel: number,
): PhaseAdvanceResult {
  // Can't advance if not active
  if (window.rollout_status !== "active") {
    return {
      advanced: false,
      new_exposure_percent: window.current_exposure_percent,
      reason: `rollout_not_active: status=${window.rollout_status}`,
      rollout_completed: false,
    };
  }

  // Immediate strategy completes instantly
  if (window.rollout_strategy === "immediate") {
    return {
      advanced: true,
      new_exposure_percent: 100,
      reason: "immediate_strategy_full_exposure",
      rollout_completed: true,
    };
  }

  // Check health
  if (healthStatus === "rollback_recommended" || healthStatus === "rollback_required") {
    return {
      advanced: false,
      new_exposure_percent: window.current_exposure_percent,
      reason: `health_guard_blocked: ${healthStatus}`,
      rollout_completed: false,
    };
  }

  // Check minimum executions
  if (executionsSinceLastPhase < MIN_EXECUTIONS_PER_PHASE) {
    return {
      advanced: false,
      new_exposure_percent: window.current_exposure_percent,
      reason: `insufficient_executions: ${executionsSinceLastPhase} < ${MIN_EXECUTIONS_PER_PHASE}`,
      rollout_completed: false,
    };
  }

  // Check confidence
  if (confidenceLevel < 0.4) {
    return {
      advanced: false,
      new_exposure_percent: window.current_exposure_percent,
      reason: `low_confidence: ${confidenceLevel} < 0.4`,
      rollout_completed: false,
    };
  }

  // Watch status: allow but warn
  const nextPercent = getNextPhasePercent(window.current_exposure_percent);
  if (nextPercent === null) {
    return {
      advanced: false,
      new_exposure_percent: window.current_exposure_percent,
      reason: "already_at_max_exposure",
      rollout_completed: true,
    };
  }

  return {
    advanced: true,
    new_exposure_percent: nextPercent,
    reason: `advanced_to_${nextPercent}_percent`,
    rollout_completed: nextPercent === 100,
  };
}

/**
 * Create a rollout window record (for use in edge functions).
 */
export function buildRolloutWindow(params: {
  organizationId: string;
  stageKey: string;
  promotedVariantId: string;
  previousControlVariantId: string | null;
  rolloutMode: RolloutMode;
  rolloutStrategy: RolloutStrategy;
}): Omit<RolloutWindow, "id" | "started_at" | "completed_at"> {
  const initialExposure = params.rolloutStrategy === "immediate" ? 100 : PHASED_STEPS[0];
  return {
    organization_id: params.organizationId,
    stage_key: params.stageKey,
    promoted_variant_id: params.promotedVariantId,
    previous_control_variant_id: params.previousControlVariantId,
    rollout_mode: params.rolloutMode,
    rollout_strategy: params.rolloutStrategy,
    rollout_status: "active",
    current_exposure_percent: initialExposure,
  };
}
