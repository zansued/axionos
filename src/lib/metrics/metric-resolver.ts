/**
 * Metric Resolver — Phase 3
 *
 * Resolves raw data from hooks into typed Metric objects
 * with confidence, status, and safe fallbacks.
 */

import type { Metric, MetricSource, MetricStatus, TelemetryLayer } from "./metric-contract";
import { confidenceForSource, deriveStatus, createFallbackMetric } from "./metric-contract";
import { getRegistryEntry } from "./metric-registry";

export interface MetricResolver {
  key: string;
  value: number | string | null | undefined;
  updatedAt?: string;
  trend?: "up" | "down" | "neutral";
  /** Override status thresholds */
  thresholds?: { warning?: number; error?: number; inverted?: boolean };
}

/**
 * Resolve a list of raw metric values into fully-typed Metric objects.
 * Uses registry for metadata, applies confidence & status, handles fallbacks.
 */
export function resolveMetrics(resolvers: MetricResolver[]): Metric[] {
  return resolvers.map((r) => {
    const entry = getRegistryEntry(r.key);
    if (!entry) {
      // Unknown metric — return with minimal info
      return {
        key: r.key,
        label: r.key,
        value: r.value ?? "—",
        source: "mock" as MetricSource,
        status: "unknown" as MetricStatus,
        updatedAt: r.updatedAt || new Date().toISOString(),
        confidence: 0,
        explanation: `Metric "${r.key}" not found in registry.`,
        layer: "system" as TelemetryLayer,
      };
    }

    // Handle null/undefined → fallback
    if (r.value === null || r.value === undefined) {
      return createFallbackMetric(entry);
    }

    const confidence = confidenceForSource(entry.source);
    const status = deriveStatus(r.value, r.thresholds);

    return {
      key: entry.key,
      label: entry.label,
      value: r.value,
      unit: entry.unit,
      source: entry.source,
      status,
      updatedAt: r.updatedAt || new Date().toISOString(),
      confidence,
      explanation: entry.explanation,
      layer: entry.layer,
      trend: r.trend,
    };
  });
}
