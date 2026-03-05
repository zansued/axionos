# AxionOS — Architectural Review & Evolution Plan

> Deep technical analysis of the AI-orchestrated software generation system.  
> Last updated: 2026-03-05

---

## 1. Project Overview

**AxionOS** is a multi-tenant SaaS platform that orchestrates multiple AI agents to collaboratively generate complete software projects — from a raw idea to a deployed GitHub repository.

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

### 2.1 Pipeline Stages — 20-Stage Model

The system implements a **20-stage deterministic pipeline** with human gates and dedicated Edge Functions per stage:

```
Idea Input
  → Stage 1:  Comprehension (pipeline-comprehension) — 4 agents
  → Stage 2:  Architecture (pipeline-architecture) — 4 agents
  → Stage 3:  Architecture Simulation (pipeline-architecture-simulation)
  → Stage 4:  Preventive Validation (pipeline-preventive-validation)
  → Stage 5:  Bootstrap Intelligence (project-bootstrap-intelligence)
  → Stage 6:  Foundation Scaffold (pipeline-foundation-scaffold)
  → Stage 7:  Module Graph Simulation (pipeline-module-graph-simulation)
  → Stage 8:  Dependency Intelligence (pipeline-dependency-intelligence)
  → Stage 9:  Schema Bootstrap (supabase-schema-bootstrap)
  → Stage 10: DB Provisioning (supabase-provisioning-engine)
  → Stage 11: Domain Model Analysis (ai-domain-model-analyzer)
  → Stage 12: Business Logic Synthesis (ai-business-logic-synthesizer)
  → Stage 13: API Generation (autonomous-api-generator)
  → Stage 14: Squad Formation (pipeline-squad)
  → Stage 15: Planning (pipeline-planning)
  → Stage 16: Execution (pipeline-execution-orchestrator + workers)
  → Stage 17: Validation
      → AI Validation (pipeline-validation) — Fix Loop (3x)
      → Deep Static Analysis (pipeline-deep-validation)
      → Architectural Drift Detection (pipeline-drift-detection)
      → Runtime Validation (pipeline-runtime-validation) — Real tsc + vite build via CI
  → Stage 18: Autonomous Build Repair (autonomous-build-repair)
  → Stage 19: Publish (pipeline-publish) — Atomic Git Tree API
  → Completed
```

Stage status transitions:
```
draft → discovering → discovered
  → architecture_ready → architecting → architected
  → simulating_architecture → architecture_simulated
  → validating_architecture → architecture_validated
  → bootstrapping → bootstrapped
  → scaffolding → scaffolded
  → simulating_modules → modules_simulated
  → analyzing_dependencies → dependencies_analyzed
  → bootstrapping_schema → schema_bootstrapped
  → provisioning_db → db_provisioned
  → analyzing_domain → domain_analyzed
  → synthesizing_logic → logic_synthesized
  → generating_api → api_generated
  → squad_ready → forming_squad → squad_formed
  → planning_ready → planning → planned
  → in_progress → validating
  → repairing_build → build_repaired | repair_failed
  → ready_to_publish → published → completed
```

#### Stage 1: Comprehension (4 Agents)
**Edge Function:** `pipeline-comprehension`  
**Agents:** Vision Agent, Market Analyst, Requirements Agent, Product Architect  
**Output:** Structured discovery JSON (refined idea, business model, MVP scope, complexity, risk, stack, market analysis, feasibility)  
**Gate:** Human approves → `architecture_ready`

#### Stage 2: Architecture (4 Agents)  
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
**Gate:** Human approves → `simulating_architecture`

#### Stage 3: Architecture Simulation
**Edge Function:** `pipeline-architecture-simulation`  
Converts architecture plan into directed graph. Validates structural integrity (entrypoints, connected modules, cycles), dependency conflicts (npm, peer deps), and uses AI to predict build failures. Auto-repairs detected issues.

#### Stage 4: Preventive Validation
**Edge Function:** `pipeline-preventive-validation`  
Pre-generation validation: checks entrypoints, scripts, required configs, dependency compatibility, and applies learned prevention rules for auto-correction.

#### Stage 5: Bootstrap Intelligence
**Edge Function:** `project-bootstrap-intelligence`  
Multi-stack detection (`react-vite`, `nextjs`, `node-api`, `python-fastapi`). Validates entrypoints, scripts, dependencies. AI-predicts build viability. Auto-injects missing files.

