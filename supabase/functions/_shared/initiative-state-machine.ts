/**
 * Sprint 204 — Canonical Initiative State Machine
 * 
 * Defines all valid stage_status values and allowed transitions.
 * Every pipeline function MUST validate transitions through this module.
 */

export type InitiativeStageStatus =
  | "draft"
  | "discovery_ready" | "discovering" | "discovered"
  | "opportunity_discovering" | "opportunity_discovered"
  | "analyzing_market_signals" | "market_signals_analyzed"
  | "validating_product" | "product_validated"
  | "strategizing_revenue" | "revenue_strategized"
  | "architecture_ready" | "architecting" | "architected"
  | "simulating_architecture" | "architecture_simulated"
  | "preventive_validated" | "bootstrap_planned" | "foundation_scaffolded"
  | "squad_ready" | "forming_squad" | "squad_formed"
  | "planning_ready" | "planning" | "planned"
  | "bootstrapping" | "bootstrapped"
  | "scaffolding" | "scaffolded"
  | "simulating_modules" | "modules_simulated"
  | "analyzing_dependencies" | "dependencies_analyzed"
  | "bootstrapping_schema" | "schema_bootstrapped"
  | "provisioning_db" | "db_provisioned"
  | "analyzing_domain" | "domain_analyzed"
  | "generating_data_model" | "data_model_generated"
  | "synthesizing_logic" | "logic_synthesized"
  | "generating_api" | "api_generated"
  | "generating_ui" | "ui_generated"
  | "learning_system" | "system_learned"
  | "in_progress" | "validating" | "ready_to_publish"
  | "repairing_build" | "build_repaired" | "repair_failed"
  | "published" | "deploying" | "deployed" | "deploy_failed"
  | "observability_ready" | "analytics_ready"
  | "observing_product" | "product_observed"
  | "analyzing_product_metrics" | "product_metrics_analyzed"
  | "analyzing_user_behavior" | "user_behavior_analyzed"
  | "optimizing_growth" | "growth_optimized"
  | "evolving_product" | "product_evolved"
  | "evolving_architecture" | "architecture_evolved"
  | "managing_portfolio" | "portfolio_managed"
  | "evolving_system" | "system_evolved"
  | "runtime_active"
  | "completed" | "rejected" | "archived";

/**
 * Valid transitions map.
 * Key = current status, Value = set of allowed next statuses.
 * 
 * Special rules:
 * - "rejected" and "archived" are terminal — no outgoing transitions
 * - Any status can transition to "rejected" or "archived" (operator override)
 * - Pipeline functions that process a stage can set status back to their "processing" state 
 *   (idempotent re-entry)
 */
