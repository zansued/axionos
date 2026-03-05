# AxionOS v2 — Architectural Review & Evolution Plan

> Deep technical analysis of the AI-orchestrated software generation system.  
> Last updated: 2026-03-05

---

## 1. Project Overview

**AxionOS v2** is a multi-tenant SaaS platform that orchestrates multiple AI agents to autonomously generate complete production-ready applications — from a natural language description to a deployed GitHub repository.

### Core Value Proposition
A human provides an idea → AI agents autonomously understand, design, model, generate schema, generate logic, generate APIs, generate UI, validate, self-heal, learn, and publish a working application.

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

## 2. Pipeline — 22-Stage Model

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
  → Stage 12: Data Model Generation (supabase-data-model-generator) ← NEW
  → Stage 13: Business Logic Synthesis (ai-business-logic-synthesizer)
  → Stage 14: API Generation (autonomous-api-generator)
  → Stage 15: Autonomous UI Generation (autonomous-ui-generator) ← NEW
  → Stage 16: Squad Formation (pipeline-squad)
  → Stage 17: Planning (pipeline-planning)
  → Stage 18: Execution (pipeline-execution-orchestrator + workers)
  → Stage 19: Validation
      → AI Validation (pipeline-validation) — Fix Loop (3x)
      → Deep Static Analysis (pipeline-deep-validation)
      → Architectural Drift Detection (pipeline-drift-detection)
      → Runtime Validation (pipeline-runtime-validation) — Real tsc + vite build via CI
  → Stage 20: Autonomous Build Repair (autonomous-build-repair)
  → Stage 21: Adaptive Learning Engine (adaptive-learning-engine) ← NEW
  → Stage 22: Publish (pipeline-publish) — Atomic Git Tree API
  → Completed
```

---

## 3. New v2 Modules

### 3.1 Supabase Data Model Generator (Stage 12)
**Edge Function:** `supabase-data-model-generator`  
**Input:** `domain_model` from Project Brain  
**Output:** `data_model` — normalized relational schema  
**Process:**
1. Load domain model entities and relationships
2. AI generates tables with columns, types, defaults, constraints
3. Generate foreign key relationships
4. Generate indexes for performance
5. Generate RLS policies for isolation
6. Fallback: basic CRUD tables for unmapped entities
7. Store `data_model` and `data_model_report` in Project Brain

### 3.2 Autonomous UI Generator (Stage 15)
**Edge Function:** `autonomous-ui-generator`  
**Input:** `domain_model` + `data_model` + `business_logic` + `api_spec`  
**Output:** `ui_structure` — complete frontend specification  
**Generated artifacts:**
- Pages (Dashboard, CRUD pages per entity)
- Components (Tables, Forms, Cards, Dialogs, Filters)
- Hooks (TanStack Query + Supabase client per entity)
- Navigation (Sidebar with icons and routes)
- Layouts (Responsive with sidebar, header, main content)
- Creates brain nodes for each page and component

### 3.3 Adaptive Learning Engine (Stage 21)
**Edge Function:** `adaptive-learning-engine`  
**Input:** `project_errors`, `initiative_jobs`, `prevention_rules`, brain nodes  
**Output:** New prevention rules + dependency constraints + architectural patterns  
**Learning loop:**
1. Analyze build errors and validation failures
2. Detect recurring patterns across projects
3. Generate prevention rules with confidence scoring
4. Update existing rules (incremental confidence)
5. Store `engineering_patterns` in Project Brain
6. Cross-project learning via `org_knowledge_base`

---

## 4. Project Brain Extensions

### New Node Types
| Type | Source | Description |
|------|--------|-------------|
| `data_model` | Data Model Generator | Tables, columns, FK, indexes, RLS |
| `ui_structure` | UI Generator | Pages, components, hooks, navigation |
| `engineering_patterns` | Adaptive Learning | Patterns, constraints, learned rules |

### New Edge Types
| Type | Description |
|------|-------------|
| `renders_component` | Page → Component |
| `calls_service` | Component → Service/Hook |
| `stores_entity` | Service → Database Table |

---

## 5. Edge Function Architecture

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
├── supabase-data-model-generator/       Stage 12 — Data Model Generation ← NEW
├── ai-business-logic-synthesizer/       Stage 13 — Business Logic Synthesis
├── autonomous-api-generator/            Stage 14 — API Generation
├── autonomous-ui-generator/             Stage 15 — Autonomous UI Generation ← NEW
├── pipeline-squad/                      Stage 16 — Squad Formation
├── pipeline-planning/                   Stage 17 — Planning
├── pipeline-execution-orchestrator/     Stage 18 — Execution Orchestrator
├── pipeline-execution-worker/           Stage 18 — Execution Worker
├── pipeline-validation/                 Stage 19a — AI Validation + Fix Loop
├── pipeline-deep-validation/            Stage 19b — Deep Static Analysis
├── pipeline-drift-detection/            Stage 19c — Drift Detection
├── pipeline-runtime-validation/         Stage 19d — Runtime Validation (CI)
├── autonomous-build-repair/             Stage 20 — Build Repair
├── adaptive-learning-engine/            Stage 21 — Adaptive Learning ← NEW
├── pipeline-publish/                    Stage 22 — Publish (Atomic Tree API)
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
│   ├── ai-client.ts                     Unified AI client
│   ├── pipeline-helpers.ts              Logging, jobs, agent messages
│   ├── pipeline-bootstrap.ts            Auth, CORS, rate limiting
│   ├── dependency-scheduler.ts          DAG builder + wave computation
│   ├── brain-helpers.ts                 Project Brain CRUD + context
│   ├── smart-context.ts                 Smart Context Window
│   ├── incremental-engine.ts            Incremental re-execution
│   ├── embedding-helpers.ts             Vector embeddings
│   ├── code-sanitizers.ts               Deterministic files
│   ├── auth.ts                          Authentication
│   ├── cors.ts                          CORS headers
│   └── rate-limit.ts                    Rate limiting
```