#### Stage 6: Foundation Scaffold
**Edge Function:** `pipeline-foundation-scaffold`  
Generates minimal buildable scaffold (package.json, index.html, src/main.tsx, App.tsx, vite.config.ts, tsconfig.json). Validates and auto-repairs scaffold. Simulates build via AI.

#### Stage 7: Module Graph Simulation
**Edge Function:** `pipeline-module-graph-simulation`  
Reconstructs bundler module graph (Vite/Rollup) to identify broken imports and circular dependencies via DFS.

#### Stage 8: Dependency Intelligence
**Edge Function:** `pipeline-dependency-intelligence`  
Audits package health via NPM Registry and Firecrawl. Blocks pipeline if Health Score < 0.75.

#### Stage 9: Schema Bootstrap
**Edge Function:** `supabase-schema-bootstrap`  
Creates isolated PostgreSQL schema (`app_{project_id}`) for each generated project.

#### Stage 10: DB Provisioning
**Edge Function:** `supabase-provisioning-engine`  
Creates base tables (users, settings, audit_logs) in project schema, enables RLS with isolation policies, creates private storage bucket (`files_{project_id}`). Validates via `information_schema`.

#### Stage 11: Domain Model Analysis
**Edge Function:** `ai-domain-model-analyzer`  
Uses LLM to extract structured domain model from project description: entities (with typed attributes), relationships (foreign keys), and business rules. Stores `domain_model` node in Project Brain. Fallback to generic templates if analysis fails.

#### Stage 12: Business Logic Synthesis
**Edge Function:** `ai-business-logic-synthesizer`  
Generates business logic from domain_model + data_model: services (CRUD + custom actions), validation rules, workflow states with transitions, access control (RLS-compatible), and computed fields. Ensures every entity has at least one service.

#### Stage 13: API Generation
**Edge Function:** `autonomous-api-generator`  
Generates complete API layer from domain_model + data_model + business_logic: REST endpoints (CRUD + custom actions), RPC functions, event triggers, and webhooks. Validates every entity has CRUD coverage.

#### Stage 14: Squad Formation
**Edge Function:** `pipeline-squad`  
AI generates optimal squad (3-8 agents) based on project needs.

#### Stage 15: Planning
**Edge Function:** `pipeline-planning`  
PRD + Architecture Document + Code-Aware Story Generation with file-level subtasks.

#### Stage 16: Execution (Agent Swarm)
**Edge Functions:** `pipeline-execution-orchestrator` + `pipeline-execution-worker`  
DAG-based parallel execution with Smart Context Window. Orchestrator dispatches up to 6 workers per wave. Workers run 3-agent chain: Code Architect → Developer → Integration Agent.

#### Stage 17: Validation (4-Stage Pipeline)
- **AI Validation** (`pipeline-validation`) — Fix Loop (3x)
- **Deep Static Analysis** (`pipeline-deep-validation`) — Import/type/build checks
- **Drift Detection** (`pipeline-drift-detection`) — Layer violations
- **Runtime Validation** (`pipeline-runtime-validation`) — Real tsc + vite build via CI

#### Stage 18: Autonomous Build Repair
**Edge Function:** `autonomous-build-repair`  
Auto-repairs build failures detected during validation.

#### Stage 19: Publish (Atomic Git Tree API)
**Edge Function:** `pipeline-publish`  
Pre-flight checks → Changelog → Atomic GitHub push via Tree API → Post-deploy verification → CI workflow injection.

### 2.2 Project Brain (Fully Implemented ✅)

A structured knowledge system representing the entire generated project:

**Tables:**
- `project_brain_nodes` — Files, components, hooks, services, APIs, tables, types + domain_model, business_logic, api_spec, data_model
- `project_brain_edges` — imports, depends_on, calls_api, uses_component, etc.
- `project_decisions` — Architectural decisions with categories and supersedes chain
- `project_errors` — Historical errors with root causes and prevention rules
- `project_prevention_rules` — Self-healing rules with confidence scoring

**Features:**
- Full-text search via `tsvector` on nodes
- Vector embeddings via `pgvector` (768-dim) with cosine similarity search
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

### 2.5 Self-Healing Codebase (Fully Implemented ✅)

- Learning Agent generates prevention rules after each fix
- `upsertPreventionRule()` — incremental confidence scoring
- Rules injected into all AI prompts via `generateBrainContext()`
- Self-Healing tab in `ProjectBrainPanel`
- `project_prevention_rules` table with scope (initiative/org-wide)

### 2.6 Edge Function Architecture

