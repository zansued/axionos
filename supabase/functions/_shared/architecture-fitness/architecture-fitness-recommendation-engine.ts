/**
 * Architecture Fitness Recommendation Engine — Sprint 44
 */

export interface FitnessRecommendationInput {
  dimension_key: string;
  score: number;
  degradation_status: string;
  trend: string;
  affected_scopes: string[];
  confidence: number;
}

export interface FitnessRecommendation {
  dimension_key: string;
  recommendation_type: string;
  description: string;
  target_scope: string;
  confidence_score: number;
  priority_score: number;
}

export function generateFitnessRecommendations(inputs: FitnessRecommendationInput[]): FitnessRecommendation[] {
  const recs: FitnessRecommendation[] = [];

  for (const i of inputs) {
    if (i.degradation_status === "critical") {
      recs.push({
        dimension_key: i.dimension_key,
        recommendation_type: "urgent_architecture_review",
        description: `Critical fitness degradation in ${i.dimension_key} (score: ${(i.score * 100).toFixed(0)}%)`,
        target_scope: i.affected_scopes[0] || "global",
        confidence_score: i.confidence,
        priority_score: 0.95,
      });
    } else if (i.degradation_status === "degrading") {
      recs.push({
        dimension_key: i.dimension_key,
        recommendation_type: "architecture_review",
        description: `Degrading fitness in ${i.dimension_key} — review recommended`,
        target_scope: i.affected_scopes[0] || "global",
        confidence_score: i.confidence,
        priority_score: 0.7,
      });
    }

    if (i.trend === "degrading" && i.degradation_status !== "critical") {
      recs.push({
        dimension_key: i.dimension_key,
        recommendation_type: "trend_intervention",
        description: `${i.dimension_key} showing downward trend — intervene before critical`,
        target_scope: i.affected_scopes[0] || "global",
        confidence_score: i.confidence * 0.9,
        priority_score: 0.6,
      });
    }

    if (i.trend === "oscillating") {
      recs.push({
        dimension_key: i.dimension_key,
        recommendation_type: "stabilize_dimension",
        description: `${i.dimension_key} oscillating — requires stabilization`,
        target_scope: i.affected_scopes[0] || "global",
        confidence_score: i.confidence * 0.8,
        priority_score: 0.55,
      });
    }
  }

  return recs.sort((a, b) => b.priority_score - a.priority_score);
}
