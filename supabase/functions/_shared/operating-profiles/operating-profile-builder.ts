/**
 * Operating Profile Builder
 * Builds reusable profiles from convergence memory, governance outcomes, and policy history.
 * Advisory-first: builds profiles, never auto-applies them.
 */

export interface ProfileBuildInput {
  organizationId: string;
  workspaceId?: string;
  profileName: string;
  profileType: string;
  scopeType: string;
  sourceMemoryPatternId?: string;
  sourceGovernanceCaseId?: string;
  sourceConvergenceDecisionId?: string;
  policyPackIds?: string[];
  architectureModeCompatibility?: Record<string, unknown>;
  assumptions?: Record<string, unknown>;
  expectedOutcomes?: Record<string, unknown>;
  description?: string;
  tags?: string[];
  evidenceLinks?: Array<Record<string, unknown>>;
  // Bias scores
  stabilityBias?: number;
  costBias?: number;
  speedBias?: number;
  governanceStrictness?: number;
}

export function computeTenantFitScore(input: ProfileBuildInput): number {
  let fit = 0.5;
  if (input.architectureModeCompatibility && Object.keys(input.architectureModeCompatibility).length > 0) fit += 0.15;
  if (input.sourceMemoryPatternId) fit += 0.15;
  if (input.sourceGovernanceCaseId) fit += 0.1;
  if ((input.evidenceLinks || []).length > 0) fit += 0.1;
  return Math.round(Math.min(fit, 1) * 100) / 100;
}

export function computeOverrideBudgetScore(governanceStrictness: number): number {
  // Stricter governance = lower override budget
  return Math.round(Math.max(0, 1 - governanceStrictness) * 100) / 100;
}

export function computeRollbackViability(policyPackCount: number, scopeType: string): number {
  let viability = 0.8;
  if (policyPackCount > 5) viability -= 0.1;
  if (policyPackCount > 10) viability -= 0.15;
  if (scopeType === 'organization') viability -= 0.1;
  return Math.round(Math.max(0, Math.min(1, viability)) * 100) / 100;
}

export function computeSharedReuseScore(input: ProfileBuildInput): number {
  let reuse = 0;
  if (input.sourceMemoryPatternId) reuse += 0.3;
  if (input.sourceGovernanceCaseId) reuse += 0.2;
  if (input.sourceConvergenceDecisionId) reuse += 0.2;
  if ((input.policyPackIds || []).length > 0) reuse += 0.15;
  if ((input.evidenceLinks || []).length > 0) reuse += 0.15;
  return Math.round(Math.min(reuse, 1) * 100) / 100;
}

export function buildProfile(input: ProfileBuildInput) {
  const tenantFit = computeTenantFitScore(input);
  const overrideBudget = computeOverrideBudgetScore(input.governanceStrictness || 0.5);
  const rollbackViability = computeRollbackViability((input.policyPackIds || []).length, input.scopeType);
  const sharedReuse = computeSharedReuseScore(input);

  return {
    organization_id: input.organizationId,
    workspace_id: input.workspaceId || null,
    profile_name: input.profileName,
    profile_type: input.profileType,
    scope_type: input.scopeType,
    profile_version: 1,
    source_memory_pattern_id: input.sourceMemoryPatternId || null,
    source_governance_case_id: input.sourceGovernanceCaseId || null,
    source_convergence_decision_id: input.sourceConvergenceDecisionId || null,
    policy_pack_ids: input.policyPackIds || [],
    architecture_mode_compatibility: input.architectureModeCompatibility || {},
    tenant_fit_score: tenantFit,
    stability_bias_score: input.stabilityBias || 0.5,
    cost_bias_score: input.costBias || 0.5,
    speed_bias_score: input.speedBias || 0.5,
    governance_strictness_score: input.governanceStrictness || 0.5,
    override_budget_score: overrideBudget,
    rollback_viability_score: rollbackViability,
    shared_reuse_score: sharedReuse,
    profile_drift_score: 0,
    adoption_status: 'draft',
    review_status: 'pending',
    assumptions: input.assumptions || {},
    expected_outcomes: input.expectedOutcomes || {},
    realized_outcomes: {},
    evidence_links: input.evidenceLinks || [],
    description: input.description || '',
    tags: input.tags || [],
  };
}
