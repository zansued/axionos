/**
 * Doctrine Drift Detector
 * Detects when local adaptation exceeds acceptable boundaries
 * and calculates drift_risk_score.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AdaptationResult } from "./doctrine-adaptation-engine.ts";

export interface DriftEvent {
  doctrine_id: string;
  context_profile_id: string;
  organization_id: string;
  drift_type: string;
  severity: "low" | "medium" | "high" | "critical";
  drift_summary: string;
  evidence: Record<string, unknown>;
  resolution_status: string;
}

const DRIFT_THRESHOLDS = {
  low: 0.2,
  medium: 0.4,
  high: 0.6,
  critical: 0.8,
};

export function detectDrift(result: AdaptationResult): DriftEvent | null {
  if (result.driftRiskScore < DRIFT_THRESHOLDS.low) return null;

  let severity: DriftEvent["severity"] = "low";
  if (result.driftRiskScore >= DRIFT_THRESHOLDS.critical) severity = "critical";
  else if (result.driftRiskScore >= DRIFT_THRESHOLDS.high) severity = "high";
  else if (result.driftRiskScore >= DRIFT_THRESHOLDS.medium) severity = "medium";

  let driftType = "adaptation_deviation";
  if (result.evaluationResult === "blocked") driftType = "immutability_violation_attempt";
  else if (result.evaluationResult === "conflicting") driftType = "conflicting_adaptation";

  return {
    doctrine_id: result.doctrineId,
    context_profile_id: result.contextProfileId,
    organization_id: "",
    drift_type: driftType,
    severity,
    drift_summary: `Drift detected for doctrine "${result.doctrineName}" in context "${result.contextName}": ${result.adaptationSummary}`,
    evidence: {
      compatibility_score: result.compatibilityScore,
      drift_risk_score: result.driftRiskScore,
      evaluation_result: result.evaluationResult,
      applied_rules_count: result.appliedRules.length,
      blocked_reasons: result.blockedReasons,
    },
    resolution_status: "open",
  };
}

export async function recordDriftEvent(
  client: SupabaseClient,
  event: DriftEvent
): Promise<void> {
  const { error } = await client
    .from("doctrine_drift_events")
    .insert(event);
  if (error) throw error;
}
