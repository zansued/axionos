/**
 * Canon Stewardship Router — Sprint 115
 * Routes entries to appropriate stewards based on scope and category.
 */

export interface Steward {
  id: string;
  user_id: string;
  steward_name: string;
  scope: string;
  category_id: string | null;
  assigned_entries_count: number;
}

export interface RoutingResult {
  recommended_steward: Steward | null;
  reason: string;
}

export function routeToSteward(
  entryScope: string,
  entryCategoryId: string | null,
  stewards: Steward[]
): RoutingResult {
  if (stewards.length === 0) return { recommended_steward: null, reason: "No stewards available" };

  // Priority: category match > scope match > least loaded
  if (entryCategoryId) {
    const catMatch = stewards.filter(s => s.category_id === entryCategoryId);
    if (catMatch.length > 0) {
      const best = catMatch.sort((a, b) => a.assigned_entries_count - b.assigned_entries_count)[0];
      return { recommended_steward: best, reason: `Category match: ${best.steward_name}` };
    }
  }

  const scopeMatch = stewards.filter(s => s.scope === entryScope || s.scope === "general");
  if (scopeMatch.length > 0) {
    const best = scopeMatch.sort((a, b) => a.assigned_entries_count - b.assigned_entries_count)[0];
    return { recommended_steward: best, reason: `Scope match: ${best.steward_name}` };
  }

  const best = stewards.sort((a, b) => a.assigned_entries_count - b.assigned_entries_count)[0];
  return { recommended_steward: best, reason: `Least loaded steward: ${best.steward_name}` };
}
