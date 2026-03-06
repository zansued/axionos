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

### Where AxionOS Is Going

The system is evolving through four implementation horizons:

| Horizon | Focus | Status |
|---------|-------|--------|
| **NOW** | Stabilize the Kernel | 🔧 Stabilizing |
| **NEXT** | Agent Intelligence Layer | 📋 Planned |
| **LATER** | Product Intelligence Layer | 📋 Planned |
| **FUTURE** | Market Intelligence Layer | 📋 Planned |

Each horizon depends on the previous one being stable.

### System Maturity
| Level | Name | Status |
|-------|------|--------|
| Level 1 | Code Generator | ✅ |
| Level 2 | Software Builder | ✅ |
| Level 3 | Autonomous Engineering System | ✅ |
| Level 4 | Self-Learning Software Factory | 🔄 Transitioning |
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

## 2. Architecture by Implementation Horizon

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
| **Stage Contracts** | Deterministic stage inputs/outputs via `initiative_jobs` (see §5) | ✅ |
| **Agent IO Contracts** | `pipeline-helpers.ts` — standardized logging, jobs, messages (see §6) | ✅ |
| **Governance** | `pipeline_gate_permissions`, `stage_sla_configs`, `audit_logs` | ✅ |
| **Adaptive Learning** | `adaptive-learning-engine` — prevention rules, error patterns | ✅ |
| **UI Control Center** | Pipeline visualization, initiative management | 🔧 Stabilizing |

#### Kernel Hardening Tasks

The following work items reduce architectural entropy and prepare the system for the Agent Intelligence Layer:

| Task | Purpose | Status |
|------|---------|--------|
| Stage Contract Formalization | Enforce input/output schemas per stage (§5) | ✅ Implemented |
| Agent IO Contract Standardization | Uniform agent output structure (§6) | ✅ Implemented |
| Observability Improvements | Granular cost tracking, latency histograms | 🔧 In Progress |
| Pipeline Visualization Refactor | Simplified control-center UI | 🔧 In Progress |
| AI Cost Tracking | Per-stage, per-model cost attribution | ✅ Implemented |
| Error Taxonomy Standardization | Typed failure modes across all stages | 🔧 In Progress |

### Agent Intelligence Layer (NEXT) — 📋 Planned

Requires stable kernel. Transforms agents from static prompt executors into learning systems.

| Module | Purpose |
|--------|---------|
| **Learning Agents** | Self-improving prompt strategies based on output quality metrics |
| **Agent Memory Layer** | Persistent per-agent memory across executions (foundation: `agent_memory` table) |
| **Prompt Optimization Engine** | A/B testing of prompt variations, automatic best-performer selection |
| **Error Pattern Recognition** | Predictive error detection from historical failure data |
| **Self-Improving Fix Agents** | Repair strategies that evolve based on fix success rates |
| **Architecture Pattern Library** | Successful patterns indexed by domain and complexity |

#### Agent Memory Foundation

The `agent_memory` table provides the storage layer for agent learning. Each memory record captures:

```
agent_memory {
  agent_id        — which agent produced this memory
  task_type       — memory_type classification (strategy, pattern, error, decision)
  strategy_used   — key describing the approach taken
  outcome         — value storing the result and quality assessment
  confidence      — relevance_score (0.0-1.0)
  scope           — "initiative" or "organization" (cross-project learning)
  timestamp       — created_at / updated_at
  times_used      — how often this memory has been retrieved
}
```

This structure allows agents to query past strategies by task type, filter by confidence, and prioritize frequently-successful approaches. The `scope` field enables cross-project learning at the organization level.

**Status:** 🔧 Foundation exists (`agent_memory` table deployed, not yet consumed by agents)

### Product Intelligence Layer (LATER) — 📋 Planned

Requires stable kernel + learning agents. Enables post-deployment product evolution.

| Module | Purpose |
|--------|---------|
| **Product Analytics Engine** | AARRR metrics: acquisition, activation, retention, revenue, referral |
| **User Behavior Analyzer** | Feature usage, drop-off points, session patterns, friction detection |
| **Growth Optimization Engine** | Landing page optimization, feature prioritization, onboarding |
| **Product Evolution Engine** | Autonomous feature addition/removal based on usage data |
| **Automatic UI Optimization** | Layout and conversion optimization driven by behavioral data |

