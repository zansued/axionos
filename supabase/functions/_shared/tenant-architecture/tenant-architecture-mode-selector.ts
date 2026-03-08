/**
 * Tenant Architecture Mode Selector — Sprint 47
 * Selects the safest eligible architecture mode for a given scope.
 */

export interface ModeCandidate {
  mode_key: string;
  mode_name: string;
  mode_scope: string;
  status: string;
  activation_mode: string;
  allowed_envelope: Record<string, unknown>;
  anti_fragmentation_constraints: Record<string, unknown>;
}

export interface ModeSelectionContext {
  organization_id: string;
  workspace_id?: string;
  context_class?: string;
  architecture_fitness_score?: number;
  rollout_density?: number;
  stability_pressure?: number;
  retrieval_intensity?: number;
  observability_readiness?: number;
  strategy_churn?: number;
  migration_activity?: number;
  tenant_sensitivity?: number;
}

export interface ModeSelectionResult {
  selected_mode: ModeCandidate | null;
  fallback_mode: ModeCandidate | null;
  scope_ref: Record<string, unknown>;
  confidence_score: number;
  rationale_codes: string[];
  evidence_refs: string[];
}

const DEFAULT_MODE_KEY = "balanced_default_architecture";

export function selectTenantArchitectureMode(
  candidates: ModeCandidate[],
  preferences: Array<{ preferred_mode_refs: Array<{ mode_key: string; weight?: number }>; status: string }>,
  ctx: ModeSelectionContext,
): ModeSelectionResult {
  const reasons: string[] = [];
  const evidence: string[] = [];

  const activeCandidates = candidates.filter((c) => c.status === "active");
  if (activeCandidates.length === 0) {
    reasons.push("no_active_modes_available");
    return { selected_mode: null, fallback_mode: null, scope_ref: { organization_id: ctx.organization_id }, confidence_score: 0, rationale_codes: reasons, evidence_refs: evidence };
  }

  const fallback = activeCandidates.find((c) => c.mode_key === DEFAULT_MODE_KEY) || activeCandidates[0];

  // Filter by scope eligibility
  const eligible = activeCandidates.filter((c) => {
    if (c.mode_scope === "global") return true;
    if (c.mode_scope === "organization") return true;
    if (c.mode_scope === "workspace" && ctx.workspace_id) return true;
    if (c.mode_scope === "context_class" && ctx.context_class) return true;
    return false;
  });

  if (eligible.length === 0) {
    reasons.push("no_scope_eligible_modes");
    return { selected_mode: fallback, fallback_mode: fallback, scope_ref: { organization_id: ctx.organization_id }, confidence_score: 0.3, rationale_codes: reasons, evidence_refs: evidence };
  }

  // Score each eligible mode
  const activePrefs = preferences.filter((p) => p.status === "active");
  const scored = eligible.map((mode) => {
    let score = 0.5;

    // Preference boost
    for (const pref of activePrefs) {
      const match = pref.preferred_mode_refs.find((r) => r.mode_key === mode.mode_key);
      if (match) {
        score += 0.2 * (match.weight || 1);
        evidence.push(`preference_match_${mode.mode_key}`);
      }
    }

    // Stability pressure penalizes aggressive modes
    if (ctx.stability_pressure && ctx.stability_pressure > 0.7) {
      if (mode.mode_key.includes("growth") || mode.mode_key.includes("latency")) {
        score -= 0.15;
        reasons.push(`stability_pressure_penalizes_${mode.mode_key}`);
      }
    }

    // Fitness boost for conservative modes under low fitness
    if (ctx.architecture_fitness_score !== undefined && ctx.architecture_fitness_score < 0.5) {
      if (mode.mode_key.includes("conservative") || mode.mode_key.includes("hardened")) {
        score += 0.1;
        evidence.push("low_fitness_favors_conservative");
      }
    }

    // Migration activity favors conservative
    if (ctx.migration_activity && ctx.migration_activity > 0.6) {
      if (mode.mode_key.includes("conservative")) {
        score += 0.1;
      }
    }

    return { mode, score: Math.max(0, Math.min(1, score)) };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  reasons.push(`selected_${best.mode.mode_key}_score_${best.score.toFixed(2)}`);

  return {
    selected_mode: best.mode,
    fallback_mode: fallback,
    scope_ref: { organization_id: ctx.organization_id, workspace_id: ctx.workspace_id, context_class: ctx.context_class },
    confidence_score: best.score,
    rationale_codes: reasons,
    evidence_refs: evidence,
  };
}
