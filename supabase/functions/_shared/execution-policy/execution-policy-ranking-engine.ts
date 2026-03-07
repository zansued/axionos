// Execution Policy Ranking Engine — Sprint 28
// Deterministic ranking of policies per context class.

import { type PolicyEvaluation } from "./execution-policy-portfolio-evaluator.ts";

export interface RankedPolicy {
  policy_id: string;
  context_class: string;
  rank: number;
  composite_score: number;
  reason_codes: string[];
}

const MIN_SUPPORT_FOR_CONFIDENCE = 5;
const BROAD_SCOPE_PENALTY = 0.05;
const VOLATILE_PENALTY = 0.1;
const HARMFUL_THRESHOLD = 0.2;

/**
 * Rank policies for a specific context class.
 */
export function rankPoliciesForContext(
  evaluations: PolicyEvaluation[],
  contextClass: string,
  policyScopes: Record<string, string>, // policy_id -> scope
): RankedPolicy[] {
  const contextEvals = evaluations.filter((e) => e.context_class === contextClass);
  if (contextEvals.length === 0) return [];

  const scored = contextEvals.map((ev) => {
    let adjustedScore = ev.scores.portfolio_rank;
    const reasons: string[] = [];

    // Penalize low support
    if (ev.sample_size < MIN_SUPPORT_FOR_CONFIDENCE) {
      adjustedScore *= 0.8;
      reasons.push("low_support_penalty");
    }

    // Penalize broad scope with lower confidence
    const scope = policyScopes[ev.policy_id] || "global";
    if (scope === "global" && ev.scores.usefulness_score < 0.7) {
      adjustedScore -= BROAD_SCOPE_PENALTY;
      reasons.push("broad_scope_weak_confidence");
    }

    // Penalize volatile policies (low stability)
    if (ev.scores.stability_score < 0.5) {
      adjustedScore -= VOLATILE_PENALTY;
      reasons.push("volatile_outcomes");
    }

    // Penalize harmful policies
    if (ev.harmful_rate > HARMFUL_THRESHOLD) {
      adjustedScore *= 0.5;
      reasons.push("harmful_outcome_penalty");
    }

    // Prefer narrow high-confidence over broad weak-confidence
    if (scope !== "global" && ev.scores.usefulness_score > 0.7 && ev.sample_size >= MIN_SUPPORT_FOR_CONFIDENCE) {
      adjustedScore += 0.05;
      reasons.push("narrow_high_confidence_boost");
    }

    if (reasons.length === 0) reasons.push("standard_ranking");

    return {
      policy_id: ev.policy_id,
      context_class: contextClass,
      rank: 0,
      composite_score: Math.max(0, Math.min(1, adjustedScore)),
      reason_codes: reasons,
    };
  });

  // Sort descending by composite score
  scored.sort((a, b) => b.composite_score - a.composite_score);

  // Assign ranks
  scored.forEach((s, i) => { s.rank = i + 1; });

  return scored;
}

/**
 * Rank all policies across all context classes.
 */
export function rankAllPolicies(
  evaluations: PolicyEvaluation[],
  policyScopes: Record<string, string>,
): RankedPolicy[] {
  const contextClasses = [...new Set(evaluations.map((e) => e.context_class))];
  const allRanked: RankedPolicy[] = [];

  for (const cc of contextClasses) {
    allRanked.push(...rankPoliciesForContext(evaluations, cc, policyScopes));
  }

  return allRanked;
}

/**
 * Determine if balanced_default should be preserved as safe fallback.
 */
export function isBalancedDefaultProtected(
  rankings: RankedPolicy[],
  balancedDefaultPolicyId: string | null,
): boolean {
  if (!balancedDefaultPolicyId) return false;
  // balanced_default should never be deprecated
  return true;
}
