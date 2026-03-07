// Execution Policy Conflict Resolver — Sprint 28
// Detects conflicts across policies in the portfolio.

export interface PolicyConflict {
  conflict_type: string;
  policy_ids: string[];
  context_class: string;
  description: string;
  severity: "low" | "medium" | "high";
  recommended_action: string;
}

export interface PolicyProfile {
  id: string;
  policy_name: string;
  policy_mode: string;
  policy_scope: string;
  allowed_adjustments: Record<string, unknown>;
  status: string;
}

export interface PolicyEvalSummary {
  policy_id: string;
  context_class: string;
  usefulness_score: number;
  risk_score: number;
  cost_efficiency_score: number;
  quality_gain_score: number;
  speed_gain_score: number;
  portfolio_rank: number;
  scope: string;
}

/**
 * Detect overlapping policies for the same context class.
 */
export function detectOverlaps(
  entries: PolicyEvalSummary[],
): PolicyConflict[] {
  const conflicts: PolicyConflict[] = [];
  const byContext = groupBy(entries, (e) => e.context_class);

  for (const [contextClass, group] of Object.entries(byContext)) {
    if (group.length <= 1) continue;

    // Find policies with similar ranks (within 0.1 of each other)
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        const rankDiff = Math.abs(a.portfolio_rank - b.portfolio_rank);

        if (rankDiff < 0.1) {
          conflicts.push({
            conflict_type: "overlapping_rank",
            policy_ids: [a.policy_id, b.policy_id],
            context_class: contextClass,
            description: `Policies have nearly identical rankings (diff: ${rankDiff.toFixed(3)}) for context "${contextClass}"`,
            severity: "low",
            recommended_action: "Consider merging or differentiating scope",
          });
        }
      }
    }

    // Broad policy overshadowing narrow policy
    const broadPolicies = group.filter((p) => p.scope === "global");
    const narrowPolicies = group.filter((p) => p.scope !== "global");

    for (const broad of broadPolicies) {
      for (const narrow of narrowPolicies) {
        if (narrow.usefulness_score > broad.usefulness_score && narrow.portfolio_rank < broad.portfolio_rank) {
          // Narrow is better but ranked lower (higher rank number = worse)
          conflicts.push({
            conflict_type: "broad_overshadowing_narrow",
            policy_ids: [broad.policy_id, narrow.policy_id],
            context_class: contextClass,
            description: `Broad policy overshadows better narrow policy for context "${contextClass}"`,
            severity: "medium",
            recommended_action: "Limit broad policy or boost narrow policy priority",
          });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Detect contradictory adjustment sets between policies.
 */
export function detectContradictions(
  profiles: PolicyProfile[],
): PolicyConflict[] {
  const conflicts: PolicyConflict[] = [];
  const active = profiles.filter((p) => p.status === "active");

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];

      // Check if modes are contradictory
      if (areModesContradictory(a.policy_mode, b.policy_mode)) {
        conflicts.push({
          conflict_type: "contradictory_modes",
          policy_ids: [a.id, b.id],
          context_class: "global",
          description: `Policies "${a.policy_name}" (${a.policy_mode}) and "${b.policy_name}" (${b.policy_mode}) have contradictory operating modes`,
          severity: "high",
          recommended_action: "Limit one policy to specific context or deprecate the weaker one",
        });
      }
    }
  }

  return conflicts;
}

/**
 * Detect quality-cost tradeoff conflicts.
 */
export function detectTradeoffConflicts(
  entries: PolicyEvalSummary[],
): PolicyConflict[] {
  const conflicts: PolicyConflict[] = [];

  for (const entry of entries) {
    // Policy is good for quality but bad for cost
    if (entry.quality_gain_score > 0.7 && entry.cost_efficiency_score < 0.3) {
      conflicts.push({
        conflict_type: "quality_cost_tradeoff",
        policy_ids: [entry.policy_id],
        context_class: entry.context_class,
        description: `Policy improves quality (${entry.quality_gain_score.toFixed(2)}) but degrades cost efficiency (${entry.cost_efficiency_score.toFixed(2)})`,
        severity: "medium",
        recommended_action: "Limit to quality-critical contexts only",
      });
    }

    // Policy is good for speed but bad for quality
    if (entry.speed_gain_score > 0.7 && entry.quality_gain_score < 0.3) {
      conflicts.push({
        conflict_type: "speed_quality_tradeoff",
        policy_ids: [entry.policy_id],
        context_class: entry.context_class,
        description: `Policy improves speed (${entry.speed_gain_score.toFixed(2)}) but degrades quality (${entry.quality_gain_score.toFixed(2)})`,
        severity: "medium",
        recommended_action: "Limit to rapid iteration contexts only",
      });
    }
  }

  return conflicts;
}

/**
 * Run all conflict detection.
 */
export function detectAllConflicts(
  entries: PolicyEvalSummary[],
  profiles: PolicyProfile[],
): PolicyConflict[] {
  return [
    ...detectOverlaps(entries),
    ...detectContradictions(profiles),
    ...detectTradeoffConflicts(entries),
  ];
}

// ---- Helpers ----

function areModesContradictory(a: string, b: string): boolean {
  const contradictions: [string, string][] = [
    ["high_quality", "cost_optimized"],
    ["high_quality", "rapid_iteration"],
    ["risk_sensitive", "rapid_iteration"],
    ["deploy_hardened", "rapid_iteration"],
    ["validation_heavy", "cost_optimized"],
  ];

  return contradictions.some(
    ([x, y]) => (a === x && b === y) || (a === y && b === x)
  );
}

function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}
