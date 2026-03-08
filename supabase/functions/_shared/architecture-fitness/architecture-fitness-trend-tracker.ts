/**
 * Architecture Fitness Trend Tracker — Sprint 44
 */

export interface FitnessDataPoint {
  dimension_key: string;
  score: number;
  timestamp: string;
}

export interface FitnessTrend {
  dimension_key: string;
  trend: "improving" | "stable" | "degrading" | "oscillating";
  slope: number;
  data_points: number;
  chronic_weakness: boolean;
}

export function trackFitnessTrend(points: FitnessDataPoint[]): FitnessTrend[] {
  const groups = new Map<string, FitnessDataPoint[]>();
  for (const p of points) {
    const g = groups.get(p.dimension_key) || [];
    g.push(p);
    groups.set(p.dimension_key, g);
  }

  return Array.from(groups.entries()).map(([key, pts]) => {
    const sorted = pts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const n = sorted.length;
    if (n < 2) return { dimension_key: key, trend: "stable" as const, slope: 0, data_points: n, chronic_weakness: sorted[0]?.score < 0.4 };

    // Simple linear regression slope
    const xMean = (n - 1) / 2;
    const yMean = sorted.reduce((s, p) => s + p.score, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (sorted[i].score - yMean);
      den += (i - xMean) ** 2;
    }
    const slope = den !== 0 ? num / den : 0;

    // Detect oscillation
    let dirChanges = 0;
    for (let i = 2; i < n; i++) {
      const prev = sorted[i - 1].score - sorted[i - 2].score;
      const curr = sorted[i].score - sorted[i - 1].score;
      if ((prev > 0 && curr < 0) || (prev < 0 && curr > 0)) dirChanges++;
    }
    const oscillating = dirChanges >= Math.floor(n / 2);

    let trend: "improving" | "stable" | "degrading" | "oscillating" = "stable";
    if (oscillating) trend = "oscillating";
    else if (slope > 0.02) trend = "improving";
    else if (slope < -0.02) trend = "degrading";

    const chronic = sorted.filter(p => p.score < 0.4).length > n * 0.6;

    return { dimension_key: key, trend, slope: Math.round(slope * 10000) / 10000, data_points: n, chronic_weakness: chronic };
  });
}
