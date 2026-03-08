/**
 * Cumulative Blast Radius Analyzer — Sprint 43
 */

export interface BlastMember {
  member_id: string;
  blast_radius_weight: number;
  blast_zone: string;
  is_active: boolean;
}

export interface CumulativeBlastResult {
  cumulative_blast_score: number;
  risk_zones: Array<{ zone: string; member_count: number; cumulative_weight: number }>;
  concurrency_limit_recommendation: string;
  stabilization_advice: string[];
}

export function analyzeCumulativeBlast(members: BlastMember[]): CumulativeBlastResult {
  const active = members.filter(m => m.is_active);
  const zoneMap = new Map<string, { count: number; weight: number }>();

  for (const m of active) {
    const z = zoneMap.get(m.blast_zone) || { count: 0, weight: 0 };
    z.count++;
    z.weight += m.blast_radius_weight;
    zoneMap.set(m.blast_zone, z);
  }

  const riskZones = Array.from(zoneMap.entries())
    .map(([zone, data]) => ({ zone, member_count: data.count, cumulative_weight: data.weight }))
    .sort((a, b) => b.cumulative_weight - a.cumulative_weight);

  const totalWeight = active.reduce((s, m) => s + m.blast_radius_weight, 0);
  const cumulative = active.length > 0 ? totalWeight / active.length : 0;

  const advice: string[] = [];
  let concurrency = "normal";

  if (cumulative > 0.7) {
    advice.push("Critical cumulative blast — freeze new architecture work");
    concurrency = "freeze_new";
  } else if (cumulative > 0.5) {
    advice.push("High cumulative blast — limit concurrent migrations");
    concurrency = "limit_concurrent";
  } else if (cumulative > 0.3) {
    advice.push("Moderate cumulative blast — monitor closely");
    concurrency = "monitor";
  }

  for (const z of riskZones) {
    if (z.member_count > 2) advice.push(`Zone "${z.zone}" has ${z.member_count} concurrent changes`);
  }

  if (advice.length === 0) advice.push("Cumulative blast within safe limits");

  return { cumulative_blast_score: Math.round(cumulative * 10000) / 10000, risk_zones: riskZones, concurrency_limit_recommendation: concurrency, stabilization_advice: advice };
}
