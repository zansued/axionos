/**
 * Metric Data Contract — Phase 3: Metrics & Data Integrity
 *
 * Every metric displayed in AxionOS must conform to this contract.
 * This ensures traceability, confidence, and explainability.
 */

// ─── Source Classification ────────────────────────────────────────
export type MetricSource =
  | "runtime_real"    // Derived from deployed services (uptime, latency, instances)
  | "pipeline_real"   // Derived from build/pipeline systems (build success, deploy success)
  | "repo_real"       // Derived from Git repositories (commits, PRs, code changes)
  | "calculated"      // Derived from internal models (autonomy score, health grade)
  | "external"        // From external integrations
  | "mock"            // Placeholder for early UI / demo environments
  | "manual";         // Manually entered values

// ─── Status Classification ────────────────────────────────────────
export type MetricStatus =
  | "ok"
  | "warning"
  | "error"
  | "unknown";

// ─── Telemetry Layer ──────────────────────────────────────────────
export type TelemetryLayer =
  | "execution"   // Pipelines, deploys, runtime
  | "product"     // Idea→software time, tokens, cost
  | "system";     // Health, autonomy, governance

// ─── Metric Contract ──────────────────────────────────────────────
export interface Metric {
  /** Unique identifier for this metric */
  key: string;
  /** Human-readable label */
  label: string;
  /** Current value */
  value: number | string;
  /** Display unit (%, ms, $, etc.) */
  unit?: string;
  /** Data origin */
  source: MetricSource;
  /** Current health status */
  status: MetricStatus;
  /** ISO timestamp of last update */
  updatedAt: string;
  /**
   * Confidence score:
   *   1.0 = real source
   *   0.8 = calculated with partial data
   *   0.3 = estimated
   *   0.0 = mock
   */
  confidence: number;
  /** How this metric is derived (for calculated/derived metrics) */
  explanation?: string;
  /** Which telemetry layer this belongs to */
  layer: TelemetryLayer;
  /** Trend direction if available */
  trend?: "up" | "down" | "neutral";
}

// ─── Registry Entry (static definition) ───────────────────────────
export interface MetricRegistryEntry {
  key: string;
  label: string;
  source: MetricSource;
  unit?: string;
  layer: TelemetryLayer;
  /** How this metric is calculated */
  calculation: string;
  /** Expected update frequency */
  updateFrequency: string;
  /** Explanation for users */
  explanation?: string;
}

// ─── Safe Fallback ────────────────────────────────────────────────
export function createFallbackMetric(entry: MetricRegistryEntry): Metric {
  return {
    key: entry.key,
    label: entry.label,
    value: "—",
    unit: entry.unit,
    source: entry.source,
    status: "unknown",
    updatedAt: new Date().toISOString(),
    confidence: 0,
    explanation: `${entry.label} is currently unavailable.`,
    layer: entry.layer,
  };
}

// ─── Confidence Helpers ───────────────────────────────────────────
export function confidenceForSource(source: MetricSource): number {
  switch (source) {
    case "runtime_real":
    case "pipeline_real":
    case "repo_real":
    case "external":
      return 1.0;
    case "calculated":
      return 0.8;
    case "manual":
      return 0.6;
    case "mock":
      return 0.0;
  }
}

// ─── Status from Value ────────────────────────────────────────────
export function deriveStatus(
  value: number | string | null | undefined,
  thresholds?: { warning?: number; error?: number; inverted?: boolean }
): MetricStatus {
  if (value === null || value === undefined || value === "—") return "unknown";
  if (typeof value === "string") return "ok";
  if (!thresholds) return "ok";
  const { warning, error, inverted } = thresholds;
  if (inverted) {
    // Lower is worse (e.g., success rate)
    if (error !== undefined && value <= error) return "error";
    if (warning !== undefined && value <= warning) return "warning";
  } else {
    // Higher is worse (e.g., latency)
    if (error !== undefined && value >= error) return "error";
    if (warning !== undefined && value >= warning) return "warning";
  }
  return "ok";
}

// ─── Validation ───────────────────────────────────────────────────
export function validateMetric(m: Partial<Metric>): boolean {
  return !!(
    m.key &&
    m.source &&
    m.updatedAt &&
    m.confidence !== undefined &&
    m.value !== undefined
  );
}
