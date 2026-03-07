# AxionOS — System Architecture

> Technical architecture of the autonomous software engineering system.
>
> **What changed (2026-03-07):** Sprint 13 Meta-Agents v1 implemented — 4 meta-agent classes (Architecture, Role Designer, Workflow Optimizer, System Evolution Advisor), recommendation registry table, rule-based scoring model, review workflow, audit trail, and dashboard. Meta-Agents operate in recommendation-only mode with full governance safety. Previous: Meta-Agent Coordination Layer was planned; now active.
>
> Last updated: 2026-03-07

---

## 1. Project Overview

**AxionOS** is a multi-tenant SaaS platform that operates as an autonomous software engineering system. It orchestrates multiple AI agents to generate complete production-ready applications through a deterministic 32-stage pipeline with self-healing builds, architecture simulation, and preventive validation.

### What AxionOS Is Today

An autonomous engineering platform with commercial readiness and active learning:
- A 32-stage deterministic pipeline from idea to deployable application
- A Project Brain (knowledge graph with semantic search)
- An AI Efficiency Layer (prompt compression, semantic cache, model routing)
- Self-healing build repair with CI integration
- DAG-based parallel execution with 6 concurrent workers
- Evidence-oriented repair with adaptive routing
- Preventive engineering with active prevention rules
- Commercial readiness: product plans, billing, usage enforcement
- Learning Agents v1: rule-based, auditable prompt and strategy optimization
- Agent OS v1.0 — a 14-module runtime architecture across 5 planes

### System Maturity

| Level | Name | Status |
|-------|------|--------|
| Level 1 | Code Generator | ✅ |
| Level 2 | Software Builder | ✅ |
| Level 3 | Autonomous Engineering System | ✅ Complete |
| Level 4 | Self-Learning Software Factory | 🔄 Entering |
| Level 4.5 | Self-Designing Engineering System | 📋 Planned (Meta-Agents) |
| Level 5 | Autonomous Startup Factory | 🔮 Long-term |

> **Current position:** Level 3 complete → Level 4 entering.
> **System state:** Commercial + Learning Platform.
> **Kernel status:** Stable and operational.
> **Learning status:** Active, rule-based, auditable.

### Implementation Horizons

| Horizon | Focus | Status |
|---------|-------|--------|
| **NOW** | Kernel + Commercial + Learning v1 | ✅ 12 Sprints Complete |
| **NEXT** | Learning Agents Expansion + Meta-Agents | 📋 Planned |
| **LATER** | Product Intelligence Layer | 📋 Planned |
| **FUTURE** | Market Intelligence Layer | 📋 Planned |

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

## 2. Active Architecture Layers

AxionOS consists of seven active layers, each with clearly defined responsibilities and interaction boundaries.

### Layer 1: Kernel Execution Layer

**Purpose:** Execute the 32-stage deterministic pipeline with DAG-based parallel orchestration.

**Key modules:**
- `pipeline-bootstrap.ts` — Pipeline lifecycle initialization with usage enforcement
- `dependency-scheduler.ts` — Kahn's algorithm, wave computation, 6 workers
- `pipeline-execution-orchestrator` / `pipeline-execution-worker` — DAG agent swarm
- `pipeline-helpers.ts` — Standardized logging, jobs, messages
- 50+ Edge Functions covering all 32 stages

**Interactions:** Consumes governance decisions from Control layer. Produces execution data consumed by Observability and Learning layers.

### Layer 2: Validation and Repair Layer

**Purpose:** Validate generated code and autonomously repair build failures.

**Key modules:**
- `pipeline-validation` — AI-powered fix loop (3 iterations)
- `pipeline-deep-validation` — Deep static analysis
- `pipeline-drift-detection` — Architectural drift detection
- `pipeline-runtime-validation` — Real tsc + vite build via CI
- `autonomous-build-repair` — Self-healing builds from CI error logs
- `pipeline-fix-orchestrator` — Multi-iteration fix coordination

**Interactions:** Receives code from Kernel. Produces `repair_evidence` consumed by Learning layer.

### Layer 3: Prevention and Routing Layer

**Purpose:** Proactively prevent known failure patterns and route repair strategies based on evidence.

**Key modules:**
- `pipeline-preventive-validation` — Pre-generation guard
- `prevention-rule-engine` — Active prevention rule management
- `repair-routing-engine` — Adaptive strategy selection
- `error-pattern-library-engine` — Pattern extraction and indexing

**Persistence:** `active_prevention_rules`, `error_patterns`, `prevention_rule_candidates`, `repair_routing_log`

