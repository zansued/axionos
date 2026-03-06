# AxionOS — System Architecture

> Technical architecture of the autonomous software engineering system.
> Last updated: 2026-03-06

---

## 1. Project Overview

**AxionOS** is a multi-tenant SaaS platform that operates as an autonomous software engineering system. It orchestrates multiple AI agents to generate complete production-ready applications through a deterministic 32-stage pipeline with self-healing builds, architecture simulation, and preventive validation.

### What AxionOS Is Today

An autonomous engineering system with:
- A 32-stage deterministic pipeline from idea to deployable application
- A Project Brain (knowledge graph with semantic search)
- An AI Efficiency Layer (prompt compression, semantic cache, model routing)
- Self-healing build repair with CI integration
- DAG-based parallel execution with 6 concurrent workers
- Adaptive learning from build failures
- Agent OS v1.0 — a 14-module runtime architecture across 5 planes

### Where AxionOS Is Going

The system is evolving through four implementation horizons:

| Horizon | Focus | Status |
|---------|-------|--------|
| **NOW** | Product Proof Closure | ✅ 7 Sprints Complete |
| **NEXT** | Learning Agents | 📋 Planned |
| **LATER** | Product Intelligence Layer | 📋 Planned |
| **FUTURE** | Market Intelligence Layer | 📋 Planned |

Each horizon depends on the previous one being stable.

### System Maturity
| Level | Name | Status |
|-------|------|--------|
| Level 1 | Code Generator | ✅ |
| Level 2 | Software Builder | ✅ |
| Level 3 | Autonomous Engineering System | ✅ |
| Level 4 | Self-Learning Software Factory | 📋 Next (Learning Agents) |
| Level 5 | Autonomous Startup Factory | 🔮 Planned |

### Technology Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui |
| State Management | TanStack React Query + React Context |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions, RLS) |
| AI Engine | Lovable AI Gateway (Gemini 2.5 Flash/Pro) + Efficiency Layer |
| Git Integration | GitHub API v3 (Tree API for atomic commits, PRs) |
| URL Scraping | Firecrawl (self-hosted or cloud) |
| Deployment | Vercel/Netlify configs auto-generated |

### Multi-Tenancy Model
- **Organizations** → **Workspaces** → **Initiatives**
- RLS policies enforce isolation per `organization_id`
- Role-based access: `owner`, `admin`, `editor`, `reviewer`, `viewer`
- Auto-provisioning: first login creates a default org via `create_organization_with_owner` RPC

---

## 2. Agent Operating System (Agent OS) — v1.0 GA

The Agent OS is the runtime architecture governing how agents are selected, executed, governed and coordinated. It consists of 14 modules organized into 5 architectural planes.

### Architecture Map

```
+-------------------------------------------------------------------+
|                       ECOSYSTEM PLANE                              |
|   Marketplace - Capability Registry - Package Manager - Trust      |
+-------------------------------+-----------------------------------+
                                | discovery
+-------------------------------+-----------------------------------+
|                       EXECUTION PLANE                              |
|   Orchestrator - Coordination - Distributed Runtime                |
|   LLM Adapter - Tool Adapter - Event Bus - Agent Registry          |
+-----------+-----------------------+-------------------+-----------+
            | decisions             | persistence       | telemetry
+-----------+----------+  +---------+---------+  +------+----------+
|    CONTROL PLANE     |  |    DATA PLANE     |  |   DATA PLANE    |
|   Selection Engine   |  |   Artifact Store  |  |  Observability  |
|   Policy Engine      |  |   Memory System   |  |  Audit Ledger   |
|   Governance Layer   |  |                   |  |                 |
|   Adaptive Routing   |  |                   |  |                 |
+-----------+----------+  +---------+---------+  +------+----------+
            |                       |                    |
+-----------+-----------------------+--------------------+----------+
|                         CORE PLANE                                 |
|   Runtime Protocol - Capability Model - Core Types                 |
|   (Contracts, Schemas, Identity -- no state, no side effects)      |
+-------------------------------------------------------------------+
```

### Module Inventory

