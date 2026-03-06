// Agent Artifact Store v0.1 — Contract Layer
// Pure type-level contracts. Zero runtime dependencies.
// Spec: docs/AGENT_ARTIFACT_STORE.md
//
// DESIGN RATIONALE:
//
// The Artifact Store manages all structured outputs produced during
// Agent OS execution. Artifacts are immutable, versioned, and linked
// by lineage — forming the reasoning chain of a run.
//
// The store is a pure interface layer:
//   - No database dependency
//   - No filesystem dependency
//   - Adapters provide concrete implementations
//
// Core invariants:
//   1. Content is immutable once stored
//   2. Updates produce new versions, never mutations
//   3. Content hash enables deduplication
//   4. Lineage enables full run reconstruction
//   5. Every write emits an event

import type {
  StageName,
  AgentType,
} from "./types.ts";

import type {
  ArtifactEnvelope,
  ArtifactKind,
  ArtifactLineage,
  ArtifactQuality,
} from "./protocol.ts";

// ════════════════════════════════════════════════════════════════
// 1. ARTIFACT RECORD
// ════════════════════════════════════════════════════════════════

/**
 * ArtifactRecord — the persisted form of an artifact.
 *
 * Wraps ArtifactEnvelope with storage metadata:
 *   - Storage ID (may differ from artifact_id for partitioning)
 *   - Version chain pointer
 *   - Hash index entry
 *   - Retrieval metadata (size, storage location)
 *
 * The envelope is stored as-is. The record adds operational data.
 */
export interface ArtifactRecord {
  /** Storage-level unique ID */
  record_id: string;

  /** The original artifact envelope (immutable) */
  envelope: ArtifactEnvelope;

  /** Version chain metadata */
  version_info: ArtifactVersionInfo;

  /** Content hash for deduplication */
  content_hash: string;

  /** Whether this record is a duplicate of another */
  is_duplicate: boolean;

  /** If duplicate, reference to the canonical record */
  canonical_record_id?: string;

  /** Storage metadata */
  storage_meta: ArtifactStorageMeta;

  /** When this record was stored */
  stored_at: string;
}

export interface ArtifactStorageMeta {
  /** Size of serialized content in bytes */
  content_size_bytes: number;

  /** Storage location hint (for adapter routing) */
  storage_location?: string;

  /** Whether content is compressed */
  compressed: boolean;

  /** Whether content is encrypted */
  encrypted: boolean;

  /** Content MIME type hint */
  content_type?: string;
}

// ════════════════════════════════════════════════════════════════
// 2. ARTIFACT VERSIONING
// ════════════════════════════════════════════════════════════════

/**
 * ArtifactVersionInfo — version chain metadata for an artifact.
 *
 * Versioning model:
 *   - artifact_id is stable across versions
 *   - Each version gets a unique record_id
 *   - version number is monotonically increasing
 *   - previous_version_id links to the prior version's record_id
 *   - is_latest marks the current head of the chain
 */
export interface ArtifactVersionInfo {
  /** Stable artifact identity (same across versions) */
  artifact_id: string;

  /** Version number (1, 2, 3, ...) */
  version: number;

  /** Record ID of the previous version (null for v1) */
  previous_version_id?: string;

  /** Whether this is the latest version */
  is_latest: boolean;

  /** What changed in this version */
  change_summary?: string;

  /** Who/what triggered the new version */
  created_by: VersionCreator;

  /** When this version was created */
  created_at: string;
}

export interface VersionCreator {
  agent_id?: string;
  agent_type?: AgentType;
  stage?: StageName;
  run_id: string;
  reason: string;
}

/**
 * ArtifactVersion — a single version in the version chain.
 * Used when listing version history.
 */
export interface ArtifactVersion {
  record_id: string;
  artifact_id: string;
  version: number;
  content_hash: string;
  is_latest: boolean;
  change_summary?: string;
  created_by: VersionCreator;
  created_at: string;
}

// ════════════════════════════════════════════════════════════════
// 3. ARTIFACT LINEAGE
// ════════════════════════════════════════════════════════════════

/**
 * ArtifactLineageRecord — tracks derivation relationships.
 *
 * Lineage types:
 *   "derived_from"   — artifact was produced using another as input
 *   "refined_from"   — artifact is a refinement/improvement of another
 *   "merged_from"    — artifact was produced by merging multiple inputs
 *   "validated_by"   — artifact was validated and the result is linked
 *   "superseded_by"  — artifact has been replaced by a newer one
 *
 * Lineage supports:
 *   - Forward traversal (what was produced FROM this artifact?)
 *   - Backward traversal (what inputs produced this artifact?)
 *   - Full DAG reconstruction for a run
 */
