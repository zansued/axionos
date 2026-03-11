/**
 * Readiness–Orchestrator Integration — Sprint 141
 *
 * Connects the Readiness Engine to the AgentOS Orchestrator pipeline.
 * Before stage execution, evaluates readiness checks to determine
 * whether the stage can proceed.
 *
 * Architectural rule:
 *   Readiness evaluates → Policy constrains → Action Engine formalizes.
 *   Readiness never executes. It only describes system state.
 *
 * This module mirrors the frontend ReadinessResult contract
 * (src/lib/readiness/) for use in the backend orchestrator.
 */

import type { StageName, WorkInput } from "./types.ts";
import { cryptoRandomId, nowIso } from "./utils.ts";

// ── Readiness Contracts (backend mirror) ──

export type ReadinessCheckStatus = "pass" | "fail" | "unknown";

export interface ReadinessCheck {
  key: string;
  label: string;
  required: boolean;
  status: ReadinessCheckStatus;
  explanation?: string;
  action?: string;
}

export interface ReadinessGateResult {
  stage: string;
  readiness_score: number;
  can_proceed: boolean;
  blockers: ReadinessCheck[];
  warnings: ReadinessCheck[];
  passed_checks: ReadinessCheck[];
  all_checks: ReadinessCheck[];
  evaluated_at: string;
  next_required_action?: string;
}

export interface ReadinessTraceRecord {
  readiness_evaluation_attempted: boolean;
  readiness_evaluation_success: boolean;
  readiness_score: number;
  can_proceed: boolean;
  blocker_count: number;
  warning_count: number;
  blocker_keys: string[];
  warning_keys: string[];
  stage: string;
  timestamp: string;
  error?: string;
}

// ── Stage-Aware Check Definitions ──

type CheckFn = (input: WorkInput) => ReadinessCheck;

const STAGE_CHECKS: Record<string, CheckFn[]> = {
  perception: [
    (input) => ({
      key: "goal_defined",
      label: "Goal is defined",
      required: true,
      status: input.goal && input.goal.trim().length > 0 ? "pass" : "fail",
      explanation: input.goal ? undefined : "No goal defined for this run",
      action: "Define a clear goal before starting execution",
    }),
  ],

  design: [
    (input) => ({
      key: "goal_defined",
      label: "Goal is defined",
      required: true,
      status: input.goal && input.goal.trim().length > 0 ? "pass" : "fail",
      explanation: input.goal ? undefined : "No goal defined",
      action: "Define a goal",
    }),
    (input) => ({
      key: "perception_artifacts",
      label: "Perception artifacts available",
      required: true,
      status: (input.artifacts?.length ?? 0) > 0 ? "pass" : "fail",
      explanation: (input.artifacts?.length ?? 0) > 0 ? undefined : "No artifacts from perception stage",
      action: "Complete perception stage first",
    }),
    (input) => ({
      key: "context_available",
      label: "Context information available",
      required: false,
      status: input.context && Object.keys(input.context).length > 0 ? "pass" : "unknown",
      explanation: "Context enrichment improves design quality",
    }),
  ],

  build: [
    (input) => ({
      key: "goal_defined",
      label: "Goal is defined",
      required: true,
      status: input.goal && input.goal.trim().length > 0 ? "pass" : "fail",
    }),
    (input) => ({
      key: "design_artifacts",
      label: "Design artifacts available",
      required: true,
      status: input.artifacts?.some((a) => a.kind === "design" || a.kind === "architecture" || a.kind === "blueprint")
        ? "pass"
        : "fail",
      explanation: "Build stage requires design artifacts",
      action: "Complete design stage first",
    }),
    (input) => ({
      key: "constraints_defined",
      label: "Constraints defined",
      required: false,
      status: (input.constraints?.length ?? 0) > 0 ? "pass" : "unknown",
      explanation: "Constraints help guide code generation",
    }),
  ],

  validation: [
    (input) => ({
      key: "build_artifacts",
      label: "Build artifacts available",
      required: true,
      status: input.artifacts?.some((a) => a.kind === "code" || a.kind === "implementation" || a.kind === "build")
        ? "pass"
        : "fail",
      explanation: "Validation requires build artifacts",
      action: "Complete build stage first",
    }),
  ],

  evolution: [
    (input) => ({
      key: "validation_artifacts",
      label: "Validation results available",
      required: true,
      status: input.artifacts?.some((a) => a.kind === "validation" || a.kind === "report" || a.kind === "test")
        ? "pass"
        : "fail",
      explanation: "Evolution requires validation results",
      action: "Complete validation stage first",
    }),
  ],
};

// ── Core Functions ──

/**
 * Evaluate readiness for a given stage.
 * Returns a structured result with blockers, warnings, and score.
 *
 * SAFE FALLBACK: If evaluation fails, returns a permissive result
 * so execution is not blocked by readiness infrastructure failures.
 */
export function evaluateReadiness(
  stage: StageName,
  input: WorkInput,
): ReadinessGateResult {
  try {
    const checkFns = STAGE_CHECKS[stage] || [];

    if (checkFns.length === 0) {
      // No checks defined for this stage — allow by default
      return {
        stage,
        readiness_score: 1.0,
        can_proceed: true,
        blockers: [],
        warnings: [],
        passed_checks: [],
        all_checks: [],
        evaluated_at: nowIso(),
      };
    }

    const allChecks = checkFns.map((fn) => fn(input));
    const blockers = allChecks.filter((c) => c.required && c.status === "fail");
    const warnings = allChecks.filter((c) => !c.required && c.status !== "pass");
    const passedChecks = allChecks.filter((c) => c.status === "pass");

    const requiredChecks = allChecks.filter((c) => c.required);
    const passedRequired = requiredChecks.filter((c) => c.status === "pass").length;
    const readinessScore = requiredChecks.length > 0
      ? passedRequired / requiredChecks.length
      : 1.0;

    const canProceed = blockers.length === 0;

    return {
      stage,
      readiness_score: readinessScore,
      can_proceed: canProceed,
      blockers,
      warnings,
      passed_checks: passedChecks,
      all_checks: allChecks,
      evaluated_at: nowIso(),
      next_required_action: blockers[0]?.action,
    };
  } catch (error) {
    // Safe fallback
    return {
      stage,
      readiness_score: 1.0,
      can_proceed: true,
      blockers: [],
      warnings: [],
      passed_checks: [],
      all_checks: [],
      evaluated_at: nowIso(),
    };
  }
}

/**
 * Build a trace record for observability and audit.
 */
export function buildReadinessTraceRecord(
  result: ReadinessGateResult,
): ReadinessTraceRecord {
  return {
    readiness_evaluation_attempted: true,
    readiness_evaluation_success: true,
    readiness_score: result.readiness_score,
    can_proceed: result.can_proceed,
    blocker_count: result.blockers.length,
    warning_count: result.warnings.length,
    blocker_keys: result.blockers.map((b) => b.key),
    warning_keys: result.warnings.map((w) => w.key),
    stage: result.stage,
    timestamp: result.evaluated_at,
  };
}