const TRANSITIONS: Record<string, string[]> = {
  // ── Venture Intelligence ──
  draft: ["discovery_ready", "opportunity_discovering"],
  discovery_ready: ["discovering"],
  discovering: ["discovered"],
  discovered: ["architecture_ready"],
  opportunity_discovering: ["opportunity_discovered"],
  opportunity_discovered: ["analyzing_market_signals"],
  analyzing_market_signals: ["market_signals_analyzed"],
  market_signals_analyzed: ["validating_product"],
  validating_product: ["product_validated"],
  product_validated: ["strategizing_revenue"],
  strategizing_revenue: ["revenue_strategized"],
  revenue_strategized: ["discovered"],

  // ── Discovery & Architecture ──
  architecture_ready: ["architecting"],
  architecting: ["architected"],
  architected: ["simulating_architecture", "architecture_simulated"],
  simulating_architecture: ["architecture_simulated"],
  architecture_simulated: ["preventive_validated"],
  preventive_validated: ["bootstrap_planned"],
  bootstrap_planned: ["foundation_scaffolded", "bootstrapping"],

  // ── Infrastructure & Modeling ──
  foundation_scaffolded: ["simulating_modules", "scaffolding"],
  bootstrapping: ["bootstrapped"],
  bootstrapped: ["scaffolding"],
  scaffolding: ["scaffolded"],
  scaffolded: ["simulating_modules"],
  simulating_modules: ["modules_simulated"],
  modules_simulated: ["analyzing_dependencies"],
  analyzing_dependencies: ["dependencies_analyzed"],
  dependencies_analyzed: ["bootstrapping_schema"],
  bootstrapping_schema: ["schema_bootstrapped"],
  schema_bootstrapped: ["provisioning_db"],
  provisioning_db: ["db_provisioned"],
  db_provisioned: ["analyzing_domain"],
  analyzing_domain: ["domain_analyzed"],
  domain_analyzed: ["generating_data_model"],
  generating_data_model: ["data_model_generated"],
  data_model_generated: ["synthesizing_logic"],
  synthesizing_logic: ["logic_synthesized"],
  logic_synthesized: ["generating_api"],
  generating_api: ["api_generated"],
  api_generated: ["generating_ui"],
  generating_ui: ["ui_generated"],
  ui_generated: ["squad_ready"],

  // ── Squad & Planning ──
  squad_ready: ["forming_squad"],
  forming_squad: ["squad_formed"],
  squad_formed: ["planning_ready"],
  planning_ready: ["planning"],
  planning: ["planned"],
  planned: ["in_progress"],

  // ── Execution & Validation ──
  in_progress: ["validating"],
  validating: ["ready_to_publish", "repairing_build", "in_progress"],
  repairing_build: ["build_repaired", "repair_failed"],
  build_repaired: ["validating"],
  repair_failed: ["validating", "in_progress"],
  ready_to_publish: ["published"],

  // ── Publish & Deploy ──
  published: ["deploying", "observability_ready"],
  deploying: ["deployed", "deploy_failed"],
  deploy_failed: ["deploying", "published"],
  deployed: ["observability_ready"],

  // ── Runtime & Post-Deploy ──
  observability_ready: ["analytics_ready", "observing_product"],
  analytics_ready: ["analyzing_user_behavior", "user_behavior_analyzed"],
  observing_product: ["product_observed"],
  product_observed: ["analyzing_product_metrics"],
  analyzing_product_metrics: ["product_metrics_analyzed"],
  product_metrics_analyzed: ["analyzing_user_behavior"],
  analyzing_user_behavior: ["user_behavior_analyzed"],
  user_behavior_analyzed: ["optimizing_growth"],
  optimizing_growth: ["growth_optimized"],
  growth_optimized: ["evolving_product"],
  evolving_product: ["product_evolved"],
  product_evolved: ["evolving_architecture"],
  evolving_architecture: ["architecture_evolved"],
  architecture_evolved: ["managing_portfolio", "evolving_system"],
  managing_portfolio: ["portfolio_managed"],
  portfolio_managed: ["evolving_system"],
  evolving_system: ["system_evolved"],
  system_evolved: ["completed"],

  // ── Learning / special ──
  learning_system: ["system_learned"],
  system_learned: ["completed"],
  runtime_active: ["completed"],

  // ── Terminal ──
  completed: [],
  rejected: [],
  archived: [],
};

/** Global overrides: any status can go to these */
const UNIVERSAL_TARGETS = new Set(["rejected", "archived"]);

/** Statuses that require repo_url to be set before entering */
const REQUIRES_REPO_URL = new Set(["published", "deploying", "deployed"]);

export interface TransitionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check whether a stage_status transition is valid.
 * 
 * @param from - current stage_status
 * @param to - desired next stage_status
 * @param context - optional context for additional guards
 */
export function validateTransition(
  from: string,
  to: string,
  context?: { repoUrl?: string | null }
): TransitionResult {
  // Same status = idempotent no-op, always allowed
  if (from === to) return { allowed: true };

  // Universal targets
  if (UNIVERSAL_TARGETS.has(to)) return { allowed: true };

  // Check if from-status has defined transitions
  const allowed = TRANSITIONS[from];
  if (!allowed) {
    return { allowed: false, reason: `Unknown source status: "${from}"` };
  }

  if (!allowed.includes(to)) {
    return {
      allowed: false,
      reason: `Invalid transition: "${from}" → "${to}". Allowed: [${allowed.join(", ")}]`,
    };
  }

  // Guard: published/deploying/deployed require repo_url
  if (REQUIRES_REPO_URL.has(to) && !context?.repoUrl) {
    return {
      allowed: false,
      reason: `Cannot transition to "${to}": repo_url is required but not set`,
    };
  }

  return { allowed: true };
}

/**
 * Get all valid next statuses from a given status.
 */
export function getValidNextStatuses(from: string): string[] {
  const direct = TRANSITIONS[from] || [];
  return [...direct, ...Array.from(UNIVERSAL_TARGETS)];
}

/**
 * Check if a status is terminal (no forward transitions).
 */
export function isTerminalStatus(status: string): boolean {
  return status === "completed" || status === "rejected" || status === "archived";
}