### Market Intelligence Layer (FUTURE) — 📋 Planned

Requires all previous layers stable. Enables autonomous venture creation.

| Module | Purpose |
|--------|---------|
| **Opportunity Discovery Engine** | Market gap identification from trends and demand signals |
| **Market Signal Analyzer** | Demand, competition, trend analysis with viability scoring |
| **Product Validation Engine** | Synthetic testing, landing page simulation, demand estimation |
| **Revenue Strategy Engine** | Pricing models, subscription tiers, market positioning |
| **Venture Intelligence Layer** | End-to-end: discover → validate → build → launch → measure → evolve |
| **Startup Portfolio Manager** | Multi-product resource allocation, growth tracking |

---

## 3. Pipeline — 32-Stage Model

```
═══════════════════════════════════════════════════════
  VENTURE INTELLIGENCE LAYER (Stages 1-5)        📋 FUTURE
═══════════════════════════════════════════════════════

  → Stage 01: Idea Intake
  → Stage 02: Opportunity Discovery Engine
  → Stage 03: Market Signal Analyzer
  → Stage 04: Product Validation Engine
  → Stage 05: Revenue Strategy Engine

═══════════════════════════════════════════════════════
  DISCOVERY & ARCHITECTURE (Stages 6-10)          ✅ NOW
═══════════════════════════════════════════════════════

  → Stage 06: Discovery Intelligence (pipeline-comprehension) — 4 agents
  → Stage 07: Market Intelligence (pipeline-architecture) — 4 agents
  → Stage 08: Technical Feasibility (pipeline-architecture-simulation)
  → Stage 09: Project Structuring (pipeline-preventive-validation)
  → Stage 10: Squad Formation (pipeline-squad)

═══════════════════════════════════════════════════════
  INFRASTRUCTURE & MODELING (Stages 11-16)        ✅ NOW
═══════════════════════════════════════════════════════

  → Stage 11: Architecture Planning (project-bootstrap-intelligence + pipeline-foundation-scaffold)
  → Stage 12: Domain Model Generation (pipeline-module-graph-simulation + pipeline-dependency-intelligence)
  → Stage 13: AI Domain Model Analyzer (ai-domain-model-analyzer)
  → Stage 14: Supabase Schema Bootstrap (supabase-schema-bootstrap)
  → Stage 15: Supabase Provisioning Engine (supabase-provisioning-engine)
  → Stage 16: Supabase Data Model Generator (supabase-data-model-generator)

═══════════════════════════════════════════════════════
  CODE GENERATION (Stages 17-19)                  ✅ NOW
═══════════════════════════════════════════════════════

  → Stage 17: AI Business Logic Synthesizer (ai-business-logic-synthesizer)
  → Stage 18: Autonomous API Generator (autonomous-api-generator)
  → Stage 19: Autonomous UI Generator (autonomous-ui-generator)

═══════════════════════════════════════════════════════
  VALIDATION & PUBLISH (Stages 20-23)             ✅ NOW
═══════════════════════════════════════════════════════

  → Stage 20: Validation Engine
      → AI Validation (pipeline-validation) — Fix Loop (3x)
      → Deep Static Analysis (pipeline-deep-validation)
      → Architectural Drift Detection (pipeline-drift-detection)
  → Stage 21: Build Engine (pipeline-runtime-validation) — Real tsc + vite build via CI
  → Stage 22: Test Engine (autonomous-build-repair) — Self-healing builds
  → Stage 23: Publish Engine (pipeline-publish) — Atomic Git Tree API

═══════════════════════════════════════════════════════
  GROWTH & EVOLUTION LAYER (Stages 24-32)         📋 LATER/FUTURE
═══════════════════════════════════════════════════════

  → Stage 24: Observability Engine                ✅ NOW
  → Stage 25: Product Analytics Engine            📋 LATER
  → Stage 26: User Behavior Analyzer              📋 LATER
  → Stage 27: Growth Optimization Engine          📋 LATER
  → Stage 28: Adaptive Learning Engine            ✅ NOW
  → Stage 29: Product Evolution Engine            📋 LATER
  → Stage 30: Architecture Evolution Engine       📋 LATER
  → Stage 31: Startup Portfolio Manager           📋 FUTURE
  → Stage 32: System Evolution Engine             📋 FUTURE
```

