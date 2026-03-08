/**
 * Cross-Layer Instability Correlator — Sprint 46
 * Links instability signals across multiple adaptive and architectural layers.
 * Pure functions. No DB access.
 */

export interface StabilityV2Signal {
  id: string;
  signal_key: string;
  signal_family: string;
  source_layers: string[];
  scope_ref: Record<string, any> | null;
  signal_payload: Record<string, any>;
  severity: "low" | "moderate" | "high" | "critical";
  confidence_score: number | null;
  status: string;
}

export interface InstabilityCluster {
  cluster_id: string;
  affected_layers: string[];
  affected_scopes: string[];
  signal_ids: string[];
  severity: "low" | "moderate" | "high" | "critical";
  conflict_density: number;
  stabilization_priority: number;
  propagation_paths: string[];
}

export interface CorrelationResult {
  clusters: InstabilityCluster[];
  total_signals: number;
  cross_layer_count: number;
  max_severity: string;
}

export function correlateInstability(signals: StabilityV2Signal[]): CorrelationResult {
  if (signals.length === 0) {
    return { clusters: [], total_signals: 0, cross_layer_count: 0, max_severity: "low" };
  }

  // Group by overlapping layers
  const layerMap = new Map<string, StabilityV2Signal[]>();
  for (const sig of signals) {
    for (const layer of sig.source_layers) {
      const list = layerMap.get(layer) || [];
      list.push(sig);
      layerMap.set(layer, list);
    }
  }

  // Find clusters: signals sharing 2+ layers
  const clustered = new Set<string>();
  const clusters: InstabilityCluster[] = [];
  let clusterIdx = 0;

  for (const sig of signals) {
    if (clustered.has(sig.id)) continue;
    const relatedIds = new Set<string>([sig.id]);
    const relatedLayers = new Set<string>(sig.source_layers);
    const relatedScopes = new Set<string>();
    if (sig.scope_ref) relatedScopes.add(JSON.stringify(sig.scope_ref));

    for (const layer of sig.source_layers) {
      for (const other of layerMap.get(layer) || []) {
        if (other.id !== sig.id) {
          relatedIds.add(other.id);
          other.source_layers.forEach((l) => relatedLayers.add(l));
          if (other.scope_ref) relatedScopes.add(JSON.stringify(other.scope_ref));
        }
      }
    }

    if (relatedIds.size > 1) {
      const sigs = signals.filter((s) => relatedIds.has(s.id));
      const severityOrder = { low: 0, moderate: 1, high: 2, critical: 3 };
      const maxSev = sigs.reduce((max, s) => severityOrder[s.severity] > severityOrder[max] ? s.severity : max, "low" as "low" | "moderate" | "high" | "critical");
      const density = relatedLayers.size * relatedIds.size;
      const priority = Math.min(1, density / 20 + severityOrder[maxSev] * 0.2);

      clusters.push({
        cluster_id: `cluster-${clusterIdx++}`,
        affected_layers: [...relatedLayers],
        affected_scopes: [...relatedScopes],
        signal_ids: [...relatedIds],
        severity: maxSev,
        conflict_density: density,
        stabilization_priority: Math.round(priority * 100) / 100,
        propagation_paths: [...relatedLayers].map((l, i, arr) => i < arr.length - 1 ? `${l} → ${arr[i + 1]}` : "").filter(Boolean),
      });
      relatedIds.forEach((id) => clustered.add(id));
    }
  }

  const crossLayerCount = signals.filter((s) => s.source_layers.length > 1).length;
  const severityOrder = { low: 0, moderate: 1, high: 2, critical: 3 };
  const maxSeverity = signals.reduce((max, s) => severityOrder[s.severity] > severityOrder[max as keyof typeof severityOrder] ? s.severity : max, "low");

  return { clusters, total_signals: signals.length, cross_layer_count: crossLayerCount, max_severity: maxSeverity };
}
