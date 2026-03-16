/**
 * Sprint 206 — Publish Confirmation Contract
 * 
 * Canonical schema emitted by pipeline-publish upon success.
 * The deploy engine MUST validate this contract before proceeding.
 */

// ══════════════════════════════════════════════════
//  PUBLISH CONFIRMATION CONTRACT
// ══════════════════════════════════════════════════

export interface PublishConfirmation {
  /** Schema version for forward compatibility */
  schema_version: "1.0";

  /** Initiative that was published */
  initiative_id: string;

  /** GitHub coordinates */
  repo_owner: string;
  repo_name: string;
  repo_url: string;
  branch: string;
  commit_sha: string;

  /** Artifact summary */
  files_committed: number;
  skipped_files: string[];

  /** Pre-flight results */
  preflight_pass: boolean;
  preflight_risk: "low" | "medium" | "high";

  /** Post-push verification */
  verification_healthy: boolean;
  verification_confidence: number;

  /** Security matcher report */
  security_passed: boolean;
  security_highest_severity: string | null;

  /** Dependency governance */
  dep_governance_risk: string | null;

  /** Version */
  version: string;

  /** Timestamp */
  published_at: string;
}

// ══════════════════════════════════════════════════
//  VALIDATION
// ══════════════════════════════════════════════════

export interface PublishConfirmationValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  deploy_ready: boolean;
}

/**
 * Validate a PublishConfirmation before allowing deploy.
 * Returns structured validation with deploy_ready flag.
 */
export function validatePublishConfirmation(
  data: unknown
): PublishConfirmationValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Publish confirmation must be an object"], warnings: [], deploy_ready: false };
  }

  const d = data as Record<string, unknown>;

  // Required fields
  if (!d.schema_version) errors.push("Missing schema_version");
  if (!d.initiative_id) errors.push("Missing initiative_id");
  if (!d.repo_url) errors.push("Missing repo_url");
  if (!d.commit_sha) errors.push("Missing commit_sha");
  if (!d.branch) errors.push("Missing branch");
  if (typeof d.files_committed !== "number" || d.files_committed === 0) {
    errors.push("files_committed must be > 0");
  }

  // Deploy-blocking conditions
  if (d.preflight_pass === false && d.preflight_risk === "high") {
    errors.push("Pre-flight failed with high risk — deploy blocked");
  }

  if (d.security_passed === false) {
    warnings.push("Security matcher flagged publish artifacts");
  }

  if (d.dep_governance_risk === "critical") {
    errors.push("Dependency governance flagged critical risk — deploy blocked");
  }

  // Warnings (non-blocking)
  if (d.verification_healthy === false) {
    warnings.push("Post-publish verification reported unhealthy");
  }
  if (typeof d.verification_confidence === "number" && d.verification_confidence < 50) {
    warnings.push(`Low verification confidence: ${d.verification_confidence}%`);
  }

  const valid = errors.length === 0;
  const deploy_ready = valid && d.preflight_pass !== false;

  return { valid, errors, warnings, deploy_ready };
}

// ══════════════════════════════════════════════════
//  DEPLOY READINESS CHECK
// ══════════════════════════════════════════════════

/**
 * Quick check: is this initiative ready for deploy based on its publish confirmation?
 */
export function isDeployReady(confirmation: PublishConfirmation): boolean {
  return (
    !!confirmation.repo_url &&
    !!confirmation.commit_sha &&
    confirmation.files_committed > 0 &&
    confirmation.preflight_pass &&
    confirmation.dep_governance_risk !== "critical"
  );
}
