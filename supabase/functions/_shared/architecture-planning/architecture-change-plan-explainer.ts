/**
 * Architecture Change Plan Explainer — Sprint 39
 * Generates structured explanations for architecture change plans.
 * Pure functions. No DB access.
 */

export interface PlanExplainerInput {
  plan_name: string;
  proposal_type: string;
  target_scope: string;
  blast_radius: Record<string, any>;
  dependency_graph: any[];
  validation_requirements: Record<string, any>;
  rollback_blueprint: Record<string, any>;
  readiness_score: number;
  implementation_risk: string;
  affected_layers: string[];
  simulation_confidence: number;
  source_recommendation_id?: string;
}

export interface PlanExplanation {
  summary: string;
  what_is_planned: string;
  why_proposed: string;
  dependencies_involved: string[];
  risk_assessment: string;
  validation_required: string[];
  rollback_path: string;
  rollout_blockers: string[];
  confidence_statement: string;
}

export function explainPlan(input: PlanExplainerInput): PlanExplanation {
  const blastSize = input.blast_radius?.size || "unknown";
  const highRiskNodes = (input.blast_radius?.high_risk_nodes as string[]) || [];
  const depCount = Array.isArray(input.dependency_graph) ? input.dependency_graph.length : 0;
  const validationCheckpoints = (input.validation_requirements?.checkpoints as any[]) || [];
  const rollbackSteps = (input.rollback_blueprint?.steps as any[]) || [];

  const summary = `Architecture change plan "${input.plan_name}" targets ${input.target_scope} with ${input.implementation_risk} risk. ` +
    `Blast radius: ${blastSize}. Readiness: ${Math.round(input.readiness_score * 100)}%.`;

  const what = `This plan proposes a ${input.proposal_type} change within the ${input.target_scope} scope, ` +
    `affecting ${input.affected_layers.length} architectural layer(s): ${input.affected_layers.join(", ")}.`;

  const why = input.source_recommendation_id
    ? `Originated from architecture recommendation ${input.source_recommendation_id}, validated through simulation with ${Math.round(input.simulation_confidence * 100)}% confidence.`
    : `Generated from accepted simulation outcome with ${Math.round(input.simulation_confidence * 100)}% confidence.`;

  const deps = [];
  if (depCount > 0) deps.push(`${depCount} dependency nodes in the change graph`);
  if (input.blast_radius?.cross_layer_dependencies) deps.push(`${input.blast_radius.cross_layer_dependencies} cross-layer dependencies`);
  if (input.blast_radius?.tenant_impact) deps.push("Tenant scope affected — isolation validation required");
  if (deps.length === 0) deps.push("No significant dependencies detected");

  const riskText = highRiskNodes.length > 0
    ? `Implementation risk: ${input.implementation_risk}. ${highRiskNodes.length} high-risk node(s): ${highRiskNodes.slice(0, 3).join(", ")}.`
    : `Implementation risk: ${input.implementation_risk}. No high-risk nodes identified.`;

  const validationItems = validationCheckpoints
    .filter((c: any) => c.priority === "required")
    .map((c: any) => c.description);
  if (validationItems.length === 0) validationItems.push("Standard validation checkpoints apply");

  const rollbackPath = rollbackSteps.length > 0
    ? `Rollback plan with ${rollbackSteps.length} step(s). Complexity: ${input.rollback_blueprint?.estimated_rollback_complexity || "unknown"}.`
    : "No rollback blueprint defined — manual rollback required.";

  const blockers: string[] = [];
  if (!input.rollback_blueprint || rollbackSteps.length === 0) blockers.push("Missing rollback blueprint");
  if (validationCheckpoints.length === 0) blockers.push("Missing validation requirements");
  if (input.readiness_score < 0.4) blockers.push("Readiness score below threshold");

  const confidence = `Simulation confidence: ${Math.round(input.simulation_confidence * 100)}%. ` +
    `Plan readiness: ${Math.round(input.readiness_score * 100)}%. ` +
    `${input.implementation_risk === "critical" ? "Critical risk — elevated review mandatory." : ""}`;

  return {
    summary,
    what_is_planned: what,
    why_proposed: why,
    dependencies_involved: deps,
    risk_assessment: riskText,
    validation_required: validationItems,
    rollback_path: rollbackPath,
    rollout_blockers: blockers,
    confidence_statement: confidence,
  };
}
