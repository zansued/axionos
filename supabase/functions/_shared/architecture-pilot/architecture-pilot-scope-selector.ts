/**
 * Architecture Pilot Scope Selector — Sprint 41
 *
 * Selects the safest valid pilot scope from plan/sandbox context.
 * Prefers minimal blast-radius, stable, observable scopes with clear baselines.
 */

export interface PilotScopeCandidate {
  scope_id: string;
  scope_type: string;
  blast_radius_estimate: number; // 0-1
  stability_score: number; // 0-1
  observability_coverage: number; // 0-1
  baseline_comparability: number; // 0-1
  tenant_sensitivity: number; // 0-1
  active_pilot_overlap: boolean;
}

export interface PilotScopeSelection {
  selected_scope: PilotScopeCandidate | null;
  risk_class: "low" | "moderate" | "high" | "critical";
  scope_rationale: string[];
  baseline_comparability_score: number;
  exclusion_reasons: Array<{ scope_id: string; reason: string }>;
}

export function selectPilotScope(
  candidates: PilotScopeCandidate[],
  maxBlastRadius: number = 0.4,
  minStability: number = 0.6,
  minObservability: number = 0.5,
): PilotScopeSelection {
  if (candidates.length === 0) {
    return {
      selected_scope: null,
      risk_class: "critical",
      scope_rationale: ["No scope candidates provided"],
      baseline_comparability_score: 0,
      exclusion_reasons: [],
    };
  }

  const exclusion_reasons: Array<{ scope_id: string; reason: string }> = [];
  const eligible: PilotScopeCandidate[] = [];

  for (const c of candidates) {
    if (c.blast_radius_estimate > maxBlastRadius) {
      exclusion_reasons.push({ scope_id: c.scope_id, reason: `Blast radius ${c.blast_radius_estimate} exceeds max ${maxBlastRadius}` });
      continue;
    }
    if (c.stability_score < minStability) {
      exclusion_reasons.push({ scope_id: c.scope_id, reason: `Stability ${c.stability_score} below min ${minStability}` });
      continue;
    }
    if (c.observability_coverage < minObservability) {
      exclusion_reasons.push({ scope_id: c.scope_id, reason: `Observability ${c.observability_coverage} below min ${minObservability}` });
      continue;
    }
    if (c.active_pilot_overlap) {
      exclusion_reasons.push({ scope_id: c.scope_id, reason: "Overlaps with active pilot" });
      continue;
    }
    eligible.push(c);
  }

  if (eligible.length === 0) {
    return {
      selected_scope: null,
      risk_class: "critical",
      scope_rationale: ["No eligible scopes after filtering"],
      baseline_comparability_score: 0,
      exclusion_reasons,
    };
  }

  // Score: prefer low blast radius, high stability, high observability, high baseline comparability, low tenant sensitivity
  const scored = eligible.map((c) => ({
    candidate: c,
    score:
      (1 - c.blast_radius_estimate) * 0.25 +
      c.stability_score * 0.2 +
      c.observability_coverage * 0.2 +
      c.baseline_comparability * 0.25 +
      (1 - c.tenant_sensitivity) * 0.1,
  }));

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const rationale: string[] = [];

  if (best.candidate.blast_radius_estimate <= 0.2) rationale.push("Minimal blast radius");
  else rationale.push("Moderate blast radius within limits");

  if (best.candidate.stability_score >= 0.8) rationale.push("High stability scope");
  if (best.candidate.observability_coverage >= 0.8) rationale.push("Strong observability coverage");
  if (best.candidate.baseline_comparability >= 0.8) rationale.push("Excellent baseline comparability");

  const riskClass = best.candidate.blast_radius_estimate <= 0.2
    ? "low"
    : best.candidate.blast_radius_estimate <= 0.35
    ? "moderate"
    : "high";

  return {
    selected_scope: best.candidate,
    risk_class: riskClass,
    scope_rationale: rationale,
    baseline_comparability_score: best.candidate.baseline_comparability,
    exclusion_reasons,
  };
}
