// Initiative Observability Contract Schema
// Canonical structure for initiative lifecycle product-level metrics.
// Aggregates existing pipeline, build, deploy, and cost telemetry into initiative-level reporting.

// ══════════════════════════════════════════════════
//  ENUMS
// ══════════════════════════════════════════════════

export type InitiativeOutcomeStatus =
  | "in_progress"
  | "repository_ready"
  | "deployed"
  | "failed"
  | "partially_completed";

const OUTCOME_STATUSES: InitiativeOutcomeStatus[] = [
  "in_progress",
  "repository_ready",
  "deployed",
  "failed",
  "partially_completed",
];

// ══════════════════════════════════════════════════
//  OBSERVABILITY CONTRACT
// ══════════════════════════════════════════════════

export interface InitiativeObservability {
  initiative_id: string;
  organization_id: string;

  // Core product metrics
  /** Ratio of successfully completed required pipeline phases (0–100) */
  pipeline_success_rate: number;
  /** Whether runtime validation/build completed successfully (0–100) */
  build_success_rate: number;
  /** Whether deployment reached deployed status with valid URL (0–100) */
  deploy_success_rate: number;

  // Time metrics (seconds)
  /** Time between initiative creation and repository publication */
  time_idea_to_repo_seconds: number | null;
  /** Time between initiative creation and successful deploy */
  time_idea_to_deploy_seconds: number | null;

  // Cost metrics
  /** Total accumulated cost across all stages, models, retries */
  cost_per_initiative_usd: number;
  tokens_total: number;
  models_used: string[];

  // Retry & repair metrics
  /** Average retries triggered across all initiative stages */
  average_retries_per_initiative: number;
  /** Ratio of successful repair outcomes over total repair attempts (0–100) */
  automatic_repair_success_rate: number;

  // Distribution metrics
  /** Count of failures grouped by stage */
  stage_failure_distribution: Record<string, number>;
  /** Duration in ms grouped by stage */
  stage_durations: Record<string, number>;
  /** Cost in USD grouped by stage */
  stage_costs: Record<string, number>;

  // Outcome
  initiative_outcome_status: InitiativeOutcomeStatus;

  computed_at: string;
}

// ══════════════════════════════════════════════════
//  OUTCOME STATUS COMPUTATION
// ══════════════════════════════════════════════════

/**
 * Compute initiative outcome status from lifecycle state.
 *
 * Rules:
 * - deployed status + deploy_url → "deployed"
 * - published/ready_to_publish status → "repository_ready"
 * - critical failure (deploy_failed with no retry, or pipeline stuck) → "failed"
 * - some outputs exist but loop not completed → "partially_completed"
 * - otherwise → "in_progress"
 */
export function computeOutcomeStatus(
  stageStatus: string,
  deployStatus: string | null,
  deployUrl: string | null,
  hasOutputs: boolean,
): InitiativeOutcomeStatus {
  if (deployStatus === "deployed" && deployUrl) return "deployed";
  if (deployStatus === "deploy_failed") return "failed";
  if (["published", "ready_to_publish"].includes(stageStatus)) return "repository_ready";
  if (stageStatus === "draft" || stageStatus === "idea") {
    return hasOutputs ? "partially_completed" : "in_progress";
  }
  // Active pipeline stages
  const activeStages = [
    "discovering", "discovered", "squad_forming", "squad_formed",
    "planning", "planned", "executing", "executed",
    "validating", "validated", "publishing",
  ];
  if (activeStages.includes(stageStatus)) return "in_progress";

  return hasOutputs ? "partially_completed" : "in_progress";
}

// ══════════════════════════════════════════════════
//  VALIDATION
// ══════════════════════════════════════════════════

export function validateInitiativeObservability(
  data: unknown,
): { success: true; data: InitiativeObservability } | { success: false; error: string } {
  if (!data || typeof data !== "object") {
    return { success: false, error: "Initiative observability must be an object" };
  }

  const d = data as Record<string, unknown>;
  const errors: string[] = [];

  if (!d.initiative_id || typeof d.initiative_id !== "string") {
    errors.push("initiative_id is required");
  }
  if (!d.organization_id || typeof d.organization_id !== "string") {
    errors.push("organization_id is required");
  }
  if (!OUTCOME_STATUSES.includes(d.initiative_outcome_status as InitiativeOutcomeStatus)) {
    errors.push(`initiative_outcome_status must be one of: ${OUTCOME_STATUSES.join(", ")}`);
  }

  if (errors.length > 0) {
    return { success: false, error: errors.join("; ") };
  }

  return { success: true, data: d as unknown as InitiativeObservability };
}
