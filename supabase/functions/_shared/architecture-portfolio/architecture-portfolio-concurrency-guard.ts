/**
 * Architecture Portfolio Concurrency Guard — Sprint 43
 */

export interface ConcurrencyContext {
  active_pilots: number;
  active_migrations: number;
  cumulative_blast_score: number;
  unstable_zones: string[];
  max_concurrent_pilots: number;
  max_concurrent_migrations: number;
}

export interface ConcurrencyDecision {
  allow_new_pilot: boolean;
  allow_new_migration: boolean;
  forced_deferrals: string[];
  rationale: string[];
}

export function evaluateConcurrency(ctx: ConcurrencyContext): ConcurrencyDecision {
  const rationale: string[] = [];
  let allowPilot = true;
  let allowMigration = true;
  const deferrals: string[] = [];

  if (ctx.active_pilots >= ctx.max_concurrent_pilots) {
    allowPilot = false;
    rationale.push(`Pilot limit reached (${ctx.active_pilots}/${ctx.max_concurrent_pilots})`);
    deferrals.push("new_pilots");
  }
  if (ctx.active_migrations >= ctx.max_concurrent_migrations) {
    allowMigration = false;
    rationale.push(`Migration limit reached (${ctx.active_migrations}/${ctx.max_concurrent_migrations})`);
    deferrals.push("new_migrations");
  }
  if (ctx.cumulative_blast_score > 0.7) {
    allowPilot = false;
    allowMigration = false;
    rationale.push("Cumulative blast score exceeds safety threshold");
    deferrals.push("all_new_work");
  }
  if (ctx.unstable_zones.length > 0) {
    rationale.push(`${ctx.unstable_zones.length} unstable zone(s) detected`);
  }
  if (rationale.length === 0) rationale.push("Concurrency within safe limits");

  return { allow_new_pilot: allowPilot, allow_new_migration: allowMigration, forced_deferrals: deferrals, rationale };
}
