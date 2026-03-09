/**
 * Memory Explainer — Sprint 103
 * Explains why a memory object is critical, disposable, protected, or reconstructable.
 */

export interface MemoryExplanation {
  headline: string;
  classification_reason: string;
  retention_posture: string;
  precedent_note: string;
  reconstruction_note: string;
  governance_guidance: string;
}

export function explainMemoryAsset(
  title: string,
  classType: string,
  retentionLevel: string,
  precedentWeight: number,
  currentStatus: string,
  reconstructionRequired: boolean,
  deletionRequiresReview: boolean
): MemoryExplanation {
  const classDescriptions: Record<string, string> = {
    critical: "This memory is classified as critical institutional knowledge — it must not be lost.",
    precedent: "This memory carries institutional precedent weight — it informs future decisions.",
    operational: "This memory supports ongoing operations and should be retained for continuity.",
    temporary: "This memory is temporary and may be expired according to policy.",
    disposable: "This memory is disposable and can be safely removed when no longer needed.",
    reconstructable: "This memory can be reconstructed from source materials if lost.",
  };

  const retentionDescriptions: Record<string, string> = {
    permanent: "Permanent retention — this memory must never be deleted.",
    long_term: "Long-term retention — kept for extended periods, reviewed periodically.",
    bounded: "Bounded retention — retained until its retention deadline, then reviewed.",
    short_term: "Short-term retention — may be archived or expired after a brief period.",
    ephemeral: "Ephemeral — may be cleaned up at any time once no longer active.",
  };

  return {
    headline: `Memory "${title}" — ${classType.toUpperCase()} class, ${retentionLevel} retention`,
    classification_reason: classDescriptions[classType] || "Classification unknown.",
    retention_posture: retentionDescriptions[retentionLevel] || "Retention level unrecognized.",
    precedent_note: precedentWeight >= 0.7
      ? `High precedent weight (${precedentWeight}). This memory informs institutional decision-making and must be preserved.`
      : precedentWeight >= 0.3
      ? `Moderate precedent weight (${precedentWeight}). May be relevant for future reference.`
      : "Low or no precedent weight.",
    reconstruction_note: reconstructionRequired
      ? "Reconstruction is required if this memory is lost. Recovery paths should be maintained."
      : "Reconstruction is not mandatory but may be possible from source references.",
    governance_guidance: deletionRequiresReview
      ? `Status: ${currentStatus}. Deletion requires human review. Changes must be auditable.`
      : `Status: ${currentStatus}. May be archived or expired per policy without mandatory review.`,
  };
}
