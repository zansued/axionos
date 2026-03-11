/**
 * Threat Domain Classifier — Sprint 143
 * Classifies threat domains and computes severity/likelihood/impact.
 */

export interface ThreatDomainDefinition {
  threat_name: string;
  threat_type: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  likelihood_score: number;
  impact_score: number;
  affected_layers: string[];
  affected_agent_types: string[];
  mitigation_posture: "mitigated" | "partially_mitigated" | "unmitigated";
}

export const CANONICAL_THREAT_DOMAINS: ThreatDomainDefinition[] = [
  {
    threat_name: "Contract Boundary Violation",
    threat_type: "contract_boundary_violation",
    description: "Agent exceeds contract scope or performs unauthorized actions beyond its declared capabilities",
    severity: "high",
    likelihood_score: 0.3,
    impact_score: 0.7,
    affected_layers: ["execution", "control"],
    affected_agent_types: ["BuildAgent", "EvolutionAgent"],
    mitigation_posture: "partially_mitigated",
  },
  {
    threat_name: "Tenant Isolation Risk",
    threat_type: "tenant_isolation_risk",
    description: "Cross-tenant data leakage through RLS gaps, shared state, or unscoped queries",
    severity: "critical",
    likelihood_score: 0.1,
    impact_score: 1.0,
    affected_layers: ["data"],
    affected_agent_types: [],
    mitigation_posture: "mitigated",
  },
  {
    threat_name: "Permission Escalation Risk",
    threat_type: "permission_escalation_risk",
    description: "Unauthorized privilege elevation through role manipulation or governance bypass",
    severity: "critical",
    likelihood_score: 0.15,
    impact_score: 0.9,
    affected_layers: ["control"],
    affected_agent_types: [],
    mitigation_posture: "mitigated",
  },
  {
    threat_name: "Unsafe Runtime Action",
    threat_type: "unsafe_runtime_action",
    description: "Agent performs destructive or irreversible runtime actions without proper gates",
    severity: "high",
    likelihood_score: 0.25,
    impact_score: 0.7,
    affected_layers: ["execution"],
    affected_agent_types: ["BuildAgent", "CoordinationAgent"],
    mitigation_posture: "partially_mitigated",
  },
  {
    threat_name: "Validation Bypass Risk",
    threat_type: "validation_bypass_risk",
    description: "Critical validation steps skipped or weakened during pipeline execution",
    severity: "high",
    likelihood_score: 0.2,
    impact_score: 0.6,
    affected_layers: ["execution"],
    affected_agent_types: ["ValidationAgent"],
    mitigation_posture: "partially_mitigated",
  },
  {
    threat_name: "Deployment Hardening Gap",
    threat_type: "deployment_hardening_gap",
    description: "Insufficient security controls in deployment pipeline or published artifacts",
    severity: "medium",
    likelihood_score: 0.3,
    impact_score: 0.5,
    affected_layers: ["execution"],
    affected_agent_types: ["BuildAgent"],
    mitigation_posture: "partially_mitigated",
  },
  {
    threat_name: "Insecure Generated Artifact",
    threat_type: "insecure_generated_artifact",
    description: "Generated code or artifacts contain security vulnerabilities",
    severity: "high",
    likelihood_score: 0.35,
    impact_score: 0.6,
    affected_layers: ["execution"],
    affected_agent_types: ["BuildAgent"],
    mitigation_posture: "partially_mitigated",
  },
  {
    threat_name: "Retrieval Poisoning Risk",
    threat_type: "retrieval_poisoning_risk",
    description: "Malicious or corrupted canon entries injected into agent retrieval context",
    severity: "medium",
    likelihood_score: 0.1,
    impact_score: 0.5,
    affected_layers: ["data"],
    affected_agent_types: ["ArchitectureAgent", "BuildAgent"],
    mitigation_posture: "mitigated",
  },
  {
    threat_name: "Governance Boundary Abuse",
    threat_type: "governance_boundary_abuse",
    description: "Attempts to mutate governance rules, approval flows, or structural authority",
    severity: "critical",
    likelihood_score: 0.05,
    impact_score: 1.0,
    affected_layers: ["control"],
    affected_agent_types: [],
    mitigation_posture: "mitigated",
  },
  {
    threat_name: "Observability Blind Spot",
    threat_type: "observability_blind_spot",
    description: "Areas of runtime execution not covered by audit, logging, or monitoring",
    severity: "medium",
    likelihood_score: 0.4,
    impact_score: 0.4,
    affected_layers: ["data"],
    affected_agent_types: [],
    mitigation_posture: "partially_mitigated",
  },
];

export function classifyThreatDomains(): ThreatDomainDefinition[] {
  return CANONICAL_THREAT_DOMAINS;
}

export function getThreatBySeverity(severity: string): ThreatDomainDefinition[] {
  return CANONICAL_THREAT_DOMAINS.filter(t => t.severity === severity);
}

export function getCompositeRiskScore(threat: ThreatDomainDefinition): number {
  return Math.round(threat.likelihood_score * threat.impact_score * 10000) / 10000;
}