| # | Module | File | Plane | Version |
|---|--------|------|-------|---------|
| 1 | Runtime Protocol | `protocol.ts` | Core | v0.1 |
| 2 | Capability Model | `capabilities.ts` | Core | v0.2 |
| 3 | Selection Engine | `selection.ts` | Control | v0.2 |
| 4 | Policy Engine | `policy-engine.ts` | Control | v0.2 |
| 5 | Artifact Store | `artifact-store.ts` | Data | v0.1 |
| 6 | Observability & Telemetry | `observability.ts` | Data | v0.3 |
| 7 | LLM Adapter Layer | `llm-adapter.ts` | Execution | v0.4 |
| 8 | Tool Adapter Layer | `tool-adapter.ts` | Execution | v0.5 |
| 9 | Memory System | `memory-system.ts` | Data | v0.6 |
| 10 | Adaptive Routing | `adaptive-routing.ts` | Control | v0.7 |
| 11 | Multi-Agent Coordination | `coordination.ts` | Execution | v0.8 |
| 12 | Distributed Runtime | `distributed-runtime.ts` | Execution | v0.9 |
| 13 | Marketplace & Registry | `marketplace.ts` | Ecosystem | v1.0 |
| 14 | Governance Layer | `governance.ts` | Control | v1.1 |

### Dependency Rules

```
Ecosystem  --> Core
Execution  --> Control, Data, Core
Control    --> Core
Data       --> Core
Core       --> (nothing)
```

### Key Capabilities

- **Core Plane:** Agent identity, capability declarations, task/artifact contracts, validation schemas
- **Control Plane:** Agent selection & ranking, policy evaluation, trust levels (6 tiers), autonomy limits, approval workflows, adaptive routing with exploration strategies
- **Execution Plane:** Task orchestration, multi-agent coordination (debate, consensus, planner-executor), distributed task scheduling, LLM/tool invocation
- **Data Plane:** Versioned artifact storage with lineage, persistent memory with embeddings, telemetry & cost tracking, audit ledger
- **Ecosystem Plane:** Capability/agent package management, registry sync, trust scoring, dependency resolution

Full specification: [docs/AGENT_OS_ARCHITECTURE_MAP.md](AGENT_OS_ARCHITECTURE_MAP.md)

---

## 3. Architecture by Implementation Horizon

### Core System Kernel (NOW) — ✅ Implemented / 🔧 Stabilizing

The kernel is the foundation all other layers depend on.

| Component | Module | Status |
|-----------|--------|--------|
| **Project Brain** | `brain-helpers.ts`, `project_brain_nodes/edges`, `project_decisions`, `project_errors` | ✅ |
| **AI Efficiency Layer** | `ai-client.ts` + `prompt-compressor.ts` + `semantic-cache.ts` + `model-router.ts` | ✅ |
| **Smart Context Window** | `smart-context.ts` — AST-like parser, ~60-80% token reduction | ✅ |
| **DAG Execution Engine** | `dependency-scheduler.ts` — Kahn's algorithm, wave computation, 6 workers | ✅ |
| **Pipeline Orchestration** | 32-stage deterministic pipeline, 50+ Edge Functions | ✅ |
| **Runtime Validation** | `pipeline-runtime-validation` — real tsc + vite build via CI | ✅ |
| **Autonomous Build Repair** | `autonomous-build-repair` + `pipeline-fix-orchestrator` + auto-PR | ✅ |
| **Observability** | `observability-engine` + `org_usage_limits` + cost tracking | ✅ |
| **Stage Contracts** | Deterministic stage inputs/outputs via `initiative_jobs` | ✅ |
| **Agent IO Contracts** | `pipeline-helpers.ts` — standardized logging, jobs, messages | ✅ |
| **Governance** | `pipeline_gate_permissions`, `stage_sla_configs`, `audit_logs` | ✅ |
| **Adaptive Learning** | `adaptive-learning-engine` — prevention rules, error patterns | ✅ |
| **Agent OS v1.0** | 14-module runtime architecture across 5 planes | ✅ Designed |
| **UI Control Center** | Pipeline visualization, initiative management | 🔧 Stabilizing |

### Agent Intelligence Layer (NEXT) — 📋 Planned

Requires stable kernel. Transforms agents from static prompt executors into learning systems.

| Module | Purpose |
|--------|---------|
| **Learning Agents** | Self-improving prompt strategies based on output quality metrics |
| **Agent Memory Layer** | Persistent per-agent memory across executions (foundation: `agent_memory` table + Memory System) |
| **Prompt Optimization Engine** | A/B testing of prompt variations, automatic best-performer selection |
| **Error Pattern Recognition** | Predictive error detection from historical failure data |
| **Self-Improving Fix Agents** | Repair strategies that evolve based on fix success rates |
| **Architecture Pattern Library** | Successful patterns indexed by domain and complexity |

