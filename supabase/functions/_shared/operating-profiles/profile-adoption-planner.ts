/**
 * Profile Adoption Planner
 * Prepares safe adoption and rollback plans for profile changes.
 */

export interface AdoptionPlanInput {
  profileId: string;
  profileName: string;
  targetScopeType: string;
  targetScopeId: string;
  rollbackViability: number;
  tenantFitScore: number;
  policyPackCount: number;
}

export interface AdoptionPlan {
  profileId: string;
  profileName: string;
  targetScope: string;
  adoptionSafety: string;
  rollbackPlan: Record<string, unknown>;
  prerequisites: string[];
  risks: string[];
  adoptionConfidence: number;
}

export function buildAdoptionPlan(input: AdoptionPlanInput): AdoptionPlan {
  const prerequisites: string[] = [];
  const risks: string[] = [];

  if (input.tenantFitScore < 0.5) {
    prerequisites.push('Verify tenant fit before adoption');
    risks.push('Low tenant fit may cause friction');
  }
  if (input.rollbackViability < 0.5) {
    risks.push('Rollback may be complex — ensure backup plan');
  }
  if (input.policyPackCount > 5) {
    prerequisites.push('Review all policy pack interactions');
    risks.push('Large number of policy packs increases coupling');
  }

  const adoptionConfidence = Math.round(
    (input.tenantFitScore * 0.4 + input.rollbackViability * 0.4 + (input.policyPackCount <= 5 ? 0.2 : 0.05)) * 100
  ) / 100;

  const adoptionSafety = adoptionConfidence >= 0.7 ? 'safe' :
    adoptionConfidence >= 0.4 ? 'review_required' : 'high_risk';

  return {
    profileId: input.profileId,
    profileName: input.profileName,
    targetScope: `${input.targetScopeType}::${input.targetScopeId}`,
    adoptionSafety,
    rollbackPlan: {
      strategy: 'unbind_and_restore_previous',
      estimated_complexity: input.rollbackViability >= 0.7 ? 'low' : 'moderate',
    },
    prerequisites,
    risks,
    adoptionConfidence,
  };
}
