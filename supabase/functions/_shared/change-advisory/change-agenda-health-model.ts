/**
 * Change Agenda Health Model — Sprint 45
 * Scores health of the current change agenda.
 * Pure functions. No DB access.
 */

import type { ChangeAgenda } from "./autonomous-change-orchestrator.ts";
import type { ConflictResolutionResult } from "./change-advisory-conflict-resolver.ts";
import type { LoadBalanceResult } from "./change-load-balancer.ts";

export interface AgendaHealthMetrics {
  agenda_coherence_index: number;
  sequencing_validity_index: number;
  change_load_index: number;
  conflict_pressure_index: number;
  readiness_alignment_index: number;
  tenant_safety_index: number;
  fragility_awareness_index: number;
  overall_health_score: number;
}

export function computeAgendaHealth(
  agenda: ChangeAgenda,
  conflicts: ConflictResolutionResult,
  loadBalance: LoadBalanceResult
): AgendaHealthMetrics {
  const queueSize = agenda.prioritized_queue.length;
  const totalItems = queueSize + agenda.deferred_items.length + agenda.suppressed_items.length;

  // Coherence: ratio of active vs total
  const coherence = totalItems > 0 ? queueSize / totalItems : 1;

  // Sequencing validity: no cycles = 1.0
  const seqValidity = agenda.sequencing_graph.length > 0 ? 0.9 : 1.0;

  // Change load
  const changeLoad = 1 - loadBalance.load_score;

  // Conflict pressure
  const conflictPressure = conflicts.conflict_count > 0
    ? Math.max(0, 1 - (conflicts.high_severity_count * 0.3 + conflicts.conflict_count * 0.1))
    : 1;

  // Readiness: based on average composite scores
  const avgComposite = queueSize > 0
    ? agenda.prioritized_queue.reduce((s, i) => s + i.composite_score, 0) / queueSize
    : 0.5;
  const readiness = avgComposite;

  // Tenant safety: assume safe unless overloaded
  const tenantSafety = loadBalance.constrained_scopes.length === 0 ? 1 : Math.max(0.3, 1 - loadBalance.constrained_scopes.length * 0.15);

  // Fragility awareness
  const fragility = agenda.suppressed_items.length > 0 ? 0.9 : 1.0;

  const overall = (coherence + seqValidity + changeLoad + conflictPressure + readiness + tenantSafety + fragility) / 7;

  return {
    agenda_coherence_index: Math.round(coherence * 100) / 100,
    sequencing_validity_index: Math.round(seqValidity * 100) / 100,
    change_load_index: Math.round(changeLoad * 100) / 100,
    conflict_pressure_index: Math.round(conflictPressure * 100) / 100,
    readiness_alignment_index: Math.round(readiness * 100) / 100,
    tenant_safety_index: Math.round(tenantSafety * 100) / 100,
    fragility_awareness_index: Math.round(fragility * 100) / 100,
    overall_health_score: Math.round(overall * 100) / 100,
  };
}
