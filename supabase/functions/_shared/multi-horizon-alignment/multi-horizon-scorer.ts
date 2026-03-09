/**
 * multi-horizon-scorer.ts
 * Scores alignment, support level, and deferred risk across horizons.
 */

import type { StrategicHorizon } from "./horizon-model-resolver.ts";
import type { AlignmentSubject } from "./alignment-subject-mapper.ts";

export interface HorizonScore {
  horizon_id: string;
  horizon_type: string;
  alignment_score: number;    // 0-1: how well subject aligns with this horizon
  tension_score: number;      // 0-1: how much this subject creates tension in this horizon
  deferred_risk_score: number; // 0-1: risk being deferred into this horizon
  support_level: "strong" | "moderate" | "weak" | "unsupported";
}

export interface MultiHorizonEvaluation {
  subject: AlignmentSubject;
  scores: HorizonScore[];
  composite_alignment: number;
  composite_tension: number;
  dominant_horizon: string;
  weakest_horizon: string;
  overall_posture: "balanced" | "short_biased" | "long_unsupported" | "mission_eroding" | "conflicted";
}

/**
 * Deterministic multi-horizon scoring based on subject metadata and horizon weights.
 * In production this would integrate with AI for deeper semantic analysis.
 */
export function scoreSubjectAcrossHorizons(
  subject: AlignmentSubject,
  horizons: StrategicHorizon[],
  weights: Record<string, number>,
): MultiHorizonEvaluation {
  const scores: HorizonScore[] = horizons.map((h) => {
    const baseAlignment = computeBaseAlignment(subject, h);
    const tension = computeTension(subject, h);
    const deferredRisk = computeDeferredRisk(subject, h);
    return {
      horizon_id: h.id,
      horizon_type: h.horizon_type,
      alignment_score: clamp(baseAlignment),
      tension_score: clamp(tension),
      deferred_risk_score: clamp(deferredRisk),
      support_level: classifySupport(baseAlignment, tension),
    };
  });

  const weightedAlignment = scores.reduce((acc, s) => {
    const w = weights[s.horizon_type] ?? 0.25;
    return acc + s.alignment_score * w;
  }, 0);

  const compositeTension = scores.reduce((acc, s) => {
    const w = weights[s.horizon_type] ?? 0.25;
    return acc + s.tension_score * w;
  }, 0);

  const sorted = [...scores].sort((a, b) => b.alignment_score - a.alignment_score);
  const dominant = sorted[0]?.horizon_type ?? "short_term";
  const weakest = sorted[sorted.length - 1]?.horizon_type ?? "mission_continuity";

  return {
    subject,
    scores,
    composite_alignment: clamp(weightedAlignment),
    composite_tension: clamp(compositeTension),
    dominant_horizon: dominant,
    weakest_horizon: weakest,
    overall_posture: classifyPosture(scores, dominant, weakest),
  };
}

function computeBaseAlignment(subject: AlignmentSubject, horizon: StrategicHorizon): number {
  // Heuristic: subject_type affinity to horizon
  const typeAffinity: Record<string, Record<string, number>> = {
    initiative: { short_term: 0.8, medium_term: 0.6, long_term: 0.3, mission_continuity: 0.2 },
    policy: { short_term: 0.3, medium_term: 0.5, long_term: 0.7, mission_continuity: 0.8 },
    plan: { short_term: 0.5, medium_term: 0.7, long_term: 0.6, mission_continuity: 0.4 },
    decision: { short_term: 0.7, medium_term: 0.5, long_term: 0.3, mission_continuity: 0.4 },
    program: { short_term: 0.4, medium_term: 0.7, long_term: 0.6, mission_continuity: 0.5 },
    portfolio: { short_term: 0.3, medium_term: 0.5, long_term: 0.7, mission_continuity: 0.7 },
  };
  const base = typeAffinity[subject.subject_type]?.[horizon.horizon_type] ?? 0.5;
  // Add slight variance from domain
  const domainBoost = subject.domain === "strategy" ? 0.1 : subject.domain === "governance" ? 0.05 : 0;
  return base + domainBoost;
}

function computeTension(subject: AlignmentSubject, horizon: StrategicHorizon): number {
  // Higher tension for short-term-heavy subjects in long horizons
  if (subject.subject_type === "initiative" && (horizon.horizon_type === "long_term" || horizon.horizon_type === "mission_continuity")) {
    return 0.4;
  }
  if (subject.subject_type === "decision" && horizon.horizon_type === "mission_continuity") {
    return 0.35;
  }
  return 0.1;
}

function computeDeferredRisk(subject: AlignmentSubject, horizon: StrategicHorizon): number {
  // Short-term actions defer risk to longer horizons
  if (subject.subject_type === "initiative" && horizon.horizon_type === "long_term") return 0.45;
  if (subject.subject_type === "decision" && horizon.horizon_type === "long_term") return 0.35;
  if (horizon.horizon_type === "mission_continuity") return 0.25;
  return 0.05;
}

function classifySupport(alignment: number, tension: number): "strong" | "moderate" | "weak" | "unsupported" {
  const net = alignment - tension;
  if (net >= 0.6) return "strong";
  if (net >= 0.35) return "moderate";
  if (net >= 0.15) return "weak";
  return "unsupported";
}

function classifyPosture(
  scores: HorizonScore[],
  dominant: string,
  weakest: string,
): "balanced" | "short_biased" | "long_unsupported" | "mission_eroding" | "conflicted" {
  const shortScore = scores.find((s) => s.horizon_type === "short_term");
  const longScore = scores.find((s) => s.horizon_type === "long_term");
  const missionScore = scores.find((s) => s.horizon_type === "mission_continuity");

  if (missionScore && missionScore.tension_score > 0.5) return "mission_eroding";
  if (longScore && longScore.support_level === "unsupported") return "long_unsupported";
  if (dominant === "short_term" && shortScore && shortScore.alignment_score > 0.7) return "short_biased";

  const tensions = scores.filter((s) => s.tension_score > 0.3);
  if (tensions.length >= 2) return "conflicted";

  return "balanced";
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}
