/**
 * Critical Role Mapper
 * Maps critical roles and continuity importance.
 */
export interface CriticalRole {
  id: string;
  role_code: string;
  role_name: string;
  domain: string;
  role_type: string;
  criticality_level: string;
  continuity_tier: string;
}

export function categorizeRoles(roles: CriticalRole[]) {
  const byDomain = roles.reduce<Record<string, CriticalRole[]>>((acc, r) => {
    (acc[r.domain] ??= []).push(r); return acc;
  }, {});
  const critical = roles.filter(r => r.criticality_level === "critical");
  const leadership = roles.filter(r => r.role_type === "leadership");
  const knowledgeAnchors = roles.filter(r => r.role_type === "knowledge_anchor");
  return { byDomain, critical, leadership, knowledgeAnchors, total: roles.length };
}
