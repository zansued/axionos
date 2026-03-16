# AxionOS — Initiative Delivery Pipeline Map

> **Purpose:** Concrete mapping of every **initiative delivery pipeline** stage to its Edge Function(s), shared modules, and data flow.  
> **Scope:** This document covers **only** the initiative delivery pipeline — from idea intake through publish/deploy.  
> **Out of Scope:** Governance engines, canon operations, action execution, learning loops, advisory systems, architecture evolution, and all other AxionOS edge functions. See [`EDGE_FUNCTIONS_SYSTEM_MAP.md`](./EDGE_FUNCTIONS_SYSTEM_MAP.md) for the full system catalog.  
> **Last Updated:** 2026-03-16

---

## Execution Paths

| Path | Entry Point | Status | Description |
|------|-------------|--------|-------------|
| **Modular** | Individual `pipeline-*` functions | **Current** | Dedicated functions per stage. Active architecture. |
| **Monolith** | `run-initiative-pipeline` | **Legacy** | Single ~3000-line function. Compatibility only. See [Legacy Compatibility Path](#legacy-compatibility-path). |

---

## Section 1 — Initiative Delivery Pipeline

### Layer 1 — Problem Comprehension

| Stage | Edge Function | Status | Agents | Input | Output |
|-------|--------------|--------|--------|-------|--------|
| **Discovery** | `pipeline-discovery/index.ts` | Current | Vision Agent, Market Analyst | `initiativeId` | `discovery_payload` (refined idea, business model, MVP scope, risk, stack) |
| **Comprehension** | `pipeline-comprehension/index.ts` | Current | Vision → Market → Requirements → Product Architect | `initiativeId` | Enriched comprehension payload |

### Layer 2 — Squad Formation

| Stage | Edge Function | Status | Description | Output |
|-------|--------------|--------|-------------|--------|
| **Squad Formation** | `pipeline-squad/index.ts` | Current | Creates AI agent squad with roles (architect, dev, qa, pm, etc.) | `squads` + `squad_members` + `agents` records |

### Layer 2.5 — Architecture Simulation

| Stage | Edge Function | Status | Description | Output |
|-------|--------------|--------|-------------|--------|
| **Architecture Simulation** | `pipeline-architecture-simulation/index.ts` | Current | Simulates and validates architecture model. Detects circular deps, missing files, structural problems. Auto-repairs plan when possible. | Validated architecture model |

### Layer 3 — Development Planning

| Stage | Edge Function | Status | Description | Output |
|-------|--------------|--------|-------------|--------|
| **Planning** | `pipeline-planning/index.ts` | Current | Task Planner → Story Generator → File Planner | `stories` + `story_phases` + `story_subtasks` with `file_path` and `file_type` |

### Layer 3.5 — Foundation Scaffold

| Stage | Edge Function | Status | Description | Output |
|-------|--------------|--------|-------------|--------|
| **Foundation Scaffold** | `pipeline-foundation-scaffold/index.ts` | Current | Creates minimal buildable project scaffold BEFORE feature code. Runs pre-build simulation. | Scaffold files (package.json, vite.config, tsconfig, etc.) |

### Layer 3.6 — Module Graph Simulation

| Stage | Edge Function | Status | Description | Output |
|-------|--------------|--------|-------------|--------|
| **Module Graph Simulation** | `pipeline-module-graph-simulation/index.ts` | Current | Simulates Vite/Rollup module resolution. Detects broken imports, missing deps, circular refs. | Module graph validation report |

### Layer 3.7 — Dependency Intelligence

| Stage | Edge Function | Status | Description | Output |
|-------|--------------|--------|-------------|--------|
| **Dependency Intelligence** | `pipeline-dependency-intelligence/index.ts` | Current | Validates packages against npm registry. Detects peer dep issues, version conflicts, deprecated packages. | Dependency health report |

### Layer 4 — Implementation (Code Generation)

| Stage | Edge Function | Status | Description | Output |
|-------|--------------|--------|-------------|--------|
| **Execution Orchestrator** | `pipeline-execution-orchestrator/index.ts` | Current | DAG-based distributed worker arch. Builds dependency graph, dispatches up to 6 parallel workers. Incremental detection (skip unchanged). | `agent_outputs` with generated code |
| **Execution Worker** | `pipeline-execution-worker/index.ts` | Current (internal) | Individual file generation worker invoked by orchestrator. | Single file output |
| **Execution** | `pipeline-execution/index.ts` | Current (fallback) | Sequential DAG-based execution. Code Architect → Developer → Integration Agent. | Same |

### Layer 5 — Validation

| Stage | Edge Function | Status | Description | Output |
|-------|--------------|--------|-------------|--------|
| **Validation** | `pipeline-validation/index.ts` | Current | Static + Runtime analysis. Fix Loop (max 2 attempts). One artifact per invocation. | Validation scores per artifact |
| **Deep Validation** | `pipeline-deep-validation/index.ts` | Current | Deep static analysis with Brain context and prevention rules. | Deep analysis report |
| **Preventive Validation** | `pipeline-preventive-validation/index.ts` | Current | Preventive architecture validation using prevention rules v2. | Prevention recommendations |
| **Full Review** | `pipeline-full-review/index.ts` | Current | Final holistic review of all artifacts against deterministic file overrides. | Review summary |

> ⚠️ **Orchestration Hotspot:** `pipeline-validation` processes one artifact per invocation. The frontend currently retries until all artifacts are validated. This retry logic should migrate to backend job orchestration in a future sprint.

---

## Section 2 — Runtime & Recovery Loop

This is a closed loop: **validate → ingest CI result → fix swarm → PR → re-validate**.

```
┌─────────────────────────────────────────────────┐
│              Runtime & Recovery Loop             │
│                                                  │
│  pipeline-runtime-validation                     │
│       │ triggers GitHub Actions CI               │
│       ▼                                          │
│  pipeline-ci-webhook                             │
│       │ receives CI results                      │
│       │ records errors in Brain graph            │
│       ▼                                          │
│  pipeline-fix-orchestrator                       │
│       │ AI error analysis                        │
│       │ groups errors by file                    │
│       │ dispatches parallel fix workers           │
│       │ creates PR                               │
│       ▼                                          │
│  (loop back to runtime-validation)               │
└─────────────────────────────────────────────────┘
```

| Stage | Edge Function | Status | Description | Output |
|-------|--------------|--------|-------------|--------|
| **Runtime Validation** | `pipeline-runtime-validation/index.ts` | Current | Real `tsc` + `vite build` via GitHub Actions. Triggers CI workflow and monitors results. | Build success/failure + error details |
| **CI Webhook** | `pipeline-ci-webhook/index.ts` | Current | Receives GitHub Actions workflow results. Records errors in Brain graph. | CI result processing |
| **Fix Orchestrator** | `pipeline-fix-orchestrator/index.ts` | Current | CI-triggered fix swarm. Analyzes errors with AI, groups by file, dispatches parallel fix workers, creates PR. | Fixed files + PR |

---

## Section 3 — Governance Gates

| Action | Edge Function | Status | Description |
|--------|--------------|--------|-------------|
| **Approve** | `pipeline-approve/index.ts` | Current | Advances initiative to next stage. Maps status transitions. |
| **Reject** | `pipeline-reject/index.ts` | Current | Rolls back to previous stage with mandatory comment. Resets subtasks/outputs for re-execution. |

---

## Section 4 — Downstream Governed Action Stack

> These functions are **downstream of delivery** and belong to the **governed action/execution path**, not to the delivery pipeline itself. They are included here to clarify the boundary.

```
Pipeline Publish ──► Action Engine ──► Approval Gate ──► Axion Execution Worker
                         │                   │                    │
                   Formalizes actions    Expiration cron      Executes only
                   in registry          for stale approvals   governed+approved
                                                              actions with audit
```

| Function | Edge Function | Relationship to Pipeline | Description |
|----------|--------------|--------------------------|-------------|
| **Action Engine** | `action-engine/index.ts` | Post-pipeline | Formalizes AI-generated actions into `action_registry_entries`. Parses Axion-style artifacts. |
| **Approval Expiration** | `approval-expiration/index.ts` | Post-pipeline (cron) | Expires stale `action_approval_requests` and propagates status to `action_registry_entries`. |
| **Axion Execution Worker** | `axion-execution-worker/index.ts` | Post-pipeline | Executes only governed and approved actions. Full audit trail via `action_audit_events`. |

---

## Section 5 — Auxiliary Pipeline Functions

| Function | Edge Function | Status | Description |
|----------|--------------|--------|-------------|
| **Fast Modify** | `pipeline-fast-modify/index.ts` | Current | Quick single-file modification without full pipeline re-run. |
| **Drift Detection** | `pipeline-drift-detection/index.ts` | Current | Detects architectural drift across Brain nodes, edges, decisions. Uses prevention rules. |

---

## Section 6 — Shared Infrastructure

All pipeline functions depend on these shared modules in `supabase/functions/_shared/`:

| Module | Purpose |
|--------|---------|
| `pipeline-bootstrap.ts` | CORS, auth, rate limiting, initiative fetch, org membership validation, usage limits |
| `pipeline-helpers.ts` | `pipelineLog()`, `updateInitiative()`, `createJob()`, `completeJob()`, `failJob()`, `recordAgentMessage()` |
| `ai-client.ts` | `callAI()` — unified AI gateway with provider failover (OpenAI → DeepSeek → Lovable Gateway) |
| `ai-router.ts` | AI model routing matrix (economy vs. precision tasks) |
| `brain-helpers.ts` | Project Brain graph operations: `upsertNode()`, `addEdge()`, `recordError()`, `generateBrainContext()` |
| `smart-context.ts` | Context window builder with semantic search integration |
| `dependency-scheduler.ts` | DAG builder: `buildExecutionDAG()`, `getReadyNodes()`, wave computation (Kahn's algorithm) |
| `incremental-engine.ts` | File change detection: `computeIncrementalDiff()`, hash comparison for skip-unchanged optimization |
| `code-sanitizers.ts` | `sanitizePackageJson()`, `DETERMINISTIC_FILES`, `detectMissingDependencies()` |
| `dependency-governance.ts` | `runDependencyGovernance()` — validates dependencies against governance rules |
| `embedding-helpers.ts` | `semanticSearch()`, `batchEmbedNodes()` — vector embeddings for context retrieval |
| `cors.ts` | CORS headers, `handleCors()`, `jsonResponse()`, `errorResponse()` |
| `rate-limit.ts` | `checkRateLimit()` per user per function |
| `usage-limit-enforcer.ts` | `enforceUsageLimits()` — billing/plan enforcement |

---

## Data Flow Pattern

```
Frontend → supabase.functions.invoke("pipeline-<stage>", { body: { initiativeId } })
         ↓
   pipeline-bootstrap.ts (auth + rate limit + org validation + usage check)
         ↓
   Stage logic (AI calls + DB reads/writes)
         ↓
   Writes to: initiatives, stories, story_phases, story_subtasks, agent_outputs,
              audit_logs, initiative_jobs, brain_graph_nodes, brain_graph_edges
         ↓
   Returns JSON response to frontend
```

State progression in `initiatives.stage_status`:

```
draft → discovering → discovered → [approve] →
squad_ready → forming_squad → squad_formed → [approve] →
planning_ready → planning → planned → [approve] →
in_progress → validating → ready_to_publish → [approve] →
published → completed
```

---

## Legacy Compatibility Path

> ⚠️ **Deprecation candidate.** This path exists for backward compatibility only.

`run-initiative-pipeline` is a single ~3000-line function that handles all stages via a `stage` parameter. It covers discovery, squad formation, and planning inline. The modular `pipeline-*` functions are the canonical current architecture.

**Do not extend the legacy path.** New features must use the modular architecture.

---

## Source of Truth

This document must stay synchronized with:
- [`EDGE_FUNCTIONS_SYSTEM_MAP.md`](./EDGE_FUNCTIONS_SYSTEM_MAP.md) — Full system catalog
- `docs/diagrams/system-brain-map.md` — High-level architectural diagram
- `docs/GOVERNANCE.md` — Pipeline orchestration contracts
- `supabase/functions/pipeline-*/index.ts` — Actual implementations
