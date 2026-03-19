/**
 * Canon Pipeline — Operational Knowledge Pipeline Logic
 * Sprint 204: Canonical lifecycle transitions formalized with explicit transition matrices.
 */

import type {
  IngestionLifecycleState,
  CanonCandidate,
  CanonEntry,
  PatternLibraryEntry,
  CanonCategory,
  CandidateReviewStatus,
  CandidatePromotionStatus,
  EntryLifecycleStatus,
  EntryApprovalStatus,
} from "./canon-types";

// ─── Ingestion Lifecycle State Machine ───
const VALID_INGESTION_TRANSITIONS: Record<IngestionLifecycleState, IngestionLifecycleState[]> = {
  discovered: ["queued", "failed"],
  queued: ["fetched", "failed"],
  fetched: ["parsed", "failed"],
  parsed: ["chunked", "failed"],
  chunked: ["classified", "failed"],
  classified: ["candidate_generated", "rejected", "failed"],
  candidate_generated: ["canon_promoted", "rejected"],
  canon_promoted: [],
  rejected: [],
  failed: ["queued"],
};

// ─── Candidate Review Transition Matrix (Sprint 204) ───
const VALID_CANDIDATE_REVIEW_TRANSITIONS: Record<CandidateReviewStatus, CandidateReviewStatus[]> = {
  pending: ["approved", "needs_human_review", "rejected"],
  needs_human_review: ["approved", "rejected"],
  approved: [],   // terminal for review — promotion is separate
  rejected: [],   // terminal
};

// ─── Candidate Promotion Transition Matrix (Sprint 204) ───
const VALID_CANDIDATE_PROMOTION_TRANSITIONS: Record<CandidatePromotionStatus, CandidatePromotionStatus[]> = {
  pending: ["promoted", "not_promoted"],
  promoted: [],       // terminal
  not_promoted: [],   // terminal
};

// ─── Entry Lifecycle Transition Matrix (Sprint 204) ───
const VALID_ENTRY_LIFECYCLE_TRANSITIONS: Record<EntryLifecycleStatus, EntryLifecycleStatus[]> = {
  active: ["deprecated", "superseded"],
  deprecated: ["archived"],
  superseded: ["archived"],
  archived: [],   // terminal
};

// ─── Entry Approval Transition Matrix (Sprint 204) ───
const VALID_ENTRY_APPROVAL_TRANSITIONS: Record<EntryApprovalStatus, EntryApprovalStatus[]> = {
  pending: ["approved"],
  approved: ["revoked"],
  revoked: [],  // terminal
};

// ─── Transition validators ───
export function canTransition(from: IngestionLifecycleState, to: IngestionLifecycleState): boolean {
  return (VALID_INGESTION_TRANSITIONS[from] || []).includes(to);
}

export function canTransitionCandidateReview(from: CandidateReviewStatus, to: CandidateReviewStatus): boolean {
  return (VALID_CANDIDATE_REVIEW_TRANSITIONS[from] || []).includes(to);
}

export function canTransitionCandidatePromotion(from: CandidatePromotionStatus, to: CandidatePromotionStatus): boolean {
  return (VALID_CANDIDATE_PROMOTION_TRANSITIONS[from] || []).includes(to);
}

export function canTransitionEntryLifecycle(from: EntryLifecycleStatus, to: EntryLifecycleStatus): boolean {
  return (VALID_ENTRY_LIFECYCLE_TRANSITIONS[from] || []).includes(to);
}

export function canTransitionEntryApproval(from: EntryApprovalStatus, to: EntryApprovalStatus): boolean {
  return (VALID_ENTRY_APPROVAL_TRANSITIONS[from] || []).includes(to);
}

export function isTerminalState(state: IngestionLifecycleState): boolean {
  return ["canon_promoted", "rejected", "failed"].includes(state);
}

export function getNextStates(state: IngestionLifecycleState): IngestionLifecycleState[] {
  return VALID_INGESTION_TRANSITIONS[state] || [];
}

// ─── Export transition matrices for health-check ───
export const TRANSITION_MATRICES = {
  ingestion: VALID_INGESTION_TRANSITIONS,
  candidateReview: VALID_CANDIDATE_REVIEW_TRANSITIONS,
  candidatePromotion: VALID_CANDIDATE_PROMOTION_TRANSITIONS,
  entryLifecycle: VALID_ENTRY_LIFECYCLE_TRANSITIONS,
  entryApproval: VALID_ENTRY_APPROVAL_TRANSITIONS,
} as const;

