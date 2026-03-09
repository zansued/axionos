/**
 * Mission Constitution Resolver — Sprint 109
 * Resolves active mission constitution and protected commitments.
 */

export interface MissionConstitution {
  id: string;
  constitution_code: string;
  constitution_name: string;
  scope: string;
  status: string;
  mission_statement: string;
  identity_principles: string;
  protected_commitments: string[];
}

export function resolveActiveConstitution(constitutions: MissionConstitution[]): MissionConstitution | null {
  return constitutions.find(c => c.status === "active") || constitutions[0] || null;
}

export function extractProtectedCommitments(constitution: MissionConstitution): string[] {
  if (Array.isArray(constitution.protected_commitments)) return constitution.protected_commitments;
  return [];
}