---

## 4. AI Efficiency Layer

### 4.1 Prompt Compression Engine
**File:** `_shared/prompt-compressor.ts`
**Purpose:** Reduce context size before LLM calls
**Strategy:**
1. **Rule-based pre-compression:** Remove console logs, verbose comments, redundant separators, collapse empty lines
2. **Critical marker extraction:** Preserve architecture decisions, dependency constraints, errors, build config
3. **AI summarization:** Use `gemini-2.5-flash-lite` (cheapest model) to compress remaining context
**Result:** 60-90% token reduction while preserving engineering-critical information

### 4.2 Semantic Cache Engine
**File:** `_shared/semantic-cache.ts`
**Table:** `ai_prompt_cache` (with `vector(768)` column)
**Workflow:**
1. Generate embedding of incoming prompt
2. Check exact hash match (fastest path)
3. Search vector database for similar prompts (cosine similarity)
4. If similarity > 0.92 → return cached response (zero LLM cost)
5. Otherwise → call LLM and store response for future hits
**Fields:** `prompt_hash`, `embedding`, `response`, `stage`, `model_used`, `tokens_saved`, `hit_count`, `expires_at`

### 4.3 Model Router Engine
**File:** `_shared/model-router.ts`
**Strategy:** Route prompts to appropriate models based on complexity analysis
| Complexity | Model | Cost Multiplier |
|-----------|-------|-----------------|
| Low | `google/gemini-2.5-flash-lite` | 0.2x |
| Medium | `google/gemini-2.5-flash` | 0.5x |
| High | `google/gemini-2.5-pro` | 1.0x |

**Routing logic:**
- Stage-based: known stage → predetermined complexity tier
- Heuristic: analyze prompt content for complexity indicators
- Cache hits bypass model calls entirely

### 4.4 Integration Point
All modules integrate transparently in `callAI()` (`_shared/ai-client.ts`):
```
callAI() → compress → cache lookup → route model → LLM call → cache store → return
```
Backward compatible: all new parameters are optional.

---

## 5. Stage Contracts

Every pipeline stage defines a formal contract that specifies its interface with the orchestrator. Stage contracts ensure deterministic execution, reliable re-execution, and safe parallelization.

### Contract Structure

```
stage_contract {
  stage_name         — unique identifier (e.g. "pipeline-comprehension")
  required_inputs    — JSON schema of expected inputs from previous stages
  produced_outputs   — JSON schema of outputs stored in initiative_jobs.outputs
  external_deps      — external services required (GitHub API, CI, Firecrawl)
  side_effects       — mutations outside initiative_jobs (brain nodes, agent messages, code artifacts)
  failure_modes      — enumerated failure types (timeout, validation_error, llm_error, dependency_missing)
  retry_policy       — { max_retries, backoff_strategy, idempotent: boolean }
}
```

### Enforcement

Stage contracts are enforced by the pipeline orchestrator (`run-initiative-pipeline`, `pipeline-execution-orchestrator`):

- **Pre-execution:** Validates that all `required_inputs` are present before invoking a stage
- **Post-execution:** Validates that `produced_outputs` match the declared schema
- **Failure handling:** Applies the declared `retry_policy` per failure mode
- **Parallelization:** The DAG scheduler uses contract metadata to determine which stages can run concurrently

### Storage

Contracts are materialized through `initiative_jobs`:
- `inputs` column stores the validated stage inputs
- `outputs` column stores the validated stage outputs
- `status` tracks execution state (`pending`, `running`, `completed`, `failed`)
- `error` captures failure details matching declared `failure_modes`

### Benefits

