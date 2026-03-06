# Agent OS — Memory System (v0.6)

> Normative specification for persistent, cross-run memory in Agent OS.

## 1. Design Rationale

The Memory System enables agents to **learn from previous executions** by persisting and retrieving contextual knowledge. It transforms Agent OS from a stateless pipeline into a system that accumulates intelligence over time.

### Principles

1. **Infrastructure-agnostic** — `IMemoryStore` adapter pattern; swap backends freely.
2. **Multi-type** — Six memory types (run, episodic, semantic, vector, procedural, meta) serve different knowledge needs.
3. **Vector-native** — First-class embedding support with `IMemoryEmbeddingProvider` for semantic retrieval.
4. **Retention-aware** — Configurable policies (TTL, importance, access-based, capacity) prevent unbounded growth.
5. **Observable** — 12 event types emitted through the EventBus.
6. **Linked** — Memory entries reference runs, artifacts, agents, capabilities, decisions, and errors.

## 2. Module Structure

```
agent-os/
├── memory-system.ts    ← Contracts (this spec)
├── memory.ts           ← Existing in-memory RunMemory (unchanged)
├── index.ts            ← Re-exports
└── (future)
    ├── memory-supabase.ts     ← Supabase/pgvector adapter
    ├── memory-redis.ts        ← Redis adapter
    └── memory-consolidator.ts ← Knowledge consolidation
```

## 3. Architecture

```
Agent / Orchestrator
       │
       ▼
MemoryWriteRequest
       │
       ▼
  IMemoryStore
       │
       ├─ write() → dedup check → store → auto-embed
       ├─ get()   → retrieve + record access
       ├─ query() → structured filter
       └─ searchSimilar() → vector similarity
              │
              ▼
  IMemoryEmbeddingProvider
       │
       ├─ embed(text) → MemoryEmbeddingVector
       └─ embedBatch(texts[])
              │
              ▼
     Observability Layer
```

## 4. Memory Types

| Type | Scope | Retention | Example |
|---|---|---|---|
| `run` | Single run | TTL (24h) | Intermediate results, stage state |
| `episodic` | Historical | Capacity (10k) | Run summaries, task outcomes |
| `semantic` | Permanent | Permanent | Validated strategies, domain knowledge |
| `vector` | Similarity | Importance (≥0.3) | Embeddings for semantic retrieval |
| `procedural` | Permanent | Permanent | How-to patterns, repair strategies |
| `meta` | System | TTL (7d) | Consolidation metadata |

## 5. Vector Memory

Semantic retrieval via cosine similarity:
- `MemoryEmbeddingVector`: values[], dimensions, model, generated_at
- `MemoryVectorQuery`: embedding, top_k, min_similarity, filters
- `MemorySimilarityResult`: record + similarity score + distance metric
- Supported metrics: cosine, euclidean, dot_product

## 6. Retention Policies

Five strategies control memory lifecycle:
- **permanent**: Never expires
- **ttl**: Expires after configured seconds
- **importance**: Kept if importance ≥ threshold
- **access_based**: Kept if accessed frequently
- **capacity**: Evict oldest when namespace limit reached
- **manual**: Only deleted explicitly

## 7. Memory Linking

`MemoryReference` connects entries to:
- Runs, stages, agents, artifacts
- Capabilities, tools, decisions, errors
- Other memory entries (for consolidation graphs)

## 8. Integration Points

| Module | Integration |
|---|---|
| **Artifact Store** | Memory references artifacts; artifact creation triggers memory |
| **Observability** | Memory operations recorded as telemetry |
| **EventBus** | 12 event types for lifecycle visibility |
| **LLM Adapter** | Embedding generation via `IMemoryEmbeddingProvider` |
| **Policy Engine** | May restrict memory access by scope |
| **Selection Engine** | Historical performance data feeds routing |

## 9. Event Taxonomy

| Event | When |
|---|---|
| `memory.created` | New entry stored |
| `memory.updated` | Entry modified |
| `memory.deleted` | Entry removed |
| `memory.accessed` | Entry retrieved |
| `memory.embedded` | Embedding generated |
| `memory.expired` | TTL/policy expiration |
| `memory.archived` | Entry archived |
| `memory.pruned` | Batch cleanup |
| `memory.deduplicated` | Duplicate content detected |
| `memory.query_executed` | Structured query ran |
| `memory.vector_search_executed` | Vector search ran |
| `memory.consolidation_triggered` | Knowledge consolidation started |

## 10. Roadmap Alignment

Completes **Phase 0.6** of the Agent OS Evolution Roadmap.

Kernel status:
- ✅ Runtime Protocol (v0.1)
- ✅ Capability Model (v0.2)
- ✅ Selection Engine (v0.2)
- ✅ Policy Engine (v0.1)
- ✅ Artifact Store (v0.2)
- ✅ Observability Layer (v0.3)
- ✅ LLM Adapter Layer (v0.4)
- ✅ Tool Adapter Layer (v0.5)
- ✅ Memory System (v0.6)

Next phase: **v0.7 — Adaptive Routing**.
