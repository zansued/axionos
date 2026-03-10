/**
 * Source Reliability Assessor — Sprint 118
 * Evaluates external source trustworthiness.
 */

export interface SourceProfile {
  source_type: string;
  total_candidates: number;
  promoted_count: number;
  rejected_count: number;
  conflict_count: number;
  age_days: number;
}

export interface ReliabilityAssessment {
  score: number;
  level: string;
  explanation: string;
}

const TYPE_BASE_SCORES: Record<string, number> = {
  official_docs: 70,
  peer_reviewed: 65,
  industry_standard: 60,
  community: 40,
  blog: 30,
  ai_generated: 20,
  unknown: 10,
};

export function assessSourceReliability(profile: SourceProfile): ReliabilityAssessment {
  let score = TYPE_BASE_SCORES[profile.source_type] || 10;

  if (profile.total_candidates > 0) {
    const promotionRate = profile.promoted_count / profile.total_candidates;
    score += Math.round(promotionRate * 20);
    const rejectionRate = profile.rejected_count / profile.total_candidates;
    score -= Math.round(rejectionRate * 15);
  }

  if (profile.conflict_count > 3) score -= 10;
  if (profile.age_days > 365) score -= 5;

  score = Math.max(0, Math.min(100, score));
  const level = score >= 70 ? "high" : score >= 40 ? "medium" : "low";

  return {
    score,
    level,
    explanation: `Source reliability ${level} (${score}/100). Type: ${profile.source_type}, promotion rate: ${profile.total_candidates > 0 ? Math.round((profile.promoted_count / profile.total_candidates) * 100) : 0}%.`,
  };
}
