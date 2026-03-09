/**
 * horizon-recommendation-engine.ts
 * Generates horizon-aware recommendations and rebalance suggestions.
 */

import type { MultiHorizonEvaluation } from "./multi-horizon-scorer.ts";
import type { DeferredRiskAssessment } from "./deferred-risk-evaluator.ts";
import type { TemporalConflict } from "./temporal-tension-detector.ts";

export interface HorizonRecommendation {
  subject_id: string;
  recommendation_type: string;
  target_horizon: string;
  recommendation_summary: string;
  rationale: string;
  tradeoff_note: string;
  priority_level: "low" | "medium" | "high" | "critical";
}

export function generateRecommendations(
  evaluation: MultiHorizonEvaluation,
  risk: DeferredRiskAssessment,
  conflicts: TemporalConflict[],
): HorizonRecommendation[] {
  const recs: HorizonRecommendation[] = [];
  const { subject, scores, overall_posture, weakest_horizon } = evaluation;

  // 1. Rebalance toward weakest horizon
  if (overall_posture !== "balanced") {
    recs.push({
      subject_id: subject.id,
      recommendation_type: "rebalance",
      target_horizon: weakest_horizon,
      recommendation_summary: `Strengthen ${weakest_horizon} alignment for "${subject.title}".`,
      rationale: `Current posture is "${overall_posture}". The ${weakest_horizon} horizon is under-supported.`,
      tradeoff_note: `Rebalancing may reduce short-term velocity but improves long-term coherence.`,
      priority_level: overall_posture === "mission_eroding" ? "critical" : "high",
    });
  }

  // 2. Deferred risk mitigation
  if (risk.risk_band === "high" || risk.risk_band === "critical") {
    recs.push({
      subject_id: subject.id,
      recommendation_type: "deferred_risk_mitigation",
      target_horizon: risk.deferred_to_horizons[0] ?? "long_term",
      recommendation_summary: `Mitigate deferred institutional risk for "${subject.title}".`,
      rationale: risk.explanation,
      tradeoff_note: `Addressing deferred risk now may require allocating resources away from immediate deliverables.`,
      priority_level: risk.risk_band === "critical" ? "critical" : "high",
    });
  }

  // 3. Conflict resolution
  for (const conflict of conflicts) {
    if (conflict.severity === "high" || conflict.severity === "critical") {
      recs.push({
        subject_id: subject.id,
        recommendation_type: "conflict_resolution",
        target_horizon: conflict.affected_horizons[1] ?? conflict.affected_horizons[0] ?? "long_term",
        recommendation_summary: `Resolve ${conflict.conflict_type} affecting "${subject.title}".`,
        rationale: conflict.event_summary,
        tradeoff_note: `Resolution requires explicit prioritization — one horizon's gain is another's constraint.`,
        priority_level: conflict.severity as "high" | "critical",
      });
    }
  }

  // 4. Mission continuity alert
  const missionScore = scores.find((s) => s.horizon_type === "mission_continuity");
  if (missionScore && missionScore.support_level === "unsupported") {
    recs.push({
      subject_id: subject.id,
      recommendation_type: "mission_investment",
      target_horizon: "mission_continuity",
      recommendation_summary: `"${subject.title}" provides zero support for mission continuity.`,
      rationale: `Mission continuity alignment is ${(missionScore.alignment_score * 100).toFixed(0)}% with ${(missionScore.tension_score * 100).toFixed(0)}% tension.`,
      tradeoff_note: `Investing in mission continuity often yields no short-term KPI improvement but prevents identity erosion.`,
      priority_level: "high",
    });
  }

  return recs;
}
