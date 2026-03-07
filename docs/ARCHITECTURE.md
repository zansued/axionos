# AxionOS — System Architecture

> Technical architecture of the autonomous software engineering system.
>
> **Last updated:** 2026-03-07
>
> **Current state:** Level 5 — Institutional Engineering Memory Platform.
> Ten architectural layers active. Advisory Calibration Layer operational (Sprint 20). Proposal Quality Feedback Loop active (Sprint 19).

---

## 1. Project Overview

**AxionOS** is a multi-tenant SaaS platform that operates as an autonomous software engineering system. It orchestrates multiple AI agents to generate complete production-ready applications through a deterministic 32-stage pipeline with self-healing builds, architecture simulation, and preventive validation.

### What AxionOS Is Today

A governed engineering platform with active learning, meta-analysis, and controlled proposal generation:

- A 32-stage deterministic pipeline from idea to deployable application
- A Project Brain (knowledge graph with semantic search)
- An AI Efficiency Layer (prompt compression, semantic cache, model routing)
- Self-healing build repair with CI integration
- DAG-based parallel execution with 6 concurrent workers
- Evidence-oriented repair with adaptive routing
- Preventive engineering with active prevention rules
- Commercial readiness: product plans, billing, usage enforcement
- Learning Agents v1: rule-based, auditable prompt and strategy optimization
- Meta-Agents v1.4: 4 memory-aware meta-agents with quality feedback loop and advisory calibration
- Controlled proposal generation via engineering artifacts
- Hardened review workflows for recommendations and artifacts
- Proposal Quality Feedback Loop: quality scoring, outcome tracking, confidence calibration
- Advisory Calibration Layer: structured diagnostic signals for future tuning
- Engineering Memory Foundation: structured knowledge capture and retrieval
- Agent OS v1.0 — a 14-module runtime architecture across 5 planes

### System Maturity

| Level | Name | Status |
|-------|------|--------|
| Level 1 | Code Generator | ✅ Complete |
| Level 2 | Software Builder | ✅ Complete |
| Level 3 | Autonomous Engineering System | ✅ Complete |
| Level 4 | Self-Learning Software Factory | ✅ Complete |
| Level 4.5 | Meta-Aware Engineering Platform | ✅ Complete |
| Level 5 | Institutional Engineering Memory | ✅ Current |
| Level 5.5 | Contextual / Self-Improving Platform | 🔮 Future horizon |
| Level 6 | Discovery-Driven Engineering | 🔮 Long-term |

> **Current position:** Level 5 — Institutional Engineering Memory.
> **System state:** Execution + Learning + Meta-Analysis + Memory-Aware Proposals + Quality Feedback + Advisory Calibration active.
> **Kernel status:** Stable and operational.
> **Learning status:** Active, rule-based, auditable.
> **Meta-Agent status:** Active, memory-aware, v1.4 with quality feedback and calibration.
> **Proposal status:** Active, artifact generation with Related Historical Context sections.
> **Engineering Memory:** Full stack operational — foundation, retrieval, summaries, memory-aware reasoning.
> **Calibration status:** Active, advisory-only diagnostic signals operational.

### Implementation Horizons

| Horizon | Focus | Status |
|---------|-------|--------|
| **DONE** | Kernel + Commercial + Learning + Meta-Agents + Proposals + Memory + Quality Feedback + Calibration | ✅ 20 Sprints Complete |
| **NEXT** | Contextual Self-Improvement + Semantic Retrieval | 📋 Planned |
| **LATER** | Discovery-Driven Architecture Experimentation | 📋 Planned |
| **FUTURE** | Discovery-Driven Architecture Experimentation | 🔮 Vision |

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui |
| State Management | TanStack React Query + React Context |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions, RLS) |
| AI Engine | Lovable AI Gateway (Gemini 2.5 Flash/Pro) + Efficiency Layer |
| Git Integration | GitHub API v3 (Tree API for atomic commits, PRs) |
| Deployment | Vercel/Netlify configs auto-generated |

### Multi-Tenancy Model

