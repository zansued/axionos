/**
 * Security Surface Mapper — Sprint 143
 * Maps system components to security surfaces with exposure classification.
 */

export interface SurfaceMapping {
  surface_name: string;
  surface_type: string;
  owning_layer: string;
  related_agent_type?: string;
  related_contract_type?: string;
  threat_domain: string;
  exposure_score: number;
  blast_radius_estimate: number;
  tenant_sensitivity: number;
  rollback_sensitivity: number;
}

const CANONICAL_SURFACES: SurfaceMapping[] = [
  {
    surface_name: "Agent Contract Execution",
    surface_type: "contract_boundary",
    owning_layer: "execution",
    related_agent_type: "BuildAgent",
    threat_domain: "contract_boundary_violation",
    exposure_score: 0.6,
    blast_radius_estimate: 0.5,
    tenant_sensitivity: 0.7,
    rollback_sensitivity: 0.4,
  },
  {
    surface_name: "Tenant Data Isolation (RLS)",
    surface_type: "tenant_boundary",
    owning_layer: "data",
    threat_domain: "tenant_isolation_risk",
    exposure_score: 0.3,
    blast_radius_estimate: 0.9,
    tenant_sensitivity: 1.0,
    rollback_sensitivity: 0.2,
  },
  {
    surface_name: "Permission Escalation Path",
    surface_type: "governance_boundary",
    owning_layer: "control",
    threat_domain: "permission_escalation_risk",
    exposure_score: 0.5,
    blast_radius_estimate: 0.7,
    tenant_sensitivity: 0.8,
    rollback_sensitivity: 0.3,
  },
  {
    surface_name: "Validation Pipeline Bypass",
    surface_type: "validation_boundary",
    owning_layer: "execution",
    related_agent_type: "ValidationAgent",
    threat_domain: "validation_bypass_risk",
    exposure_score: 0.4,
    blast_radius_estimate: 0.6,
    tenant_sensitivity: 0.5,
    rollback_sensitivity: 0.5,
  },
  {
    surface_name: "Generated Artifact Output",
    surface_type: "artifact_boundary",
    owning_layer: "execution",
    related_agent_type: "BuildAgent",
    threat_domain: "insecure_generated_artifact",
    exposure_score: 0.5,
    blast_radius_estimate: 0.4,
    tenant_sensitivity: 0.6,
    rollback_sensitivity: 0.6,
  },
  {
    surface_name: "Deployment Hardening",
    surface_type: "deployment_boundary",
    owning_layer: "execution",
    threat_domain: "deployment_hardening_gap",
    exposure_score: 0.4,
    blast_radius_estimate: 0.5,
    tenant_sensitivity: 0.5,
    rollback_sensitivity: 0.7,
  },
  {
    surface_name: "Canon Retrieval Injection",
    surface_type: "knowledge_boundary",
    owning_layer: "data",
    threat_domain: "retrieval_poisoning_risk",
    exposure_score: 0.3,
    blast_radius_estimate: 0.4,
    tenant_sensitivity: 0.4,
    rollback_sensitivity: 0.3,
  },
  {
    surface_name: "Governance Rule Mutation",
    surface_type: "governance_boundary",
    owning_layer: "control",
    threat_domain: "governance_boundary_abuse",
    exposure_score: 0.2,
    blast_radius_estimate: 0.8,
    tenant_sensitivity: 0.9,
    rollback_sensitivity: 0.2,
  },
  {
    surface_name: "Runtime Action Safety",
    surface_type: "runtime_boundary",
    owning_layer: "execution",
    threat_domain: "unsafe_runtime_action",
    exposure_score: 0.5,
    blast_radius_estimate: 0.5,
    tenant_sensitivity: 0.6,
    rollback_sensitivity: 0.5,
  },
  {
    surface_name: "Observability Gaps",
    surface_type: "observability_boundary",
    owning_layer: "data",
    threat_domain: "observability_blind_spot",
    exposure_score: 0.4,
    blast_radius_estimate: 0.3,
    tenant_sensitivity: 0.3,
    rollback_sensitivity: 0.2,
  },
];

export function mapSecuritySurfaces(): SurfaceMapping[] {
  return CANONICAL_SURFACES;
}

export function getSurfacesByThreatDomain(domain: string): SurfaceMapping[] {
  return CANONICAL_SURFACES.filter(s => s.threat_domain === domain);
}

export function getSurfacesByLayer(layer: string): SurfaceMapping[] {
  return CANONICAL_SURFACES.filter(s => s.owning_layer === layer);
}
