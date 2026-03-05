# SynkrAIOS — Architectural Review & Evolution Plan

> Deep technical analysis of the AI-orchestrated software generation system.  
> Last updated: 2026-03-05

---

## 1. Project Overview

**SynkrAIOS** (formerly AxionOS) is a multi-tenant SaaS platform that orchestrates multiple AI agents to collaboratively generate complete software projects — from a raw idea to a deployed GitHub repository.

### Core Value Proposition
A human provides an idea → AI agents autonomously analyze, plan, architect, code, validate, and publish a working application.

### Technology Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui |
| State Management | TanStack React Query + React Context |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions, RLS) |
| AI Engine | Hybrid: Google Gemini 2.5 Flash/Pro via Lovable AI Gateway |
| Git Integration | GitHub API v3 (Tree API for atomic commits, PRs) |
| URL Scraping | Firecrawl (self-hosted or cloud) |
| Deployment | Vercel/Netlify configs auto-generated |

### Multi-Tenancy Model
- **Organizations** → **Workspaces** → **Initiatives**
- RLS policies enforce isolation per `organization_id`
- Role-based access: `owner`, `admin`, `editor`, `reviewer`, `viewer`
- Auto-provisioning: first login creates a default org via `create_organization_with_owner` RPC

---

## 2. Current Architecture (Implemented)

### 2.1 Pipeline Stages — 8-Layer Model

The system implements an **8-layer governance pipeline** with human gates and dedicated Edge Functions per stage:

```
Idea Input
  → Layer 1: Comprehension (pipeline-comprehension) — 4 agents
  → Layer 2: Architecture (pipeline-architecture) — 4 agents
  → Squad Formation (pipeline-squad)
  → Layer 3: Planning (pipeline-planning)
  → Layer 4: Execution (pipeline-execution-orchestrator + workers)
  → Layer 5: Validation
      → AI Validation (pipeline-validation) — Fix Loop (3x)
      → Deep Static Analysis (pipeline-deep-validation) — Import/Type/Build checks
      → Architectural Drift Detection (pipeline-drift-detection) — Layer violations
      → Runtime Validation (pipeline-runtime-validation) — Real tsc + vite build via CI
  → Layer 6: Publish (pipeline-publish) — Atomic Git Tree API
  → Completed
```

Stage status transitions:
```
draft → discovering → discovered → architecture_ready → architecting → architected
→ squad_ready → forming_squad → squad_formed → planning_ready → planning → planned
→ in_progress → validating → ready_to_publish → published → completed
```

#### Layer 1: Comprehension (4 Agents)
**Edge Function:** `pipeline-comprehension`  
**Agents:** Vision Agent, Market Analyst, Requirements Agent, Product Architect  
**Output:** Structured discovery JSON (refined idea, business model, MVP scope, complexity, risk, stack, market analysis, feasibility)  
**Gate:** Human approves → `architecture_ready`

#### Layer 2: Architecture (4 Agents)  
**Edge Function:** `pipeline-architecture`  
**Agents:** System Architect, Data Architect, API Architect, Dependency Planner  
**Process:**
1. System Architecture (component diagram, patterns, deployment)
2. Data Architecture (database schema, tables, relationships, RLS)
3. API Architecture (endpoints, contracts, auth flows)
4. Dependency Planner (file tree with dependency graph, generation order)
5. **Project Brain population** — creates `project_brain_nodes` and `project_brain_edges`
6. Records architectural decisions in `project_decisions`

**Output:** Architecture + Data Model + API Contracts + Dependency Graph + Project Brain  
**Gate:** Human approves → `squad_ready`

#### Squad Formation
**Edge Function:** `pipeline-squad`  
**Process:** AI generates optimal squad (3-8 agents) based on project needs  
**Output:** Squad with specialized agents  
**Gate:** Human approves → `planning_ready`

#### Layer 3: Planning
**Edge Function:** `pipeline-planning`  
**Process:**
1. PRD Generation
2. Architecture Document
3. Code-Aware Story Generation (each subtask = 1 file with `file_path` + `file_type`)
4. Creates `stories` → `story_phases` → `story_subtasks` hierarchy

**Output:** PRD + Architecture + Stories with file-level subtasks  
**Gate:** Human approves → `in_progress`

#### Layer 4: Execution (Agent Swarm — Orchestrator + Workers)
**Edge Functions:** `pipeline-execution-orchestrator` + `pipeline-execution-worker`