- **Deterministic execution:** Same inputs always produce same outputs
- **Safe re-execution:** Failed stages can be retried without corrupting pipeline state
- **Debugging:** Each stage's inputs/outputs are inspectable in `initiative_jobs`
- **Future agent learning:** Contracts provide structured data for agents to learn from

**Status:** ✅ Implemented — enforced via `initiative_jobs` and `pipeline-helpers.ts`

---

## 6. Agent IO Contracts

Every agent in the pipeline must produce structured, inspectable output. Agent IO contracts standardize the interface between agents and the rest of the system.

### Contract Structure

```
agent_contract {
  agent_name       — identifier (e.g. "comprehension-analyst")
  task_scope       — what the agent is responsible for
  input_schema     — structured input from the orchestrator
  output_schema    — structured output format
  decision_rules   — constraints on what the agent can decide
}
```

### Standard Agent Output

All agents produce outputs conforming to this structure:

```
agent_output {
  summary           — human-readable summary of what was produced
  decisions[]       — list of decisions made (stored in project_decisions)
  artifacts[]       — generated files, schemas, or specifications
  confidence_score  — 0.0-1.0 self-assessed confidence
  model_used        — which LLM model was used
  tokens_used       — token count for cost tracking
  duration_ms       — execution time
}
```

### Implementation

Agent IO contracts are enforced through `pipeline-helpers.ts`:
- `createJob()` — initializes a job with validated inputs
- `completeJob()` — finalizes with structured outputs and cost metadata
- `logAgentMessage()` — records inter-agent communication with typed schemas
- `AIResult` — standardized return type from `callAI()` with `.content`, `.model`, `.costUsd`, `.durationMs`

### Benefits

- **Agent learning:** Structured outputs enable the future Agent Memory Layer to index and learn from past executions
- **Prompt optimization:** Consistent output schemas allow A/B comparison of prompt strategies
- **Performance tracking:** Every agent execution is measurable (cost, duration, quality)
- **Auditability:** All agent decisions are stored in `project_decisions` with provenance

**Status:** ✅ Implemented — enforced via `pipeline-helpers.ts` and `agent_messages`/`agent_outputs` tables

---

## 7. Agent Operating System

### Problem: Agent Proliferation

The current architecture uses many highly specific agent identities (comprehension-analyst, architecture-strategist, fix-developer, etc.). As the system grows, this creates:

- **Redundant prompt scaffolding** across agents that differ only in domain context
- **High maintenance cost** — each new capability requires a new agent definition
- **Fragmented learning** — memories are scattered across many agent identities
- **Inconsistent IO contracts** — each agent implements its own output structure

### Solution: Five Fundamental Agent Types

Instead of treating agents as many separate characters, AxionOS treats them as **system processes** — a small set of fundamental agent types that operate in different **modes** depending on the pipeline stage.

| Agent Type | Responsibility | Example Modes |
|-----------|---------------|---------------|
| **Perception Agent** | Interprets ideas, requirements, market signals, context | `idea_intake`, `requirement_analysis`, `market_signal`, `reference_scraping` |
| **Design Agent** | Creates architecture, domain models, data models, API designs, planning | `architecture`, `domain_modeling`, `data_modeling`, `api_design`, `squad_planning` |
| **Build Agent** | Generates code, UI, configs, migrations, artifacts | `business_logic`, `api_generation`, `ui_generation`, `schema_bootstrap`, `migration` |
| **Validation Agent** | Performs static analysis, runtime validation, QA, architectural checks | `static_analysis`, `runtime_build`, `drift_detection`, `deep_validation`, `qa` |
| **Evolution Agent** | Performs repair, learning, pattern extraction, prompt optimization | `build_repair`, `error_learning`, `pattern_extraction`, `prompt_optimization`, `prevention_rules` |

### How Specialization Is Preserved

Each agent type achieves specialization through four dimensions, not through identity proliferation:

```
Agent Specialization = Mode + Tools + Memory + Contract
```

