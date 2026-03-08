/**
 * Architecture Pilot Explainability — Sprint 41
 *
 * Generates structured explanations for pilot candidates.
 */

export interface PilotExplanation {
  pilot_id: string;
  plan_reference: string;
  sandbox_reference: string | null;
  scope_selection: {
    selected_scope: string;
    rationale: string[];
    risk_class: string;
  };
  baseline: {
    description: string;
    comparability_score: number;
  };
  constraints: {
    pilot_mode: string;
    stop_conditions: unknown[];
    rollback_triggers: unknown[];
    activation_window: unknown;
  };
  success_criteria: string[];
  failure_criteria: string[];
  safety_summary: string[];
}

export function buildPilotExplanation(
  pilot: Record<string, unknown>,
  plan: Record<string, unknown>,
  scopeRationale: string[],
  riskClass: string,
): PilotExplanation {
  return {
    pilot_id: String(pilot.id || ""),
    plan_reference: String(pilot.plan_id || ""),
    sandbox_reference: pilot.sandbox_outcome_id ? String(pilot.sandbox_outcome_id) : null,
    scope_selection: {
      selected_scope: String(pilot.pilot_scope || ""),
      rationale: scopeRationale,
      risk_class: riskClass,
    },
    baseline: {
      description: `Baseline reference from plan ${plan.plan_name || "unknown"}`,
      comparability_score: typeof pilot.baseline_ref === "object" && pilot.baseline_ref
        ? Number((pilot.baseline_ref as Record<string, unknown>).comparability_score || 0)
        : 0,
    },
    constraints: {
      pilot_mode: String(pilot.pilot_mode || "shadow"),
      stop_conditions: Array.isArray(pilot.stop_conditions) ? pilot.stop_conditions : [],
      rollback_triggers: Array.isArray(pilot.rollback_triggers) ? pilot.rollback_triggers : [],
      activation_window: pilot.activation_window || null,
    },
    success_criteria: [
      "Benefit score exceeds 0.2 with harm score below 0.05",
      "No rollback trigger breaches during pilot window",
      "Baseline comparison remains valid throughout pilot",
    ],
    failure_criteria: [
      "Harm score exceeds 0.3",
      "Rollback trigger breach detected",
      "Cross-scope side effects detected",
      "Baseline comparison invalidated",
    ],
    safety_summary: [
      "Pilot cannot trigger broad production rollout",
      "Pilot cannot mutate governance, billing, or enforcement",
      "Pilot requires defined rollback triggers",
      "Pilot requires baseline comparability",
      "All pilot outputs remain review-driven",
    ],
  };
}