export interface ArtifactLineageRecord {
  lineage_id: string;

  /** Source artifact (parent) */
  source_artifact_id: string;
  source_version: number;

  /** Target artifact (child/derived) */
  target_artifact_id: string;
  target_version: number;

  /** Relationship type */
  relation: ArtifactRelationType;

  /** Stage where the derivation occurred */
  stage: StageName;

  /** Run in which this relationship was established */
  run_id: string;

  /** Optional metadata about the derivation */
  metadata?: Record<string, unknown>;

  /** When this lineage was recorded */
  created_at: string;
}

export type ArtifactRelationType =
  | "derived_from"
  | "refined_from"
  | "merged_from"
  | "validated_by"
  | "superseded_by";

/**
 * ArtifactLineageGraph — the full lineage DAG for a set of artifacts.
 */
export interface ArtifactLineageGraph {
  /** Root artifacts (no parents) */
  roots: string[];

  /** Leaf artifacts (no children) */
  leaves: string[];

  /** All lineage edges */
  edges: ArtifactLineageRecord[];

  /** Artifact IDs in topological order */
  topological_order: string[];

  /** Total depth of the deepest chain */
  max_depth: number;
}

// ════════════════════════════════════════════════════════════════
// 4. ARTIFACT REFERENCE
// ════════════════════════════════════════════════════════════════

/**
 * ArtifactReference — a lightweight pointer to an artifact.
 * Used in queries, lineage, and cross-references without
 * carrying the full content.
 */
export interface ArtifactReference {
  artifact_id: string;
  version: number;
  kind: ArtifactKind;
  title: string;
  content_hash: string;
  stage: StageName;
  run_id: string;
  created_at: string;
}

// ════════════════════════════════════════════════════════════════
// 5. CONTENT HASHING
// ════════════════════════════════════════════════════════════════

/**
 * Content hash specification.
 *
 * Algorithm: SHA-256
 * Input: canonicalized content field ONLY
 *
 * Canonicalization rules (from Runtime Protocol §D):
 *   1. JSON.stringify with keys sorted alphabetically
 *   2. No whitespace (compact form)
 *   3. Metadata, timestamps, version, tags EXCLUDED
 *   4. Result: lowercase hex string
 *
 * Two artifacts with identical content_hash have semantically
 * identical content, regardless of envelope differences.
 */
export interface ContentHashSpec {
  algorithm: "sha256";
  canonicalization: "sorted-keys-compact-json";
  excludes: ("metadata" | "timestamps" | "version" | "tags" | "envelope")[];
}

export const CONTENT_HASH_SPEC: ContentHashSpec = {
  algorithm: "sha256",
  canonicalization: "sorted-keys-compact-json",
  excludes: ["metadata", "timestamps", "version", "tags", "envelope"],
};

/**
 * ArtifactHashEntry — an entry in the hash index.
 */
export interface ArtifactHashEntry {
  content_hash: string;

  /** All record IDs sharing this hash (duplicates) */
  record_ids: string[];

  /** The canonical (first-stored) record */
  canonical_record_id: string;

  /** Number of duplicates */
  duplicate_count: number;

  /** First seen timestamp */
  first_seen_at: string;
}

/**
 * DuplicateCheckResult — returned when checking for duplicates
 * before storing.
 */
export interface DuplicateCheckResult {
  is_duplicate: boolean;
  content_hash: string;
  existing_record_id?: string;
  existing_artifact_id?: string;
  existing_version?: number;
}

// ════════════════════════════════════════════════════════════════
// 6. ARTIFACT WRITE
// ════════════════════════════════════════════════════════════════

/**
 * ArtifactWriteRequest — request to store an artifact.
 */
export interface ArtifactWriteRequest {
  /** The artifact envelope to store */
  envelope: ArtifactEnvelope;

  /** Lineage: artifacts this one was derived from */
  derived_from?: ArtifactReference[];

  /** Lineage relation type (defaults to "derived_from") */
  relation?: ArtifactRelationType;

  /** Whether to skip duplicate check (force store) */
  skip_dedup?: boolean;

  /** Whether to create a new version of an existing artifact */
  is_new_version?: boolean;

  /** If new version, what changed */
  change_summary?: string;

  /** Storage hints */
  storage_hints?: {
    compress?: boolean;
    encrypt?: boolean;
    storage_location?: string;
  };
}

/**
 * ArtifactWriteResult — result of a store operation.
 */
export interface ArtifactWriteResult {
  /** Whether the write succeeded */
  success: boolean;