### Product Intelligence Layer (LATER) — 📋 Planned

Requires stable kernel + learning agents. Enables post-deployment product evolution.

| Module | Purpose |
|--------|---------|
| **Product Analytics Engine** | AARRR metrics: acquisition, activation, retention, revenue, referral |
| **User Behavior Analyzer** | Feature usage, drop-off points, session patterns, friction detection |
| **Growth Optimization Engine** | Landing page optimization, feature prioritization, onboarding |
| **Product Evolution Engine** | Autonomous feature addition/removal based on usage data |

### Market Intelligence Layer (FUTURE) — 📋 Planned

Requires all previous layers stable. Enables autonomous venture creation.

| Module | Purpose |
|--------|---------|
| **Opportunity Discovery Engine** | Market gap identification from trends and demand signals |
| **Market Signal Analyzer** | Demand, competition, trend analysis with viability scoring |
| **Product Validation Engine** | Synthetic testing, landing page simulation, demand estimation |
| **Revenue Strategy Engine** | Pricing models, subscription tiers, market positioning |
| **Startup Portfolio Manager** | Multi-product resource allocation, growth tracking |

---

## 4. Pipeline — 32-Stage Model

```
===============================================================
  VENTURE INTELLIGENCE LAYER (Stages 1-5)              FUTURE
===============================================================

  Stage 01: Idea Intake
  Stage 02: Opportunity Discovery Engine
  Stage 03: Market Signal Analyzer
  Stage 04: Product Validation Engine
  Stage 05: Revenue Strategy Engine

===============================================================
  DISCOVERY & ARCHITECTURE (Stages 6-10)               NOW
===============================================================

  Stage 06: Discovery Intelligence (pipeline-comprehension) -- 4 agents
  Stage 07: Market Intelligence (pipeline-architecture) -- 4 agents
  Stage 08: Technical Feasibility (pipeline-architecture-simulation)
  Stage 09: Project Structuring (pipeline-preventive-validation)
  Stage 10: Squad Formation (pipeline-squad)

===============================================================
  INFRASTRUCTURE & MODELING (Stages 11-16)             NOW
===============================================================

  Stage 11: Architecture Planning (project-bootstrap-intelligence + pipeline-foundation-scaffold)
  Stage 12: Domain Model Generation (pipeline-module-graph-simulation + pipeline-dependency-intelligence)
  Stage 13: AI Domain Analysis (ai-domain-model-analyzer)
  Stage 14: Schema Bootstrap (supabase-schema-bootstrap)
  Stage 15: DB Provisioning (supabase-provisioning-engine)
  Stage 16: Data Model Generation (supabase-data-model-generator)

===============================================================
  CODE GENERATION (Stages 17-19)                       NOW
===============================================================

  Stage 17: Business Logic Synthesis (ai-business-logic-synthesizer)
  Stage 18: API Generation (autonomous-api-generator)
  Stage 19: UI Generation (autonomous-ui-generator)

===============================================================
  VALIDATION & PUBLISH (Stages 20-23)                  NOW
===============================================================

  Stage 20: Validation Engine
      AI Validation (pipeline-validation) -- Fix Loop (3x)
      Deep Static Analysis (pipeline-deep-validation)
      Architectural Drift Detection (pipeline-drift-detection)
  Stage 21: Build Engine (pipeline-runtime-validation) -- Real tsc + vite build via CI
  Stage 22: Test Engine (autonomous-build-repair) -- Self-healing builds
  Stage 23: Publish Engine (pipeline-publish) -- Atomic Git Tree API

===============================================================
  GROWTH & EVOLUTION LAYER (Stages 24-32)              LATER/FUTURE
===============================================================

  Stage 24: Observability Engine                       NOW
  Stage 25: Product Analytics Engine                   LATER
  Stage 26: User Behavior Analyzer                     LATER
  Stage 27: Growth Optimization Engine                 LATER
  Stage 28: Adaptive Learning Engine                   NOW
  Stage 29: Product Evolution Engine                   LATER
  Stage 30: Architecture Evolution Engine              LATER
  Stage 31: Startup Portfolio Manager                  FUTURE
  Stage 32: System Evolution Engine                    FUTURE
```

