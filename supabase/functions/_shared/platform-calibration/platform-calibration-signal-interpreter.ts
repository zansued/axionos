/**
 * Platform Calibration Signal Interpreter — Sprint 31
 *
 * Interprets platform intelligence signals and identifies calibration opportunities.
 * Pure functions. No DB access. No side effects.
 */

export interface CalibrationSignalInput {
  bottleneck_false_positive_rate: number;
  bottleneck_false_negative_rate: number;
  insight_confidence_drift: number;
  recommendation_acceptance_rate: number;
  recommendation_rejection_rate: number;
  health_metric_changes: Record<string, number>;
  policy_effectiveness_drift: number;
  predictive_warning_miss_rate: number;
  tenant_drift_instability: number;
  recommendation_queue_size: number;
  sample_size: number;
}

export interface CalibrationOpportunity {
  parameter_key: string;
  adjustment_direction: "increase" | "decrease";
  adjustment_magnitude: number;
  confidence: number;
  rationale_codes: string[];
  evidence_refs: Record<string, unknown>[];
  expected_impact: string;
}

const MIN_SAMPLE_SIZE = 10;

export function interpretCalibrationSignals(input: CalibrationSignalInput): CalibrationOpportunity[] {
  const opportunities: CalibrationOpportunity[] = [];

  if (input.sample_size < MIN_SAMPLE_SIZE) return opportunities;

  // High false positive rate → lower sensitivity
  if (input.bottleneck_false_positive_rate > 0.3) {
    opportunities.push({
      parameter_key: "bottleneck_severity_threshold",
      adjustment_direction: "increase",
      adjustment_magnitude: Math.min(0.15, input.bottleneck_false_positive_rate * 0.3),
      confidence: computeConfidence(input.sample_size, input.bottleneck_false_positive_rate),
      rationale_codes: ["high_false_positive_rate", "bottleneck_detection_noise"],
      evidence_refs: [{ metric: "bottleneck_false_positive_rate", value: input.bottleneck_false_positive_rate }],
      expected_impact: "Reduce false bottleneck alerts",
    });
  }

  // High false negative rate → raise sensitivity
  if (input.bottleneck_false_negative_rate > 0.25) {
    opportunities.push({
      parameter_key: "bottleneck_severity_threshold",
      adjustment_direction: "decrease",
      adjustment_magnitude: Math.min(0.15, input.bottleneck_false_negative_rate * 0.3),
      confidence: computeConfidence(input.sample_size, input.bottleneck_false_negative_rate),
      rationale_codes: ["high_false_negative_rate", "missed_bottlenecks"],
      evidence_refs: [{ metric: "bottleneck_false_negative_rate", value: input.bottleneck_false_negative_rate }],
      expected_impact: "Catch more real bottlenecks",
    });
  }

  // Insight confidence drift → adjust threshold
  if (Math.abs(input.insight_confidence_drift) > 0.1) {
    opportunities.push({
      parameter_key: "insight_confidence_threshold",
      adjustment_direction: input.insight_confidence_drift > 0 ? "increase" : "decrease",
      adjustment_magnitude: Math.min(0.1, Math.abs(input.insight_confidence_drift) * 0.5),
      confidence: computeConfidence(input.sample_size, Math.abs(input.insight_confidence_drift)),
      rationale_codes: ["insight_confidence_drift"],
      evidence_refs: [{ metric: "insight_confidence_drift", value: input.insight_confidence_drift }],
      expected_impact: "Improve insight relevance",
    });
  }

  // Low recommendation acceptance → raise priority floor
  if (input.recommendation_acceptance_rate < 0.2 && input.recommendation_rejection_rate > 0.5) {
    opportunities.push({
      parameter_key: "recommendation_priority_floor",
      adjustment_direction: "increase",
      adjustment_magnitude: Math.min(0.15, (1 - input.recommendation_acceptance_rate) * 0.2),
      confidence: computeConfidence(input.sample_size, input.recommendation_rejection_rate),
      rationale_codes: ["low_acceptance_rate", "high_rejection_rate"],
      evidence_refs: [
        { metric: "recommendation_acceptance_rate", value: input.recommendation_acceptance_rate },
        { metric: "recommendation_rejection_rate", value: input.recommendation_rejection_rate },
      ],
      expected_impact: "Reduce low-value recommendations",
    });
  }

  // Predictive warning misses → raise sensitivity
  if (input.predictive_warning_miss_rate > 0.2) {
    opportunities.push({
      parameter_key: "predictive_sensitivity_threshold",
      adjustment_direction: "decrease",
      adjustment_magnitude: Math.min(0.1, input.predictive_warning_miss_rate * 0.3),
      confidence: computeConfidence(input.sample_size, input.predictive_warning_miss_rate),
      rationale_codes: ["high_prediction_miss_rate"],
      evidence_refs: [{ metric: "predictive_warning_miss_rate", value: input.predictive_warning_miss_rate }],
      expected_impact: "Catch more predictive signals",
    });
  }

  // Policy effectiveness drift
  if (input.policy_effectiveness_drift < -0.15) {
    opportunities.push({
      parameter_key: "policy_watch_threshold",
      adjustment_direction: "decrease",
      adjustment_magnitude: Math.min(0.1, Math.abs(input.policy_effectiveness_drift) * 0.3),
      confidence: computeConfidence(input.sample_size, Math.abs(input.policy_effectiveness_drift)),
      rationale_codes: ["policy_effectiveness_declining"],
      evidence_refs: [{ metric: "policy_effectiveness_drift", value: input.policy_effectiveness_drift }],
      expected_impact: "Flag declining policies earlier",
    });
  }

  // Tenant drift instability
  if (input.tenant_drift_instability > 0.3) {
    opportunities.push({
      parameter_key: "tenant_drift_sensitivity_threshold",
      adjustment_direction: "increase",
      adjustment_magnitude: Math.min(0.1, input.tenant_drift_instability * 0.2),
      confidence: computeConfidence(input.sample_size, input.tenant_drift_instability),
      rationale_codes: ["tenant_drift_instability"],
      evidence_refs: [{ metric: "tenant_drift_instability", value: input.tenant_drift_instability }],
      expected_impact: "Reduce noisy tenant drift alerts",
    });
  }

  // Recommendation queue overload
  if (input.recommendation_queue_size > 50) {
    opportunities.push({
      parameter_key: "recommendation_priority_floor",
      adjustment_direction: "increase",
      adjustment_magnitude: Math.min(0.1, (input.recommendation_queue_size - 50) * 0.002),
      confidence: 0.6,
      rationale_codes: ["recommendation_queue_overload"],
      evidence_refs: [{ metric: "recommendation_queue_size", value: input.recommendation_queue_size }],
      expected_impact: "Reduce recommendation backlog",
    });
  }

  return opportunities;
}

function computeConfidence(sampleSize: number, signalStrength: number): number {
  let base = 0.3;
  if (sampleSize >= 50) base = 0.85;
  else if (sampleSize >= 30) base = 0.7;
  else if (sampleSize >= 20) base = 0.55;
  else if (sampleSize >= 10) base = 0.4;
  const adjusted = base * (0.5 + Math.min(0.5, signalStrength));
  return Math.round(Math.min(1, Math.max(0, adjusted)) * 1000) / 1000;
}
