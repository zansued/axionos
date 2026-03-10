/**
 * Canon Decision Explainer — Sprint 115
 * Generates human-readable explanations for canon entry status and governance decisions.
 */

export function explainCanonGovernance() {
  return {
    explanation: "The Canon Steward & Knowledge Governance Engine manages implementation knowledge as governed objects. Each canon entry has a lifecycle, stewardship, confidence score, and review trail.",
    canon_types: ["pattern", "template", "anti_pattern", "architectural_guideline", "implementation_recipe", "failure_memory", "external_knowledge"],
    lifecycle_states: ["draft", "proposed", "approved", "experimental", "contested", "deprecated", "archived", "superseded"],
    approval_states: ["pending", "under_review", "approved", "rejected", "needs_revision"],
    governance_principles: [
      "No canon entry becomes runtime-relevant unless approved or bounded as experimental",
      "Contested or deprecated entries must not be silently served as default guidance",
      "Lineage must be preserved through supersession links",
      "Stewardship and explainability are mandatory",
      "Governance before retrieval",
    ],
    confidence_factors: ["validation_success", "adoption", "recurrence", "review_quality", "source_quality", "maturity"],
  };
}

export function explainEntryStatus(status: string, confidence: number, reviewCount: number): string {
  const parts: string[] = [];
  parts.push(`Lifecycle: ${status.toUpperCase()}.`);
  parts.push(`Confidence: ${Math.round(confidence * 100)}%.`);
  parts.push(`Reviews: ${reviewCount}.`);

  if (status === "deprecated") parts.push("This entry is deprecated and should not be used for new implementations.");
  if (status === "contested") parts.push("This entry is under dispute. Use with caution.");
  if (status === "experimental") parts.push("This entry is experimental and not yet fully validated.");
  if (status === "approved" && confidence > 0.7) parts.push("This entry is approved with high confidence.");
  if (status === "draft") parts.push("This entry is still in draft and not available for operational use.");

  return parts.join(" ");
}
