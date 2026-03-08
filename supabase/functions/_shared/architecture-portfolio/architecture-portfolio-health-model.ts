/**
 * Architecture Portfolio Health Model — Sprint 43
 */

export interface PortfolioHealthInput {
  total_members: number;
  active_members: number;
  conflicting_members: number;
  cumulative_blast_score: number;
  concurrent_pilots: number;
  concurrent_migrations: number;
  stale_members: number;
  recommendations_open: number;
}

export interface PortfolioHealth {
  portfolio_alignment_index: number;
  cumulative_blast_index: number;
  change_density_index: number;
  conflict_pressure_index: number;
  rollout_concurrency_index: number;
  portfolio_stability_index: number;
  overall_health: "healthy" | "moderate" | "stressed" | "critical";
}

export function computePortfolioHealth(input: PortfolioHealthInput): PortfolioHealth {
  const alignment = input.total_members > 0 ? input.active_members / input.total_members : 1;
  const blast = input.cumulative_blast_score;
  const density = Math.min((input.concurrent_pilots + input.concurrent_migrations) / 5, 1);
  const conflict = input.total_members > 0 ? input.conflicting_members / input.total_members : 0;
  const concurrency = Math.min((input.concurrent_pilots + input.concurrent_migrations) / 6, 1);
  const stability = 1 - (blast * 0.4 + conflict * 0.3 + density * 0.3);

  let overall: "healthy" | "moderate" | "stressed" | "critical" = "healthy";
  if (stability < 0.3) overall = "critical";
  else if (stability < 0.5) overall = "stressed";
  else if (stability < 0.7) overall = "moderate";

  const r = (n: number) => Math.round(n * 10000) / 10000;
  return {
    portfolio_alignment_index: r(alignment),
    cumulative_blast_index: r(blast),
    change_density_index: r(density),
    conflict_pressure_index: r(conflict),
    rollout_concurrency_index: r(concurrency),
    portfolio_stability_index: r(Math.max(0, stability)),
    overall_health: overall,
  };
}
