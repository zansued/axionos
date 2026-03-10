/**
 * External Knowledge Explainer — Sprint 118
 * Provides human-readable explanations for canon evolution decisions.
 */

export interface CanonChangeExplanation {
  title: string;
  what_changed: string;
  why: string;
  impact: string;
  lineage: string;
  governance_posture: string;
}

export function explainCanonChange(params: {
  change_type: string;
  candidate_title: string;
  decision: string;
  reasons: string[];
  conflict_count: number;
  trial_outcome?: string;
  superseded_entry?: string;
}): CanonChangeExplanation {
  const { change_type, candidate_title, decision, reasons, conflict_count, trial_outcome, superseded_entry } = params;

  const what = change_type === "addition"
    ? `New knowledge '${candidate_title}' proposed for canon addition.`
    : change_type === "supersession"
      ? `'${candidate_title}' proposed to supersede existing entry${superseded_entry ? ` '${superseded_entry}'` : ""}.`
      : `Canon change proposed for '${candidate_title}'.`;

  const why = reasons.length > 0 ? reasons.join("; ") : "No specific reasons recorded.";

  const impact = conflict_count > 0
    ? `${conflict_count} conflict(s) detected with existing canon entries.`
    : "No conflicts with existing canon.";

  const lineage = superseded_entry
    ? `Supersedes: ${superseded_entry}. Full lineage preserved in audit trail.`
    : "New entry. No supersession chain.";

  const governance = decision === "promote"
    ? "Promoted to canon after review and/or trial."
    : decision === "reject"
      ? "Rejected. Entry will not enter canon."
      : decision === "sandbox"
        ? "Sandboxed for experimental use. Not yet canon-approved."
        : "Pending decision. Awaiting review or trial completion.";

  return {
    title: `Canon Change: ${candidate_title}`,
    what_changed: what,
    why,
    impact,
    lineage,
    governance_posture: governance,
  };
}

export function explainCanonEvolutionProcess(): Record<string, string> {
  return {
    purpose: "External Knowledge Intake governs how outside practices enter the implementation canon.",
    intake: "Candidates are registered with source provenance, normalized, and queued for review.",
    review: "Reviewers evaluate relevance, quality, and conflict with existing canon.",
    trial: "Promising candidates undergo bounded trials before promotion.",
    promotion: "Only candidates with sufficient evidence and review consensus become canon.",
    rejection: "Rejected candidates are preserved with reasons for future reference.",
    lineage: "All canon changes preserve supersession chains and audit trails.",
    principle: "No external practice becomes canon by mere ingestion. Evidence and governance are required.",
  };
}