**Orchestrator responsibilities:**
1. Builds Execution DAG from Project Brain (nodes + edges)
2. Computes execution waves via topological sort (Kahn's algorithm)
3. Dispatches workers in parallel (max 6 concurrent)
4. **Smart Context Window** — sends only API surfaces (exports/types) instead of full files (~60-80% token reduction)
5. Monitors completion, triggers next waves
6. Handles retries (up to 2x per node)
7. Records errors in `project_errors` on permanent failure

**Worker responsibilities (per file):**
1. Receives node context + smart dependency context (compact API surfaces)
2. Runs agent chain: Code Architect → Developer → Integration Agent
3. Stores artifact (`agent_outputs` + `code_artifacts`)
4. Updates Project Brain node status → `generated`
5. Extracts imports from generated code → creates brain edges
6. Returns generated code to orchestrator for context injection

**Execution Order Example:**
```
Wave 1: types.ts, schema.sql         (no dependencies)
Wave 2: auth-service.ts, api.ts      (depend on types)
Wave 3: useAuth.ts, useUsers.ts      (depend on services)
Wave 4: UserCard.tsx, Dashboard.tsx   (depend on hooks)
```

**Layer Priority (within waves):**
```
config(0) → scaffold(1) → schema(2) → migration(3) → type(4) → style(5)
→ util(6) → service(7) → hook(8) → component(9) → page(10) → test(11)
```

#### Layer 5: Validation (4-Stage Pipeline)

**Stage 5a: AI Validation + Fix Loop**  
**Edge Function:** `pipeline-validation`  
Fix Loop v2 — each artifact passes through Static Analysis (Agent 15) + Runtime QA (Agent 16). If score < 70 or critical issues found, Fix Agent (Agent 17) corrects and the full validation cycle repeats (max 3x). Exhausted attempts escalate to human review (`pending_review`).

**Stage 5b: Deep Static Analysis**  
**Edge Function:** `pipeline-deep-validation`  
AI-simulated compiler checks: import resolution, cross-file type consistency, dependency audit, build config validation, prevention rules check.

**Stage 5c: Architectural Drift Detection**  
**Edge Function:** `pipeline-drift-detection`  
Hybrid detection (rule-based + AI): classifies files by layer (pages → components → hooks → services → data), detects inverted dependencies, missing layers, boundary violations. Violations recorded in `project_errors` + prevention rules generated.

**Stage 5d: Runtime Validation (Real tsc + vite build)**  
**Edge Function:** `pipeline-runtime-validation`  
Pushes code to temporary `validate/{id}` branch on GitHub. GitHub Actions runs `npm install → tsc --noEmit → vite build`. Results come back via `pipeline-ci-webhook`. Real compiler errors feed into Fix Swarm.

**Auto-trigger chain:** Execution → AI Validation → Deep Analysis → Drift Detection → (optional) Runtime Validation → Ready to Publish

#### Layer 6: Publish (Atomic Git Tree API)
**Edge Function:** `pipeline-publish`  
**Process:**
1. Pre-flight Checks (Release Agent) — validates artifact integrity
2. Changelog & Commit Messages — generates CHANGELOG.md + Conventional Commits
3. **Atomic GitHub Push via Tree API** — Create Blobs (parallel batches of 5) → Build Tree → Single Commit → Update Ref
4. Post-deploy Verification — checks repository integrity
5. CI Workflow injection — adds `.github/workflows/validate.yml`

**Output:** GitHub repo URL with single atomic commit

#### CI-Triggered Fix Swarm
**Edge Functions:** `pipeline-ci-webhook` + `pipeline-fix-orchestrator`  
When GitHub CI fails:
1. `pipeline-ci-webhook` receives workflow results, records errors in `project_errors`
2. `pipeline-fix-orchestrator` groups errors by file, dispatches fix workers in parallel
3. Creates atomic PR via Git Tree API with all fixes
4. Learning Agent generates prevention rules from fixes

### 2.2 Project Brain (Fully Implemented ✅)

A structured knowledge system representing the entire generated project:

**Tables:**
- `project_brain_nodes` — Files, components, hooks, services, APIs, tables, types
- `project_brain_edges` — imports, depends_on, calls_api, uses_component, etc.
- `project_decisions` — Architectural decisions with categories and supersedes chain
- `project_errors` — Historical errors with root causes and prevention rules
- `project_prevention_rules` — Self-healing rules with confidence scoring

**Features:**
- Full-text search via `tsvector` on nodes
- RLS policies for multi-tenant isolation
- Context generation for AI prompts (`generateBrainContext()`)
- Edge extraction from generated code (regex-based import parsing)
- Status tracking: planned → generated → validated → published

### 2.3 Dependency Scheduler (Fully Implemented ✅)

DAG-based execution ordering system in `_shared/dependency-scheduler.ts`:
- `buildExecutionDAG()` — Builds DAG from brain nodes/edges + subtask mapping
- `computeWaves()` — Topological sort (Kahn's algorithm) grouping nodes by wave level
- `getReadyNodes()` — Returns nodes with all dependencies satisfied
- `applyLayerPriorities()` — Soft dependencies based on file type layers
- `breakCycles()` — DFS cycle detection and edge removal
- `updateBrainEdgesFromImports()` — Parses generated code to discover real imports

### 2.4 Smart Context Window (Fully Implemented ✅)

AST-like parser in `_shared/smart-context.ts` that extracts only public API surfaces:

**Extraction targets:**
- Import statements (static + dynamic)
- Exported types, interfaces, enums, classes
- Function/hook signatures (without body)
- Component props types
- Re-exports

**Context budget allocation:**
- 60% → Direct dependency files (full compact context: imports + exports + types)
- 40% → Other files (export signatures only, prioritized: types > hooks > services > components > pages)

**Compression:** ~60-80% reduction in tokens sent to AI

**Integration:** Used by `pipeline-execution-orchestrator` when building worker payloads.

### 2.5 Self-Healing Codebase (Fully Implemented ✅)

- Learning Agent generates prevention rules after each fix
- `upsertPreventionRule()` — incremental confidence scoring
- Rules injected into all AI prompts via `generateBrainContext()`
- Aba Self-Healing no `ProjectBrainPanel`
- `project_prevention_rules` table with scope (initiative/org-wide)

### 2.6 Edge Function Architecture

```
supabase/functions/
├── pipeline-comprehension/          Layer 1 — Understanding (4 agents)
├── pipeline-architecture/           Layer 2 — Architecture + Brain Population (4 agents)
├── pipeline-squad/                  Squad Formation
├── pipeline-planning/               Layer 3 — Planning
├── pipeline-execution/              Layer 4 — Execution (legacy sequential)
├── pipeline-execution-orchestrator/ Layer 4 — Execution Orchestrator (swarm)
├── pipeline-execution-worker/       Layer 4 — Execution Worker (single file)
├── pipeline-validation/             Layer 5a — AI Validation + Fix Loop
├── pipeline-deep-validation/        Layer 5b — Deep Static Analysis
├── pipeline-drift-detection/        Layer 5c — Architectural Drift Detection
├── pipeline-runtime-validation/     Layer 5d — Runtime Validation (tsc + vite via CI)
├── pipeline-ci-webhook/             CI Results Webhook
├── pipeline-fix-orchestrator/       CI Fix Swarm (auto-fix + PR)
├── pipeline-publish/                Layer 6 — Publish (Atomic Tree API)
├── pipeline-approve/                Gate: Approve
├── pipeline-reject/                 Gate: Reject
├── pipeline-fast-modify/            Quick single-file modification
├── pipeline-full-review/            Full project review
├── brain-sync/                      Project Brain synchronization
├── execute-subtask/                 Legacy single subtask execution
├── generate-agents/                 Agent generation
├── generate-stories/                Story generation
├── organize-stories/                Story organization
├── generate-planning-content/       Planning content generation
├── analyze-artifact/                Artifact AI analysis
├── rework-artifact/                 Artifact rework
├── run-initiative-pipeline/         Legacy pipeline router
├── github-proxy/                    GitHub API proxy
├── _shared/
│   ├── ai-client.ts                 Unified AI client (Lovable Gateway + retry + cost)
│   ├── pipeline-helpers.ts          Logging, jobs, agent messages
│   ├── pipeline-bootstrap.ts        Auth, CORS, rate limiting, initiative fetch
│   ├── dependency-scheduler.ts      DAG builder + wave computation
│   ├── brain-helpers.ts             Project Brain CRUD + context generation
│   ├── smart-context.ts             Smart Context Window (AST-like parser)
│   ├── code-sanitizers.ts           Deterministic files, package.json sanitizer
│   ├── auth.ts                      Authentication utilities
│   ├── cors.ts                      CORS headers + response helpers
│   └── rate-limit.ts                Rate limiting per user+function
```

### 2.7 Data Model

```
organizations ──┬── workspaces
                ├── initiatives ──┬── stories ──── story_phases ──── story_subtasks
                │                 ├── squads ──── squad_members ──── agents
                │                 ├── agent_outputs ──┬── code_artifacts
                │                 │                   ├── artifact_reviews
                │                 │                   ├── adrs
                │                 │                   └── content_documents
                │                 ├── agent_messages
                │                 ├── initiative_jobs
                │                 ├── project_brain_nodes ←→ project_brain_edges
                │                 ├── project_decisions
                │                 ├── project_errors
                │                 └── project_prevention_rules
                ├── agent_memory
                ├── org_knowledge_base
                ├── git_connections
                ├── supabase_connections
                ├── stage_sla_configs
                ├── org_usage_limits
                └── audit_logs
```

### 2.8 Agent Roles (18 Agents)

| # | Role | Layer | Responsibilities |
|---|------|-------|-----------------|
| 1 | Vision Agent | L1 | Strategic vision, product goals |
| 2 | Market Analyst | L1 | Market analysis, competitors, positioning |
| 3 | Requirements Agent | L1 | Requirements, constraints, scope |
| 4 | Product Architect | L1 | MVP scope, feasibility, risk assessment |
| 5 | System Architect | L2 | Technical structure, patterns, deployment |
| 6 | Data Architect | L2 | Database schema, relationships, RLS |
| 7 | API Architect | L2 | Endpoints, contracts, auth flows |
| 8 | Dependency Planner | L2 | File tree, dependency graph, generation order |
| 9 | Squad Manager | L2 | Squad composition, role assignment |
| 10 | Task Planner | L3 | Story decomposition, subtask creation |
| 11 | Story Generator | L3 | User stories, acceptance criteria |
| 12 | File Planner | L3 | File-level planning, path assignment |
| 13 | Code Architect | L4 | Interfaces, types, contracts, imports |
| 14 | Developer Agent | L4 | Full code implementation |
| 15 | Integration Agent | L4 | Import verification, dependency checking |
| 16 | Static Analysis Agent | L5 | Code quality scoring (0-100) |
| 17 | Runtime QA Agent | L5 | Runtime behavior analysis |
| 18 | Release Agent | L6 | Pre-flight, changelog, publish, verification |

---

## 3. Implementation Status Summary

| # | System | Status | Details |
|---|--------|--------|---------|
| 1 | Pipeline Decomposition | ✅ | 20+ independent Edge Functions |
| 2 | Project Brain | ✅ | Nodes, edges, decisions, errors, prevention rules, tsvector |
| 3 | Dependency Scheduler | ✅ | DAG builder, topological sort, wave computation |
| 4 | Agent Swarm | ✅ | Orchestrator + Worker, parallel execution (6 workers) |
| 5 | DAG Visualization | ✅ | Interactive graph in ProjectBrainPanel |
| 6 | CI-Triggered Fix Swarm | ✅ | Webhook + Fix Orchestrator + auto-PR |
| 7 | Self-Healing Codebase | ✅ | Prevention rules with confidence scoring |
| 8 | Architectural Drift Detection | ✅ | Rule-based + AI hybrid, layer violations |
| 9 | Atomic Git Commits | ✅ | Tree API for publish + fix PRs |
| 10 | Runtime Validation | ✅ | Real tsc + vite build via GitHub Actions CI |
| 11 | Smart Context Window | ✅ | AST-like parser, ~60-80% token reduction |
| 12 | Vector Embeddings | ❌ | tsvector only, no pgvector |
| 13 | Incremental Re-execution | ❌ | Full reset on reject |
| 14 | Initiative Templates | ❌ | No pre-built templates |

---

## 4. Remaining Gaps

### 4.1 🟡 No Semantic Vector Search
Project Brain uses `tsvector` for keyword search. Vector embeddings (`pgvector`) not yet implemented for natural language queries and similarity-based context injection.

### 4.2 🟡 No Incremental Re-execution
Reject resets all subtasks. No way to re-generate only affected files based on `content_hash` changes.

### 4.3 🟠 No Initiative Templates
No pre-built templates for common project types (SaaS, API, Landing Page, etc.).

### 4.4 🟠 Export & Reporting
No CSV/PDF export of observability data, audit logs, or cost reports.

---