---

## 6. Implementation Status

| # | System | Status | Details |
|---|--------|--------|---------|
| 1 | Pipeline (22 stages) | ✅ | 38+ independent Edge Functions |
| 2 | Project Brain | ✅ | Nodes, edges, decisions, errors, prevention rules, tsvector, pgvector |
| 3 | Dependency Scheduler | ✅ | DAG builder, topological sort, wave computation |
| 4 | Agent Swarm | ✅ | Orchestrator + Worker, parallel execution (6 workers) |
| 5 | Data Model Generator | ✅ | Domain model → SQL tables, FK, indexes, RLS |
| 6 | Autonomous UI Generator | ✅ | Pages, components, hooks, navigation |
| 7 | Adaptive Learning Engine | ✅ | Prevention rules, patterns, cross-project |
| 8 | CI-Triggered Fix Swarm | ✅ | Webhook + Fix Orchestrator + auto-PR |
| 9 | Self-Healing Codebase | ✅ | Prevention rules with confidence scoring |
| 10 | Architectural Drift Detection | ✅ | Rule-based + AI hybrid |
| 11 | Atomic Git Commits | ✅ | Tree API for publish + fix PRs |
| 12 | Runtime Validation | ✅ | Real tsc + vite build via GitHub Actions CI |
| 13 | Smart Context Window | ✅ | ~60-80% token reduction |
| 14 | Vector Embeddings | ✅ | pgvector 768-dim, cosine similarity |
| 15 | Incremental Re-execution | ✅ | Hash-based dirty detection |

---

## 7. Remaining Gaps

### 7.1 🟡 Approval Chains
No multi-approver workflow with quorum. Currently single human gate per stage.

### 7.2 🟡 Webhook Notifications
No Slack/Discord notifications for pipeline events and SLA breaches.

### 7.3 🟡 UI Visualizations for New Stages
Missing visual representations for Data Model (ER diagram), UI Structure (component tree), Engineering Patterns.

---
