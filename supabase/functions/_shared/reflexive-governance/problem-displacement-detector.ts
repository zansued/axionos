/**
 * Problem Displacement Detector — Sprint 113
 * Detects whether a local fix displaced problems to adjacent surfaces.
 */

export interface DisplacementInput {
  affected_surfaces: string[];
  before_metrics: Record<string, number>;
  after_metrics: Record<string, number>;
}

export interface DisplacementSignal {
  displaced_surface: string;
  displacement_type: string;
  severity: number;
  evidence: Record<string, unknown>;
}

export function detectDisplacement(input: DisplacementInput): DisplacementSignal[] {
  const signals: DisplacementSignal[] = [];

  // Group metrics by surface prefix
  const surfaceMetrics: Record<string, { improved: string[]; degraded: string[] }> = {};

  for (const key of Object.keys(input.after_metrics)) {
    const surface = key.split(".")[0] || "general";
    if (!surfaceMetrics[surface]) surfaceMetrics[surface] = { improved: [], degraded: [] };

    const before = input.before_metrics[key] ?? 0;
    const after = input.after_metrics[key] ?? 0;

    const isNegative = key.includes("error") || key.includes("failure") ||
      key.includes("timeout") || key.includes("churn");
    const worsened = isNegative ? after > before + 0.02 : after < before - 0.02;
    const bettered = isNegative ? after < before - 0.02 : after > before + 0.02;

    if (worsened) surfaceMetrics[surface].degraded.push(key);
    if (bettered) surfaceMetrics[surface].improved.push(key);
  }

  // Find surfaces that degraded while not being the primary affected surfaces
  for (const [surface, data] of Object.entries(surfaceMetrics)) {
    const isPrimary = input.affected_surfaces.some(s => surface.includes(s) || s.includes(surface));
    if (!isPrimary && data.degraded.length > 0) {
      const severity = Math.min(1, data.degraded.length * 0.25);
      signals.push({
        displaced_surface: surface,
        displacement_type: data.degraded.length > 2 ? "cascading_degradation" : "adjacent_degradation",
        severity: Math.round(severity * 10000) / 10000,
        evidence: { degraded_metrics: data.degraded },
      });
    }
  }

  return signals;
}
