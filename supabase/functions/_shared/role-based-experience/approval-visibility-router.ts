// Approval Visibility Router
// Ensures approvals are visible to the right roles with the right level of context.

import { RoleName } from "./role-experience-model-manager.ts";

export interface ApprovalVisibility {
  approval_type: string;
  visible_to_roles: RoleName[];
  context_level: "minimal" | "standard" | "full";
  action_allowed: boolean;
}

const APPROVAL_ROUTING: ApprovalVisibility[] = [
  { approval_type: "initiative_approval", visible_to_roles: ["default_user", "operator", "admin"], context_level: "standard", action_allowed: true },
  { approval_type: "stage_transition", visible_to_roles: ["default_user", "operator", "admin"], context_level: "minimal", action_allowed: true },
  { approval_type: "deploy_approval", visible_to_roles: ["default_user", "operator", "admin"], context_level: "standard", action_allowed: true },
  { approval_type: "governance_review", visible_to_roles: ["operator", "admin"], context_level: "full", action_allowed: true },
  { approval_type: "policy_change", visible_to_roles: ["admin"], context_level: "full", action_allowed: true },
  { approval_type: "architecture_proposal", visible_to_roles: ["operator", "admin"], context_level: "full", action_allowed: true },
  { approval_type: "canon_mutation", visible_to_roles: ["admin"], context_level: "full", action_allowed: true },
];

export function getApprovalsForRole(roleName: RoleName): ApprovalVisibility[] {
  return APPROVAL_ROUTING.filter(a => a.visible_to_roles.includes(roleName));
}

export function computeApprovalVisibilityScore(roleName: RoleName): number {
  const total = APPROVAL_ROUTING.length;
  const visible = getApprovalsForRole(roleName).length;
  return Math.min(1, visible / Math.max(1, total));
}
