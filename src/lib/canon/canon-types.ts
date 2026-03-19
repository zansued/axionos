/**
 * Canon Pipeline Types — Operational Knowledge Infrastructure
 * Sprint 204: Canonical lifecycle semantics formalized and enforced.
 */

// ─── Ingestion Lifecycle ───
export type IngestionLifecycleState =
  | "discovered"
  | "queued"
  | "fetched"
  | "parsed"
  | "chunked"
  | "classified"
  | "candidate_generated"
  | "canon_promoted"
  | "rejected"
  | "failed";

export const INGESTION_LIFECYCLE_ORDER: IngestionLifecycleState[] = [
  "discovered", "queued", "fetched", "parsed", "chunked",
  "classified", "candidate_generated", "canon_promoted", "rejected", "failed",
];

export const INGESTION_LIFECYCLE_LABELS: Record<IngestionLifecycleState, string> = {
  discovered: "Discovered",
  queued: "Queued",
  fetched: "Fetched",
  parsed: "Parsed",
  chunked: "Chunked",
  classified: "Classified",
  candidate_generated: "Candidates Generated",
  canon_promoted: "Promoted to Canon",
  rejected: "Rejected",
  failed: "Failed",
};

// ─── Candidate Review Status (Sprint 204 canonical) ───
export type CandidateReviewStatus =
  | "pending"
  | "approved"
  | "needs_human_review"
  | "rejected";

export const CANDIDATE_REVIEW_STATUS_LABELS: Record<CandidateReviewStatus, string> = {
  pending: "Pending Review",
  approved: "Approved",
  needs_human_review: "Needs Human Review",
  rejected: "Rejected",
};

// ─── Candidate Promotion Status (Sprint 204 canonical) ───
export type CandidatePromotionStatus =
  | "pending"
  | "promoted"
  | "not_promoted";

export const CANDIDATE_PROMOTION_STATUS_LABELS: Record<CandidatePromotionStatus, string> = {
  pending: "Awaiting Promotion",
  promoted: "Promoted",
  not_promoted: "Not Promoted",
};

// ─── Entry Lifecycle Status (aligned with DB enum canon_lifecycle_status) ───
export type EntryLifecycleStatus =
  | "draft"
  | "proposed"
  | "approved"
  | "experimental"
  | "contested"
  | "deprecated"
  | "archived"
  | "superseded";

export const ENTRY_LIFECYCLE_LABELS: Record<EntryLifecycleStatus, string> = {
  draft: "Draft",
  proposed: "Proposed",
  approved: "Active",
  experimental: "Experimental",
  contested: "Contested",
  deprecated: "Deprecated",
  archived: "Archived",
  superseded: "Superseded",
};

// ─── Entry Approval Status (Sprint 204 canonical) ───
export type EntryApprovalStatus =
  | "pending"
  | "approved"
  | "revoked";

export const ENTRY_APPROVAL_LABELS: Record<EntryApprovalStatus, string> = {
  pending: "Pending Approval",
  approved: "Approved",
  revoked: "Revoked",
};

// ─── Source Registry ───
export interface CanonSourceRecord {
  id: string;
  source_name: string;
  source_type: string;
  source_url: string;
  ingestion_status: string;
  ingestion_lifecycle_state: IngestionLifecycleState;
  last_synced_at: string | null;
  domain_scope: string;
  trust_level: string;
  status: string;
  sync_policy: string;
  created_at: string;
  updated_at: string;
  documents_found?: number;
  chunks_generated?: number;
  candidates_generated?: number;
  canon_entries_promoted?: number;
  failure_state?: string;
}

// ─── Candidate Pipeline ───
export interface CanonCandidate {
  id: string;
  source_id: string | null;
  title: string;
  summary: string;
  body: string;
  knowledge_type: string;
  domain_scope: string;
  source_type: string;
  source_reference: string;
  source_reliability_score: number;
  internal_validation_status: CandidateReviewStatus;
  promotion_status: CandidatePromotionStatus;
  promotion_decision_reason: string;
  promoted_entry_id: string | null;
  promoted_at: string | null;
  submitted_by: string;
  created_at: string;
}

// ─── Canon Entry (Approved Knowledge) ───
export type CanonCategory =
  | "pattern"
  | "template"
  | "rule"
  | "convention"
  | "playbook"
  | "anti_pattern"
  | "best_practice"
  | "architectural_guideline"
  | "implementation_recipe";

export interface CanonEntry {
  id: string;
  title: string;
  slug: string;
  canon_type: string;
  practice_type: string;
  lifecycle_status: EntryLifecycleStatus;
  approval_status: EntryApprovalStatus;
  confidence_score: number;
  summary: string;
  body: string;
  implementation_guidance: string;
  stack_scope: string;
  layer_scope: string;
  problem_scope: string;
  tags: unknown;
  source_reference: string;
  source_type: string;
  source_candidate_id: string | null;
  approved_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Pattern Library Entry (Promoted from Canon) ───
export interface PatternLibraryEntry {
  canonEntryId: string;
  title: string;
  summary: string;
  category: CanonCategory;
  stack: string[];
  language: string[];
  framework: string[];
  problemType: string;
  confidenceScore: number;
  approvalStatus: string;
  lifecycleStatus: string;
  implementationGuidance: string;
  body: string;
  matchReason?: string;
  suggestedUse?: string;
}

// ─── Retrieval Contract ───
export interface PatternRetrievalQuery {
  organizationId: string;
  stack?: string;
  language?: string;
  framework?: string;
  problemType?: string;
  scope?: string;
  tags?: string[];
  maxResults?: number;
  minConfidence?: number;
  includeExperimental?: boolean;
}

export interface PatternRetrievalResult {
  pattern: PatternLibraryEntry;
  matchReason: string;
  confidence: number;
  sourceCanonEntryId: string;
  suggestedUse: string;
}

export interface PatternRetrievalResponse {
  results: PatternRetrievalResult[];
  totalMatched: number;
  queryContext: PatternRetrievalQuery;
  retrievedAt: string;
}

// ─── Sync Run (enriched) ───
export interface CanonSyncRun {
  id: string;
  source_id: string;
  sync_status: string;
  lifecycle_state: string;
  candidates_found: number;
  candidates_accepted: number;
  candidates_rejected: number;
  documents_fetched: number;
  chunks_created: number;
  candidates_promoted: number;
  duplicates_skipped: number;
  sync_notes: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

// ─── AgentOS Integration Contract ───
export interface AgentCanonQuery {
  agentType: string;
  taskType: string;
  pipelineStage: string;
  stack?: string;
  language?: string;
  problemType?: string;
  maxPatterns?: number;
}

export interface AgentCanonResponse {
  patterns: PatternLibraryEntry[];
  conventions: string[];
  antiPatterns: string[];
  totalAvailable: number;
  retrievedAt: string;
}
