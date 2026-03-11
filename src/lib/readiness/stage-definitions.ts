/**
 * Stage Definitions — Phase 4
 *
 * Explicit requirements for each delivery stage.
 * Each check is deterministic: pass, fail, or unknown.
 */

import type { ReadinessCheck, InitiativeReadinessInput } from "./readiness-types";

export type StageCheckFn = (input: InitiativeReadinessInput) => ReadinessCheck;

export interface StageDefinition {
  stage: string;
  /** Internal stage_status values that map to this delivery stage */
  matchStatuses: string[];
  /** Check functions to evaluate */
  checks: StageCheckFn[];
}

// ═══════════════════════════════════════════════════════════════════
// IDEA STAGE
// ═══════════════════════════════════════════════════════════════════

const ideaChecks: StageCheckFn[] = [
  (i) => ({
    key: "has_title",
    label: "Initiative has a title",
    required: true,
    status: i.title && i.title.trim().length > 0 ? "pass" : "fail",
    explanation: !i.title ? "Initiative needs a title to proceed." : undefined,
    action: "Add a descriptive title to the initiative.",
  }),
  (i) => ({
    key: "has_description",
    label: "Initiative has a description",
    required: true,
    status: (i.description && i.description.trim().length > 10) || (i.idea_raw && i.idea_raw.trim().length > 10) ? "pass" : "fail",
    explanation: "A description or idea text is needed for discovery.",
    action: "Provide a description of what the software should do.",
  }),
  (i) => ({
    key: "has_risk_assessment",
    label: "Risk level assessed",
    required: false,
    status: i.risk_level ? "pass" : "unknown",
    explanation: "Risk assessment helps prioritize pipeline resources.",
    action: "Risk will be assessed automatically during discovery.",
  }),
];

// ═══════════════════════════════════════════════════════════════════
// DISCOVERY STAGE
// ═══════════════════════════════════════════════════════════════════

const discoveryChecks: StageCheckFn[] = [
  (i) => ({
    key: "discovery_completed",
    label: "Discovery analysis completed",
    required: true,
    status: i.discovery_payload ? "pass" : "fail",
    explanation: "Discovery must analyze the idea before architecture.",
    action: "Run the discovery pipeline stage.",
  }),
  (i) => ({
    key: "discovery_approved",
    label: "Discovery approved",
    required: true,
    status: i.approved_at_discovery ? "pass" : "fail",
    explanation: "Human approval is required after discovery.",
    action: "Review and approve the discovery results.",
  }),
  (i) => ({
    key: "prd_generated",
    label: "PRD document generated",
    required: false,
    status: i.prd_content ? "pass" : "unknown",
    explanation: "A PRD improves architecture quality but is not strictly required.",
    action: "PRD will be generated as part of the discovery flow.",
  }),
];

// ═══════════════════════════════════════════════════════════════════
// ARCHITECTURE STAGE
// ═══════════════════════════════════════════════════════════════════

const architectureChecks: StageCheckFn[] = [
  (i) => ({
    key: "architecture_generated",
    label: "Architecture plan generated",
    required: true,
    status: i.architecture_content || i.blueprint ? "pass" : "fail",
    explanation: "Architecture must be synthesized before engineering.",
    action: "Run the architecture pipeline stage.",
  }),
  (i) => ({
    key: "architecture_simulated",
    label: "Architecture simulation passed",
    required: false,
    status: i.simulation_report
      ? (typeof i.simulation_report === "object" && i.simulation_report?.passed ? "pass" : "fail")
      : "unknown",
    explanation: i.simulation_report && !i.simulation_report?.passed
      ? "Architecture simulation found issues."
      : "Simulation validates architecture before engineering.",
    action: "Review simulation results and fix identified issues.",
  }),
  (i) => ({
    key: "planning_approved",
    label: "Architecture approved",
    required: true,
    status: i.approved_at_planning ? "pass" : "fail",
    explanation: "Human approval is required before engineering begins.",
    action: "Review and approve the architecture plan.",
  }),
];

// ═══════════════════════════════════════════════════════════════════
// ENGINEERING STAGE
// ═══════════════════════════════════════════════════════════════════

