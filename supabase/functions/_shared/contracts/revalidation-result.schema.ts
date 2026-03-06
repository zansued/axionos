// Revalidation Result Contract — AxionOS Sprint 6
// Minimal structure for post-repair validation results.

export type ValidationType =
  | "static_check"
  | "build_check"
  | "targeted_check"
  | "deploy_check";

export interface RevalidationResult {
  initiative_id: string;
  repair_id: string;
  validation_type: ValidationType;
  status: "passed" | "failed";
  errors_remaining: number;
  files_checked: string[];
  duration_ms: number;
  created_at: string;
}

export function createRevalidationResult(
  initiativeId: string,
  repairId: string,
  type: ValidationType,
  passed: boolean,
  errorsRemaining: number,
  filesChecked: string[],
  durationMs: number,
): RevalidationResult {
  return {
    initiative_id: initiativeId,
    repair_id: repairId,
    validation_type: type,
    status: passed ? "passed" : "failed",
    errors_remaining: errorsRemaining,
    files_checked: filesChecked,
    duration_ms: durationMs,
    created_at: new Date().toISOString(),
  };
}