- **Mode** — determines the domain context and prompt strategy (e.g., Design Agent in `data_modeling` mode uses different prompts than in `api_design` mode)
- **Tools** — each mode has access to specific tools (brain queries, schema generators, code sanitizers)
- **Memory** — agents query `agent_memory` filtered by their type and mode, enabling focused learning
- **Contract** — each mode declares its own IO contract within the agent type's standard output schema

### Agent Process Model

```
┌────────────────────────────────────────────────┐
│              AGENT OPERATING SYSTEM             │
├────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │ Perception│  │  Design   │  │   Build   │   │
│  │  Agent    │  │  Agent    │  │   Agent   │   │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘   │
│        │              │              │          │
│  ┌─────┴─────┐  ┌─────┴─────┐                   │
│  │Validation │  │ Evolution │                   │
│  │  Agent    │  │  Agent    │                   │
│  └───────────┘  └───────────┘                   │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │  Shared: Memory │ Contracts │ Tools       │   │
│  └──────────────────────────────────────────┘   │
└────────────────────────────────────────────────┘
```

### Migration Map: Current Agents → Agent OS

| Current Agent Identity | Agent OS Type | Mode |
|----------------------|--------------|------|
| comprehension-analyst | Perception | `requirement_analysis` |
| comprehension-ux-researcher | Perception | `ux_research` |
| comprehension-market-analyst | Perception | `market_signal` |
| comprehension-tech-scout | Perception | `tech_discovery` |
| architecture-strategist | Design | `architecture` |
| architecture-systems-designer | Design | `system_design` |
| architecture-risk-analyst | Design | `risk_analysis` |
| architecture-integration-planner | Design | `integration_planning` |
| domain-model-analyzer | Design | `domain_modeling` |
| data-model-generator | Design | `data_modeling` |
| api-generator | Design | `api_design` |
| business-logic-synthesizer | Build | `business_logic` |
| ui-generator | Build | `ui_generation` |
| schema-bootstrapper | Build | `schema_bootstrap` |
| foundation-scaffolder | Build | `scaffold` |
| code-architect (fix) | Validation | `fix_analysis` |
| static-validator | Validation | `static_analysis` |
| drift-detector | Validation | `drift_detection` |
| runtime-validator | Validation | `runtime_build` |
| fix-developer | Evolution | `build_repair` |
| fix-integration-validator | Evolution | `repair_validation` |
| adaptive-learning-engine | Evolution | `pattern_extraction` |

### Benefits

- **Reduced complexity** — 5 agent types instead of 18+ identities
- **Consistent contracts** — all agents share the same IO structure (§6)
- **Unified memory** — learning is organized by type + mode, not by identity
- **Lower cost** — shared prompt scaffolding reduces token overhead
- **Easier evolution** — adding a new capability = adding a mode, not a new agent

### Relationship to Learning Agents (NEXT)

Agent OS directly enables the NEXT horizon:
- Fewer agent types mean fewer learning models to train
- Mode-based organization provides cleaner data for prompt optimization
- Unified memory structure makes cross-mode learning natural
- Consistent output schemas make A/B testing straightforward

**Status:** 📋 Planned — conceptual architecture defined, migration from current agents pending

---

## 8. Project Brain

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
| `renders_component` | Page → Component |
| `calls_service` | Component → Service/Hook |
| `stores_entity` | Service → Database Table |

---

## 9. Edge Function Architecture

