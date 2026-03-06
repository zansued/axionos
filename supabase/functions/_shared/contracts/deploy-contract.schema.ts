// Deploy Contract Schema — the canonical structure for deployment lifecycle state.
// This schema defines the structured output for deploy tracking across targets.

// ══════════════════════════════════════════════════
//  ENUMS
// ══════════════════════════════════════════════════

export type DeployTarget = "vercel" | "netlify" | "aws" | "docker" | "unknown";
export type BuildStatus = "pending" | "passed" | "failed";
export type DeployStatus = "ready_to_publish" | "published" | "deploying" | "deployed" | "deploy_failed";
export type HealthStatus = "unknown" | "healthy" | "unhealthy";

const DEPLOY_TARGETS: DeployTarget[] = ["vercel", "netlify", "aws", "docker", "unknown"];
const BUILD_STATUSES: BuildStatus[] = ["pending", "passed", "failed"];
const DEPLOY_STATUSES: DeployStatus[] = ["ready_to_publish", "published", "deploying", "deployed", "deploy_failed"];
const HEALTH_STATUSES: HealthStatus[] = ["unknown", "healthy", "unhealthy"];

// ══════════════════════════════════════════════════
//  DEPLOY CONTRACT
// ══════════════════════════════════════════════════

export interface DeployContract {
  deploy_target: DeployTarget;
  repo_url: string | null;
  commit_hash: string | null;
  build_status: BuildStatus;
  deploy_status: DeployStatus;
  deploy_url: string | null;
  health_status: HealthStatus;
  error_code: string | null;
  error_message: string | null;
  deployed_at: string | null;
  last_checked_at: string | null;
}

// ══════════════════════════════════════════════════
//  HEALTH CHECK CONTRACT
// ══════════════════════════════════════════════════

export interface HealthCheckResult {
  health_status: HealthStatus;
  last_checked_at: string;
  health_check_url: string | null;
  health_check_result: Record<string, unknown> | null;
}

// ══════════════════════════════════════════════════
//  STATE MACHINE — Valid Transitions
// ══════════════════════════════════════════════════

/**
 * Deploy Lifecycle State Machine:
 *
 *   validating
 *       │
 *       ▼
 *   ready_to_publish
 *       │
 *       ▼
 *   published
 *       │
 *       ▼
 *   deploying ──────► deploy_failed
 *       │                   │
 *       ▼                   ▼
 *   deployed           deploying (retry)
 */

const VALID_TRANSITIONS: Record<string, DeployStatus[]> = {
  ready_to_publish: ["published"],
  published: ["deploying"],
  deploying: ["deployed", "deploy_failed"],
  deployed: ["deploying"],       // re-deploy
  deploy_failed: ["deploying"],  // retry
};

export function isValidDeployTransition(from: string, to: DeployStatus): boolean {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

// ══════════════════════════════════════════════════
//  DEPLOY REQUEST / RESPONSE
// ══════════════════════════════════════════════════

export interface DeployRequest {
  initiative_id: string;
  deploy_target?: DeployTarget;
}

export interface DeployResponse {
  initiative_id: string;
  deploy_status: DeployStatus;
  deploy_url: string | null;
  health_status: HealthStatus;
  error_code: string | null;
  error_message: string | null;
}

// ══════════════════════════════════════════════════
//  VERCEL-FIRST DEPLOYMENT CONTRACT
// ══════════════════════════════════════════════════

export interface VercelDeployConfig {
  framework: "vite";
  install_command: string;
  build_command: string;
  output_directory: string;
  rewrites: Array<{ source: string; destination: string }>;
}

export const VERCEL_DEFAULT_CONFIG: VercelDeployConfig = {
  framework: "vite",
  install_command: "rm -f package-lock.json && npm install --include=dev",
  build_command: "npm run build",
  output_directory: "dist",
  rewrites: [{ source: "/(.*)", destination: "/index.html" }],
};

// ══════════════════════════════════════════════════
//  VALIDATION
// ══════════════════════════════════════════════════

export function validateDeployContract(data: unknown): { success: true; data: DeployContract } | { success: false; error: string } {
  if (!data || typeof data !== "object") {
    return { success: false, error: "Deploy contract must be an object" };
  }

  const d = data as Record<string, unknown>;
  const errors: string[] = [];

  if (!DEPLOY_TARGETS.includes(d.deploy_target as DeployTarget)) {
    errors.push(`deploy_target must be one of: ${DEPLOY_TARGETS.join(", ")}`);
  }
  if (!BUILD_STATUSES.includes(d.build_status as BuildStatus)) {
    errors.push(`build_status must be one of: ${BUILD_STATUSES.join(", ")}`);
  }
  if (!DEPLOY_STATUSES.includes(d.deploy_status as DeployStatus)) {
    errors.push(`deploy_status must be one of: ${DEPLOY_STATUSES.join(", ")}`);
  }
  if (!HEALTH_STATUSES.includes(d.health_status as HealthStatus)) {
    errors.push(`health_status must be one of: ${HEALTH_STATUSES.join(", ")}`);
  }

  if (errors.length > 0) {
    return { success: false, error: errors.join("; ") };
  }

  return {
    success: true,
    data: {
      deploy_target: d.deploy_target as DeployTarget,
      repo_url: (d.repo_url as string) || null,
      commit_hash: (d.commit_hash as string) || null,
      build_status: d.build_status as BuildStatus,
      deploy_status: d.deploy_status as DeployStatus,
      deploy_url: (d.deploy_url as string) || null,
      health_status: d.health_status as HealthStatus,
      error_code: (d.error_code as string) || null,
      error_message: (d.error_message as string) || null,
      deployed_at: (d.deployed_at as string) || null,
      last_checked_at: (d.last_checked_at as string) || null,
    },
  };
}
