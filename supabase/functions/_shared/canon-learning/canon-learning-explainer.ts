/**
 * Canon Learning Explainer — Sprint 142
 * Human-readable explanations for operational learning artifacts.
 */

export interface LearningExplanation {
  title: string;
  what: string;
  why: string;
  confidence_note: string;
  governance_posture: string;
}

export function explainLearningCandidate(candidate: Record<string, any>): LearningExplanation {
  const conf = candidate.confidence_score || 0;

  return {
    title: candidate.title || "Untitled Candidate",
    what: `This learning candidate was generated from ${candidate.signal_count || 0} operational signals of type "${candidate.source_type || "unknown"}". It proposes a "${candidate.proposed_practice_type || "best_practice"}" for domain "${candidate.proposed_domain || "general"}".`,
    why: `The system detected recurring patterns in operational data that suggest reusable guidance. ${candidate.summary || ""}`,
    confidence_note: conf >= 70
      ? `High confidence (${conf}%) — strong evidence supports this candidate.`
      : conf >= 40
        ? `Moderate confidence (${conf}%) — additional evidence may strengthen this candidate.`
        : `Low confidence (${conf}%) — this candidate needs more operational evidence before consideration.`,
    governance_posture: candidate.noise_suppressed
      ? "This candidate has been suppressed due to noise filtering and will not enter the evolution queue."
      : candidate.review_status === "approved"
        ? "This candidate has been approved by a steward and is eligible for canon promotion."
        : "This candidate awaits steward review. It cannot become canon without governance approval.",
  };
}

export function explainPattern(pattern: Record<string, any>, type: string): string {
  const count = pattern.occurrence_count || 0;
  const name = pattern.pattern_name || pattern.pattern_signature || "Unknown";
  switch (type) {
    case "failure":
      return `Failure pattern "${name}" detected ${count} time(s). Severity: ${pattern.severity || "unknown"}. ${pattern.pattern_description || ""}`;
    case "success":
      return `Success pattern "${name}" observed ${count} time(s) with ${pattern.success_rate || 0}% success rate. ${pattern.pattern_description || ""}`;
    case "refactor":
      return `Refactor pattern "${name}" applied ${count} time(s) with ${pattern.success_rate || 0}% success. ${pattern.pattern_description || ""}`;
    case "validation":
      return `Validation pattern "${name}" triggered ${count} time(s) with ${pattern.failure_rate || 0}% failure rate. ${pattern.pattern_description || ""}`;
    default:
      return `Pattern "${name}": ${pattern.pattern_description || "No description"}`;
  }
}