---

## 5. AI Efficiency Layer

### 5.1 Prompt Compression Engine
**File:** `_shared/prompt-compressor.ts`
**Result:** 60-90% token reduction while preserving engineering-critical information

### 5.2 Semantic Cache Engine
**File:** `_shared/semantic-cache.ts`
**Table:** `ai_prompt_cache` (with `vector(768)` column)
**Threshold:** cosine similarity > 0.92 returns cached response

### 5.3 Model Router Engine
**File:** `_shared/model-router.ts`

| Complexity | Model | Cost Multiplier |
|-----------|-------|-----------------|
| Low | `google/gemini-2.5-flash-lite` | 0.2x |
| Medium | `google/gemini-2.5-flash` | 0.5x |
| High | `google/gemini-2.5-pro` | 1.0x |

### 5.4 Integration Point
All modules integrate transparently in `callAI()` (`_shared/ai-client.ts`):
```
callAI() -> compress -> cache lookup -> route model -> LLM call -> cache store -> return
```

---

## 6. Stage Contracts

Every pipeline stage defines a formal contract specifying its interface with the orchestrator.

```
stage_contract {
  stage_name         -- unique identifier
  required_inputs    -- JSON schema of expected inputs
  produced_outputs   -- JSON schema of outputs
  external_deps      -- external services required
  side_effects       -- mutations outside initiative_jobs
  failure_modes      -- enumerated failure types
  retry_policy       -- { max_retries, backoff_strategy, idempotent }
}
```

**Status:** ✅ Implemented — enforced via `initiative_jobs` and `pipeline-helpers.ts`

---

## 7. Agent IO Contracts

All agents produce outputs conforming to this structure:

```
agent_output {
  summary           -- human-readable summary
  decisions[]       -- list of decisions made
  artifacts[]       -- generated files, schemas, or specifications
  confidence_score  -- 0.0-1.0 self-assessed confidence
  model_used        -- which LLM model was used
  tokens_used       -- token count for cost tracking
  duration_ms       -- execution time
}
```

**Status:** ✅ Implemented — enforced via `pipeline-helpers.ts`

---

## 8. Agent Operating System — Conceptual Model

### Five Fundamental Agent Types

| Agent Type | Responsibility | Example Modes |
|-----------|---------------|---------------|
| **Perception Agent** | Interprets ideas, requirements, market signals, context | `idea_intake`, `requirement_analysis`, `market_signal` |
| **Design Agent** | Creates architecture, domain models, data models, API designs | `architecture`, `domain_modeling`, `data_modeling`, `api_design` |
| **Build Agent** | Generates code, UI, configs, migrations, artifacts | `business_logic`, `api_generation`, `ui_generation` |
| **Validation Agent** | Static analysis, runtime validation, QA, architectural checks | `static_analysis`, `runtime_build`, `drift_detection` |
| **Evolution Agent** | Repair, learning, pattern extraction, prompt optimization | `build_repair`, `error_learning`, `pattern_extraction` |

### Specialization Model

```
Agent Specialization = Mode + Tools + Memory + Contract
```

### Agent Process Model

```
+------------------------------------------------+
|              AGENT OPERATING SYSTEM             |
+------------------------------------------------+
|                                                 |
|  +-----------+  +-----------+  +-----------+    |
|  | Perception|  |  Design   |  |   Build   |    |
|  |  Agent    |  |  Agent    |  |   Agent   |    |
|  +-----+-----+  +-----+-----+  +-----+-----+    |
|        |              |              |           |
|  +-----+-----+  +-----+-----+                    |
|  |Validation |  | Evolution |                    |
|  |  Agent    |  |  Agent    |                    |
|  +-----------+  +-----------+                    |
|                                                 |
|  +------------------------------------------+   |
|  |  Shared: Memory | Contracts | Tools       |   |
|  +------------------------------------------+   |
+------------------------------------------------+
```

---

## 9. Project Brain

### Node Types
| Type | Source | Description |
|------|--------|-------------|
| `file` | Scaffold/Execution | Source code files |
| `domain_model` | Domain Analyzer | Entities, attributes, relationships |
| `data_model` | Data Model Generator | Tables, columns, FK, indexes, RLS |
| `business_logic` | Logic Synthesizer | Services, workflows, validations |
| `api_spec` | API Generator | Endpoints, RPCs, webhooks |
| `ui_structure` | UI Generator | Pages, components, hooks, navigation |
| `engineering_patterns` | Adaptive Learning | Patterns, constraints, learned rules |

