/**
 * Contract Risk Profiler — Sprint 143
 * Profiles agent contracts for security risk across multiple dimensions.
 */

export interface ContractRiskInput {
  contract_type: string;
  agent_type: string;
  has_mutation_authority: boolean;
  has_deployment_authority: boolean;
  has_governance_access: boolean;
  has_cross_tenant_access: boolean;
  validation_gate_count: number;
  rollback_capability: boolean;
}

export interface ContractRiskOutput {
  contract_type: string;
  agent_type: string;
  risk_score: number;
  permission_sensitivity: number;
  governance_boundary_score: number;
  tenant_boundary_score: number;
  validation_bypass_risk: number;
  deployment_risk: number;
  threat_domains: string[];
  mitigations: string[];
}

export function profileContractRisk(input: ContractRiskInput): ContractRiskOutput {
  const threats: string[] = [];
  const mitigations: string[] = [];

  let permSensitivity = 0;
  if (input.has_mutation_authority) { permSensitivity += 0.4; threats.push("unsafe_runtime_action"); }
  if (input.has_deployment_authority) { permSensitivity += 0.3; threats.push("deployment_hardening_gap"); }
  if (input.has_governance_access) { permSensitivity += 0.3; threats.push("governance_boundary_abuse"); }

  let tenantBoundary = input.has_cross_tenant_access ? 0.9 : 0.1;
  if (input.has_cross_tenant_access) threats.push("tenant_isolation_risk");

  let validationBypass = input.validation_gate_count > 0
    ? Math.max(0, 0.6 - input.validation_gate_count * 0.15)
    : 0.8;
  if (validationBypass > 0.5) threats.push("validation_bypass_risk");

  let deploymentRisk = input.has_deployment_authority ? 0.6 : 0.1;
  if (input.rollback_capability) {
    deploymentRisk *= 0.6;
    mitigations.push("rollback_available");
  }
  if (input.validation_gate_count >= 2) mitigations.push("multi_gate_validation");

  const govBoundary = input.has_governance_access ? 0.8 : 0.1;

  const riskScore = Math.min(1, (
    permSensitivity * 0.3 +
    tenantBoundary * 0.25 +
    validationBypass * 0.2 +
    deploymentRisk * 0.15 +
    govBoundary * 0.1
  ));

  return {
    contract_type: input.contract_type,
    agent_type: input.agent_type,
    risk_score: Math.round(riskScore * 10000) / 10000,
    permission_sensitivity: Math.round(permSensitivity * 10000) / 10000,
    governance_boundary_score: Math.round(govBoundary * 10000) / 10000,
    tenant_boundary_score: Math.round(tenantBoundary * 10000) / 10000,
    validation_bypass_risk: Math.round(validationBypass * 10000) / 10000,
    deployment_risk: Math.round(deploymentRisk * 10000) / 10000,
    threat_domains: [...new Set(threats)],
    mitigations,
  };
}
