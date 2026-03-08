/**
 * Product Friction Analyzer
 * Detects recurring product friction patterns and clusters.
 */

export interface FrictionSignal {
  id: string;
  product_area: string;
  friction_score: number;
  signal_type: string;
  signal_source: string;
  confidence_score: number;
}

export interface FrictionCluster {
  productArea: string;
  frictionType: string;
  severityScore: number;
  recurrenceCount: number;
  affectedSignalIds: string[];
  trendDirection: string;
}

export function clusterFrictionSignals(signals: FrictionSignal[]): FrictionCluster[] {
  const groups = new Map<string, FrictionSignal[]>();
  for (const s of signals) {
    if (s.friction_score <= 0) continue;
    const key = s.product_area || 'unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  const clusters: FrictionCluster[] = [];
  for (const [area, sigs] of groups) {
    if (sigs.length < 2) continue;
    const avgFriction = sigs.reduce((s, x) => s + x.friction_score, 0) / sigs.length;
    const sorted = sigs.sort((a, b) => a.friction_score - b.friction_score);
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    const avgFirst = firstHalf.length > 0 ? firstHalf.reduce((s, x) => s + x.friction_score, 0) / firstHalf.length : 0;
    const avgSecond = secondHalf.length > 0 ? secondHalf.reduce((s, x) => s + x.friction_score, 0) / secondHalf.length : 0;
    const trend = avgSecond > avgFirst * 1.1 ? 'worsening' : avgSecond < avgFirst * 0.9 ? 'improving' : 'stable';

    clusters.push({
      productArea: area,
      frictionType: detectFrictionType(sigs),
      severityScore: Math.round(avgFriction * 100) / 100,
      recurrenceCount: sigs.length,
      affectedSignalIds: sigs.map(s => s.id),
      trendDirection: trend,
    });
  }

  return clusters.sort((a, b) => b.severityScore - a.severityScore);
}

function detectFrictionType(signals: FrictionSignal[]): string {
  const types = signals.map(s => s.signal_type);
  if (types.includes('onboarding')) return 'onboarding';
  if (types.includes('support')) return 'usability';
  if (types.includes('friction')) return 'usability';
  return 'performance';
}
