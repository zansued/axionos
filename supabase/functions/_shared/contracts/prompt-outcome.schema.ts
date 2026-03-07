// Prompt Outcome Contract Schema — AxionOS Sprint 10
// Tracks prompt-level execution outcomes for future optimization.

export interface PromptOutcome {
  prompt_outcome_id: string;
  stage_name: string;
  prompt_version: string | null;
  initiative_id: string | null;
  organization_id: string;
  input_signature: string | null;
  output_quality_score: number; // 0-100
  success_status: "success" | "partial" | "failed";
  cost_usd: number;
  tokens_used: number;
  duration_ms: number;
  repair_needed: boolean;
  deploy_success_impact: boolean | null;
  created_at: string;
}

export function computePromptSignature(
  stage: string,
  promptVersion: string | null,
  model: string | null,
): string {
  return `${stage}::${promptVersion || "default"}::${model || "unknown"}`;
}

export function validatePromptOutcome(
  data: unknown,
): { success: true; data: PromptOutcome } | { success: false; error: string } {
  if (!data || typeof data !== "object") {
    return { success: false, error: "Prompt outcome must be an object" };
  }
  const d = data as Record<string, unknown>;
  const errors: string[] = [];

  if (!d.prompt_outcome_id) errors.push("prompt_outcome_id required");
  if (!d.stage_name) errors.push("stage_name required");
  if (!d.organization_id) errors.push("organization_id required");
  if (!["success", "partial", "failed"].includes(d.success_status as string)) {
    errors.push("success_status must be success, partial, or failed");
  }

  if (errors.length > 0) return { success: false, error: errors.join("; ") };
  return { success: true, data: d as unknown as PromptOutcome };
}
