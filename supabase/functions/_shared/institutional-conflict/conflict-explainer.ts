/**
 * Conflict Explainer
 * Generates human-readable explanations of institutional conflicts.
 */

export interface ConflictExplanation {
  whyIsConflict: string;
  whatCollides: string;
  whatIsAtRisk: string;
  possiblePaths: string;
  escalationNeeded: boolean;
  escalationReason: string | null;
}

export function explainConflict(
  conflict: {
    conflict_type: string;
    conflict_title: string;
    conflict_summary: string;
    severity: string;
    urgency: string;
    blast_radius: string;
    involved_domains: any[];
    involved_subjects: any[];
  },
  resolutionPaths: Array<{ path_type: string; path_summary: string; recommended: boolean }>,
  precedentCount: number
): ConflictExplanation {
  const whyIsConflict = `This is classified as a "${conflict.conflict_type}" conflict because: ${conflict.conflict_summary}`;

  const subjects = Array.isArray(conflict.involved_subjects)
    ? conflict.involved_subjects.map((s: any) => `${s.type || "unknown"}:${s.label || s.id || "?"}`).join(", ")
    : "unspecified subjects";
  const whatCollides = `Involved subjects: ${subjects}. Domains: ${Array.isArray(conflict.involved_domains) ? conflict.involved_domains.join(", ") : "unspecified"}.`;

  const whatIsAtRisk = `Severity: ${conflict.severity}. Urgency: ${conflict.urgency}. Blast radius: ${conflict.blast_radius}. ${
    conflict.severity === "critical" ? "Immediate attention required." : conflict.severity === "high" ? "Timely review recommended." : "Monitor and review at next cycle."
  }`;

  const recommended = resolutionPaths.find((p) => p.recommended);
  const possiblePaths = resolutionPaths.length > 0
    ? `${resolutionPaths.length} resolution path(s) available. Recommended: ${recommended?.path_type || "none"} — ${recommended?.path_summary || "N/A"}. ${precedentCount > 0 ? `${precedentCount} precedent(s) found.` : "No precedents found."}`
    : "No resolution paths generated yet.";

  const escalationNeeded = conflict.severity === "critical" || conflict.urgency === "critical";
  const escalationReason = escalationNeeded
    ? `Conflict severity (${conflict.severity}) or urgency (${conflict.urgency}) requires institutional escalation.`
    : null;

  return { whyIsConflict, whatCollides, whatIsAtRisk, possiblePaths, escalationNeeded, escalationReason };
}