const engineeringChecks: StageCheckFn[] = [
  (i) => ({
    key: "squad_formed",
    label: "Agent squad formed",
    required: true,
    status: (i.agentsCount ?? 0) > 0 || i.approved_at_squad ? "pass" : "fail",
    explanation: "A squad of agents must be assigned to execute.",
    action: "Run squad formation stage.",
  }),
  (i) => ({
    key: "squad_approved",
    label: "Squad approved",
    required: true,
    status: i.approved_at_squad ? "pass" : "fail",
    explanation: "Squad composition must be approved before execution.",
    action: "Review and approve the agent squad.",
  }),
  (i) => ({
    key: "stories_created",
    label: "Stories created",
    required: true,
    status: (i.storiesCount ?? 0) > 0 ? "pass" : "fail",
    explanation: "Stories must be planned before execution begins.",
    action: "Run the planning stage to generate stories.",
  }),
  (i) => ({
    key: "code_generated",
    label: "Code artifacts generated",
    required: true,
    status: (i.artifactsCount ?? 0) > 0 ? "pass" : "fail",
    explanation: "Code must be generated before validation.",
    action: "Execute the engineering pipeline to generate code.",
  }),
  (i) => ({
    key: "repo_connected",
    label: "Repository connected",
    required: false,
    status: i.repo_url ? "pass" : "unknown",
    explanation: "A repository connection enables publishing and CI.",
    action: "Repository will be created during publish stage.",
  }),
];

// ═══════════════════════════════════════════════════════════════════
// VALIDATION STAGE
// ═══════════════════════════════════════════════════════════════════

const validationChecks: StageCheckFn[] = [
  (i) => ({
    key: "artifacts_validated",
    label: "Artifacts validated",
    required: true,
    status: (i.approvedArtifacts ?? 0) > 0 ? "pass" : "fail",
    explanation: "Generated artifacts must pass validation before deploy.",
    action: "Run the validation stage (Fix Loop).",
  }),
  (i) => ({
    key: "build_passing",
    label: "Build passing",
    required: true,
    status: i.build_status === "passing" || i.build_status === "success" ? "pass"
      : i.build_status === "failing" || i.build_status === "failed" ? "fail"
      : "unknown",
    explanation: i.build_status === "failing" || i.build_status === "failed"
      ? "Latest build failed in CI pipeline."
      : "Build status must be verified before deploy.",
    action: "Fix build errors in repository.",
  }),
  (i) => ({
    key: "no_critical_failures",
    label: "No critical pipeline failures",
    required: true,
    status: (i.jobsFailedCount ?? 0) === 0 ? "pass" : "fail",
    explanation: (i.jobsFailedCount ?? 0) > 0
      ? `${i.jobsFailedCount} pipeline job(s) failed.`
      : undefined,
    action: "Investigate and resolve failed pipeline jobs.",
  }),
];

// ═══════════════════════════════════════════════════════════════════
// DEPLOY STAGE
// ═══════════════════════════════════════════════════════════════════

const deployChecks: StageCheckFn[] = [
  (i) => ({
    key: "repo_connected",
    label: "Repository connected",
    required: true,
    status: i.repo_url ? "pass" : "fail",
    explanation: "Code must be published to a repository before deployment.",
    action: "Publish code to create a repository.",
  }),
  (i) => ({
    key: "build_passing",
    label: "Build passing",
    required: true,
    status: i.build_status === "passing" || i.build_status === "success" ? "pass"
      : i.build_status === "failing" || i.build_status === "failed" ? "fail"
      : "unknown",
    explanation: i.build_status === "failing" ? "Latest build failed." : "Build status should be verified.",
    action: "Fix build errors in repository.",
  }),
  (i) => ({
    key: "deploy_target_defined",
    label: "Deployment target defined",
    required: true,
    status: i.deploy_target ? "pass" : "unknown",
    explanation: "A deployment target (e.g. Vercel) should be configured.",
    action: "Configure deployment target.",
  }),
  (i) => ({
    key: "commit_pushed",
    label: "Code committed",
    required: true,
    status: i.commit_hash ? "pass" : "fail",
    explanation: "Code must be committed before deploy.",
    action: "Publish code to repository.",
  }),
  (i) => ({
    key: "monitoring_configured",
    label: "Monitoring configured",
    required: false,
    status: "unknown",
    explanation: "Monitoring helps detect issues post-deploy.",
    action: "Configure observability after deployment.",
  }),
];