**Interactions:** Consumes patterns from error history. Feeds routing decisions to Repair layer. Learning layer adjusts routing weights.

### Layer 4: Governance and Audit Layer

**Purpose:** Enforce trust boundaries, approval workflows, SLA compliance, and complete audit trails.

**Key modules:**
- `governance.ts` — Approval workflows, access control
- `pipeline_gate_permissions` — Per-role stage access
- `stage_sla_configs` — SLA enforcement per stage
- `audit_logs` — Complete event ledger

**Interactions:** Gates pipeline advancement. All layers emit audit events.

### Layer 5: Observability Layer

**Purpose:** Track execution telemetry, cost, performance, and system health.

**Key modules:**
- `observability-engine` — Telemetry aggregation
- `initiative-observability-engine` — Per-initiative metrics
- Cost tracking per model, per stage, per initiative

**Persistence:** `initiative_observability`, `initiative_jobs` (cost_usd, tokens_used, duration_ms)

**Interactions:** Provides data consumed by Commercial layer (billing) and Learning layer (analysis).

### Layer 6: Commercial Readiness Layer (Sprint 11)

**Purpose:** Make AxionOS operationally packageable as a commercial product.

**Key modules:**
- `usage-limit-enforcer.ts` — Enforces plan limits at pipeline entry points
- `billing-calculator.ts` — Cost aggregation with org-safe job filtering
- `product-dashboard` — Overview, usage metrics API

**Persistence:**
- `product_plans` — Starter / Pro / Enterprise with numeric limits
- `billing_accounts` — Stripe-ready schema with billing period tracking
- `workspace_members` — Granular roles per workspace

**Hardening corrections applied:**
- Usage enforcement integrated into `pipeline-bootstrap.ts` and `run-initiative-pipeline`
- Cross-org query leakage fixed: all job aggregation scoped by organization initiatives
- Cost double-counting fixed: `job_cost` is the single source of truth

**Interactions:** Consumes observability data. Blocks pipeline execution when limits exceeded (HTTP 402, `USAGE_LIMIT_EXCEEDED`).

### Layer 7: Learning Agents Layer (Sprint 12)

**Purpose:** Transform passive learning data into active, auditable intelligence.

**Key modules:**

| Module | File | Purpose |
|--------|------|---------|
| Prompt Outcome Analyzer | `prompt-outcome-analyzer/index.ts` | Aggregates success_rate, cost, retry_rate per stage+model signature |
| Strategy Performance Engine | `strategy-performance-engine/index.ts` | Evaluates repair strategy effectiveness with MTTR and recurrence |
| Predictive Error Engine | `predictive-error-engine/index.ts` | Detects recurring failure patterns, generates prevention candidates |
| Repair Learning Engine | `repair-learning-engine/index.ts` | Adjusts routing weights: `new_weight = prev + success_factor − failure_penalty` |
| Learning Recommendation Engine | `learning-recommendation-engine/index.ts` | Generates structured improvement recommendations |
| Learning Dashboard | `learning-dashboard/index.ts` | API: overview, recommendations, strategies, errors |

**Persistence:**
- `prompt_strategy_metrics` — Aggregated prompt performance
- `strategy_effectiveness_metrics` — Repair strategy effectiveness
- `predictive_error_patterns` — Recurring failure predictions
- `repair_strategy_weights` — Adjusted routing weights with audit trail
- `learning_recommendations` — Structured improvement suggestions

**Interactions:** Consumes data from Observability, Repair, and Prevention layers. Produces recommendations and weight adjustments. Cannot mutate Kernel, Governance, or Commercial layers.

### Learning Safety Principles

Learning in AxionOS follows this chain:

```
Observation → Evidence → Analysis → Recommendation → Human-safe Adjustment
```

**Rules:**
1. Learning is **additive** — new modules consume existing data, never modify kernel
2. Learning is **rule-based** — no black-box behavior, all logic explicit
3. Learning is **auditable** — all decisions logged as `LEARNING_UPDATE` events in `audit_logs`
4. Learning is **bounded** — weight adjustments have min/max constraints, are reversible
5. Learning **cannot mutate**: pipeline stages, governance rules, product plans, billing

### Layer 8: Meta-Agent Coordination Layer (Planned)

> **Status:** 📋 Planned architecture — **Not implemented**
> **Dependency:** Requires stable Learning Agents v2

**Purpose:** Introduce higher-order agents that reason about the system itself — analyzing execution patterns, designing new agent roles, optimizing workflows, and advising on architectural evolution. Meta-Agents do not execute pipeline tasks directly.

