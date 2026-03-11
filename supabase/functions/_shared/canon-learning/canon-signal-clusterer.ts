/**
 * Canon Signal Clusterer — Sprint 142
 * Groups raw operational signals by signature for pattern detection.
 */

export interface RawSignal {
  id: string;
  signal_type: string;
  signal_source: string;
  stage_name: string;
  error_signature?: string;
  strategy_used?: string;
  outcome: string;
  outcome_success: boolean;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface SignalCluster {
  cluster_key: string;
  signals: RawSignal[];
  dominant_type: string;
  dominant_outcome: boolean;
  avg_confidence: number;
}

/**
 * Clusters signals by a composite key of signal_type + error_signature (or stage_name).
 * Only clusters with >= minSize signals are returned.
 */
export function clusterSignals(signals: RawSignal[], minSize = 2): SignalCluster[] {
  const groups = new Map<string, RawSignal[]>();

  for (const signal of signals) {
    const key = buildClusterKey(signal);
    const existing = groups.get(key) || [];
    existing.push(signal);
    groups.set(key, existing);
  }

  const clusters: SignalCluster[] = [];
  for (const [key, sigs] of groups) {
    if (sigs.length < minSize) continue;

    const successCount = sigs.filter(s => s.outcome_success).length;
    const avgConf = Math.round(sigs.reduce((a, s) => a + s.confidence, 0) / sigs.length);

    // Determine dominant type by frequency
    const typeCounts = new Map<string, number>();
    for (const s of sigs) {
      typeCounts.set(s.signal_type, (typeCounts.get(s.signal_type) || 0) + 1);
    }
    let dominantType = sigs[0].signal_type;
    let maxCount = 0;
    for (const [t, c] of typeCounts) {
      if (c > maxCount) { dominantType = t; maxCount = c; }
    }

    clusters.push({
      cluster_key: key,
      signals: sigs,
      dominant_type: dominantType,
      dominant_outcome: successCount > sigs.length / 2,
      avg_confidence: avgConf,
    });
  }

  // Sort by size descending
  clusters.sort((a, b) => b.signals.length - a.signals.length);
  return clusters;
}

function buildClusterKey(signal: RawSignal): string {
  const base = signal.error_signature || signal.stage_name || "unknown";
  return `${signal.signal_type}::${base}`;
}
