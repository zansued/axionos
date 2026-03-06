# Agent Artifact Store — Specification v0.1

**Status:** Normative  
**Depends on:** Agent Runtime Protocol v0.1.1  
**Module:** `supabase/functions/_shared/agent-os/artifact-store.ts`

---

## 1. Purpose

The Artifact Store manages all structured outputs produced during Agent OS execution. It provides persistence, versioning, lineage tracking, deduplication, and querying for artifacts wrapped in `ArtifactEnvelope` (defined in the Runtime Protocol).

The Artifact Store enables:
- Complete audit trail of pipeline outputs
- Full run reconstruction from artifacts
- Content deduplication across runs
- Reasoning chain traversal via lineage

---

## 2. Design Principles

### 2.1 Content Immutability

Once stored, artifact content is never modified. Updates produce new versions.

### 2.2 Infrastructure Agnosticism

The store is defined as a pure interface (`IArtifactStore`). Concrete implementations are provided by adapters (Supabase, Postgres, S3, in-memory).

### 2.3 Envelope Preservation

The original `ArtifactEnvelope` is stored as-is. The `ArtifactRecord` wraps it with operational metadata (storage location, version chain, hash index).

### 2.4 Hash-Based Deduplication

Content is hashed using SHA-256 on canonicalized content (sorted keys, compact JSON, no envelope metadata). Identical content is stored once; duplicates reference the canonical record.

### 2.5 Event-Driven

Every write operation emits an event via the EventBus for observability and audit.

---

## 3. Core Entities

| Entity | Purpose |
|--------|---------|
| `ArtifactRecord` | Persisted artifact with storage metadata |
| `ArtifactVersionInfo` | Version chain metadata |
| `ArtifactVersion` | Single version in a chain |
| `ArtifactLineageRecord` | Derivation relationship between artifacts |
| `ArtifactLineageGraph` | Full lineage DAG for a run |
| `ArtifactReference` | Lightweight pointer to an artifact |
| `ArtifactHashEntry` | Hash index entry for deduplication |
| `ArtifactQuery` | Flexible query with filters |
| `RunArtifactManifest` | Complete artifact inventory for a run |

---

## 4. Artifact Lifecycle

```
Agent produces ArtifactEnvelope
        │
        ▼
┌──────────────────┐
│  WRITE REQUEST   │  ArtifactWriteRequest received
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  CANONICALIZE    │  Sort keys, compact JSON
│  & HASH          │  SHA-256 → content_hash
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  DUPLICATE       │  Check hash index
│  CHECK           │  If duplicate → link to canonical, skip storage
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  VERSION         │  Create version entry
│  CREATION        │  Link to previous version (if exists)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  LINEAGE         │  Record derivation relationships
│  RECORDING       │  Link source → target artifacts
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  STORE           │  Persist ArtifactRecord
│                  │  Emit artifact.stored event
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  WRITE RESULT    │  Return ArtifactWriteResult
└──────────────────┘
```

---

## 5. Versioning Model

### Rules

1. Every artifact has a stable `artifact_id` that persists across versions
2. Each version gets a unique `record_id`
3. Version numbers are monotonically increasing (1, 2, 3, ...)
4. Previous versions remain immutable
5. `is_latest` marks the head of the chain
6. When a new version is created, the prior version's `is_latest` becomes `false`

### Version Chain

```
artifact_id: "abc-123"

  v1 (record_id: "r001") ← oldest
   ↓
  v2 (record_id: "r002")
   ↓
  v3 (record_id: "r003") ← is_latest: true
```

### Version Creation Triggers

- Agent produces improved output for same artifact
- Validation feedback causes artifact refinement
- Manual edit or rework

---

## 6. Lineage Model

### Relationship Types

| Type | Meaning | Example |
|------|---------|---------|
| `derived_from` | Artifact was produced using another as input | Architecture derived from requirements |
| `refined_from` | Artifact is an improvement of another | Code v2 refined from code v1 |
| `merged_from` | Artifact was produced by combining inputs | Plan merged from multiple analyses |
| `validated_by` | Artifact was validated; result is linked | Code validated by test report |
| `superseded_by` | Artifact has been replaced | Old architecture superseded by new |

### Traversal

- **Forward:** "What was produced FROM this artifact?" → follow `source → target` edges
- **Backward:** "What inputs produced this artifact?" → follow `target → source` edges

### Lineage Graph

The lineage graph for a run is a DAG (Directed Acyclic Graph):
- **Roots:** Artifacts with no parents (initial inputs)
- **Leaves:** Artifacts with no children (final outputs)
- **Topological order:** Artifacts sorted by dependency order

---

## 7. Content Hashing

### Algorithm

SHA-256 on canonicalized content.

### Canonicalization (from Runtime Protocol §D)

1. Take the `content` field of `ArtifactEnvelope`
2. `JSON.stringify` with keys sorted alphabetically (stable serialization)
3. No whitespace (compact form)
4. Exclude: metadata, timestamps, version, tags, envelope wrapper
5. Result: lowercase hex string

### Deduplication

When a write request arrives:
1. Compute `content_hash`
2. Check hash index for existing entry
3. If match found → set `is_duplicate: true`, link to `canonical_record_id`
4. If no match → store as new canonical entry

### Benefits

- Avoid redundant storage across runs
- Enable incremental execution (skip unchanged artifacts)
- Cache invalidation by hash comparison

---

## 8. Query Interface