- **Organizations** → **Workspaces** → **Initiatives**
- RLS policies enforce isolation per `organization_id`
- Role-based access: `owner`, `admin`, `editor`, `reviewer`, `viewer`
- Auto-provisioning: first login creates a default org via `create_organization_with_owner` RPC

---

## 2. Active Architecture Layers

AxionOS consists of ten layers. All ten layers are active and operational.

### Layer Interaction Flow

```
  Layer 10: Proposal Quality & Calibration Layer  ← Active (Sprints 19-20)
  ─────────────────────────────────────────
  Layer 9: Engineering Memory Architecture     ← Cross-layer (Full stack active)
  ─────────────────────────────────────────
  Layer 8: Proposal Generation Layer           ← Active (Sprint 14)
          ↑
  Layer 7: Meta-Agent Coordination Layer       ← Active (Sprint 13)
          ↑
  Layer 6: Learning Agents Layer               ← Active (Sprint 12)
          ↑
  Layer 5: Commercial Readiness Layer          ← Active (Sprint 11)
          ↑
  Layer 4: Observability Layer                 ← Active
          ↑
  Layer 3: Governance and Audit Layer          ← Active
          ↑
  Layer 2: Prevention and Routing Layer        ← Active
          ↑
  Layer 1: Execution Kernel                    ← Active
```

Engineering Memory is a **cross-layer infrastructure** that captures knowledge from all layers but does not interfere with their operation. The pipeline executes identically whether memory is available or not.

---

### Layer 1: Execution Kernel

**Purpose:** Execute the 32-stage deterministic pipeline with DAG-based parallel orchestration.

