/**
 * Platform Calibration Proposal Engine — Sprint 31
 *
 * Converts calibration opportunities into structured proposals.
 * Pure functions. No DB access.
 */

import type { CalibrationOpportunity } from "./platform-calibration-signal-interpreter.ts";

export interface CalibrationParameter {
  parameter_key: string;
  current_value: { value: number };
  default_value: { value: number };
  allowed_range: { min: number; max: number };
  calibration_mode: string;
  status: string;
  parameter_scope: string;
  parameter_family: string;
}

export interface CalibrationProposal {
  parameter_key: string;
  scope_ref: Record<string, unknown> | null;
  current_value: { value: number };
  proposed_value: { value: number };
  expected_impact: { summary: string; direction: string };
  rationale_codes: string[];
  evidence_refs: Record<string, unknown>[];
  confidence_score: number;
  proposal_mode: "advisory" | "bounded_auto_candidate";
  rollback_guard: {
    max_observation_window_hours: number;
    harmful_threshold: number;
    auto_rollback_enabled: boolean;
  };
}

const MAX_DELTA = 0.2;
const MIN_CONFIDENCE_FOR_AUTO = 0.6;

export function generateProposals(
  opportunities: CalibrationOpportunity[],
  parameters: CalibrationParameter[],
): CalibrationProposal[] {
  const paramMap = new Map(parameters.map((p) => [p.parameter_key, p]));
  const proposals: CalibrationProposal[] = [];

  for (const opp of opportunities) {
    const param = paramMap.get(opp.parameter_key);
    if (!param) continue;

    // Skip frozen/deprecated
    if (param.status === "frozen" || param.status === "deprecated") continue;

    const currentVal = typeof param.current_value === "object" && "value" in param.current_value
      ? (param.current_value as any).value
      : 0;

    let delta = Math.min(MAX_DELTA, opp.adjustment_magnitude);
    if (opp.adjustment_direction === "decrease") delta = -delta;

    let proposed = currentVal + delta;
    proposed = Math.max(param.allowed_range.min, Math.min(param.allowed_range.max, proposed));

    // Don't propose no-change
    if (Math.abs(proposed - currentVal) < 0.001) continue;

    const isAutoEligible =
      param.calibration_mode === "bounded_auto" &&
      opp.confidence >= MIN_CONFIDENCE_FOR_AUTO &&
      param.status === "active";

    proposals.push({
      parameter_key: opp.parameter_key,
      scope_ref: null,
      current_value: { value: currentVal },
      proposed_value: { value: Math.round(proposed * 1000) / 1000 },
      expected_impact: {
        summary: opp.expected_impact,
        direction: opp.adjustment_direction,
      },
      rationale_codes: opp.rationale_codes,
      evidence_refs: opp.evidence_refs,
      confidence_score: opp.confidence,
      proposal_mode: isAutoEligible ? "bounded_auto_candidate" : "advisory",
      rollback_guard: {
        max_observation_window_hours: 72,
        harmful_threshold: 0.3,
        auto_rollback_enabled: isAutoEligible,
      },
    });
  }

  return proposals;
}
