/**
 * Architecture Rollout Fragility Analyzer — Sprint 40
 * Evaluates rollback difficulty, dependency brittleness, tenant sensitivity, etc.
 * Pure functions. No DB access.
 */

export interface FragilityInput {
  blast_radius: Record<string, any>;
  dependency_graph: Array<{ entity: string; layer: string; depends_on: string[] }>;
  rollback_blueprint: Record<string, any>;
  validation_requirements: Record<string, any>;
  target_scope: string;
  tenant_impact: boolean;
  affected_layers: string[];
}

export interface FragilityFinding {
  fragility_type: string;
  severity: "low" | "moderate" | "high" | "critical";
  description: string;
  evidence_refs: string[];
  mitigation: string;
}

export interface FragilityResult {
  fragility_score: number;
  findings: FragilityFinding[];
  overall_severity: "low" | "moderate" | "high" | "critical";
}

export function analyzeFragility(input: FragilityInput): FragilityResult {
  const findings: FragilityFinding[] = [];
  let score = 0;

  const blastSize = input.blast_radius?.size || "small";
  const highRiskNodes = (input.blast_radius?.high_risk_nodes as string[]) || [];
  const rollbackSteps = (input.rollback_blueprint?.steps as any[]) || [];
  const validationCheckpoints = (input.validation_requirements?.checkpoints as any[]) || [];

  // Rollback difficulty
  if (rollbackSteps.length === 0) {
    findings.push({ fragility_type: "rollback_absence", severity: "critical", description: "No rollback blueprint defined", evidence_refs: ["rollback_blueprint"], mitigation: "Define rollback steps before rehearsal" });
    score += 0.3;
  } else if (rollbackSteps.length > 8) {
    findings.push({ fragility_type: "rollback_complexity", severity: "high", description: `Rollback requires ${rollbackSteps.length} steps`, evidence_refs: ["rollback_blueprint"], mitigation: "Simplify rollback by reducing change scope" });
    score += 0.15;
  }

  // Dependency brittleness
  const depCount = input.dependency_graph.length;
  const avgDeps = depCount > 0 ? input.dependency_graph.reduce((s, n) => s + n.depends_on.length, 0) / depCount : 0;
  if (avgDeps > 2) {
    findings.push({ fragility_type: "dependency_brittleness", severity: "high", description: `High average dependency count: ${avgDeps.toFixed(1)}`, evidence_refs: ["dependency_graph"], mitigation: "Decouple entities before migration" });
    score += 0.15;
  }

  // Tenant blast sensitivity
  if (input.tenant_impact) {
    findings.push({ fragility_type: "tenant_blast_sensitivity", severity: "high", description: "Migration affects tenant-scoped resources", evidence_refs: ["blast_radius.tenant_impact"], mitigation: "Stage tenant migrations with per-tenant validation" });
    score += 0.15;
  }

  // Observability blind spots
  const obsLayers = input.affected_layers.filter((l) => l === "observability");
  if (obsLayers.length === 0 && input.affected_layers.length > 2) {
    findings.push({ fragility_type: "observability_blind_spot", severity: "moderate", description: "Multiple layers affected without observability coverage", evidence_refs: ["affected_layers"], mitigation: "Add observability hooks for affected layers" });
    score += 0.1;
  }

  // Validation insufficiency
  const requiredCheckpoints = validationCheckpoints.filter((c: any) => c.priority === "required");
  if (requiredCheckpoints.length === 0 && depCount > 0) {
    findings.push({ fragility_type: "validation_insufficiency", severity: "high", description: "No required validation checkpoints defined", evidence_refs: ["validation_requirements"], mitigation: "Define required validation checkpoints" });
    score += 0.15;
  }

  // Scope breadth risk
  if (blastSize === "critical") {
    findings.push({ fragility_type: "scope_breadth_risk", severity: "critical", description: "Critical blast radius — high rollout fragility", evidence_refs: ["blast_radius.size"], mitigation: "Narrow change scope or stage implementation" });
    score += 0.2;
  } else if (blastSize === "large") {
    findings.push({ fragility_type: "scope_breadth_risk", severity: "high", description: "Large blast radius — moderate rollout fragility", evidence_refs: ["blast_radius.size"], mitigation: "Consider staged rollout" });
    score += 0.1;
  }

  // High-risk node concentration
  if (highRiskNodes.length > 3) {
    findings.push({ fragility_type: "risk_concentration", severity: "high", description: `${highRiskNodes.length} high-risk nodes concentrated in change`, evidence_refs: highRiskNodes.slice(0, 3), mitigation: "Isolate high-risk nodes into separate change plans" });
    score += 0.1;
  }

  score = Math.min(1, score);

  let overall: FragilityResult["overall_severity"] = "low";
  if (score >= 0.6) overall = "critical";
  else if (score >= 0.4) overall = "high";
  else if (score >= 0.2) overall = "moderate";

  return {
    fragility_score: Math.round(score * 100) / 100,
    findings,
    overall_severity: overall,
  };
}