**Includes:**
- Deterministic 32-stage pipeline
- DAG orchestration (Kahn's algorithm, wave computation, 6 concurrent workers)
- Stage execution via independent Edge Functions
- Runtime validation (real tsc + vite build via GitHub Actions CI)
- Autonomous build repair with multi-iteration fix loop
- Deploy flow (atomic Git Tree API, Vercel/Netlify config generation)
- Project Brain (knowledge graph with semantic search and pgvector)
- AI Efficiency Layer (prompt compression, semantic cache, model routing)

**Key modules:**
- `pipeline-bootstrap.ts` — Pipeline lifecycle initialization with usage enforcement
- `dependency-scheduler.ts` — Kahn's algorithm, wave computation, 6 workers
- `pipeline-execution-orchestrator` / `pipeline-execution-worker` — DAG agent swarm
- `pipeline-helpers.ts` — Standardized logging, jobs, messages
- `autonomous-build-repair` — Self-healing builds from CI error logs
- `pipeline-fix-orchestrator` — Multi-iteration fix coordination
- 50+ Edge Functions covering all 32 stages

**Interactions:** Consumes governance decisions from Layer 3. Produces execution data consumed by Layers 4, 6, and 9.

---

### Layer 2: Prevention and Routing Layer

**Purpose:** Proactively prevent known failure patterns and route repair strategies based on evidence.

**Includes:**
- Pre-generation guard (preventive validation before code generation)
- Active prevention rule management with confidence scoring
- Adaptive strategy selection based on historical effectiveness
- Error pattern extraction, indexing, and signature normalization

**Key modules:**
- `pipeline-preventive-validation` — Pre-generation guard
- `prevention-rule-engine` — Active prevention rule management
- `repair-routing-engine` — Adaptive strategy selection
- `error-pattern-library-engine` — Pattern extraction and indexing

**Persistence:** `active_prevention_rules`, `error_patterns`, `prevention_rule_candidates`, `repair_routing_log`

**Interactions:** Consumes patterns from error history. Feeds routing decisions to Execution Kernel. Learning layer adjusts routing weights.

---

### Layer 3: Governance and Audit Layer

**Purpose:** Enforce trust boundaries, approval workflows, SLA compliance, and complete audit trails.

**Includes:**
- Trust boundaries and approval gates for pipeline stages
- Per-role stage access permissions
- SLA enforcement per stage with breach alerting
- Complete audit log event ledger
- Review workflows for artifacts, recommendations, and proposals

**Key modules:**
- `governance.ts` — Approval workflows, access control
- `pipeline_gate_permissions` — Per-role stage access
- `stage_sla_configs` — SLA enforcement per stage
- `audit_logs` — Complete event ledger

**Interactions:** Gates pipeline advancement. All layers emit audit events. Meta-Agent and Proposal layers operate under governance review workflows.

---

### Layer 4: Observability Layer

**Purpose:** Track execution telemetry, cost, performance, and system health.

**Includes:**
- Per-initiative metrics (success rate, cost, duration, retries)
- Pipeline-level aggregated observability
- Cost metrics per model, per stage, per initiative
- Recommendation and artifact observability
- Engineering Memory metrics (entry counts, retrieval frequency)

**Key modules:**
- `observability-engine` — Telemetry aggregation
- `initiative-observability-engine` — Per-initiative metrics
- Cost tracking per model, per stage, per initiative

**Persistence:** `initiative_observability`, `initiative_jobs` (cost_usd, tokens_used, duration_ms)

**Interactions:** Provides data consumed by Commercial layer (billing), Learning layer (analysis), and Meta-Agent layer (system analysis).

---

### Layer 5: Commercial Readiness Layer

**Purpose:** Make AxionOS operationally packageable as a commercial product.

**Includes:**
- Product plans (Starter $29, Pro $99, Enterprise custom) with numeric limits
- Billing accounts with Stripe-ready schema and billing period tracking
- Workspace-level isolation with granular roles
- Usage enforcement at pipeline entry points (HTTP 402 when limits exceeded)
- Product dashboard with overview and usage metrics

**Key modules:**
- `usage-limit-enforcer.ts` — Enforces plan limits at pipeline entry points
- `billing-calculator.ts` — Cost aggregation with org-safe job filtering
- `product-dashboard` — Overview, usage metrics API

**Persistence:** `product_plans`, `billing_accounts`, `workspace_members`

**Interactions:** Consumes observability data. Blocks pipeline execution when limits exceeded.

---

### Layer 6: Learning Agents Layer

**Purpose:** Transform passive learning data into active, auditable intelligence.

**Includes:**
- Prompt outcome tracking and aggregation per stage+model signature
- Strategy effectiveness evaluation with MTTR and recurrence metrics
- Predictive error pattern detection and prevention candidate generation
- Repair routing weight adjustment (bounded, reversible, auditable)
- Structured learning recommendations

**Key modules:**

| Module | File | Purpose |
|--------|------|---------|
| Prompt Outcome Analyzer | `prompt-outcome-analyzer/index.ts` | Aggregates success_rate, cost, retry_rate per stage+model |
| Strategy Performance Engine | `strategy-performance-engine/index.ts` | Evaluates repair strategy effectiveness |
| Predictive Error Engine | `predictive-error-engine/index.ts` | Detects recurring failure patterns |
| Repair Learning Engine | `repair-learning-engine/index.ts` | Adjusts routing weights with bounded constraints |
| Learning Recommendation Engine | `learning-recommendation-engine/index.ts` | Generates structured improvement recommendations |
| Learning Dashboard | `learning-dashboard/index.ts` | API: overview, recommendations, strategies, errors |

**Persistence:** `prompt_strategy_metrics`, `strategy_effectiveness_metrics`, `predictive_error_patterns`, `repair_strategy_weights`, `learning_recommendations`, `learning_records`

**Safety rules:**
1. Learning is **additive** — new modules consume existing data, never modify kernel
2. Learning is **rule-based** — no black-box behavior, all logic explicit
3. Learning is **auditable** — all decisions logged as `LEARNING_UPDATE` events
4. Learning is **bounded** — weight adjustments have min/max constraints, are reversible
5. Learning **cannot mutate**: pipeline stages, governance rules, product plans, billing

**Interactions:** Consumes data from Observability, Repair, and Prevention layers. Produces recommendations and weight adjustments. Feeds analysis data to Meta-Agent layer.

---

### Layer 7: Meta-Agent Coordination Layer

**Purpose:** Introduce higher-order agents that reason about the system itself — analyzing execution patterns, designing new agent roles, optimizing workflows, and advising on architectural evolution.

**Status:** ✅ Active (Sprint 13, hardened Sprint 13.5, memory-aware Sprint 18, quality feedback Sprint 19, calibration Sprint 20)

**Includes:**
- 4 memory-aware meta-agents analyzing cross-layer signals with historical context
- Historical continuity scoring (support, conflict, context scores)
- Historical alignment classification (reinforces, extends, reopens, diverges, novel)
- Redundancy guard suppressing/downgrading weak historically rejected recommendations
- Recommendation deduplication via content signatures
- Structured recommendation lifecycle (pending → reviewed → accepted → rejected → deferred)
- Read-only analysis of all lower layers

**Four Meta-Agent Types:**

| Meta-Agent | Purpose | Output Types |
|-----------|---------|--------------|
| **Architecture Meta-Agent** | Analyze execution outcomes and suggest pipeline improvements | `PIPELINE_OPTIMIZATION`, `STAGE_REORDERING_SUGGESTION`, `STAGE_SPLIT_OR_MERGE` |
| **Agent Role Designer** | Analyze task distribution and propose new agent roles | `NEW_AGENT_ROLE`, `AGENT_SPECIALIZATION`, `AGENT_DEPRECATION` |
| **Workflow Optimizer** | Improve pipeline efficiency by analyzing duration and retries | `WORKFLOW_PARALLELIZATION`, `STEP_ELIMINATION`, `STEP_REORDERING` |
| **System Evolution Advisor** | Produce high-level system evolution guidance | `TECHNICAL_DEBT_ALERT`, `ARCHITECTURE_CHANGE_PROPOSAL`, `SYSTEM_EVOLUTION_REPORT` |

**Persistence:** `meta_agent_recommendations`

**Memory-Aware Context (Sprint 18):**
- Each meta-agent receives: `related_memory_entries`, `related_summaries`, `related_decisions`, `related_outcomes`, `historical_context_score`
- Recommendations include: `historical_alignment`, `decision_history_signal`, `outcome_history_signal`, `historical_novelty_flag`
- Redundancy guard modules: `historical-continuity-scoring.ts`, `historical-redundancy-guard.ts`, `meta-agent-memory-context.ts`

**Critical constraint:** Meta-Agents are **recommendation-only**. They do not modify pipeline stages, governance rules, billing, contracts, or agent behavior. All recommendations require human review before any structural change is considered. Memory and summaries inform but do not dictate recommendations. Calibration signals diagnose performance but do not auto-tune behavior.

**Interactions:** Consumes data from all lower layers including Layer 9 memory (read-only). Produces recommendations consumed by Layer 8 (Proposal Generation). Performance analyzed by Layer 10 (Calibration).

---

### Layer 8: Proposal Generation Layer

**Purpose:** Transform accepted meta-agent recommendations into structured engineering proposals (artifacts) that humans can review, approve, and implement.

**Status:** ✅ Active (Sprint 14, hardened Sprint 14.5, memory-aware Sprint 18)

**Includes:**
- Artifact generation from accepted recommendations
- 5 supported artifact types
- Artifact review lifecycle with state machine
- Idempotency guarantees (same recommendation cannot generate duplicate artifacts)
- Content quality enforcement (context, problem, evidence, proposal, risk, rollback)

**Supported Artifact Types:**

| Artifact Type | Description |
|---------------|-------------|
| **ADR Draft** | Architecture Decision Record documenting a structural decision |
| **Architecture Proposal** | Detailed technical proposal for architecture changes |
| **Agent Role Spec** | Specification for new or modified agent roles |
| **Workflow Change Proposal** | Proposal for workflow optimization or restructuring |
| **Implementation Plan** | Step-by-step plan for implementing a recommended change |

**Artifact Lifecycle:**

```
draft → reviewed → approved → implemented
  ↓        ↓
rejected  rejected
```

**Persistence:** `meta_agent_artifacts`

**Memory-Aware Artifacts (Sprint 18):**
- Artifacts include a structured **Related Historical Context** section with up to 3–5 historical references
- Prior decisions, outcomes, and summary context are embedded in proposals
- Historical alignment and novelty indicators help reviewers assess context

**Critical constraint:** Artifacts are **engineering proposals only**. Approving or implementing an artifact does not automatically modify the system. Human implementation is required for any structural change. No artifact or review action mutates the pipeline, governance, billing, contracts, or agent behavior.

**Interactions:** Consumes accepted recommendations from Layer 7. Produces engineering proposals for human review. Emits memory capture events to Layer 9. Quality tracked by Layer 10.

---

### Layer 9: Engineering Memory Architecture

**Purpose:** Cross-layer knowledge infrastructure that captures, structures, indexes, and retrieves engineering experience over time.

**Status:** Full stack operational (Sprints 15–18). Foundation, retrieval surfaces, summaries, and memory-aware reasoning all active.

**Design Principles:**

| Principle | Description |
|-----------|-------------|
| **Explainable** | Every memory entry traces back to a real event or artifact |
| **Curated** | Not every log becomes memory — capture is event-driven and filtered |
| **Contextual** | Retrieval depends on query context (stage, component, error type) |
| **Tenant-safe** | Organization boundaries preserved via RLS |
| **Non-invasive** | Memory never mutates system configuration or runtime behavior |
| **Composable** | Memory entries link to each other via typed relationships |

**Memory Types:**

| Type | Description | Examples |
|------|-------------|----------|
| **ExecutionMemory** | Structured summaries of engineering runs | Pipeline outcomes, stage performance, cost patterns |
| **ErrorMemory** | Failure patterns and contexts | Recurring errors, dependency failures, build issues |
| **StrategyMemory** | Strategies used to resolve problems | Prompt strategies, repair strategies, mitigation techniques |
| **DesignMemory** | Structural insights about the system | Meta-agent recommendations, architecture proposals |
| **DecisionMemory** | Human decisions and their context | Recommendation accepted/rejected, artifact reviewed |
| **OutcomeMemory** | Results of implemented changes | Impact of architecture changes, repair improvements |

**Foundation Implemented (Sprint 15):**

| Component | Status |
|-----------|--------|
| `engineering_memory_entries` table with RLS | ✅ |
| `memory_links` table with typed relationships | ✅ |
| `memory_retrieval_log` table | ✅ |
| Memory capture on artifact approval/implementation | ✅ |
| Memory capture on recommendation acceptance | ✅ |
| Retrieval API with filtering and pagination | ✅ |
| Observability metrics (entry counts, retrieval frequency, link totals) | ✅ |
| Read-only memory dashboard in Observability UI | ✅ |

**Not Yet Implemented:**

| Component | Status |
|-----------|--------|
| Semantic indexing via embeddings | 📋 Planned |

**Data Model:**

**engineering_memory_entries**

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| organization_id | uuid | Tenant isolation |
| workspace_id | uuid | Optional workspace scope |
| memory_type | text | ExecutionMemory, ErrorMemory, StrategyMemory, DesignMemory, DecisionMemory, OutcomeMemory |
| memory_subtype | text | Finer classification within type |
| title | text | Human-readable summary title |
| summary | text | Structured summary of the memory |
| source_type | text | Origin layer (execution, learning, meta_agent, proposal, human) |
| source_id | uuid | Reference to originating record |
| related_component | text | Affected component or stage |
| related_stage | text | Pipeline stage context |
| confidence_score | numeric | Reliability of the memory |
| relevance_score | numeric | Current relevance |
| tags | jsonb | Searchable tags |
| created_at | timestamptz | Creation timestamp |
| last_accessed_at | timestamptz | Last retrieval timestamp |
| times_retrieved | integer | Retrieval count |

**memory_links**

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| organization_id | uuid | Tenant isolation |
| from_memory_id | uuid | Source memory entry |
| to_memory_id | uuid | Target memory entry |
| link_type | text | caused_by, resolved_by, recommended_by, implemented_as, similar_to, superseded_by |
| created_at | timestamptz | Link creation time |

**memory_retrieval_log**

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| organization_id | uuid | Tenant isolation |
| memory_id | uuid | Retrieved memory entry |
| retrieved_by_component | text | Component that requested retrieval |
| retrieval_context | text | Query context |
| used_in_decision | boolean | Whether it influenced a decision |
| created_at | timestamptz | Retrieval time |

**memory_summaries**

| Field | Type | Description |
|-------|------|-------------|
| summary_type | text | weekly_failures, monthly_evolution, strategy_trends |
| organization_id | uuid | Tenant scope |
| workspace_id | uuid | Optional workspace scope |
| period_start | timestamptz | Summary period start |
| period_end | timestamptz | Summary period end |
| content | jsonb | Synthesized summary content |
| source_memory_ids | uuid[] | Contributing memory entries |
| created_at | timestamptz | Summary creation time |

**Memory Capture Events:**

| Layer | Capture Trigger | Memory Type |
|-------|----------------|-------------|
| Meta-Agent | Recommendation accepted | DesignMemory |
| Proposal | Artifact approved | DesignMemory |
| Proposal | Artifact implemented | OutcomeMemory |

Additional capture events (pipeline completion, error patterns, strategy updates) are designed but not yet wired.

**Indexing Strategy:**

- **Structural Index (Active):** Query by explicit fields — memory_type, related_stage, related_component, tags, source_type.
- **Semantic Index (Planned):** Vector-based contextual retrieval using embeddings.

**Retrieval Surfaces (Active — Sprint 16):**

| Context | Use Case | Status |
|---------|----------|--------|
| During repair | Retrieve past strategies used for similar errors | ✅ |
| During meta-agent analysis | Retrieve memory, summaries, decisions, outcomes | ✅ |
| During artifact generation | Retrieve historical context for proposals | ✅ |
| During human review | Show related past decisions and outcomes | ✅ |

**Memory-Aware Reasoning (Active — Sprint 18):**

| Module | Purpose |
|--------|---------|
| `meta-agent-memory-context.ts` | Gather ranked historical context per meta-agent type |
| `historical-continuity-scoring.ts` | Compute support/conflict/context scores (0-1, deterministic) |
| `historical-redundancy-guard.ts` | Suppress/downgrade weak historically redundant recommendations |

**Safety Constraints:** Engineering Memory must **not** change system configuration, alter execution pipeline, bypass governance, or expose tenant data across organizations. Memory remains **informational infrastructure only**. The pipeline executes identically whether memory is available or not.

---

### Layer 10: Proposal Quality & Calibration Layer

**Purpose:** Measure the quality and usefulness of recommendations and artifacts over time, and produce structured calibration signals that diagnose where advisory intelligence should be tuned.

**Status:** ✅ Active (Sprints 19–20)

**Includes:**
- Proposal Quality Feedback Loop (Sprint 19): quality scoring, outcome tracking, confidence calibration
- Advisory Calibration Layer (Sprint 20): structured diagnostic signals across 6 calibration domains
- Calibration summaries for periodic system-level guidance
- Calibration observability endpoints

**Calibration Domains:**

| Domain | Purpose |
|--------|---------|
| `META_AGENT_PERFORMANCE` | Evaluate meta-agent recommendation value |
| `PROPOSAL_USEFULNESS` | Analyze usefulness by artifact type |
| `HISTORICAL_CONTEXT_VALUE` | Assess whether historical context helps or hurts |
| `REDUNDANCY_GUARD_EFFECTIVENESS` | Detect suppression calibration issues |
| `NOVELTY_BALANCE` | Evaluate novelty scoring balance |
| `DECISION_FOLLOW_THROUGH` | Track implementation follow-through patterns |

**Key modules:**
- `proposal-quality-scoring.ts` — Quality scoring service
- `proposal-quality-feedback-service.ts` — Feedback collection
- `calibration/types.ts` — Calibration taxonomy
- `calibration/scoring.ts` — Deterministic calibration scoring
- `calibration/analysis-service.ts` — Domain-specific analysis
- `advisory-calibration-engine/index.ts` — Calibration API

**Persistence:** `proposal_quality_feedback`, `proposal_quality_summaries`, `advisory_calibration_signals`, `advisory_calibration_summaries`

**Critical constraint:** Calibration signals are **advisory only**. They diagnose where tuning should happen but do not apply tuning automatically. No auto-adjustment of meta-agent scoring, redundancy guard thresholds, historical weighting, or proposal generation behavior. Humans decide when and how tuning is applied.

**Interactions:** Consumes data from Layers 7 (recommendations), 8 (artifacts), and 9 (memory). Produces structured diagnostic signals for human review.

---

## 3. Safety Architecture

### Structural Safety Rules

The following rules are enforced across all layers:

1. **Recommendations do not execute changes.** Meta-Agent recommendations are proposals for human review. No recommendation triggers automatic system modification.

2. **Artifacts do not execute changes.** Engineering artifacts (ADRs, proposals, specs) are documents. Approving or implementing an artifact does not automatically mutate the system.

3. **Memory is not a mutation engine.** Engineering Memory captures and retrieves knowledge. It does not alter pipeline behavior, governance rules, billing, or agent configuration.

4. **Calibration is advisory only.** Calibration signals diagnose where tuning should happen. They do not auto-adjust meta-agent scoring, redundancy thresholds, historical weighting, or proposal behavior. Humans decide when and how tuning is applied.

5. **Human review remains required for structural evolution.** Any change to pipeline stages, governance rules, agent roles, or system architecture requires explicit human action.

6. **Tenant isolation is absolute.** All data access is scoped by `organization_id` with RLS enforcement. No cross-tenant data leakage is permitted.

7. **Learning is bounded and reversible.** Weight adjustments have min/max constraints. All learning decisions are logged and auditable.

---

## 4. Agent Operating System (Agent OS) — v1.0 GA

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

## 5. Pipeline — 32-Stage Model

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

## 6. AI Efficiency Layer

### 6.1 Prompt Compression Engine
**File:** `_shared/prompt-compressor.ts`
**Result:** 60-90% token reduction while preserving engineering-critical information

### 6.2 Semantic Cache Engine
**File:** `_shared/semantic-cache.ts`
**Table:** `ai_prompt_cache` (with `vector(768)` column)
**Threshold:** cosine similarity > 0.92 returns cached response

### 6.3 Model Router Engine
**File:** `_shared/model-router.ts`

| Complexity | Model | Cost Multiplier |
|-----------|-------|-----------------|
| Low | `google/gemini-2.5-flash-lite` | 0.2x |
| Medium | `google/gemini-2.5-flash` | 0.5x |
| High | `google/gemini-2.5-pro` | 1.0x |

### 6.4 Integration Point
All modules integrate transparently in `callAI()` (`_shared/ai-client.ts`):
```
callAI() -> compress -> cache lookup -> route model -> LLM call -> cache store -> return
```

---

## 7. Stage Contracts

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

## 8. Agent IO Contracts

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

## 9. Five Fundamental Agent Types

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

## 10. Project Brain

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

## 11. Edge Function Architecture

```
supabase/functions/
+-- Discovery & Architecture       (5 functions)
+-- Infrastructure & Modeling       (8 functions)
+-- Code Generation                 (3 functions)
+-- Validation & Publish            (6 functions)
+-- Growth & Evolution              (9 functions)
+-- Pipeline Control                (7 functions)
+-- Commercial Readiness            (2 functions -- Sprint 11)
+-- Learning Agents                 (6 functions -- Sprint 12)
+-- Meta-Agents                     (3 functions -- Sprint 13-14, 18)
+-- Engineering Memory              (2 functions -- Sprint 15, 17)
+-- Proposal Quality                (1 function -- Sprint 19)
+-- Advisory Calibration            (1 function -- Sprint 20)
+-- Support                         (11 functions)
+-- _shared/                        (15+ helper modules)
    +-- agent-os/                   (14 Agent OS modules)
    +-- meta-agents/               (Meta-agent types, scoring, validation, memory context, continuity, redundancy, quality feedback)
    +-- calibration/               (Calibration types, scoring, analysis service)
```

---

## 12. Implementation Status

### Implemented

| # | System | Sprint | Details |
|---|--------|--------|---------|
| 1 | Pipeline (32 stages) | 1-10 | 50+ independent Edge Functions |
| 2 | Project Brain | 1-10 | Nodes, edges, decisions, errors, prevention rules, tsvector, pgvector |
| 3 | Dependency Scheduler | 1-10 | DAG builder, topological sort, wave computation |
| 4 | Agent Swarm | 1-10 | Orchestrator + Worker, parallel execution (6 workers) |
| 5 | Data Model Generator | 1-10 | Domain model to SQL tables, FK, indexes, RLS |
| 6 | Autonomous UI Generator | 1-10 | Pages, components, hooks, navigation |
| 7 | Adaptive Learning Engine | 1-10 | Prevention rules, patterns, cross-project |
| 8 | CI-Triggered Fix Swarm | 1-10 | Webhook + Fix Orchestrator + auto-PR |
| 9 | Self-Healing Codebase | 1-10 | Prevention rules with confidence scoring |
| 10 | Architectural Drift Detection | 1-10 | Rule-based + AI hybrid |
| 11 | Atomic Git Commits | 1-10 | Tree API for publish + fix PRs |
| 12 | Runtime Validation | 1-10 | Real tsc + vite build via GitHub Actions CI |
| 13 | Smart Context Window | 1-10 | ~60-80% token reduction |
| 14 | AI Efficiency Layer | 1-10 | Prompt compression + semantic cache + model router |
| 15 | Agent OS v1.0 | 1-10 | 14 modules, 5 planes, full TypeScript contracts |
| 16 | Commercial Readiness | 11 | Plans, billing, workspace roles, usage enforcement |
| 17 | Learning Agents v1 | 12 | Prompt analysis, strategy tracking, prediction, weight adaptation |
| 18 | Meta-Agents v1.4 | 13+18+19+20 | 4 memory-aware meta-agents, quality feedback, advisory calibration |
| 19 | Controlled Proposal Generation | 14 | 5 artifact types, review lifecycle, idempotency |
| 20 | Engineering Memory Foundation | 15 | Memory tables, capture events, retrieval API, observability |
| 21 | Memory Retrieval Surfaces | 16 | Structured retrieval for repair, meta-agents, artifacts, review |
| 22 | Memory Summaries | 17 | 6 summary types, signal strength, generation service |
| 23 | Memory-Aware Meta-Agents | 18 | Historical context, continuity scoring, redundancy guard, proposal v2 |
| 24 | Proposal Quality Feedback Loop | 19 | Quality scoring, outcome tracking, confidence calibration |
| 25 | Advisory Calibration Layer | 20 | 6 calibration domains, deterministic scoring, advisory-only signals |

### Frozen

| Module | Reason |
|--------|--------|
| Marketplace ecosystem | Not needed until product intelligence layer |
| Global capability registry expansion | Architecture sufficient |
| Advanced distributed runtime | Current runtime is adequate |
| Advanced multi-agent coordination | Existing coordination works |

### Planned

| Horizon | Module | Priority |
|---------|--------|----------|
| DONE | Memory Retrieval Surfaces (Sprint 16) | ✅ |
| DONE | Memory Summaries (Sprint 17) | ✅ |
| DONE | Memory-Aware Meta-Agents (Sprint 18) | ✅ |
| DONE | Proposal Quality Feedback Loop (Sprint 19) | ✅ |
| DONE | Advisory Calibration Layer (Sprint 20) | ✅ |
| NEXT | Semantic Retrieval via Embeddings | P1 |
| LATER | Product Analytics Engine | P2 |
| FUTURE | Discovery-Driven Architecture | P3 |

---

## 13. Database Schema (50+ tables)

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

### Meta-Agent Tables (Sprint 13-14)
- `meta_agent_recommendations` — Architectural recommendations with scoring and deduplication
- `meta_agent_artifacts` — Engineering proposals generated from accepted recommendations

### Engineering Memory Tables (Sprints 15–17)
- `engineering_memory_entries` — Core memory storage with type taxonomy
- `memory_links` — Typed relationships between memory entries
- `memory_retrieval_log` — Retrieval tracking and access statistics
- `memory_summaries` — Periodic historical synthesis with signal strength scoring
