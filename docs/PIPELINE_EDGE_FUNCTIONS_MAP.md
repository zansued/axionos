# AxionOS — Pipeline to Edge Functions Map

> **Purpose:** Concrete mapping of every pipeline stage to its corresponding Edge Function(s), shared modules, and data flow.
> **Last Updated:** 2026-03-16

---

## Overview

AxionOS transforms an **Idea** into **Delivered Software** through a deterministic pipeline. Each stage is implemented as one or more **Edge Functions** (Deno/TypeScript) deployed on Supabase.

There are **two execution paths**:

| Path | Entry Point | Description |
|------|-------------|-------------|
| **Monolith** | `run-initiative-pipeline` | Single 3000-line function handling all stages via `stage` parameter. Legacy path. |
| **Modular** | Individual `pipeline-*` functions | Dedicated functions per stage. Current architecture. |

---

## Pipeline Stages — Concrete Edge Functions

### Layer 1 — Problem Comprehension

| Stage | Edge Function | Lines | Agents Orchestrated | Input | Output |
|-------|--------------|-------|---------------------|-------|--------|
| **Discovery** | `pipeline-discovery/index.ts` | 131 | Vision Agent, Market Analyst | `initiativeId` | `discovery_payload` (refined idea, business model, MVP scope, risk, stack) |
| **Discovery** *(legacy)* | `run-initiative-pipeline` → `stage: "discovery"` | — | Single AI call | Same | Same |
| **Comprehension** | `pipeline-comprehension/index.ts` | 392 | Vision Agent → Market Analyst → Requirements Agent → Product Architect | `initiativeId` | Enriched comprehension payload |

### Layer 2 — Squad Formation

| Stage | Edge Function | Lines | Description | Output |
|-------|--------------|-------|-------------|--------|
| **Squad Formation** | `pipeline-squad/index.ts` | ~150 | Creates AI agent squad with roles (architect, dev, qa, pm, etc.) | `squads` + `squad_members` + `agents` records |
| **Squad Formation** *(legacy)* | `run-initiative-pipeline` → `stage: "squad_formation"` | — | Same logic inline | Same |

### Layer 2.5 — Architecture Simulation

| Stage | Edge Function | Lines | Description | Output |
|-------|--------------|-------|-------------|--------|
| **Architecture Simulation** | `pipeline-architecture-simulation/index.ts` | 736 | Simulates and validates architecture model. Detects circular deps, missing files, structural problems. Auto-repairs plan when possible. | Validated architecture model |

### Layer 3 — Development Planning

| Stage | Edge Function | Lines | Agents Orchestrated | Output |
|-------|--------------|-------|---------------------|--------|
| **Planning** | `pipeline-planning/index.ts` | 440 | Task Planner → Story Generator → File Planner | `stories` + `story_phases` + `story_subtasks` with `file_path` and `file_type` |
| **Planning** *(legacy)* | `run-initiative-pipeline` → `stage: "planning"` | — | PRD Agent → Architecture Agent → Story Generator | Same |

### Layer 3.5 — Foundation Scaffold

| Stage | Edge Function | Lines | Description | Output |
|-------|--------------|-------|-------------|--------|
| **Foundation Scaffold** | `pipeline-foundation-scaffold/index.ts` | 621 | Creates minimal buildable project scaffold BEFORE feature code. Runs pre-build simulation. | Scaffold files (package.json, vite.config.ts, tsconfig.json, etc.) |

### Layer 3.6 — Module Graph Simulation

| Stage | Edge Function | Lines | Description | Output |
|-------|--------------|-------|-------------|--------|
| **Module Graph Simulation** | `pipeline-module-graph-simulation/index.ts` | 493 | Simulates Vite/Rollup module resolution. Detects broken imports, missing deps, circular refs. | Module graph validation report |

### Layer 3.7 — Dependency Intelligence

| Stage | Edge Function | Lines | Description | Output |
|-------|--------------|-------|-------------|--------|
| **Dependency Intelligence** | `pipeline-dependency-intelligence/index.ts` | 541 | Validates packages against npm registry. Detects peer dep issues, version conflicts, deprecated packages. Uses Firecrawl for ecosystem research. | Dependency health report |

### Layer 4 — Implementation (Code Generation)

