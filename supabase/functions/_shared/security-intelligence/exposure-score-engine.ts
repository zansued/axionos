/**
 * Exposure Score Engine — Sprint 143
 * Computes composite exposure scores for security surfaces.
 */

export interface ExposureInput {
  exposure_score: number;
  blast_radius_estimate: number;
  tenant_sensitivity: number;
  rollback_sensitivity: number;
  threat_likelihood: number;
  threat_impact: number;
}

export interface ExposureOutput {
  composite_risk: number;
  risk_class: "low" | "moderate" | "high" | "critical";
  blast_radius_weighted: number;
  tenant_impact: number;
  rollback_impact: number;
  factors: string[];
}

export function computeExposureScore(input: ExposureInput): ExposureOutput {
  const factors: string[] = [];

  if (input.exposure_score > 0.6) factors.push("high_exposure");
  if (input.blast_radius_estimate > 0.6) factors.push("large_blast_radius");
  if (input.tenant_sensitivity > 0.7) factors.push("tenant_sensitive");
  if (input.rollback_sensitivity > 0.6) factors.push("rollback_sensitive");
  if (input.threat_likelihood > 0.3) factors.push("likely_threat");
  if (input.threat_impact > 0.7) factors.push("high_impact");

  const blastWeighted = input.blast_radius_estimate * input.threat_impact;
  const tenantImpact = input.tenant_sensitivity * input.threat_impact;
  const rollbackImpact = input.rollback_sensitivity * (1 - input.rollback_sensitivity);

  const composite = Math.min(1,
    input.exposure_score * 0.25 +
    blastWeighted * 0.25 +
    tenantImpact * 0.2 +
    input.threat_likelihood * input.threat_impact * 0.2 +
    rollbackImpact * 0.1
  );

  let riskClass: ExposureOutput["risk_class"];
  if (composite >= 0.75) riskClass = "critical";
  else if (composite >= 0.5) riskClass = "high";
  else if (composite >= 0.25) riskClass = "moderate";
  else riskClass = "low";

  return {
    composite_risk: Math.round(composite * 10000) / 10000,
    risk_class: riskClass,
    blast_radius_weighted: Math.round(blastWeighted * 10000) / 10000,
    tenant_impact: Math.round(tenantImpact * 10000) / 10000,
    rollback_impact: Math.round(rollbackImpact * 10000) / 10000,
    factors,
  };
}