### Filterable Fields

| Field | Type | Description |
|-------|------|-------------|
| `run_id` | string | Filter by run |
| `stage` | StageName | Filter by pipeline stage |
| `agent_id` | string | Filter by producing agent |
| `agent_type` | AgentType | Filter by agent type |
| `kind` | ArtifactKind | Filter by artifact kind |
| `content_hash` | string | Filter by content hash |
| `tags` | string[] | Filter by tags (any match) |
| `created_after` | string | Filter by creation time (lower bound) |
| `created_before` | string | Filter by creation time (upper bound) |

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `latest_only` | false | Only return latest versions |
| `exclude_duplicates` | false | Exclude duplicate records |
| `include_content` | true | Include full content in results |
| `sort_by` | "created_at" | Sort key |
| `sort_order` | "desc" | Sort direction |
| `limit` | 50 | Max results per page |
| `offset` | 0 | Pagination offset |

---

## 9. Event Taxonomy

| Event | When Emitted | Key Payload |
|-------|-------------|-------------|
| `artifact.stored` | New artifact persisted | `record_id`, `artifact_id`, `content_hash` |
| `artifact.version_created` | New version of existing artifact | `artifact_id`, `version`, `previous_version_id` |
| `artifact.duplicate_detected` | Content hash match found | `content_hash`, `canonical_record_id` |
| `artifact.lineage_linked` | Lineage relationship created | `source_id`, `target_id`, `relation` |
| `artifact.retrieved` | Artifact fetched | `artifact_id`, `version` |
| `artifact.query_executed` | Query completed | `filter_count`, `result_count`, `duration_ms` |
| `artifact.history_retrieved` | Version history fetched | `artifact_id`, `version_count` |
| `artifact.run_manifest_built` | Run manifest constructed | `run_id`, `artifact_count` |
| `artifact.pruned` | Old versions removed | `artifact_id`, `pruned_count` |
| `artifact.archived` | Artifact moved to cold storage | `record_id`, `storage_location` |

---

## 10. Run Reconstruction

The Artifact Store enables full run reconstruction via `getRunManifest()`:

1. Collect all artifacts produced during a run
2. Group by stage and kind
3. Build the lineage graph (DAG)
4. Compute topological order
5. Identify roots (initial inputs) and leaves (final outputs)
6. Calculate storage statistics

This allows:
- Replaying the reasoning chain of a run
- Auditing every decision point
- Comparing runs by their artifact outputs
- Training data extraction for agent learning

---

## 11. Interface Contract

```typescript
interface IArtifactStore {
  // Write
  store(request): Promise<ArtifactWriteResult>
  storeBatch(requests): Promise<ArtifactWriteResult[]>

  // Read
  retrieve(request): Promise<ArtifactRetrievalResult>
  query(query): Promise<ArtifactQueryResult>
  getHistory(artifact_id): Promise<ArtifactHistory>

  // Lineage
  linkLineage(source, target, relation, ...): Promise<ArtifactLineageRecord>
  getLineage(artifact_id, direction, depth): Promise<ArtifactLineageRecord[]>
  getLineageGraph(run_id): Promise<ArtifactLineageGraph>

  // Hash
  checkDuplicate(content_hash): Promise<DuplicateCheckResult>

  // Run Reconstruction
  getRunManifest(run_id): Promise<RunArtifactManifest>

  // Maintenance
  pruneVersions(artifact_id, keep): Promise<number>
  count(query): Promise<number>
}
```

---

## 12. Edge Cases

### 12.1 Content Exceeds Max Size
Reject with error. Do not silently truncate.

### 12.2 Hash Collision
Extremely unlikely with SHA-256. If detected, store both and flag for investigation.

### 12.3 Orphaned Artifacts
Artifacts whose run_id references a deleted run. Retain for lineage integrity; mark as orphaned.

### 12.4 Circular Lineage
Should not occur (DAG invariant). If detected, reject the lineage link and emit alert.

### 12.5 Version Limit Reached
When `max_versions_per_artifact` is hit, oldest versions are pruned automatically.

---

## 13. Extension Points

### 13.1 External Storage Adapters
Supabase, Postgres, S3, GCS, Azure Blob.

### 13.2 Vector Indexing
Embed artifact content for semantic search across the artifact corpus.

### 13.3 Artifact Compression
Compress content before storage (gzip, zstd).

### 13.4 Artifact Encryption
Encrypt content at rest for sensitive outputs.

### 13.5 Artifact Archiving
Move old artifacts to cold storage after retention period.

### 13.6 Artifact Replication
Cross-region or cross-tenant artifact mirroring.

### 13.7 Semantic Search
Vector-based similarity search for "find artifacts similar to X."

---

## 14. Relationship with Other Modules

```
┌────────────────────┐
│  Runtime Protocol  │  Defines ArtifactEnvelope, ArtifactKind,
│                    │  ArtifactLineage, ArtifactQuality
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Artifact Store    │  Persists, versions, deduplicates,
│                    │  tracks lineage, enables queries
└────────┬───────────┘
         │
         ├──→ Orchestrator (stores stage outputs)
         ├──→ Selection Engine (queries past performance data)
         ├──→ Policy Engine (audits artifact compliance)
         ├──→ Observability (artifact metrics)
         └──→ Memory System (links memories to artifacts)
```

---

## 15. Versioning

This document follows semantic versioning: `MAJOR.MINOR.PATCH`

Current version: `0.1.0`