// ─── Promotion Eligibility ───
export function isCandidatePromotable(candidate: CanonCandidate): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (candidate.internal_validation_status !== "approved") {
    reasons.push("Review status must be 'approved' before promotion");
  }
  if (candidate.promotion_status === "promoted") {
    reasons.push("Already promoted");
  }
  if (candidate.promotion_status === "not_promoted") {
    reasons.push("Marked as not promoted");
  }
  if (candidate.source_reliability_score < 30) {
    reasons.push("Source reliability too low (< 30)");
  }
  if (!candidate.title || candidate.title.length < 5) {
    reasons.push("Title too short");
  }
  if (!candidate.summary || candidate.summary.length < 10) {
    reasons.push("Summary too short");
  }

  return { eligible: reasons.length === 0, reasons };
}

// ─── Canon Entry → Pattern Library Mapping ───
const PROMOTABLE_CANON_TYPES: string[] = [
  "pattern", "template", "rule", "convention",
  "anti_pattern", "best_practice", "architectural_guideline", "implementation_recipe",
];

export function isCanonEntryPromotableToLibrary(entry: CanonEntry): boolean {
  if (entry.lifecycle_status !== "active" && entry.lifecycle_status !== "approved") return false;
  if (entry.approval_status !== "approved") return false;
  if (!PROMOTABLE_CANON_TYPES.includes(entry.canon_type) && !PROMOTABLE_CANON_TYPES.includes(entry.practice_type)) return false;
  return true;
}

export function canonEntryToPatternLibraryEntry(entry: CanonEntry): PatternLibraryEntry {
  const tags = Array.isArray(entry.tags) ? entry.tags as string[] : [];
  return {
    canonEntryId: entry.id,
    title: entry.title,
    summary: entry.summary,
    category: (entry.practice_type || entry.canon_type || "pattern") as CanonCategory,
    stack: entry.stack_scope ? [entry.stack_scope] : [],
    language: tags.filter((t) => ["typescript", "javascript", "python", "go", "rust"].includes(t)),
    framework: tags.filter((t) => ["react", "nextjs", "vue", "angular", "supabase"].includes(t)),
    problemType: entry.problem_scope || "general",
    confidenceScore: entry.confidence_score,
    approvalStatus: entry.approval_status,
    lifecycleStatus: entry.lifecycle_status,
    implementationGuidance: entry.implementation_guidance || "",
    body: entry.body || "",
  };
}

// ─── Build Canon Entry from Candidate ───
export function buildCanonEntryFromCandidate(
  candidate: CanonCandidate,
  organizationId: string,
  approvedBy: string
): Record<string, unknown> {
  const slug = candidate.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return {
    organization_id: organizationId,
    title: candidate.title,
    slug: `${slug}-${Date.now()}`,
    canon_type: mapKnowledgeTypeToCanonType(candidate.knowledge_type),
    practice_type: candidate.knowledge_type,
    lifecycle_status: "active",
    approval_status: "approved",
    confidence_score: Math.min(candidate.source_reliability_score / 100, 1),
    summary: candidate.summary,
    body: candidate.body || "",
    implementation_guidance: "",
    stack_scope: candidate.domain_scope || "general",
    layer_scope: "general",
    problem_scope: "general",
    topic: candidate.domain_scope || "general",
    subtopic: candidate.knowledge_type,
    tags: [],
    source_reference: candidate.source_reference || "",
    source_type: candidate.source_type || "external_documentation",
    source_candidate_id: candidate.id,
    approved_by: approvedBy,
    created_by: candidate.submitted_by,
    metadata: {},
    structured_guidance: {},
  };
}

function mapKnowledgeTypeToCanonType(kt: string): string {
  const map: Record<string, string> = {
    pattern: "pattern",
    anti_pattern: "anti_pattern",
    best_practice: "best_practice",
    architectural_guideline: "architectural_guideline",
    implementation_recipe: "implementation_recipe",
    template: "template",
    methodology: "methodology",
  };
  return map[kt] || "pattern";
}