// ═══════════════════════════════════════════════════════════════════
// RUNTIME STAGE
// ═══════════════════════════════════════════════════════════════════

const runtimeChecks: StageCheckFn[] = [
  (i) => ({
    key: "deployed_successfully",
    label: "Application deployed",
    required: true,
    status: i.deploy_url ? "pass" : "fail",
    explanation: "Application must be deployed to enter runtime.",
    action: "Complete the deployment process.",
  }),
  (i) => ({
    key: "deploy_healthy",
    label: "Deployment healthy",
    required: true,
    status: i.deploy_status === "success" || i.deploy_url ? "pass"
      : i.deploy_status === "failed" ? "fail"
      : "unknown",
    explanation: i.deploy_status === "failed" ? "Deployment failed." : "Deployment health should be verified.",
    action: "Check deployment logs and redeploy if necessary.",
  }),
  (i) => ({
    key: "analytics_configured",
    label: "Analytics configured",
    required: false,
    status: "unknown",
    explanation: "Analytics help track product usage.",
    action: "Configure analytics integration.",
  }),
  (i) => ({
    key: "documentation_exists",
    label: "Documentation available",
    required: false,
    status: "unknown",
    explanation: "Documentation improves maintainability.",
    action: "Generate or write documentation.",
  }),
];

// ═══════════════════════════════════════════════════════════════════
// STAGE REGISTRY
// ═══════════════════════════════════════════════════════════════════

export const STAGE_DEFINITIONS: StageDefinition[] = [
  {
    stage: "idea",
    matchStatuses: ["draft"],
    checks: ideaChecks,
  },
  {
    stage: "discovery",
    matchStatuses: [
      "opportunity_discovered", "market_signals_analyzing", "market_signals_analyzed",
      "product_validating", "product_validated", "revenue_strategizing", "revenue_strategized",
      "discovered",
    ],
    checks: discoveryChecks,
  },
  {
    stage: "architecture",
    matchStatuses: [
      "architecture_ready", "architected", "architecture_simulated",
      "preventive_validated", "bootstrap_planned", "scaffolded", "foundation_scaffolded",
      "simulating_modules", "modules_simulated", "analyzing_dependencies", "dependencies_analyzed",
      "bootstrapping_schema", "schema_bootstrapped", "provisioning_db", "db_provisioned",
      "analyzing_domain", "domain_analyzed", "generating_data_model", "data_model_generated",
      "synthesizing_logic", "logic_synthesized", "generating_api", "api_generated",
      "generating_ui", "ui_generated",
    ],
    checks: architectureChecks,
  },
  {
    stage: "engineering",
    matchStatuses: [
      "squad_ready", "squad_formed", "planning_ready", "planned", "in_progress",
    ],
    checks: engineeringChecks,
  },
  {
    stage: "validation",
    matchStatuses: ["validating"],
    checks: validationChecks,
  },
  {
    stage: "deploy",
    matchStatuses: [
      "ready_to_publish", "published", "deploying", "deployed",
    ],
    checks: deployChecks,
  },
  {
    stage: "runtime",
    matchStatuses: [
      "runtime_active", "observing_product", "product_observed",
      "analyzing_product_metrics", "product_metrics_analyzed",
      "analyzing_user_behavior", "user_behavior_analyzed",
      "optimizing_growth", "growth_optimized",
      "learning_system", "system_learned",
      "evolving_product", "product_evolved",
      "evolving_architecture", "architecture_evolved",
      "managing_portfolio", "portfolio_managed",
      "evolving_system", "system_evolved",
      "observability_ready", "analytics_ready", "behavior_analyzed",
    ],
    checks: runtimeChecks,
  },
];

/**
 * Get the delivery stage for a given internal stage_status.
 */
export function getDeliveryStage(stageStatus: string): string {
  for (const def of STAGE_DEFINITIONS) {
    if (def.matchStatuses.includes(stageStatus)) return def.stage;
  }
  if (stageStatus === "completed") return "completed";
  return "idea"; // fallback
}

/**
 * Get the stage definition for a given internal stage_status.
 */
export function getStageDefinition(stageStatus: string): StageDefinition | undefined {
  return STAGE_DEFINITIONS.find((d) => d.matchStatuses.includes(stageStatus));
}
