/**
 * Policy Pack Composer
 * Groups compatible policy sets into bounded packs.
 */

export interface PolicyDefinition {
  policyKey: string;
  policyType: string;
  policyValue: Record<string, unknown>;
  sourceRef?: Record<string, unknown>;
}

export interface PackComposeInput {
  organizationId: string;
  packName: string;
  packType: string;
  policies: PolicyDefinition[];
  compatibilityConstraints?: Record<string, unknown>;
  description?: string;
}

export function computeCohesionScore(policies: PolicyDefinition[]): number {
  if (policies.length === 0) return 0;
  if (policies.length === 1) return 1;

  const types = new Set(policies.map(p => p.policyType));
  const typeDiversity = types.size / policies.length;
  // Lower diversity = higher cohesion
  const cohesion = 1 - (typeDiversity * 0.5);
  return Math.round(Math.max(0, Math.min(1, cohesion)) * 100) / 100;
}

export function computeReuseFootprint(policies: PolicyDefinition[]): Record<string, number> {
  const footprint: Record<string, number> = {};
  for (const p of policies) {
    footprint[p.policyType] = (footprint[p.policyType] || 0) + 1;
  }
  return footprint;
}

export function buildPolicyPack(input: PackComposeInput) {
  const cohesion = computeCohesionScore(input.policies);
  const footprint = computeReuseFootprint(input.policies);

  return {
    organization_id: input.organizationId,
    pack_name: input.packName,
    pack_type: input.packType,
    pack_version: 1,
    policy_definitions: input.policies,
    cohesion_score: cohesion,
    compatibility_constraints: input.compatibilityConstraints || {},
    reuse_footprint: footprint,
    status: 'draft',
    description: input.description || '',
  };
}
