/**
 * Predictive Checkpoint Runner — Sprint 25
 * Invokes risk scoring at bounded stage checkpoints.
 * SAFETY: Non-blocking. Degrades gracefully. Cannot mutate pipeline.
 */

import type { RiskBand } from "./predictive-risk-engine.ts";

export type CheckpointType = "pre_stage" | "pre_expensive_stage" | "post_retry" | "pre_deploy_transition" | "pre_repair";
export type CheckpointDecision = "proceed" | "proceed_with_guard" | "recommend_review" | "pause_for_review";

export interface CheckpointInput {
  stage_key: string;
  checkpoint_type: CheckpointType;
  risk_score: number;
  risk_band: RiskBand;
  confidence_score: number;
  has_blocking_actions: boolean;
}

export interface CheckpointResult {
  checkpoint_type: CheckpointType;
  decision: CheckpointDecision;
  reason: string;
}

const EXPENSIVE_STAGES = new Set([
  "pipeline-build", "pipeline-deploy", "pipeline-ci",
  "pipeline-runtime-validation", "pipeline-architecture",
]);

export function isExpensiveStage(stage_key: string): boolean {
  return EXPENSIVE_STAGES.has(stage_key);
}

export function resolveCheckpointType(stage_key: string, retryCount: number): CheckpointType {
  if (retryCount > 2) return "post_retry";
  if (stage_key.includes("deploy")) return "pre_deploy_transition";
  if (stage_key.includes("repair")) return "pre_repair";
  if (isExpensiveStage(stage_key)) return "pre_expensive_stage";
  return "pre_stage";
}

export function evaluateCheckpoint(input: CheckpointInput): CheckpointResult {
  const { risk_band, confidence_score, has_blocking_actions, checkpoint_type } = input;

  if (risk_band === "critical" && confidence_score >= 0.5) {
    return { checkpoint_type, decision: "pause_for_review", reason: "critical_risk_high_confidence" };
  }

  if (risk_band === "critical" && confidence_score < 0.5) {
    return { checkpoint_type, decision: "recommend_review", reason: "critical_risk_low_confidence" };
  }

  if (risk_band === "high" && has_blocking_actions) {
    return { checkpoint_type, decision: "proceed_with_guard", reason: "high_risk_with_guards" };
  }

  if (risk_band === "high") {
    return { checkpoint_type, decision: "recommend_review", reason: "high_risk_no_guards" };
  }

  if (risk_band === "moderate") {
    return { checkpoint_type, decision: "proceed_with_guard", reason: "moderate_risk" };
  }

  return { checkpoint_type, decision: "proceed", reason: "low_risk" };
}