```
supabase/functions/
├── pipeline-comprehension/              Stage 1 — Understanding (4 agents)
├── pipeline-architecture/               Stage 2 — Architecture + Brain (4 agents)
├── pipeline-architecture-simulation/    Stage 3 — Architecture Simulation
├── pipeline-preventive-validation/      Stage 4 — Preventive Validation
├── project-bootstrap-intelligence/      Stage 5 — Bootstrap Intelligence
├── pipeline-foundation-scaffold/        Stage 6 — Foundation Scaffold
├── pipeline-module-graph-simulation/    Stage 7 — Module Graph Simulation
├── pipeline-dependency-intelligence/    Stage 8 — Dependency Intelligence
├── ecosystem-drift-intelligence/        Ecosystem Drift Analysis (optional)
├── supabase-schema-bootstrap/           Stage 9 — Schema Bootstrap
├── supabase-provisioning-engine/        Stage 10 — DB Provisioning
├── ai-domain-model-analyzer/            Stage 11 — Domain Model Analysis
├── ai-business-logic-synthesizer/       Stage 12 — Business Logic Synthesis
├── autonomous-api-generator/            Stage 13 — API Generation
├── pipeline-squad/                      Stage 14 — Squad Formation
├── pipeline-planning/                   Stage 15 — Planning
├── pipeline-execution-orchestrator/     Stage 16 — Execution Orchestrator
├── pipeline-execution-worker/           Stage 16 — Execution Worker
├── pipeline-validation/                 Stage 17a — AI Validation + Fix Loop
├── pipeline-deep-validation/            Stage 17b — Deep Static Analysis
├── pipeline-drift-detection/            Stage 17c — Drift Detection
├── pipeline-runtime-validation/         Stage 17d — Runtime Validation (CI)
├── autonomous-build-repair/             Stage 18 — Build Repair
├── pipeline-publish/                    Stage 19 — Publish (Atomic Tree API)
├── pipeline-approve/                    Gate: Approve
├── pipeline-reject/                     Gate: Reject
├── pipeline-ci-webhook/                 CI Results Webhook
├── pipeline-fix-orchestrator/           CI Fix Swarm
├── pipeline-fast-modify/                Quick single-file modification
├── pipeline-full-review/                Full project review
├── brain-sync/                          Project Brain synchronization
├── error-intelligence/                  Error pattern analysis
├── generate-embeddings/                 Vector embedding generation
├── analyze-artifact/                    Artifact AI analysis
├── rework-artifact/                     Artifact rework
├── generate-agents/                     Agent generation
├── generate-stories/                    Story generation
├── organize-stories/                    Story organization
├── generate-planning-content/           Planning content generation
├── github-proxy/                        GitHub API proxy
├── github-ci-webhook/                   GitHub CI webhook
├── run-initiative-pipeline/             Legacy pipeline router
├── _shared/
│   ├── ai-client.ts                     Unified AI client (Lovable Gateway + retry + cost)
│   ├── pipeline-helpers.ts              Logging, jobs, agent messages
│   ├── pipeline-bootstrap.ts            Auth, CORS, rate limiting, initiative fetch
│   ├── dependency-scheduler.ts          DAG builder + wave computation
│   ├── brain-helpers.ts                 Project Brain CRUD + context generation
│   ├── smart-context.ts                 Smart Context Window (AST-like parser)
│   ├── incremental-engine.ts            Incremental re-execution engine
│   ├── embedding-helpers.ts             Vector embedding generation
│   ├── code-sanitizers.ts               Deterministic files, package.json sanitizer
│   ├── auth.ts                          Authentication utilities
│   ├── cors.ts                          CORS headers + response helpers
│   └── rate-limit.ts                    Rate limiting per user+function
```

### 2.7 Data Model

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
                │                 ├── project_errors
                │                 └── project_prevention_rules
                ├── agent_memory
                ├── org_knowledge_base
                ├── git_connections
                ├── supabase_connections
                ├── stage_sla_configs
                ├── pipeline_gate_permissions
                ├── org_usage_limits
                ├── usage_monthly_snapshots
                ├── ai_rate_limits
                └── audit_logs
