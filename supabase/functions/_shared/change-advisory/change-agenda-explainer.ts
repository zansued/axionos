/**
 * Change Agenda Explainability Layer — Sprint 45
 * Explains every aspect of the change agenda.
 * Pure functions. No DB access.
 */

import type { ChangeAgenda } from "./autonomous-change-orchestrator.ts";
import type { ConflictResolutionResult } from "./change-advisory-conflict-resolver.ts";
import type { AgendaHealthMetrics } from "./change-agenda-health-model.ts";

export interface AgendaExplanation {
  agenda_summary: string;
  signals_aggregated: number;
  opportunities_prioritized: number;
  items_deferred: number;
  items_suppressed: number;
  items_bundled: number;
  sequencing_dependencies: number;
  conflicts_detected: number;
  high_severity_conflicts: number;
  health_summary: Record<string, number>;
  orchestration_rationale: string[];
  safety_notes: string[];
  next_steps: string[];
}

export function explainAgenda(
  agenda: ChangeAgenda,
  conflicts: ConflictResolutionResult,
  health: AgendaHealthMetrics
): AgendaExplanation {
  const totalSignals = agenda.prioritized_queue.length + agenda.deferred_items.length + agenda.suppressed_items.length;

  const nextSteps: string[] = [];
  if (conflicts.high_severity_count > 0) nextSteps.push("Resolve high-severity conflicts before proceeding");
  if (agenda.deferred_items.length > 0) nextSteps.push(`Review ${agenda.deferred_items.length} deferred items for re-prioritization`);
  if (health.overall_health_score < 0.5) nextSteps.push("Agenda health is low — consider reducing change density");
  if (agenda.prioritized_queue.length > 0) nextSteps.push("Review top-priority items for execution readiness");

  return {
    agenda_summary: `${agenda.agenda_name}: ${agenda.prioritized_queue.length} prioritized, ${agenda.deferred_items.length} deferred, ${agenda.suppressed_items.length} suppressed`,
    signals_aggregated: totalSignals,
    opportunities_prioritized: agenda.prioritized_queue.length,
    items_deferred: agenda.deferred_items.length,
    items_suppressed: agenda.suppressed_items.length,
    items_bundled: agenda.bundled_items.length,
    sequencing_dependencies: agenda.sequencing_graph.length,
    conflicts_detected: conflicts.conflict_count,
    high_severity_conflicts: conflicts.high_severity_count,
    health_summary: { ...health },
    orchestration_rationale: agenda.orchestration_rationale,
    safety_notes: [
      "Cannot mutate topology directly",
      "Cannot alter governance/billing",
      "All outputs advisory-first",
      "Cannot auto-approve migrations",
      "Cannot auto-execute changes",
    ],
    next_steps: nextSteps,
  };
}
