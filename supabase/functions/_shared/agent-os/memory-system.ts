// Agent OS — Memory System (v0.6)
// Infrastructure-agnostic persistent memory for cross-run knowledge.
// Supports run, episodic, semantic, and vector memory types.
// Adapters provide storage; this module defines contracts only.

import type { StageName } from "./types.ts";

// ─────────────────────────────────────────────
// §1  Memory Types
// ─────────────────────────────────────────────

/** Discriminator for the kind of memory stored. */
export type PersistentMemoryType =
  | "run"        // Temporary, scoped to a single run
  | "episodic"   // Historical events and execution records
  | "semantic"   // Structured knowledge and validated strategies
  | "vector"     // Embedding-based for similarity retrieval
  | "procedural" // How-to knowledge (strategies, patterns)
  | "meta";      // Memory about memory (consolidation metadata)

// ─────────────────────────────────────────────
// §2  Memory Entry
// ─────────────────────────────────────────────

/** Core memory record stored in the system. */
export interface MemoryRecord {
  /** Unique memory identifier. */
  memory_id: string;
  /** Type of memory. */
  memory_type: PersistentMemoryType;
  /** Namespace for logical grouping. */
  namespace: string;
  /** Memory key within namespace. */
  key: string;
  /** The stored content (structured or unstructured). */
  content: MemoryContent;
  /** Tags for indexing and filtering. */
  tags: string[];
  /** Importance score 0.0–1.0. */
  importance: number;
  /** Access count (for retention scoring). */
  access_count: number;
  /** Last accessed timestamp. */
  last_accessed_at?: string;
  /** Links to related entities. */
  references: MemoryReference[];
  /** Embedding vector for similarity search (vector type). */
  embedding?: MemoryEmbeddingVector;
  /** Retention policy applied to this entry. */
  retention: MemoryRetentionInfo;
  /** Creation timestamp. */
  created_at: string;
  /** Last update timestamp. */
  updated_at: string;
  /** Arbitrary metadata. */
  metadata?: Record<string, unknown>;
}

/** Content payload of a memory entry. */
export interface MemoryContent {
  /** Primary text content. */
  text: string;
  /** Optional structured data. */
  structured?: Record<string, unknown>;
  /** Content format hint. */
  format: MemoryContentFormat;
  /** Content hash for deduplication. */
  content_hash?: string;
}

export type MemoryContentFormat =
  | "text"
  | "json"
  | "markdown"
  | "code"
  | "summary"
  | "embedding_source";

// ─────────────────────────────────────────────
// §3  Memory References & Linking
// ─────────────────────────────────────────────

/** Link between a memory entry and another entity. */
export interface MemoryReference {
  /** Type of referenced entity. */
  ref_type: MemoryRefType;
  /** ID of the referenced entity. */
  ref_id: string;
  /** Relationship label. */
  relation: string;
}

export type MemoryRefType =
  | "run"
  | "stage"
  | "agent"
  | "artifact"
  | "capability"
  | "memory"
  | "tool"
  | "decision"
  | "error";

// ─────────────────────────────────────────────
// §4  Embedding & Vector Search
// ─────────────────────────────────────────────

/** Embedding vector attached to a memory entry. */
export interface MemoryEmbeddingVector {
  /** The embedding values. */
  values: number[];
  /** Dimensionality. */
  dimensions: number;
  /** Model used to generate the embedding. */
  model: string;
  /** Timestamp of embedding generation. */
  generated_at: string;
}

/** Result of a vector similarity search. */
export interface MemorySimilarityResult {
  /** The matching memory record. */
  record: MemoryRecord;
  /** Cosine similarity score 0.0–1.0. */
  similarity: number;
  /** Distance metric used. */
  distance_metric: MemoryDistanceMetric;
}

export type MemoryDistanceMetric =
  | "cosine"
  | "euclidean"
  | "dot_product";

/** Request for a vector similarity search. */
export interface MemoryVectorQuery {
  /** Query embedding. */
  embedding: number[];
  /** Maximum results. */
  top_k: number;
  /** Minimum similarity threshold. */
  min_similarity: number;
  /** Filter by memory type. */
  memory_type?: PersistentMemoryType;
  /** Filter by namespace. */
  namespace?: string;
  /** Filter by tags. */
  tags?: string[];
  /** Distance metric. */
  distance_metric?: MemoryDistanceMetric;
}

