/**
 * Regression Link Analyzer — Sprint 113
 * Detects whether self-revisions introduced regressions.
 */

import type { OutcomeComparison } from "./self-revision-outcome-comparator.ts";
import type { DisplacementSignal } from "./problem-displacement-detector.ts";

export interface RegressionInput {
  comparison: OutcomeComparison;
  displacement_signals: DisplacementSignal[];
  related_incident_ids: string[];
}

export interface RegressionLink {
  regression_type: string;
  description: string;
  confidence: number;
  evidence_refs: Record<string, unknown>;
}

export function analyzeRegressionLinks(input: RegressionInput): RegressionLink[] {
  const links: RegressionLink[] = [];

  // Check dimension-level regressions
  const degradedDims = input.comparison.dimension_deltas.filter(d => !d.improved && Math.abs(d.delta) > 0.02);

  if (degradedDims.length > 0) {
    links.push({
      regression_type: "metric_regression",
      description: `${degradedDims.length} dimension(s) degraded after revision`,
      confidence: Math.min(1, degradedDims.length * 0.2 + 0.3),
      evidence_refs: { degraded_dimensions: degradedDims.map(d => d.dimension) },
    });
  }

  // Check displacement-linked regressions
  const severeDisplacements = input.displacement_signals.filter(s => s.severity > 0.4);
  if (severeDisplacements.length > 0) {
    links.push({
      regression_type: "displacement_regression",
      description: `${severeDisplacements.length} severe displacement(s) indicate problem redistribution`,
      confidence: Math.min(1, severeDisplacements.reduce((s, d) => s + d.severity, 0) / severeDisplacements.length),
      evidence_refs: { displaced_surfaces: severeDisplacements.map(s => s.displaced_surface) },
    });
  }

  // Related incidents suggest recurrence
  if (input.related_incident_ids.length > 2) {
    links.push({
      regression_type: "recurrence_pattern",
      description: `Revision linked to ${input.related_incident_ids.length} related incidents, suggesting recurrent failure`,
      confidence: Math.min(1, input.related_incident_ids.length * 0.15),
      evidence_refs: { incident_ids: input.related_incident_ids },
    });
  }

  return links;
}
