/**
 * Security Boundary Explainer — Sprint 143
 * Generates human-readable explanations for security surfaces and risk scores.
 */

export interface ExplainableRisk {
  surface_name: string;
  threat_domain: string;
  composite_risk: number;
  risk_class: string;
  factors: string[];
}

const FACTOR_EXPLANATIONS: Record<string, string> = {
  high_exposure: "This surface has a high baseline exposure score, indicating significant attack surface area.",
  large_blast_radius: "If compromised, the blast radius would affect multiple system components.",
  tenant_sensitive: "This surface handles tenant-scoped data; compromise could leak cross-tenant information.",
  rollback_sensitive: "Rollback for this surface is complex; damage may be difficult to reverse.",
  likely_threat: "Historical patterns suggest this threat domain is likely to be exercised.",
  high_impact: "Successful exploitation would have severe consequences for system integrity.",
};

const THREAT_EXPLANATIONS: Record<string, string> = {
  contract_boundary_violation: "Agent contracts may be exceeded, allowing unauthorized actions.",
  tenant_isolation_risk: "RLS or scoping gaps could allow cross-tenant data access.",
  permission_escalation_risk: "Role or permission boundaries could be bypassed.",
  unsafe_runtime_action: "Destructive runtime actions lack sufficient safety gates.",
  validation_bypass_risk: "Validation pipeline steps could be skipped or weakened.",
  deployment_hardening_gap: "Deployment pipeline lacks full security hardening.",
  insecure_generated_artifact: "Generated code may contain vulnerabilities.",
  retrieval_poisoning_risk: "Canon retrieval context could be corrupted.",
  governance_boundary_abuse: "Governance rules could be manipulated.",
  observability_blind_spot: "Runtime areas are not fully covered by monitoring.",
};

export function explainRisk(risk: ExplainableRisk): string {
  const lines: string[] = [];
  lines.push(`Surface: ${risk.surface_name}`);
  lines.push(`Threat Domain: ${THREAT_EXPLANATIONS[risk.threat_domain] || risk.threat_domain}`);
  lines.push(`Risk Class: ${risk.risk_class.toUpperCase()} (${Math.round(risk.composite_risk * 100)}%)`);

  if (risk.factors.length > 0) {
    lines.push("Contributing factors:");
    risk.factors.forEach(f => {
      lines.push(`  • ${FACTOR_EXPLANATIONS[f] || f}`);
    });
  }

  return lines.join("\n");
}

export function getThreatExplanation(threatType: string): string {
  return THREAT_EXPLANATIONS[threatType] || "Unknown threat domain.";
}
