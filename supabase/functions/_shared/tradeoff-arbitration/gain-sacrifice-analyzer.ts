/**
 * gain-sacrifice-analyzer.ts
 * Identifies what is gained and what is sacrificed in a tradeoff subject.
 */
import type { TradeoffSubject } from "./tradeoff-subject-mapper.ts";
import type { TradeoffDimension } from "./tradeoff-dimension-resolver.ts";

export interface DimensionImpact {
  dimension_id: string;
  dimension_code: string;
  dimension_name: string;
  impact_score: number; // -1 to 1
  impact_label: string; // "strong_gain" | "moderate_gain" | "neutral" | "moderate_sacrifice" | "severe_sacrifice"
  rationale: string;
}

export interface GainSacrificeAnalysis {
  subject_id: string;
  subject_title: string;
  gains: DimensionImpact[];
  sacrifices: DimensionImpact[];
  neutral: DimensionImpact[];
  net_posture: string; // "net_positive" | "balanced" | "net_sacrifice" | "hidden_sacrifice"
  dominant_gain: string;
  dominant_sacrifice: string;
}

export function analyzeGainSacrifice(
  subject: TradeoffSubject,
  dimensions: TradeoffDimension[],
): GainSacrificeAnalysis {
  const impacts: DimensionImpact[] = dimensions.map((dim) => {
    const score = inferImpactScore(subject, dim);
    return {
      dimension_id: dim.id,
      dimension_code: dim.dimension_code,
      dimension_name: dim.dimension_name,
      impact_score: score,
      impact_label: labelFromScore(score),
      rationale: generateRationale(subject, dim, score),
    };
  });

  const gains = impacts.filter((i) => i.impact_score > 0.15);
  const sacrifices = impacts.filter((i) => i.impact_score < -0.15);
  const neutral = impacts.filter((i) => Math.abs(i.impact_score) <= 0.15);

  const dominantGain = gains.length > 0
    ? gains.reduce((a, b) => (a.impact_score > b.impact_score ? a : b)).dimension_code
    : "none";
  const dominantSacrifice = sacrifices.length > 0
    ? sacrifices.reduce((a, b) => (a.impact_score < b.impact_score ? a : b)).dimension_code
    : "none";

  let netPosture = "balanced";
  const gainSum = gains.reduce((s, g) => s + g.impact_score, 0);
  const sacSum = Math.abs(sacrifices.reduce((s, g) => s + g.impact_score, 0));
  if (gainSum > sacSum * 1.5) netPosture = "net_positive";
  else if (sacSum > gainSum * 1.5) netPosture = "net_sacrifice";
  else if (sacrifices.length > 0 && sacrifices.some((s) => s.impact_label === "severe_sacrifice"))
    netPosture = "hidden_sacrifice";

  return {
    subject_id: subject.id,
    subject_title: subject.title,
    gains,
    sacrifices,
    neutral,
    net_posture: netPosture,
    dominant_gain: dominantGain,
    dominant_sacrifice: dominantSacrifice,
  };
}

function inferImpactScore(subject: TradeoffSubject, dim: TradeoffDimension): number {
  // Heuristic: derive impact from subject metadata
  const ref = subject.subject_ref as Record<string, unknown>;
  const impacts = (ref?.dimension_impacts ?? {}) as Record<string, number>;
  if (impacts[dim.dimension_code] !== undefined) {
    return clamp(impacts[dim.dimension_code], -1, 1);
  }
  // Fallback: type-based heuristic
  const typeHeuristics: Record<string, Record<string, number>> = {
    decision: { speed: 0.3, quality: -0.1, continuity: -0.2 },
    initiative: { quality: 0.4, speed: -0.2, cost: -0.3 },
    policy: { compliance: 0.5, legitimacy: 0.3, speed: -0.3, ux: -0.2 },
    workflow: { speed: 0.4, cost: 0.2, quality: -0.1 },
    exception: { speed: 0.5, compliance: -0.4, legitimacy: -0.3, resilience: -0.2 },
    plan: { continuity: 0.3, mission: 0.2, speed: -0.2 },
  };
  const h = typeHeuristics[subject.subject_type] ?? {};
  return clamp(h[dim.dimension_code] ?? 0, -1, 1);
}

function labelFromScore(score: number): string {
  if (score >= 0.5) return "strong_gain";
  if (score >= 0.15) return "moderate_gain";
  if (score <= -0.5) return "severe_sacrifice";
  if (score <= -0.15) return "moderate_sacrifice";
  return "neutral";
}

function generateRationale(subject: TradeoffSubject, dim: TradeoffDimension, score: number): string {
  const dir = score > 0 ? "supports" : score < 0 ? "compromises" : "does not affect";
  return `Subject "${subject.title}" (${subject.subject_type}) ${dir} ${dim.dimension_name} (${dim.dimension_type}).`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