  /** The stored record (or existing record if duplicate) */
  record: ArtifactRecord;

  /** Whether this was a duplicate */
  was_duplicate: boolean;

  /** If duplicate, the canonical record */
  canonical_record?: ArtifactRecord;

  /** Version created */
  version: number;

  /** Lineage records created */
  lineage_records_created: number;

  /** Content hash computed */
  content_hash: string;

  /** Error if write failed */
  error?: string;

  /** Timing */
  duration_ms: number;
}

// ════════════════════════════════════════════════════════════════
// 7. ARTIFACT RETRIEVAL
// ════════════════════════════════════════════════════════════════

/**
 * ArtifactRetrievalRequest — request to retrieve an artifact.
 */
export interface ArtifactRetrievalRequest {
  /** Retrieve by artifact_id (returns latest version by default) */
  artifact_id?: string;

  /** Retrieve specific version */
  version?: number;

  /** Retrieve by record_id */
  record_id?: string;

  /** Retrieve by content_hash */
  content_hash?: string;

  /** Whether to include full content (false = reference only) */
  include_content?: boolean;

  /** Whether to include lineage */
  include_lineage?: boolean;

  /** Whether to include version history */
  include_history?: boolean;
}

/**
 * ArtifactRetrievalResult — result of a retrieval operation.
 */
export interface ArtifactRetrievalResult {
  /** Whether the artifact was found */
  found: boolean;

  /** The artifact record (if found) */
  record?: ArtifactRecord;

  /** Version history (if requested) */
  history?: ArtifactVersion[];

  /** Lineage (if requested) */
  lineage?: ArtifactLineageRecord[];

  /** Error if retrieval failed */
  error?: string;
}

// ════════════════════════════════════════════════════════════════
// 8. ARTIFACT QUERY
// ════════════════════════════════════════════════════════════════

/**
 * ArtifactQuery — flexible query interface for artifact search.
 *
 * All filter fields are optional. Multiple fields are ANDed.
 */
export interface ArtifactQuery {
  /** Filter by run */
  run_id?: string;

  /** Filter by stage */
  stage?: StageName;

  /** Filter by agent */
  agent_id?: string;

  /** Filter by agent type */
  agent_type?: AgentType;

  /** Filter by artifact kind */
  kind?: ArtifactKind;

  /** Filter by content hash */
  content_hash?: string;

  /** Filter by tags (any match) */
  tags?: string[];

  /** Filter by creation time range */
  created_after?: string;
  created_before?: string;

  /** Only return latest versions */
  latest_only?: boolean;

  /** Exclude duplicates */
  exclude_duplicates?: boolean;

  /** Sort order */
  sort_by?: ArtifactSortKey;
  sort_order?: "asc" | "desc";

  /** Pagination */
  limit?: number;
  offset?: number;

  /** Whether to include full content */
  include_content?: boolean;
}

export type ArtifactSortKey =
  | "created_at"
  | "version"
  | "kind"
  | "stage"
  | "content_size_bytes";

/**
 * ArtifactQueryResult — paginated query results.
 */
export interface ArtifactQueryResult {
  /** Matching artifacts */
  artifacts: ArtifactRecord[];

  /** Total count matching query (ignoring pagination) */
  total_count: number;

  /** Whether there are more results */
  has_more: boolean;

  /** Applied filters summary */
  applied_filters: string[];

  /** Query execution time */
  duration_ms: number;
}

// ════════════════════════════════════════════════════════════════
// 9. ARTIFACT HISTORY
// ════════════════════════════════════════════════════════════════

/**
 * ArtifactHistory — complete version history for an artifact.
 */
export interface ArtifactHistory {
  artifact_id: string;
  current_version: number;
  total_versions: number;
  versions: ArtifactVersion[];
  first_created_at: string;
  last_updated_at: string;
}

// ════════════════════════════════════════════════════════════════
// 10. RUN RECONSTRUCTION
// ════════════════════════════════════════════════════════════════

/**
 * RunArtifactManifest — all artifacts produced during a run,
 * organized by stage for full run reconstruction.
 */
export interface RunArtifactManifest {
  run_id: string;

  /** Artifacts grouped by stage */
  by_stage: Record<string, ArtifactReference[]>;

  /** Artifacts grouped by kind */
  by_kind: Record<string, ArtifactReference[]>;

  /** Full lineage graph for this run */
  lineage_graph: ArtifactLineageGraph;

  /** Total artifact count */
  total_artifacts: number;

  /** Total unique content (deduplicated count) */
  unique_content_count: number;

  /** Total storage size */
  total_size_bytes: number;

