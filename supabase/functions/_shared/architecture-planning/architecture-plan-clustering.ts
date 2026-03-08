/**
 * Architecture Plan Clustering — Sprint 39
 * Detects duplicate/near-duplicate plans, merges equivalents, detects conflicts.
 * Pure functions. No DB access.
 */

export interface PlanSummary {
  id: string;
  proposal_id: string;
  plan_name: string;
  target_scope: string;
  status: string;
  created_at: string;
  implementation_risk: string;
}

export interface ClusterResult {
  is_duplicate: boolean;
  duplicate_of: string | null;
  is_stale: boolean;
  conflicting_plans: string[];
  cluster_key: string;
}

export function computeClusterKey(plan: { target_scope: string; proposal_id: string }): string {
  return `${plan.target_scope}::${plan.proposal_id}`;
}

export function detectDuplicatePlan(
  candidate: { target_scope: string; proposal_id: string; plan_name: string },
  existing: PlanSummary[]
): ClusterResult {
  const candidateKey = computeClusterKey(candidate);
  const activePlans = existing.filter((p) => !["rejected", "archived"].includes(p.status));

  // Exact duplicate: same proposal_id and target_scope
  const exactDup = activePlans.find(
    (p) => p.proposal_id === candidate.proposal_id && p.target_scope === candidate.target_scope
  );

  // Conflicting: same target_scope but different proposal
  const conflicts = activePlans
    .filter((p) => p.target_scope === candidate.target_scope && p.proposal_id !== candidate.proposal_id)
    .map((p) => p.id);

  return {
    is_duplicate: !!exactDup,
    duplicate_of: exactDup?.id || null,
    is_stale: false,
    conflicting_plans: conflicts,
    cluster_key: candidateKey,
  };
}

export function identifyStalePlans(plans: PlanSummary[], staleDays: number = 14): string[] {
  const now = Date.now();
  const staleThreshold = staleDays * 24 * 3600 * 1000;
  return plans
    .filter((p) => {
      if (["archived", "rejected"].includes(p.status)) return false;
      const age = now - new Date(p.created_at).getTime();
      return age > staleThreshold && p.status === "draft";
    })
    .map((p) => p.id);
}

export function detectConflictingPlans(plans: PlanSummary[]): Array<{ plan_a: string; plan_b: string; reason: string }> {
  const conflicts: Array<{ plan_a: string; plan_b: string; reason: string }> = [];
  const active = plans.filter((p) => !["rejected", "archived"].includes(p.status));

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      if (active[i].target_scope === active[j].target_scope) {
        conflicts.push({
          plan_a: active[i].id,
          plan_b: active[j].id,
          reason: `Overlapping target scope: ${active[i].target_scope}`,
        });
      }
    }
  }

  return conflicts;
}
