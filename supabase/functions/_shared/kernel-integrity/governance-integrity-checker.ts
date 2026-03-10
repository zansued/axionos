/**
 * Governance Integrity Checker — Sprint 114
 * Evaluates whether governance mechanisms remain effective and enforced.
 */

export interface GovernanceIntegrityInput {
  active_policies: number;
  enforced_policies: number;
  bypassed_policies: number;
  approval_gates_active: number;
  approval_gates_functional: number;
  rollback_paths_tested: number;
  rollback_paths_total: number;
  audit_coverage_ratio: number; // 0-1
}

export interface GovernanceIntegrityResult {
  governance_integrity_score: number;
  enforcement_ratio: number;
  rollback_readiness: number;
  weaknesses: string[];
}

export function checkGovernanceIntegrity(input: GovernanceIntegrityInput): GovernanceIntegrityResult {
  const weaknesses: string[] = [];

  const enforcement = input.active_policies > 0 ? input.enforced_policies / input.active_policies : 1;
  const gateHealth = input.approval_gates_active > 0 ? input.approval_gates_functional / input.approval_gates_active : 1;
  const rollbackReadiness = input.rollback_paths_total > 0 ? input.rollback_paths_tested / input.rollback_paths_total : 0;

  let score = enforcement * 0.3 + gateHealth * 0.25 + rollbackReadiness * 0.2 + input.audit_coverage_ratio * 0.15;

  if (input.bypassed_policies > 0) {
    score -= Math.min(0.2, input.bypassed_policies * 0.05);
    weaknesses.push(`${input.bypassed_policies}_policies_bypassed`);
  }
  if (enforcement < 0.8) weaknesses.push("low_enforcement_ratio");
  if (gateHealth < 0.9) weaknesses.push("approval_gates_degraded");
  if (rollbackReadiness < 0.5) weaknesses.push("rollback_untested");
  if (input.audit_coverage_ratio < 0.7) weaknesses.push("audit_gaps");

  return {
    governance_integrity_score: Math.round(Math.max(0, Math.min(1, score)) * 10000) / 10000,
    enforcement_ratio: Math.round(enforcement * 10000) / 10000,
    rollback_readiness: Math.round(rollbackReadiness * 10000) / 10000,
    weaknesses,
  };
}
