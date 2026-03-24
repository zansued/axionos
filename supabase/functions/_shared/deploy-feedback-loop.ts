/**
 * Deploy Feedback Loop — Sprint 216
 * Captures deploy outcomes and feeds structured learning signals
 * back into operational_learning_signals for pattern mining.
 */

export interface DeployOutcomeSignal {
  organization_id: string;
  initiative_id: string;
  deploy_target: string;
  deploy_status: "deployed" | "deploy_failed";
  deploy_url?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  health_status?: string | null;
  publish_contract_valid?: boolean;
  security_matcher_passed?: boolean;
  latency_ms?: number;
  provider_metadata?: Record<string, unknown> | null;
}

interface ErrorClassification {
  category: string;
  is_actionable: boolean;
  remediation_hint: string;
}

const ERROR_PATTERNS: Array<{ pattern: RegExp; category: string; hint: string }> = [
  { pattern: /ERESOLVE|peer dep|dependency/i, category: "dependency_conflict", hint: "Sanitize package.json devDependencies and add --legacy-peer-deps" },
  { pattern: /Cannot find module|MODULE_NOT_FOUND/i, category: "missing_module", hint: "Run import validation against file manifest before publish" },
  { pattern: /TS2\d{3}/i, category: "typescript_error", hint: "Run synthetic build check before publish" },
  { pattern: /process\.env/i, category: "env_var_misuse", hint: "Replace process.env with import.meta.env in Vite projects" },
  { pattern: /CORS|preflight/i, category: "cors_error", hint: "Check Supabase URL and CORS headers configuration" },
  { pattern: /401|403|Unauthorized|Forbidden/i, category: "auth_error", hint: "Verify deploy tokens and permissions" },
  { pattern: /timeout|ETIMEDOUT/i, category: "timeout", hint: "Increase deploy timeout or check provider status" },
  { pattern: /rate.?limit|429/i, category: "rate_limit", hint: "Wait and retry; consider spacing deploys" },
  { pattern: /installCommand.*256|command too long/i, category: "config_overflow", hint: "Simplify installCommand to stay under 256 chars" },
  { pattern: /DEPLOYMENT_NOT_FOUND|404/i, category: "provider_not_found", hint: "Verify project exists on deploy provider" },
];

function classifyError(errorCode?: string | null, errorMessage?: string | null): ErrorClassification {
  const combined = `${errorCode || ""} ${errorMessage || ""}`;
  for (const { pattern, category, hint } of ERROR_PATTERNS) {
    if (pattern.test(combined)) {
      return { category, is_actionable: true, remediation_hint: hint };
    }
  }
  return { category: "unknown", is_actionable: false, remediation_hint: "Review deploy logs for details" };
}

/**
 * Emit a structured learning signal from a deploy outcome.
 * Call this after every deploy attempt (success or failure).
 */
export async function emitDeployFeedback(
  supabase: any,
  signal: DeployOutcomeSignal,
): Promise<{ success: boolean; error?: string }> {
  try {
    const succeeded = signal.deploy_status === "deployed";
    const classification = succeeded
      ? { category: "success", is_actionable: false, remediation_hint: "" }
      : classifyError(signal.error_code, signal.error_message);

    // 1. Emit to operational_learning_signals
    const { error: sigError } = await supabase
      .from("operational_learning_signals")
      .insert({
        organization_id: signal.organization_id,
        initiative_id: signal.initiative_id,
        signal_type: succeeded ? "deploy_succeeded" : "deploy_failed",
        outcome: succeeded
          ? `Deploy to ${signal.deploy_target} succeeded: ${signal.deploy_url}`
          : `Deploy to ${signal.deploy_target} failed: ${signal.error_message}`,
        outcome_success: succeeded,
        confidence: succeeded ? 0.9 : 0.8,
        payload: {
          deploy_target: signal.deploy_target,
          error_code: signal.error_code || null,
          error_category: classification.category,
          is_actionable: classification.is_actionable,
          remediation_hint: classification.remediation_hint,
          health_status: signal.health_status || null,
          publish_contract_valid: signal.publish_contract_valid ?? null,
          security_matcher_passed: signal.security_matcher_passed ?? null,
          latency_ms: signal.latency_ms || null,
        },
      });

    if (sigError) {
      console.error("[DeployFeedback] Failed to emit learning signal:", sigError.message);
      return { success: false, error: sigError.message };
    }

    // 2. Record to pipeline_execution_metrics for dashboard
    await supabase.from("pipeline_execution_metrics").insert({
      organization_id: signal.organization_id,
      initiative_id: signal.initiative_id,
      file_path: "deploy",
      file_type: "deploy",
      execution_path: `deploy:${signal.deploy_target}`,
      succeeded,
      error_message: signal.error_message || null,
      error_category: classification.category,
      risk_tier: classification.is_actionable ? "high" : "standard",
      latency_ms: signal.latency_ms || 0,
      tokens_used: 0,
      cost_usd: 0,
      retry_count: 0,
    }).then(({ error }: any) => {
      if (error) console.error("[DeployFeedback] Metrics insert failed:", error.message);
    });

    console.log(`[DeployFeedback] Emitted ${succeeded ? "success" : "failure"} signal for ${signal.initiative_id} (${classification.category})`);
    return { success: true };
  } catch (err: any) {
    console.error("[DeployFeedback] Unexpected error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Query aggregated deploy feedback for an organization.
 * Used by dashboards to show deploy health trends.
 */
export async function queryDeployFeedback(
  supabase: any,
  organizationId: string,
  limit = 50,
): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  success_rate: number;
  top_error_categories: Record<string, number>;
  recent: any[];
}> {
  const { data } = await supabase
    .from("operational_learning_signals")
    .select("signal_type, outcome_success, payload, created_at")
    .eq("organization_id", organizationId)
    .in("signal_type", ["deploy_succeeded", "deploy_failed"])
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = data || [];
  const succeeded = rows.filter((r: any) => r.outcome_success).length;
  const failed = rows.length - succeeded;

  const errorCategories: Record<string, number> = {};
  for (const r of rows) {
    if (!r.outcome_success && r.payload?.error_category) {
      const cat = r.payload.error_category;
      errorCategories[cat] = (errorCategories[cat] || 0) + 1;
    }
  }

  return {
    total: rows.length,
    succeeded,
    failed,
    success_rate: rows.length > 0 ? Math.round((succeeded / rows.length) * 100) : 0,
    top_error_categories: errorCategories,
    recent: rows.slice(0, 10),
  };
}
