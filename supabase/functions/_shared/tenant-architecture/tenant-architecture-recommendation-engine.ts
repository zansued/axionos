/**
 * Tenant Architecture Recommendation Engine — Sprint 47
 * Generates recommendations when architecture modes become too fragmented.
 */

export interface RecommendationInput {
  organization_id: string;
  modes: Array<{ mode_key: string; status: string; support_count: number; divergence_score: number }>;
  fragmentation_risk_score: number;
  divergence_drift_score: number;
  outcome_history: Array<{ mode_key: string; outcome_status: string }>;
}

export interface TenantArchRecommendation {
  recommendation_type: string;
  target_scope: string;
  target_entities: Array<{ mode_key: string }>;
  recommendation_reason: Record<string, unknown>;
  confidence_score: number;
  priority_score: number;
}

export function generateRecommendations(input: RecommendationInput): TenantArchRecommendation[] {
  const recs: TenantArchRecommendation[] = [];

  // Deprecate low-value modes
  const lowValue = input.modes.filter((m) => m.status === "active" && m.support_count < 2);
  for (const mode of lowValue) {
    recs.push({
      recommendation_type: "deprecate_low_value_mode",
      target_scope: "organization",
      target_entities: [{ mode_key: mode.mode_key }],
      recommendation_reason: { reason: "low_support_count", support_count: mode.support_count },
      confidence_score: 0.7,
      priority_score: 0.5,
    });
  }

  // High fragmentation → merge
  if (input.fragmentation_risk_score > 0.6) {
    const activeModes = input.modes.filter((m) => m.status === "active");
    if (activeModes.length > 3) {
      recs.push({
        recommendation_type: "merge_modes",
        target_scope: "organization",
        target_entities: activeModes.slice(2).map((m) => ({ mode_key: m.mode_key })),
        recommendation_reason: { reason: "high_fragmentation_risk", score: input.fragmentation_risk_score },
        confidence_score: 0.75,
        priority_score: 0.8,
      });
    }
  }

  // High divergence → return to default
  if (input.divergence_drift_score > 0.7) {
    recs.push({
      recommendation_type: "force_return_to_default",
      target_scope: "organization",
      target_entities: [{ mode_key: "balanced_default_architecture" }],
      recommendation_reason: { reason: "high_divergence_drift", score: input.divergence_drift_score },
      confidence_score: 0.8,
      priority_score: 0.9,
    });
  }

  // Harmful outcomes → tighten or rollback
  const harmfulOutcomes = input.outcome_history.filter((o) => o.outcome_status === "harmful");
  if (harmfulOutcomes.length >= 2) {
    const harmfulModes = [...new Set(harmfulOutcomes.map((o) => o.mode_key))];
    for (const mk of harmfulModes) {
      recs.push({
        recommendation_type: "tighten_override_limits",
        target_scope: "organization",
        target_entities: [{ mode_key: mk }],
        recommendation_reason: { reason: "repeated_harmful_outcomes", count: harmfulOutcomes.filter((o) => o.mode_key === mk).length },
        confidence_score: 0.8,
        priority_score: 0.85,
      });
    }
  }

  return recs;
}
