/**
 * Autonomous Change Orchestrator — Sprint 45
 * Aggregates normalized change opportunities, prioritizes, resolves conflicts,
 * identifies sequencing dependencies, and generates a bounded change agenda.
 * Pure functions. No DB access.
 */

import type { NormalizedChangeOpportunity } from "./change-opportunity-normalizer.ts";

export interface ChangeAgenda {
  agenda_name: string;
  agenda_scope: string;
  prioritized_queue: PrioritizedItem[];
  deferred_items: DeferredItem[];
  suppressed_items: SuppressedItem[];
  bundled_items: BundledGroup[];
  sequencing_graph: SequencingEdge[];
  orchestration_rationale: string[];
}

export interface PrioritizedItem {
  signal_id: string;
  priority_rank: number;
  composite_score: number;
  change_type: string;
  scope: string;
}

export interface DeferredItem {
  signal_id: string;
  reason: string;
}

export interface SuppressedItem {
  signal_id: string;
  reason: string;
}

export interface BundledGroup {
  group_id: string;
  signal_ids: string[];
  bundle_reason: string;
}

export interface SequencingEdge {
  from_signal_id: string;
  to_signal_id: string;
  dependency_type: string;
}

export function orchestrateAgenda(
  opportunities: NormalizedChangeOpportunity[],
  options: { max_queue_size?: number; scope?: string } = {}
): ChangeAgenda {
  const maxQueue = options.max_queue_size || 20;
  const scope = options.scope || "global";
  const rationale: string[] = [];

  if (opportunities.length === 0) {
    return {
      agenda_name: `Change Agenda — ${scope}`,
      agenda_scope: scope,
      prioritized_queue: [],
      deferred_items: [],
      suppressed_items: [],
      bundled_items: [],
      sequencing_graph: [],
      orchestration_rationale: ["No change opportunities to orchestrate"],
    };
  }

  // Score and sort
  const scored = opportunities.map((o) => ({
    ...o,
    composite: o.urgency_score * 0.35 + o.expected_value_score * 0.35 + (1 - o.risk_score) * 0.3,
  }));
  scored.sort((a, b) => b.composite - a.composite);

  // Build sequencing graph from dependency_refs
  const sequencing: SequencingEdge[] = [];
  for (const opp of scored) {
    for (const dep of opp.dependency_refs) {
      if (scored.some((s) => s.signal_id === dep)) {
        sequencing.push({ from_signal_id: dep, to_signal_id: opp.signal_id, dependency_type: "prerequisite" });
      }
    }
  }

  // Bundle opportunities with same scope + type
  const bundleMap = new Map<string, string[]>();
  for (const opp of scored) {
    const key = `${opp.affected_scope}::${opp.normalized_change_type}`;
    const existing = bundleMap.get(key) || [];
    existing.push(opp.signal_id);
    bundleMap.set(key, existing);
  }
  const bundled: BundledGroup[] = [];
  for (const [key, ids] of bundleMap) {
    if (ids.length > 1) {
      bundled.push({ group_id: `bundle-${key}`, signal_ids: ids, bundle_reason: `Same scope and change type: ${key}` });
    }
  }
  if (bundled.length > 0) rationale.push(`Bundled ${bundled.length} groups of related changes`);

  // Suppress low-value items
  const suppressed: SuppressedItem[] = [];
  const deferred: DeferredItem[] = [];
  const active: typeof scored = [];

  for (const item of scored) {
    if (item.composite < 0.2) {
      suppressed.push({ signal_id: item.signal_id, reason: "Composite score below threshold (0.2)" });
    } else if (active.length >= maxQueue) {
      deferred.push({ signal_id: item.signal_id, reason: "Exceeds max queue capacity" });
    } else {
      active.push(item);
    }
  }

  if (suppressed.length > 0) rationale.push(`Suppressed ${suppressed.length} low-value items`);
  if (deferred.length > 0) rationale.push(`Deferred ${deferred.length} items due to capacity`);
  rationale.push(`Prioritized ${active.length} change opportunities`);

  const prioritized: PrioritizedItem[] = active.map((item, idx) => ({
    signal_id: item.signal_id,
    priority_rank: idx + 1,
    composite_score: Math.round(item.composite * 100) / 100,
    change_type: item.normalized_change_type,
    scope: item.affected_scope,
  }));

  return {
    agenda_name: `Change Agenda — ${scope}`,
    agenda_scope: scope,
    prioritized_queue: prioritized,
    deferred_items: deferred,
    suppressed_items: suppressed,
    bundled_items: bundled,
    sequencing_graph: sequencing,
    orchestration_rationale: rationale,
  };
}
