/**
 * Bounded Auto-Approval Engine — Sprint 121
 * Determines whether an action can be auto-approved given autonomy posture.
 */

const NEVER_AUTOAPPROVE = [
  "mutate_architecture",
  "alter_governance_rules",
  "alter_billing_logic",
  "alter_plan_enforcement",
  "alter_execution_contracts",
  "alter_hard_safety_constraints",
  "override_tenant_isolation",
  "bypass_review_gate",
];

export interface AutoApprovalInput {
  action_class: string;
  autonomy_level: number;
  risk_score: number;
  has_rollback_posture: boolean;
  min_level_required: number;
  max_risk_allowed: number;
  requires_rollback: boolean;
}

export interface AutoApprovalResult {
  approved: boolean;
  reason: string;
  hard_blocked: boolean;
}

export function evaluateAutoApproval(input: AutoApprovalInput): AutoApprovalResult {
  // Hard block on forbidden actions
  if (NEVER_AUTOAPPROVE.includes(input.action_class)) {
    return { approved: false, reason: `Action '${input.action_class}' is permanently excluded from auto-approval.`, hard_blocked: true };
  }

  if (input.autonomy_level < input.min_level_required) {
    return { approved: false, reason: `Autonomy level ${input.autonomy_level} below minimum ${input.min_level_required}.`, hard_blocked: false };
  }

  if (input.risk_score > input.max_risk_allowed) {
    return { approved: false, reason: `Risk score ${input.risk_score} exceeds maximum ${input.max_risk_allowed}.`, hard_blocked: false };
  }

  if (input.requires_rollback && !input.has_rollback_posture) {
    return { approved: false, reason: "Rollback posture required but not available.", hard_blocked: false };
  }

  return { approved: true, reason: "All auto-approval criteria met.", hard_blocked: false };
}
