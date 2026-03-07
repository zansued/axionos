// Cross-Stage Policy Synthesizer — AxionOS Sprint 26
// Detects cross-stage patterns and synthesizes bounded policy candidates.

export interface CrossStageEdge {
  id: string;
  from_stage_key: string;
  to_stage_key: string;
  relationship_type: string;
  support_count: number;
  confidence_score: number;
  impact_score: number;
  evidence_refs: any[];
  status: string;
}

export interface SynthesizedPolicyCandidate {
  policy_type: string;
  policy_scope: string;
  affected_stages: string[];
  trigger_signature: string;
  policy_payload: Record<string, unknown>;
  confidence_score: number;
  support_count: number;
  evidence_refs: any[];
  action_mode: string;
}

// Thresholds
const MIN_SUPPORT_FOR_SYNTHESIS = 3;
const MIN_CONFIDENCE_FOR_SYNTHESIS = 0.3;
const MIN_IMPACT_FOR_SYNTHESIS = 0.2;
const HIGH_CONFIDENCE_THRESHOLD = 0.7;
const BROAD_SCOPE_MIN_CONFIDENCE = 0.6;

const VALID_RELATIONSHIP_TYPES = new Set([
  "failure_propagation", "success_dependency", "retry_correlation",
  "cost_amplification", "validation_cascade", "repair_influence",
]);

const RELATIONSHIP_TO_POLICY: Record<string, string> = {
  failure_propagation: "repair_preemption",
  success_dependency: "strategy_coordination",
  retry_correlation: "prompt_coordination",
  cost_amplification: "validation_guard",
  validation_cascade: "validation_guard",
  repair_influence: "context_enrichment",
};

/**
 * Synthesize cross-stage policy candidates from learning edges.
 * Pure function — no DB calls.
 */
export function synthesizePolicies(edges: CrossStageEdge[]): SynthesizedPolicyCandidate[] {
  const candidates: SynthesizedPolicyCandidate[] = [];

  // Filter valid, active edges with sufficient support
  const validEdges = edges.filter(e =>
    e.status === "active" &&
    VALID_RELATIONSHIP_TYPES.has(e.relationship_type) &&
    e.support_count >= MIN_SUPPORT_FOR_SYNTHESIS &&
    e.confidence_score >= MIN_CONFIDENCE_FOR_SYNTHESIS &&
    e.impact_score >= MIN_IMPACT_FOR_SYNTHESIS
  );

  // Group edges by relationship_type + stage pair for deterministic synthesis
  const grouped = new Map<string, CrossStageEdge[]>();
  for (const edge of validEdges) {
    const key = `${edge.relationship_type}::${edge.from_stage_key}::${edge.to_stage_key}`;
    const group = grouped.get(key) || [];
    group.push(edge);
    grouped.set(key, group);
  }

  for (const [key, group] of grouped) {
    const representative = group[0];
    const totalSupport = group.reduce((s, e) => s + e.support_count, 0);
    const avgConfidence = group.reduce((s, e) => s + e.confidence_score, 0) / group.length;
    const avgImpact = group.reduce((s, e) => s + e.impact_score, 0) / group.length;

    const affectedStages = [representative.from_stage_key, representative.to_stage_key];
    const isWide = affectedStages.length > 2;

    // Broad scope policies require higher confidence
    if (isWide && avgConfidence < BROAD_SCOPE_MIN_CONFIDENCE) continue;

    const policyType = RELATIONSHIP_TO_POLICY[representative.relationship_type] || "context_enrichment";
    const actionMode = avgConfidence >= HIGH_CONFIDENCE_THRESHOLD ? "bounded_auto_safe" : "advisory_only";

    candidates.push({
      policy_type: policyType,
      policy_scope: isWide ? "stage_group" : "stage_pair",
      affected_stages: affectedStages,
      trigger_signature: key,
      policy_payload: {
        relationship_type: representative.relationship_type,
        from_stage: representative.from_stage_key,
        to_stage: representative.to_stage_key,
        avg_impact: avgImpact,
        recommendation: buildRecommendation(policyType, representative),
      },
      confidence_score: Math.min(avgConfidence, 0.95),
      support_count: totalSupport,
      evidence_refs: group.flatMap(e => e.evidence_refs || []),
      action_mode: actionMode,
    });
  }

  return candidates.sort((a, b) => b.confidence_score - a.confidence_score);
}

function buildRecommendation(policyType: string, edge: CrossStageEdge): string {
  switch (policyType) {
    case "repair_preemption":
      return `Preempt repair in ${edge.to_stage_key} by addressing failure patterns from ${edge.from_stage_key}`;
    case "strategy_coordination":
      return `Coordinate strategy between ${edge.from_stage_key} and ${edge.to_stage_key} for improved outcomes`;
    case "prompt_coordination":
      return `Coordinate prompt variants between ${edge.from_stage_key} and ${edge.to_stage_key} to reduce retries`;
    case "validation_guard":
      return `Add validation guard between ${edge.from_stage_key} and ${edge.to_stage_key} to catch issues earlier`;
    case "context_enrichment":
      return `Enrich context from ${edge.from_stage_key} for use in ${edge.to_stage_key}`;
    default:
      return `Apply cross-stage coordination between ${edge.from_stage_key} and ${edge.to_stage_key}`;
  }
}

/**
 * Check if a pattern is strong enough for synthesis.
 */
export function isPatternStrong(edge: CrossStageEdge): boolean {
  return (
    edge.support_count >= MIN_SUPPORT_FOR_SYNTHESIS &&
    edge.confidence_score >= MIN_CONFIDENCE_FOR_SYNTHESIS &&
    edge.impact_score >= MIN_IMPACT_FOR_SYNTHESIS &&
    edge.status === "active"
  );
}

/**
 * Reject contradictory patterns: same stages, opposite effects.
 */
export function filterContradictions(edges: CrossStageEdge[]): CrossStageEdge[] {
  const pairMap = new Map<string, CrossStageEdge[]>();
  for (const e of edges) {
    const pairKey = `${e.from_stage_key}::${e.to_stage_key}`;
    const group = pairMap.get(pairKey) || [];
    group.push(e);
    pairMap.set(pairKey, group);
  }

  const result: CrossStageEdge[] = [];
  for (const [, group] of pairMap) {
    const hasSuccess = group.some(e => e.relationship_type === "success_dependency");
    const hasFailure = group.some(e => e.relationship_type === "failure_propagation");
    if (hasSuccess && hasFailure) {
      // Keep only the one with higher support
      const sorted = group.sort((a, b) => b.support_count - a.support_count);
      result.push(sorted[0]);
    } else {
      result.push(...group);
    }
  }
  return result;
}