### Edge Types
| Type | Description |
|------|-------------|
| `depends_on` | File/module dependency |
| `imports` | Import relationship |
| `renders_component` | Page to Component |
| `calls_service` | Component to Service/Hook |
| `stores_entity` | Service to Database Table |

---

## 10. Edge Function Architecture

```
supabase/functions/
+-- Discovery & Architecture       (5 functions)
+-- Infrastructure & Modeling       (8 functions)
+-- Code Generation                 (3 functions)
+-- Validation & Publish            (6 functions)
+-- Growth & Evolution              (9 functions)
+-- Venture Intelligence            (4 functions -- FUTURE)
+-- Pipeline Control                (7 functions)
+-- Support                         (11 functions)
+-- _shared/                        (15+ helper modules)
    +-- agent-os/                   (14 Agent OS modules)
```

---

## 11. Implementation Status

### Implemented (Kernel)

| # | System | Details |
|---|--------|---------|
| 1 | Pipeline (32 stages) | 50+ independent Edge Functions |
| 2 | Project Brain | Nodes, edges, decisions, errors, prevention rules, tsvector, pgvector |
| 3 | Dependency Scheduler | DAG builder, topological sort, wave computation |
| 4 | Agent Swarm | Orchestrator + Worker, parallel execution (6 workers) |
| 5 | Data Model Generator | Domain model to SQL tables, FK, indexes, RLS |
| 6 | Autonomous UI Generator | Pages, components, hooks, navigation |
| 7 | Adaptive Learning Engine | Prevention rules, patterns, cross-project |
| 8 | CI-Triggered Fix Swarm | Webhook + Fix Orchestrator + auto-PR |
| 9 | Self-Healing Codebase | Prevention rules with confidence scoring |
| 10 | Architectural Drift Detection | Rule-based + AI hybrid |
| 11 | Atomic Git Commits | Tree API for publish + fix PRs |
| 12 | Runtime Validation | Real tsc + vite build via GitHub Actions CI |
| 13 | Smart Context Window | ~60-80% token reduction |
| 14 | Vector Embeddings | pgvector 768-dim, cosine similarity |
| 15 | Incremental Re-execution | Hash-based dirty detection |
| 16 | AI Efficiency Layer | Prompt compression + semantic cache + model router |
| 17 | Agent OS v1.0 | 14 modules, 5 planes, full TypeScript contracts |

### Planned (NEXT to FUTURE)

| Horizon | Module | Priority |
|---------|--------|----------|
| NEXT | Learning Agents | P0 |
| NEXT | Prompt Optimization Engine | P0 |
| NEXT | Error Pattern Recognition | P1 |
| NEXT | Architecture Pattern Library | P1 |
| LATER | Product Analytics Engine | P1 |
| LATER | User Behavior Analyzer | P1 |
| LATER | Product Evolution Engine | P2 |
| FUTURE | Opportunity Discovery Engine | P2 |
| FUTURE | Startup Portfolio Manager | P3 |

---

## 12. Database Schema (30+ tables)

### Core Tables
- `organizations`, `organization_members`, `profiles`
- `workspaces`, `initiatives`, `initiative_jobs`
- `agents`, `agent_messages`, `agent_memory`, `agent_outputs`

### Pipeline Tables
- `stories`, `story_phases`, `story_subtasks`
- `squads`, `squad_members`
- `planning_sessions`
- `code_artifacts`, `content_documents`, `adrs`

### Brain Tables
- `project_brain_nodes` (with `vector(768)` embedding)
- `project_brain_edges`
- `project_decisions`
- `project_errors`
- `project_prevention_rules`

### Governance Tables
- `pipeline_gate_permissions`
- `stage_sla_configs`
- `org_usage_limits`
- `audit_logs`
- `artifact_reviews`

### Efficiency Tables
- `ai_prompt_cache` (with `vector(768)` embedding, TTL, hit tracking)
- `ai_rate_limits`

### Knowledge Tables
- `org_knowledge_base`
- `git_connections`
- `supabase_connections`
- `validation_runs`
- `usage_monthly_snapshots`
