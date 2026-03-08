/**
 * Adaptive Pressure Analyzer — Sprint 46
 * Measures adaptation pressure across multiple systems.
 * Pure functions. No DB access.
 */

import type { StabilityV2Signal } from "./cross-layer-instability-correlator.ts";

export interface AdaptivePressureResult {
  adaptive_pressure_score: number;
  unstable_zones: string[];
  load_contributors: string[];
  suppression_recommendations: string[];
  within_tolerance: boolean;
}

export function analyzeAdaptivePressure(
  signals: StabilityV2Signal[],
  options: { max_simultaneous?: number; fragility_threshold?: number } = {}
): AdaptivePressureResult {
  const maxSimultaneous = options.max_simultaneous || 8;
  const fragilityThreshold = options.fragility_threshold || 0.7;

  if (signals.length === 0) {
    return { adaptive_pressure_score: 0, unstable_zones: [], load_contributors: [], suppression_recommendations: [], within_tolerance: true };
  }

  const activeSignals = signals.filter((s) => s.status !== "suppressed" && s.status !== "healthy");
  const pressureScore = Math.min(1, activeSignals.length / maxSimultaneous);

  // Unstable zones: scopes with high-severity signals
  const scopeSeverity = new Map<string, number>();
  const sevWeight = { low: 0.1, moderate: 0.3, high: 0.6, critical: 1.0 };
  for (const sig of activeSignals) {
    const scope = sig.scope_ref ? JSON.stringify(sig.scope_ref) : "global";
    scopeSeverity.set(scope, (scopeSeverity.get(scope) || 0) + (sevWeight[sig.severity] || 0.1));
  }

  const unstableZones = [...scopeSeverity.entries()].filter(([, v]) => v >= fragilityThreshold).map(([k]) => k);

  // Load contributors: signal families with most signals
  const familyCounts = new Map<string, number>();
  for (const sig of activeSignals) {
    familyCounts.set(sig.signal_family, (familyCounts.get(sig.signal_family) || 0) + 1);
  }
  const loadContributors = [...familyCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f, c]) => `${f} (${c})`);

  const suppressionRecs: string[] = [];
  if (pressureScore > 0.8) suppressionRecs.push("Suppress low-confidence signals to reduce adaptive pressure");
  if (unstableZones.length > 2) suppressionRecs.push("Freeze adaptation in most fragile zones");
  if (activeSignals.filter((s) => s.severity === "critical").length > 3) suppressionRecs.push("Escalate: critical signal density exceeds safe threshold");

  return {
    adaptive_pressure_score: Math.round(pressureScore * 100) / 100,
    unstable_zones: unstableZones,
    load_contributors: loadContributors,
    suppression_recommendations: suppressionRecs,
    within_tolerance: pressureScore <= 0.6,
  };
}
