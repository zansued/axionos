/**
 * Memory Retention Governor — Sprint 103
 * Determines retention posture, review requirements, and deletion eligibility.
 */

export interface RetentionPolicyRecord {
  id: string;
  policy_name: string;
  retention_rule_text: string;
  deletion_rule_text: string;
  review_cycle_days: number;
  requires_human_review: boolean;
  active: boolean;
}

export interface RetentionPosture {
  eligible_for_deletion: boolean;
  eligible_for_archival: boolean;
  requires_review: boolean;
  review_due: boolean;
  retention_reason: string;
  next_review_date: string | null;
}

export function determineRetentionPosture(
  retentionLevel: string,
  retentionDeadline: string | null,
  precedentWeight: number,
  currentStatus: string,
  policy: RetentionPolicyRecord | null
): RetentionPosture {
  const now = new Date();

  // Protected status blocks all deletion
  if (currentStatus === "protected") {
    return {
      eligible_for_deletion: false,
      eligible_for_archival: false,
      requires_review: false,
      review_due: false,
      retention_reason: "Memory is in protected status — deletion and archival blocked.",
      next_review_date: null,
    };
  }

  // Permanent retention
  if (retentionLevel === "permanent") {
    return {
      eligible_for_deletion: false,
      eligible_for_archival: false,
      requires_review: false,
      review_due: false,
      retention_reason: "Permanent retention — memory must not be deleted or archived.",
      next_review_date: null,
    };
  }

  // High precedent weight
  if (precedentWeight >= 0.7) {
    return {
      eligible_for_deletion: false,
      eligible_for_archival: false,
      requires_review: true,
      review_due: false,
      retention_reason: `High precedent weight (${precedentWeight}) — requires review before any status change.`,
      next_review_date: null,
    };
  }

  // Past deadline
  if (retentionDeadline) {
    const deadline = new Date(retentionDeadline);
    if (now > deadline) {
      return {
        eligible_for_deletion: retentionLevel === "ephemeral" || retentionLevel === "short_term",
        eligible_for_archival: true,
        requires_review: policy?.requires_human_review ?? true,
        review_due: true,
        retention_reason: `Retention deadline passed (${retentionDeadline}). Review required.`,
        next_review_date: null,
      };
    }
  }

  // Policy-based review cycle
  if (policy && policy.review_cycle_days > 0) {
    const nextReview = new Date(now.getTime() + policy.review_cycle_days * 24 * 60 * 60 * 1000);
    return {
      eligible_for_deletion: false,
      eligible_for_archival: false,
      requires_review: policy.requires_human_review,
      review_due: false,
      retention_reason: `Active retention per policy "${policy.policy_name}". Next review in ${policy.review_cycle_days} days.`,
      next_review_date: nextReview.toISOString(),
    };
  }

  return {
    eligible_for_deletion: false,
    eligible_for_archival: false,
    requires_review: true,
    review_due: false,
    retention_reason: "Standard retention — no specific triggers active.",
    next_review_date: null,
  };
}
