/**
 * Tenant Architecture Anti-Fragmentation Guard — Sprint 47
 * Prevents the platform from drifting into tenant-specific fragmentation.
 */

export interface FragmentationCheckInput {
  organization_id: string;
  mode_key: string;
  mode_scope: string;
  anti_fragmentation_constraints: Record<string, unknown>;
  global_mode_count: number;
  org_mode_count: number;
  divergence_score?: number;
  override_count?: number;
  support_count?: number;
}

export interface FragmentationGuardResult {
  allowed: boolean;
  fragmentation_risk_score: number;
  blocked_changes: string[];
  divergence_flags: string[];
  required_consolidation_actions: string[];
}

const MAX_ORG_MODES = 5;
const MAX_DIVERGENCE_SCORE = 0.7;
const MIN_SUPPORT_COUNT = 3;

const FORBIDDEN_MUTATIONS = [
  "create_tenant_pipeline_topology",
  "alter_governance_rules",
  "alter_billing_logic",
  "alter_plan_enforcement",
  "alter_execution_contracts",
  "alter_hard_safety_constraints",
  "override_tenant_isolation",
  "bypass_review_gate",
  "auto_fork_platform",
];

export function checkFragmentationGuard(input: FragmentationCheckInput): FragmentationGuardResult {
  const blocked: string[] = [];
  const divergence_flags: string[] = [];
  const consolidation_actions: string[] = [];
  let risk = 0;

  // Check forbidden mutations in constraints
  for (const key of Object.keys(input.anti_fragmentation_constraints)) {
    if (FORBIDDEN_MUTATIONS.includes(key)) {
      blocked.push(key);
      risk += 0.3;
    }
  }

  // Too many org-specific modes
  if (input.org_mode_count >= MAX_ORG_MODES) {
    divergence_flags.push("too_many_org_modes");
    consolidation_actions.push("merge_or_deprecate_low_value_modes");
    risk += 0.2;
  }

  // High divergence score
  if (input.divergence_score !== undefined && input.divergence_score > MAX_DIVERGENCE_SCORE) {
    divergence_flags.push("excessive_divergence_from_global");
    consolidation_actions.push("return_to_balanced_default");
    risk += 0.25;
  }

  // Low support count
  if (input.support_count !== undefined && input.support_count < MIN_SUPPORT_COUNT) {
    divergence_flags.push("low_support_mode");
    consolidation_actions.push("increase_evidence_before_activation");
    risk += 0.1;
  }

  // Excessive overrides
  if (input.override_count !== undefined && input.override_count > 10) {
    divergence_flags.push("excessive_local_overrides");
    consolidation_actions.push("tighten_override_limits");
    risk += 0.15;
  }

  risk = Math.min(1, risk);

  return {
    allowed: blocked.length === 0 && risk < 0.8,
    fragmentation_risk_score: risk,
    blocked_changes: blocked,
    divergence_flags,
    required_consolidation_actions: consolidation_actions,
  };
}

export function validateMutationSafety(intent: string): { allowed: boolean; reason?: string } {
  for (const forbidden of FORBIDDEN_MUTATIONS) {
    if (intent.toLowerCase().includes(forbidden)) {
      return { allowed: false, reason: `Mutation '${forbidden}' is forbidden in tenant architecture modes` };
    }
  }
  return { allowed: true };
}