**Position in the layer stack:**

```
  Meta-Agent Coordination Layer    ← NEW (planned)
          ↑
  Learning Agents Layer            ← Active (Sprint 12)
          ↑
  Commercial Readiness Layer       ← Active (Sprint 11)
          ↑
  Observability Layer              ← Active
          ↑
  Governance and Audit Layer       ← Active
          ↑
  Prevention and Routing Layer     ← Active
          ↑
  Validation and Repair Layer      ← Active
          ↑
  Kernel Execution Layer           ← Active
```

Meta-Agents consume outputs from all lower layers but cannot modify any of them directly.

**Five Meta-Agent Types:**

| Meta-Agent | Purpose | Outputs |
|-----------|---------|---------|
| **Architecture Meta-Agent** | Analyze execution outcomes and suggest pipeline architecture improvements | `PIPELINE_OPTIMIZATION`, `STAGE_REORDERING_SUGGESTION`, `STAGE_SPLIT_OR_MERGE`, `RESOURCE_ALLOCATION_HINT` |
| **Agent Role Designer** | Analyze task distribution and propose new agent roles or specializations | `NEW_AGENT_ROLE`, `AGENT_ROLE_REFACTOR`, `AGENT_SPECIALIZATION`, `AGENT_DEPRECATION` |
| **Workflow Optimizer** | Improve pipeline efficiency by analyzing duration, retries, and repair patterns | `WORKFLOW_PARALLELIZATION`, `STEP_ELIMINATION`, `STEP_REORDERING` |
| **Strategy Synthesizer** | Combine successful strategies into improved execution approaches | `NEW_EXECUTION_STRATEGY`, `PROMPT_STRATEGY_COMPOSITION`, `REPAIR_STRATEGY_REWEIGHTING` |
| **System Evolution Advisor** | Produce high-level system evolution guidance from cross-cutting trends | `SYSTEM_EVOLUTION_REPORT`, `TECHNICAL_DEBT_ALERT`, `ARCHITECTURE_CHANGE_PROPOSAL` |

**Data sources (read-only):**
- `initiative_observability` — stage metrics, durations, failure distribution
- `prompt_strategy_metrics` — prompt performance trends
- `strategy_effectiveness_metrics` — repair strategy effectiveness
- `predictive_error_patterns` — failure predictions
- `learning_recommendations` — existing improvement suggestions
- `repair_evidence` — repair outcome history
- `audit_logs` — system event history

**Planned output structure:**

```
meta_agent_recommendation {
  id                    -- UUID
  meta_agent_type       -- architecture | role_designer | workflow | strategy | evolution
  recommendation_type   -- specific output type
  target_component      -- what system component is affected
  description           -- human-readable explanation
  confidence_score      -- 0.0-1.0
  supporting_evidence   -- array of source records
  status                -- pending | reviewed | accepted | rejected
  created_at            -- timestamp
}
```

**Planned persistence:** `meta_agent_recommendations` table (not yet created)

**Safety constraints:**
1. Meta-Agents **never** modify pipeline stages, governance rules, billing, or contracts
2. All outputs are **recommendations** requiring human review before implementation
3. All Meta-Agent actions must be **auditable** and **explainable**
4. Meta-Agent outputs must be **reversible** — no irreversible system changes
5. Meta-Agents operate in **read-only** mode against all lower layers

**Interaction flow:**

```
Observability → Learning Agents → Meta-Agents → Recommendations → Human Review → Controlled Implementation
```

Meta-Agents do not bypass human oversight.

---

## 3. Agent Operating System (Agent OS) — v1.0 GA

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

### Plane Implementation Status

| Plane | Status | Notes |
|-------|--------|-------|
| **Core** | ✅ Implemented | Identity, contracts, types fully specified |
| **Control** | ✅ Implemented | Selection, policy, governance, adaptive routing operational |
| **Execution** | ✅ Partial | Orchestrator + DAG operational. Coordination/Distributed Runtime designed but advanced features frozen |
| **Data** | ✅ Implemented | Artifact store, memory, observability operational |
| **Ecosystem** | ❄️ Frozen | Marketplace designed but not needed for current product |

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
  DISCOVERY & ARCHITECTURE (Stages 6-10)               NOW ✅
===============================================================

  Stage 06: Discovery Intelligence (pipeline-comprehension) -- 4 agents
  Stage 07: Market Intelligence (pipeline-architecture) -- 4 agents
  Stage 08: Technical Feasibility (pipeline-architecture-simulation)
  Stage 09: Project Structuring (pipeline-preventive-validation)
  Stage 10: Squad Formation (pipeline-squad)

