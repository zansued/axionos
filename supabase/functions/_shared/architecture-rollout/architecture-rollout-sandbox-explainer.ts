/**
 * Architecture Rollout Sandbox Explainer — Sprint 40
 * Generates structured explanations for sandbox rehearsals.
 * Pure functions. No DB access.
 */

export interface SandboxExplainerInput {
  sandbox_name: string;
  plan_name: string;
  target_scope: string;
  rehearsal_mode: string;
  rehearsal_summary: Record<string, any>;
  fragility_findings: any[];
  readiness_summary: Record<string, any>;
  rollback_viability_summary: Record<string, any>;
  blocked_steps: any[];
  validation_hooks_count: number;
  rollback_hooks_count: number;
}

export interface SandboxExplanation {
  summary: string;
  what_is_rehearsed: string;
  sequence_preview: string;
  fragility_assessment: string;
  validation_coverage: string;
  rollback_viability: string;
  migration_readiness: string;
  blockers: string[];
}

export function explainSandbox(input: SandboxExplainerInput): SandboxExplanation {
  const seqSteps = (input.rehearsal_summary?.staged_sequence as any[]) || [];
  const blockedCount = (input.blocked_steps || []).length;
  const fragilityScore = input.readiness_summary?.fragility_score ?? 0;
  const readinessScore = input.readiness_summary?.migration_readiness_score ?? 0;
  const viabilityScore = input.rollback_viability_summary?.viability_score ?? 0;
  const viabilityStatus = input.rollback_viability_summary?.viability_status || "unknown";

  const summary = `Sandbox "${input.sandbox_name}" rehearses plan "${input.plan_name}" in ${input.rehearsal_mode} mode. ` +
    `${seqSteps.length} migration steps, ${blockedCount} blocked. Readiness: ${Math.round(readinessScore * 100)}%.`;

  const what = `Rehearsing architecture change plan "${input.plan_name}" targeting ${input.target_scope} scope ` +
    `using ${input.rehearsal_mode} rehearsal mode.`;

  const sequence = seqSteps.length > 0
    ? `${seqSteps.length} staged migration steps in activation order. ${blockedCount > 0 ? `${blockedCount} steps blocked due to dependency or forbidden domain issues.` : "No blocked steps."}`
    : "No migration sequence generated.";

  const findings = input.fragility_findings || [];
  const fragility = findings.length > 0
    ? `${findings.length} fragility finding(s) detected. Overall fragility score: ${Math.round(fragilityScore * 100)}%. ` +
      `Top concerns: ${findings.slice(0, 2).map((f: any) => f.fragility_type || f.description).join(", ")}.`
    : "No fragility findings detected.";

  const validation = `${input.validation_hooks_count} validation hook(s) defined. ` +
    `${input.validation_hooks_count === 0 ? "Validation coverage insufficient — hooks required before migration." : "Validation coverage present."}`;

  const rollback = `Rollback viability: ${viabilityStatus} (${Math.round(viabilityScore * 100)}%). ` +
    `${input.rollback_hooks_count} rollback hook(s) defined. ` +
    `${viabilityStatus === "not_viable" ? "Rollback path is not viable — do not proceed." : ""}`;

  const readiness = `Migration readiness score: ${Math.round(readinessScore * 100)}%. ` +
    `Status: ${input.readiness_summary?.migration_readiness_status || "unknown"}. ` +
    `Required review depth: ${input.readiness_summary?.required_review_depth || "standard"}.`;

  const allBlockers: string[] = [];
  if (blockedCount > 0) allBlockers.push(`${blockedCount} blocked migration steps`);
  if (input.validation_hooks_count === 0) allBlockers.push("No validation hooks defined");
  if (viabilityStatus === "not_viable") allBlockers.push("Rollback not viable");
  if (readinessScore < 0.4) allBlockers.push("Readiness score below threshold");

  return {
    summary,
    what_is_rehearsed: what,
    sequence_preview: sequence,
    fragility_assessment: fragility,
    validation_coverage: validation,
    rollback_viability: rollback,
    migration_readiness: readiness,
    blockers: allBlockers,
  };
}