// ─────────────────────────────────────────────
// §5  Memory Query & Filter
// ─────────────────────────────────────────────

/** General-purpose memory query. */
export interface MemoryQuery {
  /** Filter by memory type. */
  memory_type?: PersistentMemoryType;
  /** Filter by namespace. */
  namespace?: string;
  /** Filter by key (exact or prefix). */
  key?: string;
  /** Key matching mode. */
  key_match?: "exact" | "prefix" | "contains";
  /** Filter by tags (all must match). */
  tags?: string[];
  /** Filter by reference. */
  ref_type?: MemoryRefType;
  ref_id?: string;
  /** Minimum importance. */
  min_importance?: number;
  /** Created after. */
  created_after?: string;
  /** Created before. */
  created_before?: string;
  /** Sort field. */
  sort_by?: MemorySortKey;
  /** Sort direction. */
  sort_order?: "asc" | "desc";
  /** Pagination limit. */
  limit?: number;
  /** Pagination offset. */
  offset?: number;
}

export type MemorySortKey =
  | "created_at"
  | "updated_at"
  | "importance"
  | "access_count"
  | "last_accessed_at";

/** Result of a memory query. */
export interface MemoryQueryResult {
  records: MemoryRecord[];
  total_count: number;
  has_more: boolean;
}

// ─────────────────────────────────────────────
// §6  Memory Write Operations
// ─────────────────────────────────────────────

/** Request to store a memory entry. */
export interface MemoryWriteRequest {
  memory_type: PersistentMemoryType;
  namespace: string;
  key: string;
  content: MemoryContent;
  tags?: string[];
  importance?: number;
  references?: MemoryReference[];
  /** If true, generate embedding automatically. */
  auto_embed?: boolean;
  /** Retention override. */
  retention_policy?: MemoryRetentionPolicy;
  metadata?: Record<string, unknown>;
  /** Trace context. */
  trace?: MemoryTraceMetadata;
}

/** Result of a memory write. */
export interface MemoryWriteResult {
  memory_id: string;
  created: boolean;
  updated: boolean;
  /** Was a duplicate detected by content hash? */
  deduplicated: boolean;
  /** Embedding generated? */
  embedded: boolean;
}

/** Request to retrieve a specific memory. */
export interface MemoryRetrievalRequest {
  /** Retrieve by id. */
  memory_id?: string;
  /** Retrieve by namespace + key. */
  namespace?: string;
  key?: string;
  /** Record access for retention scoring. */
  record_access?: boolean;
}

/** Result of a memory retrieval. */
export interface MemoryRetrievalResult {
  found: boolean;
  record?: MemoryRecord;
}

/** Trace context for memory operations. */
export interface MemoryTraceMetadata {
  run_id?: string;
  stage?: StageName;
  agent_id?: string;
  capability_id?: string;
  label?: string;
}

// ─────────────────────────────────────────────
// §7  Retention Policies
// ─────────────────────────────────────────────

/** Retention info attached to each memory entry. */
export interface MemoryRetentionInfo {
  policy: MemoryRetentionPolicy;
  /** Expiration timestamp (if applicable). */
  expires_at?: string;
  /** Has this entry been archived? */
  archived: boolean;
  /** Archive timestamp. */
  archived_at?: string;
}

/** Configurable retention policy. */
export interface MemoryRetentionPolicy {
  /** Policy identifier. */
  policy_id: string;
  /** Strategy for retention. */
  strategy: MemoryRetentionStrategy;
  /** TTL in seconds (for ttl strategy). */
  ttl_seconds?: number;
  /** Minimum importance to retain (for importance strategy). */
  min_importance?: number;
  /** Minimum access count to retain (for access strategy). */
  min_access_count?: number;
  /** Maximum entries per namespace (for capacity strategy). */
  max_entries?: number;
}

export type MemoryRetentionStrategy =
  | "permanent"     // Never expires
  | "ttl"           // Expires after time-to-live
  | "importance"    // Kept if importance above threshold
  | "access_based"  // Kept if accessed frequently
  | "capacity"      // Evict oldest when namespace is full
  | "manual";       // Only deleted manually