```

### 2.8 Agent Roles (18+ Agents)

| # | Role | Stage | Responsibilities |
|---|------|-------|-----------------|
| 1 | Vision Agent | S1 | Strategic vision, product goals |
| 2 | Market Analyst | S1 | Market analysis, competitors, positioning |
| 3 | Requirements Agent | S1 | Requirements, constraints, scope |
| 4 | Product Architect | S1 | MVP scope, feasibility, risk assessment |
| 5 | System Architect | S2 | Technical structure, patterns, deployment |
| 6 | Data Architect | S2 | Database schema, relationships, RLS |
| 7 | API Architect | S2 | Endpoints, contracts, auth flows |
| 8 | Dependency Planner | S2 | File tree, dependency graph, generation order |
| 9 | Squad Manager | S14 | Squad composition, role assignment |
| 10 | Task Planner | S15 | Story decomposition, subtask creation |
| 11 | Story Generator | S15 | User stories, acceptance criteria |
| 12 | File Planner | S15 | File-level planning, path assignment |
| 13 | Code Architect | S16 | Interfaces, types, contracts, imports |
| 14 | Developer Agent | S16 | Full code implementation |
| 15 | Integration Agent | S16 | Import verification, dependency checking |
| 16 | Static Analysis Agent | S17 | Code quality scoring (0-100) |
| 17 | Runtime QA Agent | S17 | Runtime behavior analysis |
| 18 | Release Agent | S19 | Pre-flight, changelog, publish, verification |

---

## 3. Implementation Status Summary

| # | System | Status | Details |
|---|--------|--------|---------|
| 1 | Pipeline (20 stages) | ✅ | 35+ independent Edge Functions |
| 2 | Project Brain | ✅ | Nodes, edges, decisions, errors, prevention rules, tsvector, pgvector |
| 3 | Dependency Scheduler | ✅ | DAG builder, topological sort, wave computation |
| 4 | Agent Swarm | ✅ | Orchestrator + Worker, parallel execution (6 workers) |
| 5 | DAG Visualization | ✅ | Interactive graph in ProjectBrainPanel |
| 6 | CI-Triggered Fix Swarm | ✅ | Webhook + Fix Orchestrator + auto-PR |
| 7 | Self-Healing Codebase | ✅ | Prevention rules with confidence scoring |
| 8 | Architectural Drift Detection | ✅ | Rule-based + AI hybrid, layer violations |
| 9 | Atomic Git Commits | ✅ | Tree API for publish + fix PRs |
| 10 | Runtime Validation | ✅ | Real tsc + vite build via GitHub Actions CI |
| 11 | Smart Context Window | ✅ | AST-like parser, ~60-80% token reduction |
| 12 | Vector Embeddings | ✅ | pgvector 768-dim, cosine similarity search |
| 13 | Incremental Re-execution | ✅ | Hash-based dirty detection, cascade propagation |
| 14 | Initiative Templates | ✅ | 6 pre-built templates |
| 15 | Architecture Simulation | ✅ | Structural + dependency + AI prediction |
| 16 | Preventive Validation | ✅ | Pre-generation rules + learned prevention |
| 17 | Bootstrap Intelligence | ✅ | Multi-stack detection + build prediction |
| 18 | Foundation Scaffold | ✅ | Minimal buildable scaffold generation |
| 19 | Module Graph Simulation | ✅ | Import analysis + circular dependency DFS |
| 20 | Dependency Intelligence | ✅ | NPM health audit, ecosystem analysis |
| 21 | Schema Bootstrap | ✅ | Isolated PostgreSQL schema per project |
| 22 | DB Provisioning | ✅ | Tables + RLS + Storage bucket creation |
| 23 | Domain Model Analysis | ✅ | LLM entity/relationship extraction |
| 24 | Business Logic Synthesis | ✅ | Services, validations, workflows, access control |
| 25 | API Generation | ✅ | REST endpoints, RPCs, triggers, webhooks |
| 26 | Autonomous Build Repair | ✅ | Auto-fix build failures |
| 27 | Error Intelligence | ✅ | Cross-project error pattern analysis |
| 28 | Observability & Costs | ✅ | Per-initiative cost tracking, SLA, budgets |

---

## 4. Remaining Gaps

### 4.1 🟡 Approval Chains
No multi-approver workflow with quorum. Currently single human gate per stage.

### 4.2 🟡 Webhook Notifications
No Slack/Discord notifications for pipeline events and SLA breaches.

### 4.3 🟡 Supabase Data Model Generator
Missing stage between Domain Model Analysis and Business Logic Synthesis to auto-generate SQL tables from the domain model in the project schema.

### 4.4 🟠 Export & Reporting Enhancements
Basic CSV/PDF export exists but could be expanded with richer visualizations and scheduled reports.

---
