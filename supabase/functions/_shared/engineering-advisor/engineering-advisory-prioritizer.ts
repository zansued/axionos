// Engineering Advisory Prioritizer — Sprint 35
// Deterministic prioritization of recommendations.

import { AdvisoryRecommendation } from "./engineering-advisory-recommendation-engine.ts";

export interface PrioritizedRecommendation extends AdvisoryRecommendation {
  final_priority: number;
  priority_rationale: string[];
}

export function prioritizeRecommendations(recommendations: AdvisoryRecommendation[]): PrioritizedRecommendation[] {
  if (!recommendations || recommendations.length === 0) return [];

  return recommendations.map(rec => {
    const rationale: string[] = [];
    let score = rec.priority_score;

    // Safety class boost
    if (rec.safety_class === "high_risk_review") {
      score += 0.15;
      rationale.push("high_risk_boost");
    } else if (rec.safety_class === "medium_risk_review") {
      score += 0.05;
      rationale.push("medium_risk_boost");
    }

    // Confidence boost
    if (rec.confidence_score >= 0.85) {
      score += 0.1;
      rationale.push("high_confidence_boost");
    }

    // Evidence density
    const evidenceCount = Object.keys(rec.evidence_refs || {}).length;
    if (evidenceCount >= 3) {
      score += 0.05;
      rationale.push("dense_evidence_boost");
    }

    const final_priority = Math.round(Math.min(1, score) * 100) / 100;

    return { ...rec, final_priority, priority_rationale: rationale };
  }).sort((a, b) => b.final_priority - a.final_priority);
}