===============================================================
  INFRASTRUCTURE & MODELING (Stages 11-16)             NOW ✅
===============================================================

  Stage 11: Architecture Planning
  Stage 12: Domain Model Generation
  Stage 13: AI Domain Analysis
  Stage 14: Schema Bootstrap
  Stage 15: DB Provisioning
  Stage 16: Data Model Generation

===============================================================
  CODE GENERATION (Stages 17-19)                       NOW ✅
===============================================================

  Stage 17: Business Logic Synthesis
  Stage 18: API Generation
  Stage 19: UI Generation

===============================================================
  VALIDATION & PUBLISH (Stages 20-23)                  NOW ✅
===============================================================

  Stage 20: Validation Engine (Fix Loop + Deep Static + Drift Detection)
  Stage 21: Build Engine (Runtime Validation via CI)
  Stage 22: Test Engine (Autonomous Build Repair)
  Stage 23: Publish Engine (Atomic Git Tree API)

===============================================================
  GROWTH & EVOLUTION LAYER (Stages 24-32)
===============================================================

  Stage 24: Observability Engine                       NOW ✅
  Stage 25: Product Analytics Engine                   LATER
  Stage 26: User Behavior Analyzer                     LATER
  Stage 27: Growth Optimization Engine                 LATER
  Stage 28: Adaptive Learning Engine                   NOW ✅
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

## 8. Five Fundamental Agent Types

| Agent Type | Responsibility | Example Modes |
|-----------|---------------|---------------|
| **Perception Agent** | Interprets ideas, requirements, market signals, context | `idea_intake`, `requirement_analysis`, `market_signal` |
| **Design Agent** | Creates architecture, domain models, data models, API designs | `architecture`, `domain_modeling`, `data_modeling`, `api_design` |
| **Build Agent** | Generates code, UI, configs, migrations, artifacts | `business_logic`, `api_generation`, `ui_generation` |
| **Validation Agent** | Static analysis, runtime validation, QA, architectural checks | `static_analysis`, `runtime_build`, `drift_detection` |
| **Evolution Agent** | Repair, learning, pattern extraction, prompt optimization | `build_repair`, `error_learning`, `pattern_extraction` |

```
Agent Specialization = Mode + Tools + Memory + Contract
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
+-- Commercial Readiness            (2 functions -- Sprint 11)
+-- Learning Agents                 (6 functions -- Sprint 12)
+-- Support                         (11 functions)
+-- _shared/                        (15+ helper modules)
    +-- agent-os/                   (14 Agent OS modules)
```

---

## 11. Implementation Status

### Implemented (Kernel + Sprint 11 + Sprint 12)

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
| 18 | Commercial Readiness | Plans, billing, workspace roles, usage enforcement |
| 19 | Learning Agents v1 | Prompt analysis, strategy tracking, prediction, weight adaptation, recommendations |

### Frozen

| Module | Reason |
|--------|--------|
| Marketplace ecosystem | Not needed until Learning Agents are stable |
| Global capability registry expansion | Architecture sufficient |
| Advanced distributed runtime | Current runtime is adequate |
| Advanced multi-agent coordination | Existing coordination works |

### Planned (NEXT to FUTURE)

| Horizon | Module | Priority |
|---------|--------|----------|
| NEXT | Learning Agents v2 (Self-improving prompts) | P0 |
| NEXT | Meta-Agents (Self-designing orchestration) | P1 |
| LATER | Product Analytics Engine | P1 |
| LATER | User Behavior Analyzer | P1 |
| LATER | Product Evolution Engine | P2 |
| FUTURE | Opportunity Discovery Engine | P2 |
| FUTURE | Startup Portfolio Manager | P3 |

---

## 12. Database Schema (40+ tables)

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

### Commercial Tables (Sprint 11)
- `product_plans` — Starter / Pro / Enterprise with limits
- `billing_accounts` — Stripe-ready with period tracking
- `workspace_members` — Granular roles per workspace

### Learning Tables (Sprint 12)
- `prompt_strategy_metrics` — Prompt performance aggregation
- `strategy_effectiveness_metrics` — Repair strategy effectiveness
- `predictive_error_patterns` — Recurring failure predictions
- `repair_strategy_weights` — Adjusted routing weights
- `learning_recommendations` — Structured improvement suggestions
- `learning_records` — Learning foundation substrate
