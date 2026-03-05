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
| AI Engine | Hybrid: OpenAI GPT-4o-mini or Google Gemini 2.5 Flash/Pro via Lovable AI Gateway |
| Git Integration | GitHub API v3 (create repo, commit files, create PRs) |
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
  → Layer 5: Validation (pipeline-validation)
  → Layer 6: Publish (pipeline-publish)
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
4. Monitors completion, triggers next waves
5. Handles retries (up to 2x per node)
6. Records errors in `project_errors` on permanent failure

**Worker responsibilities (per file):**
1. Receives node context + dependency code
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

#### Layer 5: Validation
**Edge Function:** `pipeline-validation`  
**Process:** AI reviews each artifact with 5 criteria, auto-approve/rework/reject  
**Gate:** All approved → `ready_to_publish`

#### Layer 6: Publish
**Edge Function:** `pipeline-publish`  
**Process:** Creates GitHub repo, generates semantic commits, pushes code  
**Output:** GitHub repo URL

#### Additional Functions
- `pipeline-fast-modify` — Single-file AI modification + auto-republish via PR
- `pipeline-full-review` — AI reviews entire project, fixes multiple files, creates PR
- `pipeline-approve` / `pipeline-reject` — Gate actions
- `brain-sync` — Synchronize Project Brain state

### 2.2 Project Brain (Fully Implemented ✅)

A structured knowledge system representing the entire generated project:

**Tables:**
- `project_brain_nodes` — Files, components, hooks, services, APIs, tables, types
- `project_brain_edges` — imports, depends_on, calls_api, uses_component, etc.
- `project_decisions` — Architectural decisions with categories and supersedes chain
- `project_errors` — Historical errors with root causes and prevention rules

**Features:**
- Full-text search via `tsvector` on nodes
- Semantic search via `search_vector` column
- RLS policies for multi-tenant isolation
- Context generation for AI prompts (`generateBrainContext()`)
- Edge extraction from generated code (regex-based import parsing)
- Status tracking: planned → generated → validated → published

### 2.3 Dependency Scheduler (Fully Implemented ✅)

DAG-based execution ordering system:

**Components:**
- `buildExecutionDAG()` — Builds DAG from brain nodes/edges + subtask mapping
- `computeWaves()` — Topological sort (Kahn's algorithm) grouping nodes by wave level
- `getReadyNodes()` — Returns nodes with all dependencies satisfied
- `applyLayerPriorities()` — Soft dependencies based on file type layers
- `breakCycles()` — DFS cycle detection and edge removal
- `updateBrainEdgesFromImports()` — Parses generated code to discover real imports
- `formatExecutionPlan()` — Human-readable execution plan for logging

**File:** `supabase/functions/_shared/dependency-scheduler.ts`

### 2.4 Agent Swarm (Fully Implemented ✅)

Distributed execution via Orchestrator + Worker architecture:

**Orchestrator** (`pipeline-execution-orchestrator`):
- Builds DAG, creates waves, dispatches workers via `fetch()` to worker Edge Function
- Parallel execution with configurable `MAX_WORKERS = 6`
- Batch processing within waves when nodes exceed worker limit
- Progress tracking via `execution_progress` JSON in `initiatives` table
- Memory extraction after completion

**Worker** (`pipeline-execution-worker`):
- Receives single node payload with full context
- Executes 3-agent chain: Code Architect → Developer → Integration Agent
- Returns generated code + metrics to orchestrator
- Updates brain autonomously (node status + edge extraction)

### 2.5 Edge Function Architecture

```
supabase/functions/
├── pipeline-comprehension/        Layer 1 — Understanding
├── pipeline-architecture/         Layer 2 — Architecture + Brain Population
├── pipeline-squad/                Squad Formation
├── pipeline-planning/             Layer 3 — Planning
├── pipeline-execution/            Layer 4 — Execution (legacy sequential)
├── pipeline-execution-orchestrator/ Layer 4 — Execution Orchestrator (swarm)
├── pipeline-execution-worker/     Layer 4 — Execution Worker (single file)
├── pipeline-validation/           Layer 5 — Validation
├── pipeline-publish/              Layer 6 — Publish to GitHub
├── pipeline-approve/              Gate: Approve
├── pipeline-reject/               Gate: Reject
├── pipeline-fast-modify/          Quick single-file modification
├── pipeline-full-review/          Full project review
├── brain-sync/                    Project Brain synchronization
├── execute-subtask/               Legacy single subtask execution
├── generate-agents/               Agent generation
├── generate-stories/              Story generation
├── organize-stories/              Story organization
├── generate-planning-content/     Planning content generation
├── analyze-artifact/              Artifact AI analysis
├── rework-artifact/               Artifact rework
├── run-initiative-pipeline/       Legacy pipeline router
├── github-proxy/                  GitHub API proxy
├── _shared/
│   ├── ai-client.ts               Unified AI client (OpenAI + Lovable Gateway)
│   ├── pipeline-helpers.ts        Logging, jobs, agent messages
│   ├── pipeline-bootstrap.ts      Auth, CORS, rate limiting, initiative fetch
│   ├── dependency-scheduler.ts    DAG builder + wave computation
│   ├── brain-helpers.ts           Project Brain CRUD operations
│   ├── code-sanitizers.ts         Deterministic files, package.json sanitizer
│   ├── auth.ts                    Authentication utilities
│   ├── cors.ts                    CORS headers + response helpers
│   └── rate-limit.ts              Rate limiting per user+function
```

### 2.6 Data Model

```
organizations ──┬── workspaces
                ├── initiatives ──┬── stories ──── story_phases ──── story_subtasks
                │                 ├── squads ──── squad_members ──── agents
                │                 ├── agent_outputs ──┬── code_artifacts
                │                 │                   ├── artifact_reviews
                │                 │                   ├── adrs
                │                 │                   ├── content_documents
                │                 │                   └── validation_runs
                │                 ├── agent_messages
                │                 ├── initiative_jobs
                │                 ├── project_brain_nodes ←→ project_brain_edges
                │                 ├── project_decisions
                │                 └── project_errors
                ├── agent_memory
                ├── org_knowledge_base
                ├── git_connections
                ├── supabase_connections
                ├── stage_sla_configs
                ├── org_usage_limits
                └── audit_logs
```

### 2.7 Agent Roles

| Role | Layer | Responsibilities |
|------|-------|-----------------|
| `architect` | L1-L2 | Technical structure, interfaces, patterns, ADRs |
| `code_architect` | L4 | Pre-implementation specs: interfaces, contracts, imports |
| `dev` / `developer` | L4 | Code generation, implementation |
| `integration_agent` | L4 | Import verification, dependency checking, consistency |
| `qa` | L5 | Code review, quality scoring |
| `pm` | L3 | Product management, PRD |
| `po` | L3 | Product ownership, backlog |
| `sm` | L3 | Scrum master, team organization |
| `analyst` | L1 | Requirements, business analysis |
| `devops` | L6 | Infrastructure, CI/CD |
| `ux_expert` | L2 | UX/UI design |
| `aios_master` | All | System orchestrator |

---

## 3. Remaining Gaps & Problems

### 3.1 🔴 No Real Code Validation
The validation stage is purely AI-based text analysis. No TypeScript compilation, build verification, or runtime testing.

### 3.2 🔴 No Fix Loop
When validation fails, there's no automated cycle to re-execute failed subtasks with error context. Currently requires manual re-run.

### 3.3 🟡 Single-File Commit Strategy
Publish commits files one-by-one via GitHub Contents API instead of atomic Git Tree API operations.

### 3.4 🟡 Context Window Could Be Smarter
Workers receive dependency code but limited to string truncation. No AST-based type signature extraction for indirect dependencies.

### 3.5 🟡 No Semantic Vector Search
Project Brain uses `tsvector` for keyword search. Vector embeddings (`pgvector`) not yet implemented for natural language queries.

### 3.6 🟠 No Incremental Re-execution
Reject resets all subtasks. No way to re-generate only affected files.

---

## 4. Future Architecture Targets

### 4.1 Fix Loop (Validation → Execution Feedback)
```
Execution → Validation
    ↓ (if failures)
Fix Agent receives exact errors + file content
    ↓
Fix Agent produces corrected files
    ↓
Re-validation (max 3 iterations)
    ↓
Human escalation or publish
```

### 4.2 Runtime Sandbox Validation
```
1. Assemble virtual filesystem
2. npm install (dependency resolution)
3. tsc --noEmit (TypeScript compilation)
4. vite build (build verification)
5. Report errors → Fix Agent
```

### 4.3 Atomic Git Operations
Replace file-by-file commits with Git Tree API for single atomic commits.

### 4.4 Vector Embeddings (pgvector)
Add embedding column to `project_brain_nodes` for similarity-based context injection.

### 4.5 Smart Context Window
- 40% → Direct dependency files (full content)
- 20% → Indirect dependencies (type signatures via AST)
- 15% → Architecture + PRD context
- 15% → Agent memory + knowledge base
- 10% → Project file tree

---

## 5. Implementation Status Summary

| System | Status | Details |
|--------|--------|---------|
| Pipeline Decomposition | ✅ Complete | 15+ independent Edge Functions |
| Unified AI Client | ✅ Complete | `_shared/ai-client.ts` with retry + cost tracking |
| Project Brain | ✅ Complete | Nodes, edges, decisions, errors, tsvector search |
| Dependency Scheduler | ✅ Complete | DAG builder, topological sort, wave computation |
| Agent Swarm | ✅ Complete | Orchestrator + Worker, parallel execution (6 workers) |
| Chain-of-Agents | ✅ Complete | Code Architect → Developer → Integration Agent |
| Brain Edge Extraction | ✅ Complete | Regex-based import parsing, auto-edge creation |
| Fix Loop | ❌ Missing | No automated error → re-execution cycle |
| Runtime Validation | ❌ Missing | No tsc/build verification |
| Atomic Git Commits | ❌ Missing | Still file-by-file via Contents API |
| Vector Embeddings | ❌ Missing | tsvector only, no pgvector |
| Incremental Re-execution | ❌ Missing | Full reset on reject |

---
