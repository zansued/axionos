/**
 * Product Opportunity Capacity Scorer — Sprint 55
 * Models bounded capacity pressure for portfolio prioritization.
 */

export interface CapacityContext {
  max_concurrent_promotions: number;
  current_active_count: number;
  promoted_count: number;
  total_items: number;
}

export interface CapacityResult {
  queue_pressure_score: number;
  resource_utilization_score: number;
  capacity_headroom_score: number;
  can_promote: boolean;
  rationale: string[];
}

export function evaluateCapacity(ctx: CapacityContext): CapacityResult {
  const utilization = ctx.max_concurrent_promotions > 0
    ? ctx.current_active_count / ctx.max_concurrent_promotions
    : 1;

  const queuePressure = ctx.total_items > 0
    ? Math.min(1, (ctx.total_items - ctx.promoted_count) / Math.max(ctx.total_items, 1))
    : 0;

  const headroom = Math.max(0, 1 - utilization);
  const canPromote = ctx.current_active_count < ctx.max_concurrent_promotions;

  const rationale: string[] = [];
  if (utilization > 0.9) rationale.push("Near capacity limit — defer non-critical promotions");
  if (utilization > 0.7) rationale.push("Moderate capacity pressure");
  if (queuePressure > 0.8) rationale.push("Large backlog of unprocessed opportunities");
  if (canPromote) rationale.push("Capacity available for promotion");
  if (rationale.length === 0) rationale.push("Capacity within normal bounds");

  return {
    queue_pressure_score: round(queuePressure),
    resource_utilization_score: round(Math.min(1, utilization)),
    capacity_headroom_score: round(headroom),
    can_promote: canPromote,
    rationale,
  };
}

function round(n: number, d = 4): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}
