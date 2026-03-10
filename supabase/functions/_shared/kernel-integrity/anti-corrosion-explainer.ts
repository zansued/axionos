/**
 * Anti-Corrosion Explainer — Sprint 114
 * Generates structured explanations for kernel integrity posture and recommendations.
 */

export function explainKernelIntegrity() {
  return {
    explanation: "The Kernel Integrity & Anti-Corrosion Guard protects AxionOS from slow-motion architectural death: incoherence, bloat, over-coupling, illegibility, and governance fragility. It detects corrosion before it becomes irreversible.",
    protected_domains: [
      "deterministic_execution_kernel",
      "governance_invariants",
      "approval_boundaries",
      "rollback_guarantees",
      "tenant_isolation",
      "plan_billing_enforcement",
      "hard_safety_constraints",
      "canon_integrity_principles",
    ],
    posture_levels: [
      { posture: "healthy", description: "All kernel domains are intact, governance is enforced, and architecture is proportional" },
      { posture: "stable", description: "Minor signals present but no active degradation" },
      { posture: "degrading", description: "Active corrosion, bloat, or drift detected requiring intervention" },
      { posture: "critical", description: "Kernel identity is at risk. Evolution freeze and extraordinary review required" },
    ],
    action_types: [
      { type: "freeze", description: "Halt all non-essential evolution until resolved" },
      { type: "simplify", description: "Reduce complexity by removing unused or redundant components" },
      { type: "deprecate", description: "Mark inactive modules for removal" },
      { type: "consolidate", description: "Merge overlapping or duplicate capabilities" },
      { type: "extraordinary_review", description: "Require human-led comprehensive review" },
      { type: "monitor", description: "Continue routine observation" },
    ],
    metrics: [
      "legibility_score", "governance_integrity_score", "architectural_coherence_score",
      "bloat_score", "corrosion_score", "existential_drift_score",
      "mutation_pressure_score", "overall_health_score",
    ],
    block_x_summary: "Block X (Sprints 111-114) establishes reflexive governance: propose changes (111), control mutations (112), audit revisions (113), and protect kernel identity (114).",
  };
}

export function explainPosture(posture: string, scores: Record<string, number>): string {
  const parts: string[] = [`Kernel posture: ${posture.toUpperCase()}.`];
  if (scores.corrosion_score > 0.5) parts.push(`Corrosion detected at ${Math.round(scores.corrosion_score * 100)}%.`);
  if (scores.bloat_score > 0.5) parts.push(`Architectural bloat at ${Math.round(scores.bloat_score * 100)}%.`);
  if (scores.existential_drift_score > 0.3) parts.push(`Existential drift at ${Math.round(scores.existential_drift_score * 100)}%.`);
  if (scores.governance_integrity_score < 0.6) parts.push(`Governance integrity weakened to ${Math.round(scores.governance_integrity_score * 100)}%.`);
  if (scores.overall_health_score > 0.7) parts.push("Overall health is within safe parameters.");
  return parts.join(" ");
}
