/**
 * Cross-Layer Assurance Aggregator — Sprint 63
 * Aggregates assurance signals from architecture, product, governance, and ecosystem.
 */

export interface LayerSignal {
  layer: string;
  assurance_score: number;
  stability_score: number;
  evidence_density: number;
}

export interface AggregatedAssurance {
  cross_layer_assurance_score: number;
  weakest_layer: string;
  strongest_layer: string;
  rationale: string[];
}

export function aggregateAssurance(signals: LayerSignal[]): AggregatedAssurance {
  if (signals.length === 0) {
    return { cross_layer_assurance_score: 0, weakest_layer: 'none', strongest_layer: 'none', rationale: ['no_signals'] };
  }

  const rationale: string[] = [];
  let total = 0;
  let weakest = signals[0];
  let strongest = signals[0];

  for (const s of signals) {
    total += s.assurance_score;
    if (s.assurance_score < weakest.assurance_score) weakest = s;
    if (s.assurance_score > strongest.assurance_score) strongest = s;
  }

  const avg = total / signals.length;
  if (weakest.assurance_score < 0.3) rationale.push(`weak_${weakest.layer}`);
  if (avg < 0.5) rationale.push('below_threshold_average');

  return {
    cross_layer_assurance_score: Math.round(avg * 10000) / 10000,
    weakest_layer: weakest.layer,
    strongest_layer: strongest.layer,
    rationale,
  };
}
