/**
 * Canon Review Explainer — Sprint 140
 * Provides human-readable explanations of stewardship workflows.
 */

export function explainStewardship() {
  return {
    purpose: "The Canon Stewardship Workflow governs how candidate knowledge becomes structured canonical intelligence.",
    workflow_stages: [
      "1. Normalization: Entry data is cleaned, typed, and tagged",
      "2. Duplicate Detection: System checks for existing similar entries",
      "3. Conflict Analysis: Contradictions with existing canon are flagged",
      "4. Stewardship Review: Canon steward reviews entry quality and relevance",
      "5. Approval/Rejection: Entry is approved, rejected, or changes requested",
      "6. Supersession: Approved entry may supersede older entries",
      "7. Deprecation: Outdated entries are deprecated with lineage preserved",
    ],
    verdicts: {
      approve: "Entry meets quality and relevance standards for canon inclusion",
      reject: "Entry does not meet standards or is not relevant",
      request_changes: "Entry needs modification before re-review",
      defer: "Decision deferred pending more information or context",
    },
    practice_types: {
      best_practice: "Proven approach recommended for general use",
      implementation_pattern: "Reusable implementation solution",
      architecture_pattern: "Structural design approach",
      template: "Ready-to-use code or configuration template",
      checklist: "Step-by-step verification list",
      anti_pattern: "Known problematic approach to avoid",
      validation_rule: "Automated validation criteria",
      methodology_guideline: "Process or methodology recommendation",
      migration_note: "Guidance for system or version migrations",
    },
    safety: [
      "Candidate knowledge cannot become canon without stewardship review",
      "Deprecated entries are never used by default",
      "Conflicts must be visible and addressed",
      "All canon changes preserve lineage",
      "No entry gains authority beyond guidance without governance alignment",
    ],
  };
}

export function explainReviewVerdict(verdict: string, confidence: number): string {
  const desc: Record<string, string> = {
    approve: `Approved with ${confidence}% confidence. Entry is now part of canonical intelligence.`,
    reject: `Rejected (${confidence}% confidence). Entry did not meet stewardship standards.`,
    request_changes: `Changes requested (${confidence}% confidence). Entry needs revision before re-review.`,
    defer: `Decision deferred (${confidence}% confidence). More context or evidence needed.`,
  };
  return desc[verdict] || `Unknown verdict "${verdict}" with ${confidence}% confidence.`;
}