| Stage | Edge Function | Lines | Architecture | Output |
|-------|--------------|-------|-------------|--------|
| **Execution** | `pipeline-execution/index.ts` | 541 | DAG-based Dependency Scheduler. Code Architect → Developer → Integration Agent. Order from Project Brain dependency graph. | `agent_outputs` with generated code per subtask |
| **Execution Orchestrator** | `pipeline-execution-orchestrator/index.ts` | 578 | Distributed worker architecture. Builds DAG, dispatches up to 6 parallel workers via `pipeline-execution-worker`. Incremental detection (skip unchanged files). | Same |
| **Execution Worker** | `pipeline-execution-worker/index.ts` | — | Individual file generation worker invoked by orchestrator. | Single file output |
| **Execution** *(legacy)* | `run-initiative-pipeline` → `stage: "execution"` | ~800 | Chain-of-Agents: Architect → Dev → QA. Sequential. | Same |

### Layer 5 — Validation

| Stage | Edge Function | Lines | Description | Output |
|-------|--------------|-------|-------------|--------|
| **Validation** | `pipeline-validation/index.ts` | 326 | Static + Runtime analysis. Fix Loop (max 2 attempts). Processes one artifact per invocation. Frontend retries until all validated. | Validation scores per artifact |
| **Deep Validation** | `pipeline-deep-validation/index.ts` | 361 | Deep static analysis. Runtime validation pre-check. Uses Brain context and prevention rules. | Deep analysis report |
| **Preventive Validation** | `pipeline-preventive-validation/index.ts` | 361 | Preventive architecture validation. Uses prevention rules v2 and Brain context. | Prevention recommendations |
| **Full Review** | `pipeline-full-review/index.ts` | 170 | Final holistic review of all artifacts against deterministic file overrides. | Review summary |

### Layer 5.5 — Runtime Validation

| Stage | Edge Function | Lines | Description | Output |
|-------|--------------|-------|-------------|--------|
| **Runtime Validation** | `pipeline-runtime-validation/index.ts` | 458 | Real `tsc` + `vite build` via GitHub Actions. Triggers CI workflow and monitors results. | Build success/failure + error details |
| **CI Webhook** | `pipeline-ci-webhook/index.ts` | 180 | Receives GitHub Actions workflow results. Records errors in Brain graph. | CI result processing |
| **Fix Orchestrator** | `pipeline-fix-orchestrator/index.ts` | 507 | CI-triggered fix swarm. Analyzes errors with AI, groups by file, dispatches parallel fix workers, creates PR. | Fixed files + PR |

### Layer 6 — Release & Publish

| Stage | Edge Function | Lines | Description | Output |
|-------|--------------|-------|-------------|--------|
| **Publish** | `pipeline-publish/index.ts` | 754 | Pre-flight checks → Changelog generation → GitHub push → Post-deploy verification. Dependency governance integration. | GitHub repository with committed files |

### Governance Gates

| Action | Edge Function | Lines | Description |
|--------|--------------|-------|-------------|
| **Approve** | `pipeline-approve/index.ts` | 95 | Advances initiative to next stage. Maps status transitions. |
| **Reject** | `pipeline-reject/index.ts` | 104 | Rolls back to previous stage with mandatory comment. Resets subtasks/outputs for re-execution. |

### Auxiliary Pipeline Functions

| Function | Edge Function | Lines | Description |
|----------|--------------|-------|-------------|
| **Fast Modify** | `pipeline-fast-modify/index.ts` | 115 | Quick single-file modification without full pipeline re-run. |
| **Drift Detection** | `pipeline-drift-detection/index.ts` | 400 | Detects architectural drift across Brain nodes, edges, decisions. Uses prevention rules. |

---

## Shared Infrastructure

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
| `contracts/security-matcher.schema.ts` | Security rule evaluation for pipeline outputs |

---

## Data Flow Pattern

All pipeline stages follow the same communication pattern:

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

State is persisted in `initiatives.stage_status` which drives the frontend UI progression:

```
draft → discovering → discovered → [approve] →
squad_ready → forming_squad → squad_formed → [approve] →
planning_ready → planning → planned → [approve] →
in_progress → validating → ready_to_publish → [approve] →
published → completed
```

---

## Source of Truth

This document must stay synchronized with:
- `docs/diagrams/system-brain-map.md` — High-level architectural diagram
- `docs/GOVERNANCE.md` — Pipeline orchestration contracts
- `supabase/functions/pipeline-*/index.ts` — Actual implementations
