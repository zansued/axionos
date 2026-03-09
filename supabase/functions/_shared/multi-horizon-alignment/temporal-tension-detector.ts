/**
 * temporal-tension-detector.ts
 * Detects conflicts between short, medium, and long-term priorities.
 */

import type { MultiHorizonEvaluation, HorizonScore } from "./multi-horizon-scorer.ts";

export interface TemporalConflict {
  subject_id: string;
  conflict_type: string;
  severity: "low" | "moderate" | "high" | "critical";
  affected_horizons: string[];
  event_summary: string;
  payload: Record<string, unknown>;
}

export function detectTemporalConflicts(evaluation: MultiHorizonEvaluation): TemporalConflict[] {
  const conflicts: TemporalConflict[] = [];
  const scores = evaluation.scores;

  // 1. Short vs Long tension
  const shortLongConflict = detectPairConflict(scores, "short_term", "long_term", evaluation);
  if (shortLongConflict) conflicts.push(shortLongConflict);

  // 2. Short vs Mission tension
  const shortMissionConflict = detectPairConflict(scores, "short_term", "mission_continuity", evaluation);
  if (shortMissionConflict) conflicts.push(shortMissionConflict);

  // 3. Medium vs Long misalignment
  const medLongConflict = detectPairConflict(scores, "medium_term", "long_term", evaluation);
  if (medLongConflict) conflicts.push(medLongConflict);

  // 4. Overall posture-based conflicts
  if (evaluation.overall_posture === "mission_eroding") {
    conflicts.push({
      subject_id: evaluation.subject.id,
      conflict_type: "mission_erosion",
      severity: "critical",
      affected_horizons: ["mission_continuity"],
      event_summary: `Subject "${evaluation.subject.title}" is actively eroding mission continuity.`,
      payload: { posture: evaluation.overall_posture, composite_tension: evaluation.composite_tension },
    });
  }

  // 5. Deferred risk accumulation
  const highDeferredRisk = scores.filter((s) => s.deferred_risk_score > 0.4);
  if (highDeferredRisk.length > 0) {
    conflicts.push({
      subject_id: evaluation.subject.id,
      conflict_type: "deferred_risk_accumulation",
      severity: highDeferredRisk.some((s) => s.deferred_risk_score > 0.6) ? "high" : "moderate",
      affected_horizons: highDeferredRisk.map((s) => s.horizon_type),
      event_summary: `Subject "${evaluation.subject.title}" is deferring significant risk to ${highDeferredRisk.map((s) => s.horizon_type).join(", ")}.`,
      payload: { deferred_scores: highDeferredRisk.map((s) => ({ horizon: s.horizon_type, score: s.deferred_risk_score })) },
    });
  }

  return conflicts;
}

function detectPairConflict(
  scores: HorizonScore[],
  typeA: string,
  typeB: string,
  evaluation: MultiHorizonEvaluation,
): TemporalConflict | null {
  const a = scores.find((s) => s.horizon_type === typeA);
  const b = scores.find((s) => s.horizon_type === typeB);
  if (!a || !b) return null;

  const alignmentGap = a.alignment_score - b.alignment_score;
  const tensionSum = a.tension_score + b.tension_score;

  if (alignmentGap > 0.3 && tensionSum > 0.4) {
    return {
      subject_id: evaluation.subject.id,
      conflict_type: `${typeA}_vs_${typeB}_tension`,
      severity: alignmentGap > 0.5 ? "high" : "moderate",
      affected_horizons: [typeA, typeB],
      event_summary: `"${evaluation.subject.title}" strongly favors ${typeA} (${(a.alignment_score * 100).toFixed(0)}%) while undermining ${typeB} (${(b.alignment_score * 100).toFixed(0)}%).`,
      payload: { alignment_gap: alignmentGap, tension_sum: tensionSum },
    };
  }
  return null;
}
