/**
 * Advantage Lineage Builder — Sprint 122
 * Traces the origin of compounding advantage through system lineage.
 */

export interface LineageLink {
  lineage_type: string;
  source_ref: string;
  target_ref: string;
  contribution_score: number;
}

export interface LineageMap {
  domain: string;
  links: LineageLink[];
  total_contribution: number;
  dominant_source: string;
}

export function buildAdvantageLineage(domain: string, sources: Array<{ type: string; ref: string; score: number }>): LineageMap {
  const links: LineageLink[] = sources.map((s) => ({
    lineage_type: s.type,
    source_ref: s.ref,
    target_ref: domain,
    contribution_score: s.score,
  }));

  const total = links.reduce((sum, l) => sum + l.contribution_score, 0);
  const dominant = links.length > 0 ? links.reduce((a, b) => (a.contribution_score > b.contribution_score ? a : b)).source_ref : "none";

  return { domain, links, total_contribution: Math.round(total * 1000) / 1000, dominant_source: dominant };
}
