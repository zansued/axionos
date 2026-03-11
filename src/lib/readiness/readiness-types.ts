/**
 * Readiness Engine — Phase 4
 *
 * Deterministic evaluation model for initiative pipeline readiness.
 * Answers: Why blocked? What's missing? What must happen next?
 */

// ─── Delivery Stages ──────────────────────────────────────────────
export type DeliveryStage =
  | "idea"
  | "discovery"
  | "architecture"
  | "engineering"
  | "validation"
  | "deploy"
  | "runtime"
  | "completed";

// ─── Check Model ──────────────────────────────────────────────────
export type CheckStatus = "pass" | "fail" | "unknown";

export interface ReadinessCheck {
  /** Unique key for this check */
  key: string;
  /** Human-readable label */
  label: string;
  /** Whether this check blocks progression */
  required: boolean;
  /** Current evaluation status */
  status: CheckStatus;
  /** Why this check failed or is unknown */
  explanation?: string;
  /** Suggested action to resolve */
  action?: string;
}

// ─── Readiness Result ─────────────────────────────────────────────
export interface ReadinessResult {
  /** Current delivery stage */
  stage: DeliveryStage;
  /** 0.0–1.0 readiness score (passed required / total required) */
  readinessScore: number;
  /** Failed required checks */
  blockers: ReadinessCheck[];
  /** Failed or unknown optional checks */
  warnings: ReadinessCheck[];
  /** Passed checks */
  passedChecks: ReadinessCheck[];
  /** All checks evaluated */
  allChecks: ReadinessCheck[];
  /** ISO timestamp of evaluation */
  evaluatedAt: string;
  /** Whether the initiative can proceed to next stage */
  canProceed: boolean;
  /** Next required action (first blocker's action) */
  nextRequiredAction?: string;
}

// ─── Initiative Data (input to engine) ────────────────────────────
export interface InitiativeReadinessInput {
  id: string;
  title: string;
  stage_status: string;
  description?: string | null;
  idea_raw?: string | null;
  discovery_payload?: any;
  architecture_content?: string | null;
  blueprint?: any;
  prd_content?: string | null;
  approved_at_discovery?: string | null;
  approved_at_planning?: string | null;
  approved_at_squad?: string | null;
  repo_url?: string | null;
  deploy_url?: string | null;
  deploy_target?: string | null;
  deploy_status?: string | null;
  build_status?: string | null;
  commit_hash?: string | null;
  simulation_report?: any;
  execution_progress?: any;
  risk_level?: string | null;
  health_status?: string | null;
  /** Counts from related tables */
  storiesCount?: number;
  agentsCount?: number;
  artifactsCount?: number;
  approvedArtifacts?: number;
  jobsSuccessCount?: number;
  jobsFailedCount?: number;
}