```
supabase/functions/
├── Discovery & Architecture
│   ├── pipeline-comprehension/         (4 agents)
│   ├── pipeline-architecture/          (4 agents)
│   ├── pipeline-architecture-simulation/
│   ├── pipeline-preventive-validation/
│   └── pipeline-squad/
├── Infrastructure & Modeling
│   ├── project-bootstrap-intelligence/
│   ├── pipeline-foundation-scaffold/
│   ├── pipeline-module-graph-simulation/
│   ├── pipeline-dependency-intelligence/
│   ├── ai-domain-model-analyzer/
│   ├── supabase-schema-bootstrap/
│   ├── supabase-provisioning-engine/
│   └── supabase-data-model-generator/
├── Code Generation
│   ├── ai-business-logic-synthesizer/
│   ├── autonomous-api-generator/
│   └── autonomous-ui-generator/
├── Validation & Publish
│   ├── pipeline-validation/
│   ├── pipeline-deep-validation/
│   ├── pipeline-drift-detection/
│   ├── pipeline-runtime-validation/
│   ├── autonomous-build-repair/
│   └── pipeline-publish/
├── Growth & Evolution
│   ├── observability-engine/
│   ├── product-analytics-engine/
│   ├── user-behavior-analyzer/
│   ├── growth-optimization-engine/
│   ├── adaptive-learning-engine/
│   ├── product-evolution-engine/
│   ├── architecture-evolution-engine/
│   ├── startup-portfolio-manager/
│   └── system-evolution-engine/
├── Venture Intelligence (FUTURE)
│   ├── opportunity-discovery-engine/
│   ├── market-signal-analyzer/
│   ├── product-validation-engine/
│   └── revenue-strategy-engine/
├── Pipeline Control
│   ├── pipeline-approve/
│   ├── pipeline-reject/
│   ├── pipeline-ci-webhook/
│   ├── pipeline-fix-orchestrator/
│   ├── pipeline-fast-modify/
│   ├── pipeline-full-review/
│   └── run-initiative-pipeline/
├── Support
│   ├── brain-sync/
│   ├── error-intelligence/
│   ├── generate-embeddings/
│   ├── analyze-artifact/
│   ├── rework-artifact/
│   ├── generate-agents/
│   ├── generate-stories/
│   ├── organize-stories/
│   ├── generate-planning-content/
│   ├── github-proxy/
│   └── github-ci-webhook/
└── _shared/
    ├── ai-client.ts              Unified AI client + Efficiency Layer
    ├── prompt-compressor.ts      Prompt compression engine
    ├── semantic-cache.ts         Vector-based semantic cache
    ├── model-router.ts           Intelligent model routing
    ├── pipeline-helpers.ts       Logging, jobs, agent messages
    ├── pipeline-bootstrap.ts     Auth, CORS, rate limiting
    ├── dependency-scheduler.ts   DAG builder + wave computation
    ├── brain-helpers.ts          Project Brain CRUD + context
    ├── smart-context.ts          Smart Context Window
    ├── incremental-engine.ts     Incremental re-execution
    ├── embedding-helpers.ts      Vector embeddings
    ├── code-sanitizers.ts        Deterministic files
    ├── auth.ts                   Authentication
    ├── cors.ts                   CORS headers
    └── rate-limit.ts             Rate limiting
```

---

## 10. Implementation Status

### ✅ Implemented (Kernel — NOW)

| # | System | Details |
|---|--------|---------|
| 1 | Pipeline (32 stages) | 50+ independent Edge Functions |
| 2 | Project Brain | Nodes, edges, decisions, errors, prevention rules, tsvector, pgvector |
| 3 | Dependency Scheduler | DAG builder, topological sort, wave computation |
| 4 | Agent Swarm | Orchestrator + Worker, parallel execution (6 workers) |
| 5 | Data Model Generator | Domain model → SQL tables, FK, indexes, RLS |
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

### 📋 Planned (NEXT → LATER → FUTURE)

| Horizon | Module | Priority |
|---------|--------|----------|
| NEXT | Learning Agents | P0 |
| NEXT | Prompt Optimization Engine | P0 |
| NEXT | Error Pattern Recognition | P1 |
| NEXT | Architecture Pattern Library | P1 |
| NEXT | Self-Improving Fix Agents | P2 |
| LATER | Product Analytics Engine | P1 |
| LATER | User Behavior Analyzer | P1 |
| LATER | Product Evolution Engine | P2 |
| FUTURE | Opportunity Discovery Engine | P2 |
| FUTURE | Startup Portfolio Manager | P3 |

### 🟡 Remaining Gaps

| Gap | Description |
|-----|-------------|
| Approval Chains | No multi-approver workflow with quorum |
| Webhook Notifications | No Slack/Discord notifications |
| UI Visualizations | Missing ER diagrams, component trees, patterns view |

---

## 10. Database Schema (30+ tables)

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