/** Default retention policies by memory type. */
export const DEFAULT_RETENTION_POLICIES: Record<PersistentMemoryType, MemoryRetentionPolicy> = {
  run: {
    policy_id: "run_default",
    strategy: "ttl",
    ttl_seconds: 86400, // 24 hours
  },
  episodic: {
    policy_id: "episodic_default",
    strategy: "capacity",
    max_entries: 10000,
  },
  semantic: {
    policy_id: "semantic_default",
    strategy: "permanent",
  },
  vector: {
    policy_id: "vector_default",
    strategy: "importance",
    min_importance: 0.3,
  },
  procedural: {
    policy_id: "procedural_default",
    strategy: "permanent",
  },
  meta: {
    policy_id: "meta_default",
    strategy: "ttl",
    ttl_seconds: 604800, // 7 days
  },
};

// ─────────────────────────────────────────────
// §8  Embedding Provider Interface
// ─────────────────────────────────────────────

/** Adapter for generating embeddings. */
export interface IMemoryEmbeddingProvider {
  /** Provider identifier. */
  readonly provider_id: string;
  /** Model used for embedding. */
  readonly model: string;
  /** Embedding dimensionality. */
  readonly dimensions: number;

  /** Generate embedding for text. */
  embed(text: string): Promise<MemoryEmbeddingVector>;

  /** Batch embed multiple texts. */
  embedBatch(texts: string[]): Promise<MemoryEmbeddingVector[]>;
}

// ─────────────────────────────────────────────
// §9  Memory Store Interface
// ─────────────────────────────────────────────

/**
 * Core memory store interface.
 * Adapters implement this for specific backends (Supabase, Redis, etc.).
 */
export interface IMemoryStore {
  // ── Write ──
  write(request: MemoryWriteRequest): Promise<MemoryWriteResult>;
  update(memory_id: string, updates: Partial<MemoryRecord>): Promise<boolean>;
  delete(memory_id: string): Promise<boolean>;

  // ── Retrieve ──
  get(request: MemoryRetrievalRequest): Promise<MemoryRetrievalResult>;
  query(query: MemoryQuery): Promise<MemoryQueryResult>;

  // ── Vector Search ──
  searchSimilar(query: MemoryVectorQuery): Promise<MemorySimilarityResult[]>;

  // ── Lifecycle ──
  expire(): Promise<number>;
  archive(memory_id: string): Promise<boolean>;
  prune(namespace: string, policy: MemoryRetentionPolicy): Promise<number>;

  // ── Stats ──
  count(memory_type?: PersistentMemoryType): Promise<number>;
  namespaces(): Promise<string[]>;
}

// ─────────────────────────────────────────────
// §10  Configuration
// ─────────────────────────────────────────────

/** Configuration for the Memory System. */
export interface MemorySystemConfig {
  /** Enable auto-embedding for new entries. */
  auto_embed_enabled: boolean;
  /** Default distance metric for vector search. */
  default_distance_metric: MemoryDistanceMetric;
  /** Default top_k for vector search. */
  default_top_k: number;
  /** Default minimum similarity threshold. */
  default_min_similarity: number;
  /** Enable content hash deduplication. */
  deduplication_enabled: boolean;
  /** Enable access tracking. */
  access_tracking_enabled: boolean;
  /** Run automatic expiration on write. */
  auto_expire_on_write: boolean;
  /** Maximum content size in bytes. */
  max_content_bytes: number;
}

export const DEFAULT_MEMORY_SYSTEM_CONFIG: MemorySystemConfig = {
  auto_embed_enabled: true,
  default_distance_metric: "cosine",
  default_top_k: 10,
  default_min_similarity: 0.5,
  deduplication_enabled: true,
  access_tracking_enabled: true,
  auto_expire_on_write: false,
  max_content_bytes: 1024 * 1024, // 1MB
};

// ─────────────────────────────────────────────
// §11  Event Types (EventBus integration)
// ─────────────────────────────────────────────

export type MemorySystemEventType =
  | "memory.created"
  | "memory.updated"
  | "memory.deleted"
  | "memory.accessed"
  | "memory.embedded"
  | "memory.expired"
  | "memory.archived"
  | "memory.pruned"
  | "memory.deduplicated"
  | "memory.query_executed"
  | "memory.vector_search_executed"
  | "memory.consolidation_triggered";