  /** Run start and end timestamps */
  run_started_at: string;
  run_completed_at?: string;
}

// ════════════════════════════════════════════════════════════════
// 11. ARTIFACT STORE CONFIGURATION
// ════════════════════════════════════════════════════════════════

export interface ArtifactStoreConfig {
  /** Enable content deduplication */
  dedup_enabled: boolean;

  /** Enable content compression */
  compression_enabled: boolean;

  /** Maximum content size in bytes (reject larger artifacts) */
  max_content_size_bytes: number;

  /** Maximum versions per artifact (oldest pruned) */
  max_versions_per_artifact: number;

  /** Default retention period for artifacts (ISO 8601 duration) */
  default_retention_period?: string;

  /** Whether to emit events for reads (may be noisy) */
  emit_read_events: boolean;

  /** Whether to compute and store lineage graphs eagerly */
  eager_lineage_computation: boolean;
}

export const DEFAULT_ARTIFACT_STORE_CONFIG: ArtifactStoreConfig = {
  dedup_enabled: true,
  compression_enabled: false,
  max_content_size_bytes: 10 * 1024 * 1024, // 10 MB
  max_versions_per_artifact: 50,
  default_retention_period: undefined, // no expiry by default
  emit_read_events: false,
  eager_lineage_computation: false,
};

// ════════════════════════════════════════════════════════════════
// 12. ARTIFACT STORE EVENTS
// ════════════════════════════════════════════════════════════════

export type ArtifactStoreEventType =
  | "artifact.stored"
  | "artifact.version_created"
  | "artifact.duplicate_detected"
  | "artifact.lineage_linked"
  | "artifact.retrieved"
  | "artifact.query_executed"
  | "artifact.history_retrieved"
  | "artifact.run_manifest_built"
  | "artifact.pruned"
  | "artifact.archived";

// ════════════════════════════════════════════════════════════════
// 13. ARTIFACT STORE INTERFACE
// ════════════════════════════════════════════════════════════════

/**
 * IArtifactStore — the contract that any artifact store
 * implementation must satisfy.
 *
 * Adapters (Supabase, Postgres, S3, in-memory) implement
 * this interface. The Agent OS kernel depends only on the
 * interface, never on a concrete implementation.
 */
export interface IArtifactStore {
  // ── Write Operations ──

  /**
   * Store an artifact. Computes hash, checks duplicates,
   * creates version, records lineage, emits events.
   */
  store(request: ArtifactWriteRequest): Promise<ArtifactWriteResult>;

  /**
   * Store multiple artifacts in a batch.
   * Useful for stage outputs that produce multiple artifacts.
   */
  storeBatch(requests: ArtifactWriteRequest[]): Promise<ArtifactWriteResult[]>;

  // ── Read Operations ──

  /**
   * Retrieve a single artifact by ID, version, or hash.
   */
  retrieve(request: ArtifactRetrievalRequest): Promise<ArtifactRetrievalResult>;

  /**
   * Query artifacts with flexible filters.
   */
  query(query: ArtifactQuery): Promise<ArtifactQueryResult>;

  /**
   * Get version history for an artifact.
   */
  getHistory(artifact_id: string): Promise<ArtifactHistory>;

  // ── Lineage Operations ──

  /**
   * Link two artifacts with a lineage relationship.
   */
  linkLineage(
    source_artifact_id: string,
    source_version: number,
    target_artifact_id: string,
    target_version: number,
    relation: ArtifactRelationType,
    run_id: string,
    stage: StageName,
  ): Promise<ArtifactLineageRecord>;

  /**
   * Get lineage for an artifact (forward or backward).
   */
  getLineage(
    artifact_id: string,
    direction: "forward" | "backward",
    max_depth?: number,
  ): Promise<ArtifactLineageRecord[]>;

  /**
   * Build the full lineage graph for a run.
   */
  getLineageGraph(run_id: string): Promise<ArtifactLineageGraph>;

  // ── Hash Operations ──

  /**
   * Check if content with this hash already exists.
   */
  checkDuplicate(content_hash: string): Promise<DuplicateCheckResult>;

  // ── Run Reconstruction ──

  /**
   * Build the complete artifact manifest for a run.
   */
  getRunManifest(run_id: string): Promise<RunArtifactManifest>;

  // ── Maintenance ──

  /**
   * Prune old versions beyond max_versions_per_artifact.
   */
  pruneVersions(artifact_id: string, keep_versions: number): Promise<number>;

  /**
   * Count artifacts matching a query (without fetching content).
   */
  count(query: ArtifactQuery): Promise<number>;
}
