/**
 * Cross-Domain Completion Aggregator — Sprint 65
 * Aggregates completion posture across pipeline, architecture, governance, product, ecosystem, assurance, and canon integrity.
 */

export interface DomainScore {
  domain: string;
  score: number;
  weight: number;
}

export interface AggregationResult {
  aggregate_completion_score: number;
  weakest_domain: string;
  strongest_domain: string;
  domain_scores: DomainScore[];
  rationale: string[];
}

export function aggregateCompletion(domains: DomainScore[]): AggregationResult {
  if (domains.length === 0) {
    return { aggregate_completion_score: 0, weakest_domain: 'none', strongest_domain: 'none', domain_scores: [], rationale: ['no_domains_provided'] };
  }

  const totalWeight = domains.reduce((s, d) => s + d.weight, 0);
  const weighted = totalWeight > 0 ? domains.reduce((s, d) => s + d.score * (d.weight / totalWeight), 0) : 0;

  const sorted = [...domains].sort((a, b) => a.score - b.score);
  const rationale: string[] = [];
  if (sorted[0].score < 0.4) rationale.push(`weakest_domain_${sorted[0].domain}_is_critically_low`);
  if (sorted[sorted.length - 1].score > 0.8) rationale.push(`strongest_domain_${sorted[sorted.length - 1].domain}_is_strong`);

  return {
    aggregate_completion_score: Math.round(Math.min(1, weighted) * 10000) / 10000,
    weakest_domain: sorted[0].domain,
    strongest_domain: sorted[sorted.length - 1].domain,
    domain_scores: domains,
    rationale,
  };
}
