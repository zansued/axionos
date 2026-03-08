/**
 * Architecture Portfolio Recommendation Engine — Sprint 43
 */

export interface PortfolioState {
  active_members: number;
  conflicting_members: number;
  cumulative_blast_score: number;
  stale_member_count: number;
  concurrent_pilots: number;
  concurrent_migrations: number;
}

export interface PortfolioRecommendation {
  recommendation_type: string;
  description: string;
  confidence_score: number;
  priority_score: number;
}

export function generatePortfolioRecommendations(state: PortfolioState): PortfolioRecommendation[] {
  const recs: PortfolioRecommendation[] = [];

  if (state.conflicting_members > 0) {
    recs.push({
      recommendation_type: "resolve_conflicts",
      description: `${state.conflicting_members} members in conflict — review and consolidate`,
      confidence_score: 0.9,
      priority_score: 0.9,
    });
  }

  if (state.cumulative_blast_score > 0.6) {
    recs.push({
      recommendation_type: "reduce_blast_radius",
      description: `Cumulative blast score ${(state.cumulative_blast_score * 100).toFixed(0)}% — defer low-priority work`,
      confidence_score: 0.85,
      priority_score: 0.85,
    });
  }

  if (state.stale_member_count > 0) {
    recs.push({
      recommendation_type: "archive_stale",
      description: `${state.stale_member_count} stale members — consider archiving`,
      confidence_score: 0.8,
      priority_score: 0.5,
    });
  }

  if (state.concurrent_pilots > 3) {
    recs.push({
      recommendation_type: "limit_pilots",
      description: `${state.concurrent_pilots} concurrent pilots — exceeds recommended limit`,
      confidence_score: 0.8,
      priority_score: 0.7,
    });
  }

  if (state.concurrent_migrations > 2) {
    recs.push({
      recommendation_type: "limit_migrations",
      description: `${state.concurrent_migrations} concurrent migrations — sequence recommended`,
      confidence_score: 0.8,
      priority_score: 0.75,
    });
  }

  return recs.sort((a, b) => b.priority_score - a.priority_score);
}
