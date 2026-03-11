/**
 * Readiness Engine — Phase 4
 *
 * Evaluates an initiative's readiness to proceed through the pipeline.
 * All readiness is derived from explicit, deterministic checks.
 */

import type {
  ReadinessResult,
  ReadinessCheck,
  DeliveryStage,
  InitiativeReadinessInput,
} from "./readiness-types";
import { getStageDefinition, getDeliveryStage } from "./stage-definitions";

/**
 * Evaluate readiness for an initiative at its current stage.
 *
 * This is the core entry point of the Readiness Engine.
 * It runs all checks for the current stage and produces
 * a deterministic, traceable result.
 */
export function evaluateInitiativeReadiness(
  input: InitiativeReadinessInput
): ReadinessResult {
  const stageStatus = input.stage_status || "draft";
  const deliveryStage = getDeliveryStage(stageStatus) as DeliveryStage;

  // Completed initiatives are fully ready
  if (deliveryStage === "completed" || stageStatus === "completed") {
    return {
      stage: "completed",
      readinessScore: 1.0,
      blockers: [],
      warnings: [],
      passedChecks: [],
      allChecks: [],
      evaluatedAt: new Date().toISOString(),
      canProceed: true,
    };
  }

  const definition = getStageDefinition(stageStatus);
  if (!definition) {
    return {
      stage: deliveryStage,
      readinessScore: 0,
      blockers: [{
        key: "unknown_stage",
        label: "Unknown pipeline stage",
        required: true,
        status: "fail",
        explanation: `Stage "${stageStatus}" is not recognized by the readiness engine.`,
        action: "Contact support or check pipeline configuration.",
      }],
      warnings: [],
      passedChecks: [],
      allChecks: [],
      evaluatedAt: new Date().toISOString(),
      canProceed: false,
    };
  }

  // Run all checks
  const allChecks: ReadinessCheck[] = definition.checks.map((checkFn) => checkFn(input));

  // Classify
  const blockers = allChecks.filter((c) => c.required && c.status === "fail");
  const warnings = allChecks.filter(
    (c) => (!c.required && c.status !== "pass") || (c.required && c.status === "unknown")
  );
  const passedChecks = allChecks.filter((c) => c.status === "pass");

  // Score: passed required / total required
  const requiredChecks = allChecks.filter((c) => c.required);
  const passedRequired = requiredChecks.filter((c) => c.status === "pass").length;
  const readinessScore = requiredChecks.length > 0
    ? passedRequired / requiredChecks.length
    : 1.0;

  const canProceed = blockers.length === 0;
  const nextRequiredAction = blockers.length > 0
    ? blockers[0].action
    : warnings.length > 0
      ? warnings[0].action
      : undefined;

  return {
    stage: deliveryStage,
    readinessScore,
    blockers,
    warnings,
    passedChecks,
    allChecks,
    evaluatedAt: new Date().toISOString(),
    canProceed,
    nextRequiredAction,
  };
}

/**
 * Format readiness score as percentage string.
 */
export function formatReadiness(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/**
 * Get a summary label for the readiness state.
 */
export function readinessSummaryLabel(result: ReadinessResult): string {
  if (result.canProceed && result.readinessScore === 1) return "Ready";
  if (result.canProceed) return "Ready (with warnings)";
  if (result.readinessScore >= 0.5) return "Partially ready";
  return "Blocked";
}
