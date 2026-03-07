/**
 * Preventive Action Engine — Sprint 25
 * Determines safe preventive actions from risk profile.
 * SAFETY: Cannot change pipeline structure or bypass governance.
 */

import type { RecommendedAction, RiskBand } from "./predictive-risk-engine.ts";

export type ActionType = "strategy_fallback" | "prompt_fallback" | "extra_validation" | "extra_context" | "human_review" | "pause_execution";
export type ActionMode = "advisory_only" | "bounded_auto_safe";
export type OutcomeStatus = "pending" | "helpful" | "neutral" | "harmful" | "unknown";

export interface PreventiveAction {
  action_type: ActionType;
  action_mode: ActionMode;
  reason: string;
  safe_to_auto_apply: boolean;
}

const AUTO_SAFE_ACTIONS: Set<ActionType> = new Set([
  "extra_validation", "extra_context", "strategy_fallback", "prompt_fallback",
]);

const NEVER_AUTO_ACTIONS: Set<ActionType> = new Set([
  "pause_execution", "human_review",
]);

export function classifyActions(recommended: RecommendedAction[], riskBand: RiskBand): PreventiveAction[] {
  return recommended.map((r) => {
    const actionType = r.action_type as ActionType;
    const isSafe = AUTO_SAFE_ACTIONS.has(actionType) && !NEVER_AUTO_ACTIONS.has(actionType) && riskBand !== "critical";

    return {
      action_type: actionType,
      action_mode: isSafe ? "bounded_auto_safe" : "advisory_only",
      reason: r.reason,
      safe_to_auto_apply: isSafe,
    };
  });
}

export function filterAutoSafe(actions: PreventiveAction[]): PreventiveAction[] {
  return actions.filter((a) => a.safe_to_auto_apply);
}

export function isActionSafe(action_type: ActionType): boolean {
  return AUTO_SAFE_ACTIONS.has(action_type) && !NEVER_AUTO_ACTIONS.has(action_type);
}

export function validateActionType(t: string): t is ActionType {
  return ["strategy_fallback", "prompt_fallback", "extra_validation", "extra_context", "human_review", "pause_execution"].includes(t);
}

export function validateOutcomeStatus(s: string): s is OutcomeStatus {
  return ["pending", "helpful", "neutral", "harmful", "unknown"].includes(s);
}
