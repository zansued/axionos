/**
 * Sprint 126 — Cold Start Explainability Layer
 *
 * Detects when a tenant/org has insufficient data to produce reliable metrics.
 * Returns structured labels so Observability UI can explain "low confidence" scores
 * instead of letting operators misinterpret weak numbers.
 */

export interface ColdStartInput {
  execution_count: number;
  tenant_created_at: string;       // ISO date
  stack_history_count: number;     // how many unique stacks have been used
  autonomy_adjustment_count: number;
  compounding_score_count: number;
}

export interface ColdStartThresholds {
  min_execution_count: number;
  min_tenant_age_days: number;
  min_stack_history: number;
  min_autonomy_adjustments: number;
  min_compounding_scores: number;
}

export type ColdStartLabel = "cold_start" | "low_confidence" | "insufficient_history" | "ready";

export interface ColdStartResult {
  label: ColdStartLabel;
  is_cold_start: boolean;
  signals: ColdStartSignal[];
  summary: string;
}

export interface ColdStartSignal {
  dimension: string;
  current_value: number;
  required_value: number;
  met: boolean;
  explanation: string;
}

export const DEFAULT_THRESHOLDS: ColdStartThresholds = {
  min_execution_count: 20,
  min_tenant_age_days: 7,
  min_stack_history: 2,
  min_autonomy_adjustments: 5,
  min_compounding_scores: 3,
};

function daysSince(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24);
}

export function detectColdStart(
  input: ColdStartInput,
  thresholds: ColdStartThresholds = DEFAULT_THRESHOLDS,
): ColdStartResult {
  const signals: ColdStartSignal[] = [];

  const tenantAgeDays = daysSince(input.tenant_created_at);

  signals.push({
    dimension: "execution_count",
    current_value: input.execution_count,
    required_value: thresholds.min_execution_count,
    met: input.execution_count >= thresholds.min_execution_count,
    explanation: input.execution_count < thresholds.min_execution_count
      ? `Only ${input.execution_count} executions recorded (${thresholds.min_execution_count} required).`
      : "Sufficient execution history.",
  });

  signals.push({
    dimension: "tenant_age_days",
    current_value: Math.round(tenantAgeDays),
    required_value: thresholds.min_tenant_age_days,
    met: tenantAgeDays >= thresholds.min_tenant_age_days,
    explanation: tenantAgeDays < thresholds.min_tenant_age_days
      ? `Tenant is ${Math.round(tenantAgeDays)} days old (${thresholds.min_tenant_age_days} required).`
      : "Sufficient tenant maturity.",
  });

  signals.push({
    dimension: "stack_history",
    current_value: input.stack_history_count,
    required_value: thresholds.min_stack_history,
    met: input.stack_history_count >= thresholds.min_stack_history,
    explanation: input.stack_history_count < thresholds.min_stack_history
      ? `Only ${input.stack_history_count} stack(s) used (${thresholds.min_stack_history} required).`
      : "Sufficient stack diversity.",
  });

  signals.push({
    dimension: "autonomy_adjustments",
    current_value: input.autonomy_adjustment_count,
    required_value: thresholds.min_autonomy_adjustments,
    met: input.autonomy_adjustment_count >= thresholds.min_autonomy_adjustments,
    explanation: input.autonomy_adjustment_count < thresholds.min_autonomy_adjustments
      ? `Only ${input.autonomy_adjustment_count} autonomy adjustments (${thresholds.min_autonomy_adjustments} required).`
      : "Sufficient autonomy history.",
  });

  signals.push({
    dimension: "compounding_scores",
    current_value: input.compounding_score_count,
    required_value: thresholds.min_compounding_scores,
    met: input.compounding_score_count >= thresholds.min_compounding_scores,
    explanation: input.compounding_score_count < thresholds.min_compounding_scores
      ? `Only ${input.compounding_score_count} compounding scores (${thresholds.min_compounding_scores} required).`
      : "Sufficient compounding data.",
  });

  const unmet = signals.filter((s) => !s.met);
  const metCount = signals.length - unmet.length;

  let label: ColdStartLabel;
  let summary: string;

  if (metCount === signals.length) {
    label = "ready";
    summary = "All data maturity thresholds met. Metrics are reliable.";
  } else if (metCount >= 3) {
    label = "low_confidence";
    summary = `Some metrics have limited confidence: ${unmet.map((s) => s.dimension).join(", ")}.`;
  } else if (metCount >= 1) {
    label = "insufficient_history";
    summary = `Insufficient history for reliable scoring. ${unmet.length} of ${signals.length} thresholds unmet.`;
  } else {
    label = "cold_start";
    summary = "System is in cold start — no thresholds met. All metrics should be interpreted with caution.";
  }

  return {
    label,
    is_cold_start: label !== "ready",
    signals,
    summary,
  };
}
