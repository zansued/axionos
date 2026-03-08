/**
 * Architecture Fitness Signal Aggregator — Sprint 44
 * Aggregates architecture-relevant signals across all layers.
 */

export interface FitnessSignal {
  source_layer: string;
  signal_type: string;
  dimension_key: string;
  value: number;
  scope_ref: string;
  recurrence: number;
  timestamp: string;
}

export interface AggregatedFitnessSignal {
  dimension_key: string;
  signal_count: number;
  average_value: number;
  max_value: number;
  min_value: number;
  recurrence_total: number;
  scope_refs: string[];
  degradation_indicator: boolean;
  source_layers: string[];
}

export function aggregateFitnessSignals(signals: FitnessSignal[]): AggregatedFitnessSignal[] {
  if (!signals.length) return [];

  const groups = new Map<string, FitnessSignal[]>();
  for (const s of signals) {
    const group = groups.get(s.dimension_key) || [];
    group.push(s);
    groups.set(s.dimension_key, group);
  }

  return Array.from(groups.entries()).map(([dimension_key, group]) => {
    const values = group.map(s => s.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const recurrence = group.reduce((a, s) => a + s.recurrence, 0);
    const scopes = [...new Set(group.map(s => s.scope_ref))];
    const layers = [...new Set(group.map(s => s.source_layer))];

    return {
      dimension_key,
      signal_count: group.length,
      average_value: round(avg),
      max_value: Math.max(...values),
      min_value: Math.min(...values),
      recurrence_total: recurrence,
      scope_refs: scopes,
      degradation_indicator: avg < 0.5 || recurrence > 3,
      source_layers: layers,
    };
  });
}

function round(n: number, d = 4): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}
