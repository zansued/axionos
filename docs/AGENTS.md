# AxionOS — Agent OS Reference

> Consolidated reference for the Agent Operating System architecture.
> Replaces individual AGENT_*.md files.
>
> **What changed (2026-03-07):** Sprint 23 — Self-Improving Fix Agents v2. Repair system now memory-aware and policy-driven with bounded adjustments, retry path intelligence, and full explainability. Previous: Bounded Promotion & Rollback Guard (Sprint 22).
>
> Last updated: 2026-03-07

---

## 1. Architecture Overview

The Agent OS is a **layered, contract-first** system with 14 modules across 5 architectural planes.

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

### Dependency Rules

```
Ecosystem  --> Core
Execution  --> Control, Data, Core
Control    --> Core
Data       --> Core
Core       --> (nothing)
```

---

## 2. Five Fundamental Agent Types

| Agent Type | Responsibility | Example Modes |
|-----------|---------------|---------------|
| **Perception** | Interprets ideas, requirements, market signals, context | `idea_intake`, `requirement_analysis`, `market_signal` |
| **Design** | Creates architecture, domain models, data models, API designs | `architecture`, `domain_modeling`, `data_modeling`, `api_design` |
| **Build** | Generates code, UI, configs, migrations, artifacts | `business_logic`, `api_generation`, `ui_generation` |
| **Validation** | Static analysis, runtime validation, QA, architectural checks | `static_analysis`, `runtime_build`, `drift_detection` |
| **Evolution** | Repair, learning, pattern extraction, prompt optimization | `build_repair`, `error_learning`, `pattern_extraction` |

### Specialization Model

```
Agent Specialization = Mode + Tools + Memory + Contract
```

---

## 3. Module Inventory

| # | Module | File | Plane | Version | Purpose |
|---|--------|------|-------|---------|---------|
| 1 | Runtime Protocol | `protocol.ts` | Core | v0.1 | Agent identity, task contracts, artifact schemas |
| 2 | Capability Model | `capabilities.ts` | Core | v0.2 | Capability declaration, matching, scoring, evolution |
| 3 | Core Types | `types.ts` | Core | v0.1 | Foundational types and enums |
| 4 | Selection Engine | `selection.ts` | Control | v0.2 | Agent selection & ranking by capability scores |
| 5 | Policy Engine | `policy-engine.ts` | Control | v0.2 | Policy evaluation, trust levels (6 tiers), autonomy limits |
| 6 | Governance Layer | `governance.ts` | Control | v1.1 | Approval workflows, access control, compliance, audit |
| 7 | Adaptive Routing | `adaptive-routing.ts` | Control | v0.7 | Performance feedback loop, routing signal analysis, exploration strategies |
| 8 | Orchestrator | `orchestrator.ts` | Execution | v0.1 | Task orchestration, agent dispatch |
| 9 | Agent Registry | `registry.ts` | Execution | v0.1 | Agent registration & lookup |
| 10 | Event Bus | `event-bus.ts` | Execution | v0.1 | Async event emission & subscription |
| 11 | Multi-Agent Coordination | `coordination.ts` | Execution | v0.8 | Debate, consensus, planner-executor patterns |
| 12 | Distributed Runtime | `distributed-runtime.ts` | Execution | v0.9 | Distributed task scheduling, worker management |
| 13 | LLM Adapter | `llm-adapter.ts` | Execution | v0.4 | LLM invocation with provider abstraction |
| 14 | Tool Adapter | `tool-adapter.ts` | Execution | v0.5 | External tool execution with sandboxing |
| 15 | Artifact Store | `artifact-store.ts` | Data | v0.1 | Versioned storage with lineage DAG, deduplication by SHA-256 |
| 16 | Memory System | `memory-system.ts` | Data | v0.6 | 6 memory types, embedding-based search, retention policies |
| 17 | Observability | `observability.ts` | Data | v0.3 | Telemetry, cost tracking, execution tracing, audit ledger |
| 18 | Marketplace | `marketplace.ts` | Ecosystem | v1.0 | Capability registry, package management, trust scoring |

---

## 4. Active Operational Agents & Modules

These are the currently implemented and operational components of the AxionOS agent system.

### Pipeline Orchestration
- **DAG Execution Engine** — Kahn's algorithm, wave computation, 6 concurrent workers
- **Pipeline Orchestrator** — 32-stage deterministic pipeline coordination
- **Pipeline Bootstrap** — Lifecycle initialization with usage enforcement integration

### Validation Agents
- **Fix Loop Agent** — AI-powered code correction (3 iterations)
- **Deep Static Analyzer** — Import/reference/type consistency validation
- **Drift Detector** — Architecture-to-code conformance checking
- **Runtime Validator** — Real tsc + vite build via GitHub Actions CI

### Repair Agents
- **Autonomous Build Repair** — Self-healing from CI error logs
- **Fix Orchestrator** — Multi-iteration repair coordination with auto-PR
- **Repair Router** — Evidence-based strategy selection
- **Repair Policy Engine** — Memory-aware, policy-driven repair strategy selection with bounded adjustments (Sprint 23)
- **Retry Path Intelligence** — Contextual retry action computation to reduce unproductive loops (Sprint 23)

### Prevention Agents
- **Preventive Validator** — Pre-generation guard against known failure patterns
- **Prevention Rule Engine** — Active rule management and enforcement
- **Error Pattern Library** — Pattern extraction and indexing

### Governance
- **Gate Permissions** — Per-role stage access control
- **SLA Enforcement** — Per-stage timing constraints
- **Audit Logger** — Complete event ledger for all system actions

### Observability
- **Observability Engine** — Telemetry aggregation and reporting
- **Initiative Observability** — Per-initiative metrics (success rate, cost, MTTR)
- **Cost Tracker** — Per-model, per-stage, per-initiative cost tracking

---

## 5. Supporting Engines

These modules provide infrastructure and efficiency services consumed by operational agents.

| Engine | File | Purpose |
|--------|------|---------|
| AI Client | `ai-client.ts` | Unified LLM invocation with compression, caching, routing |
| Prompt Compressor | `prompt-compressor.ts` | 60-90% token reduction |
| Semantic Cache | `semantic-cache.ts` | Cosine similarity cache (threshold > 0.92) |
| Model Router | `model-router.ts` | Complexity-based model selection |
| Smart Context | `smart-context.ts` | AST-like context window management |
| Pipeline Helpers | `pipeline-helpers.ts` | Standardized logging, jobs, messages |
| Brain Helpers | `brain-helpers.ts` | Knowledge graph operations |
| Embedding Helpers | `embedding-helpers.ts` | Vector embedding generation |
| Incremental Engine | `incremental-engine.ts` | Hash-based dirty detection for re-execution |

---

## 6. Learning Agents v1 (Sprint 12) — Active

Learning Agents v1 introduces five intelligence modules that observe execution data and generate auditable improvement recommendations. These agents follow the chain:

```
Observation → Evidence → Analysis → Recommendation → Human-safe Adjustment
```

### 6.1 Prompt Outcome Analyzer

| Attribute | Value |
|-----------|-------|
| **File** | `supabase/functions/prompt-outcome-analyzer/index.ts` |
| **Inputs** | `prompt_outcomes`, `initiative_jobs`, `learning_records` |
| **Outputs** | `prompt_strategy_metrics` (success_rate, average_cost, retry_rate per stage+model) |
| **Safety** | Read-only analysis. Does not modify prompts. |

### 6.2 Strategy Performance Engine

| Attribute | Value |
|-----------|-------|
| **File** | `supabase/functions/strategy-performance-engine/index.ts` |
| **Inputs** | `repair_routing_log`, `repair_evidence`, `error_patterns` |
| **Outputs** | `strategy_effectiveness_metrics` (success_rate, MTTR, recurrence_rate per strategy) |
| **Safety** | Read-only analysis. Does not modify strategies. |

### 6.3 Predictive Error Engine

| Attribute | Value |
|-----------|-------|
| **File** | `supabase/functions/predictive-error-engine/index.ts` |
| **Inputs** | `error_patterns`, `initiative_jobs`, `repair_evidence`, `learning_records` |
| **Outputs** | `predictive_error_patterns` (probability_score, observations, recommended_prevention_rule) |
| **Safety** | Generates `prevention_rule_candidates` when probability > 70%. Does not activate rules directly. |

### 6.4 Repair Learning Engine

| Attribute | Value |
|-----------|-------|
| **File** | `supabase/functions/repair-learning-engine/index.ts` |
| **Inputs** | `repair_routing_log`, `repair_evidence`, `strategy_effectiveness_metrics` |
| **Outputs** | `repair_strategy_weights` (current_weight, previous_weight, adjustment_reason) |
| **Formula** | `new_weight = previous_weight + success_factor − failure_penalty` |
| **Safety** | Weight changes are bounded (min/max), reversible, and logged. Cannot modify routing formula. |

### 6.5 Learning Recommendation Engine

| Attribute | Value |
|-----------|-------|
| **File** | `supabase/functions/learning-recommendation-engine/index.ts` |
| **Inputs** | `prompt_strategy_metrics`, `strategy_effectiveness_metrics`, `predictive_error_patterns`, `learning_records` |
| **Outputs** | `learning_recommendations` with types: PROMPT_OPTIMIZATION, STRATEGY_RANKING_ADJUSTMENT, NEW_PREVENTION_RULE, PIPELINE_CONFIGURATION_HINT |
| **Safety** | Generates recommendations only. Human review required for activation. |

### 6.6 Learning Dashboard

| Attribute | Value |
|-----------|-------|
| **File** | `supabase/functions/learning-dashboard/index.ts` |
| **Endpoints** | `overview`, `recommendations`, `strategies`, `errors` |
| **Purpose** | Exposes learning metrics for frontend consumption |

### Learning Safety Constraints

Learning Agents **cannot** modify:
- Pipeline stages or stage ordering
- Governance rules or trust levels
- Autonomy boundaries
- Product plans or billing
- Prevention rules directly (can only propose candidates)

Learning Agents **can**:
- Register evidence and observations
- Generate structured recommendations
- Adjust repair routing weights (bounded, logged, reversible)
- Propose prevention rule candidates for review

All learning actions generate `LEARNING_UPDATE` events in `audit_logs`.

---

## 7. Core Plane — Identity & Contracts

**Purpose:** Define what agents are, what they can do and how they communicate.

### Key Contracts

- `AgentIdentity` / `AgentProfile` — Who the agent is
- `CapabilityDeclaration` / `CapabilityCatalog` — What it can do
- `AgentTask` / `AgentResponse` — How tasks are defined and results returned
- `ArtifactEnvelope` / `ArtifactKind` — How outputs are packaged
- `ValidationReport` — How quality is assessed
- `RetryPolicy` / `RollbackPolicy` — How failures are handled

### Capability Model

Agents declare capabilities with:
- **Domain** — what area (frontend, backend, database, architecture)
- **Proficiency** — numeric score (0.0 - 1.0)
- **Evidence** — historical execution data backing the score
- **Evolution** — capabilities improve over time via feedback

Selection uses multi-dimensional scoring: capability match × trust level × cost efficiency × historical performance.

---

## 8. Control Plane — Decisions & Governance

**Purpose:** Decide which agent runs, under what rules, with what trust level.

### Selection Engine
- Multi-criteria ranking: capability score, trust tier, cost, latency
- Supports exploration strategies (ε-greedy, UCB, Thompson sampling)
- Override management for manual agent assignment

### Policy Engine
- 6 trust tiers: `untrusted` → `provisional` → `standard` → `trusted` → `expert` → `autonomous`
- Each tier defines: max autonomy level, allowed actions, approval requirements
- Policies can be stage-specific or organization-wide

### Governance Layer
- Approval workflows with configurable gate permissions
- SLA enforcement per stage (`stage_sla_configs`)
- Access control per role (`pipeline_gate_permissions`)
- Complete audit trail (`audit_logs`)

### Adaptive Routing
- Performance feedback loop: success rate, latency, cost per task
- Automatic rebalancing when agent performance degrades
- Learning Agents v1 adjusts routing weights based on evidence (Sprint 12)

---

## 9. Execution Plane — Orchestration & Work

**Purpose:** Execute agent tasks, coordinate multi-agent workflows, distribute work.

### Orchestrator
- DAG-based topological scheduling (Kahn's algorithm)
- Wave computation for maximum parallelism
- 6 concurrent workers per execution
- Time-budget management with auto-continuation

### Coordination Patterns
- **Debate** — Multiple agents propose, evaluate, converge
- **Consensus** — Voting-based agreement
- **Planner-Executor** — One agent plans, others execute
- **Pipeline** — Sequential handoff between specialists

### Distributed Runtime
- Worker registration and health monitoring
- Task queue with priority scheduling
- Failure detection and automatic reassignment

### Adapters
- **LLM Adapter** — Provider-agnostic LLM invocation with prompt compression, caching, model routing
- **Tool Adapter** — External tool execution with sandboxing, timeout, retry

---

## 10. Data Plane — State & Knowledge

**Purpose:** Persist artifacts, memory, telemetry and audit records.

### Artifact Store
- Immutable versioning with content-hash deduplication (SHA-256)
- Lineage DAG — full provenance tracking from input to output
- Run Artifact Manifest — reconstructs complete reasoning chain
- Kinds: `code`, `config`, `schema`, `document`, `model`, `test`, `report`

### Memory System
- **6 memory types:** run, episodic, semantic, vector, procedural, meta
- Vector-native with pgvector (768-dim) for semantic retrieval
- Retention policies: TTL, importance, access-based, capacity
- Cross-execution learning: patterns, decisions, errors
- 12 observable event types via EventBus

### Observability
- Execution tracing with `run_id` / `trace_id` correlation
- Per-model, per-stage, per-initiative cost tracking
- SLA breach detection and alerting
- Performance metrics: latency, token usage, success rate

---

## 11. Ecosystem Plane — Discovery & Distribution

**Purpose:** Enable agent and capability sharing across environments.

> **Status:** ❄️ Frozen — not needed for current product proof.

- Capability registry with semantic versioning
- Package management for agent bundles
- Trust scoring for third-party agents
- Dependency resolution between capabilities

---

## 12. Meta-Agents — Active (Sprints 13–20)

> **Status:** ✅ Active — 4 memory-aware meta-agents with quality feedback and advisory calibration
> **Maturity:** v1.4 — Quality feedback loop + advisory calibration layer
> **Target:** Level 5 — Institutional Engineering Memory

Meta-Agents are higher-order agents that operate above the normal execution and learning agents. They analyze system behavior with historical engineering context, design new agent roles, adjust orchestration strategies, recommend workflow changes, and optimize system architecture. They do **not** execute pipeline tasks directly.

### Memory-Aware Capabilities (Sprint 18)

Each meta-agent receives historical context via `meta-agent-memory-context.ts`:
- `related_memory_entries` — Ranked memory entries by type relevance
- `related_summaries` — Relevant memory summaries
- `related_decisions` — Prior accepted/rejected/deferred decisions
- `related_outcomes` — Prior implementation outcomes
- `historical_context_score` — Deterministic 0-1 score

Recommendations include structured historical signals:
- `historical_alignment` — reinforces_prior_direction | extends_prior_direction | reopens_unresolved_issue | diverges_from_prior_direction | historically_novel
- `decision_history_signal` — Prior decision context
- `outcome_history_signal` — Prior outcome context
- `historical_novelty_flag` — Whether recommendation is historically novel

Redundancy guard (`historical-redundancy-guard.ts`) suppresses or downgrades:
- Repeatedly rejected recommendations without new evidence
- Near-duplicate recommendations within 3 days
- Low-confidence recommendations with prior rejections

### 12.1 Architecture Meta-Agent

| Attribute | Value |
|-----------|-------|
| **Purpose** | Analyze execution outcomes and suggest pipeline architecture improvements |
| **Inputs** | Stage metrics, stage failure distribution, execution durations, repair frequency |
| **Outputs** | `PIPELINE_OPTIMIZATION`, `STAGE_REORDERING_SUGGESTION`, `STAGE_SPLIT_OR_MERGE`, `RESOURCE_ALLOCATION_HINT` |
| **Safety** | Never modifies stages automatically. Recommendations only. |

### 12.2 Agent Role Designer

| Attribute | Value |
|-----------|-------|
| **Purpose** | Analyze task distribution and propose new agent roles or specializations |
| **Inputs** | `agent_outputs`, task complexity metrics, failure distribution by agent type |
| **Outputs** | `NEW_AGENT_ROLE`, `AGENT_ROLE_REFACTOR`, `AGENT_SPECIALIZATION`, `AGENT_DEPRECATION` |
| **Safety** | Cannot create or deploy agents. Proposes roles for human review. |
| **Example** | _"Create DependencyResolutionAgent because 28% of repair loops involve dependency conflicts."_ |

### 12.3 Workflow Optimizer

| Attribute | Value |
|-----------|-------|
| **Purpose** | Improve pipeline efficiency by analyzing duration, retry frequency, and repair success distribution |
| **Inputs** | Stage duration metrics, retry frequency, repair success distribution |
| **Outputs** | `WORKFLOW_PARALLELIZATION`, `STEP_ELIMINATION`, `STEP_REORDERING` |
| **Safety** | Does not modify pipeline ordering. Generates suggestions only. |

### 12.4 Strategy Synthesizer

| Attribute | Value |
|-----------|-------|
| **Purpose** | Combine successful strategies to generate improved execution strategies |
| **Inputs** | `strategy_effectiveness_metrics`, repair success patterns, prompt outcome trends |
| **Outputs** | `NEW_EXECUTION_STRATEGY`, `PROMPT_STRATEGY_COMPOSITION`, `REPAIR_STRATEGY_REWEIGHTING` |
| **Safety** | Does not modify weights or strategies directly. Proposes compositions for review. |

### 12.5 System Evolution Advisor

| Attribute | Value |
|-----------|-------|
| **Purpose** | Produce high-level system evolution guidance from cross-cutting data |
| **Inputs** | Learning trends, failure recurrence patterns, cost evolution, deployment success rate |
| **Outputs** | `SYSTEM_EVOLUTION_REPORT`, `TECHNICAL_DEBT_ALERT`, `ARCHITECTURE_CHANGE_PROPOSAL` |
| **Safety** | Advisory only. No system-level changes. |

### Meta-Agent Output Structure (Active)

All Meta-Agent outputs follow this structure, persisted in a `meta_agent_recommendations` table:

```
meta_agent_recommendation {
  id                    -- UUID
  meta_agent_type       -- architecture | role_designer | workflow | strategy | evolution
  recommendation_type   -- specific output type per meta-agent
  target_component      -- affected system component
  description           -- human-readable explanation
  confidence_score      -- 0.0-1.0
  supporting_evidence   -- array of source records with provenance
  status                -- pending | reviewed | accepted | rejected
  created_at            -- timestamp
}
```

### Meta-Agent Safety Rules

Meta-Agents **must never**:
- Modify pipeline stages or stage ordering
- Change governance rules or trust levels
- Modify billing, product plans, or commercial configuration
- Bypass RLS or cross-tenant boundaries
- Alter existing contracts

Meta-Agents **may only**:
- Generate recommendations for human review
- Suggest structural changes with supporting evidence
- Propose agent roles with justification
- Suggest strategy evolution with confidence scores

### Meta-Agent Interaction Flow

```
Observability → Learning Agents → Meta-Agents → Recommendations → Human Review → Controlled Implementation
```

Meta-Agents do not bypass human oversight at any point.

---

### 12.6 Proposal Quality Feedback Loop (Sprint 19)

**Purpose:** Track the quality and usefulness of recommendations and artifacts over time to enable evidence-based calibration.

**Tables:**
- `proposal_quality_feedback` — Tracks acceptance, implementation, and outcome signals per recommendation/artifact
- `proposal_quality_summaries` — Periodic summaries of proposal quality patterns

**Key modules:**
- `proposal-quality-scoring.ts` — Deterministic quality scoring based on acceptance, implementation, and outcome signals
- `proposal-quality-feedback-service.ts` — Feedback collection and aggregation
- `proposal-quality-summary-service.ts` — Periodic quality summary generation

**Metrics tracked:**
- Recommendation acceptance rate per meta-agent type
- Artifact implementation rate per artifact type
- Downstream outcome quality (positive/negative/neutral)
- Reviewer feedback scores
- Confidence calibration accuracy

**Safety:** Read-only analysis. Does not modify recommendations, artifacts, or meta-agent behavior.

---

### 12.7 Advisory Calibration Layer (Sprint 20)

**Purpose:** Produce structured, explainable calibration signals that diagnose how AxionOS advisory intelligence should be tuned — without applying tuning automatically.

**Calibration Domains:**

| Domain | Purpose |
|--------|---------|
| `META_AGENT_PERFORMANCE` | Evaluate which meta-agents produce consistently useful output |
| `PROPOSAL_USEFULNESS` | Analyze usefulness by artifact type |
| `HISTORICAL_CONTEXT_VALUE` | Assess whether historical context is helping or hurting |
| `REDUNDANCY_GUARD_EFFECTIVENESS` | Detect if suppression is too strict or too weak |
| `NOVELTY_BALANCE` | Evaluate whether novel signals are under/over-scored |
| `DECISION_FOLLOW_THROUGH` | Track implementation follow-through patterns |

**Signal Types:** `UNDERPERFORMING_META_AGENT`, `HIGH_VALUE_META_AGENT`, `LOW_USEFULNESS_ARTIFACT_TYPE`, `HIGH_USEFULNESS_ARTIFACT_TYPE`, `HISTORICAL_CONTEXT_OVERWEIGHTED`, `HISTORICAL_CONTEXT_UNDERUSED`, `REDUNDANCY_GUARD_TOO_STRICT`, `REDUNDANCY_GUARD_TOO_WEAK`, `NOVEL_SIGNALS_UNDERSCORED`, `NOVEL_SIGNALS_OVERPROMOTED`, `LOW_FOLLOW_THROUGH_PATTERN`, `HIGH_FOLLOW_THROUGH_PATTERN`

**Key modules:**
- `calibration/types.ts` — Calibration taxonomy (domains, signal types)
- `calibration/scoring.ts` — Deterministic scoring (signal_strength, confidence_score, risk_of_overcorrection)
- `calibration/analysis-service.ts` — Analysis functions per domain
- `advisory-calibration-engine/index.ts` — Edge function exposing calibration API

**Tables:**
- `advisory_calibration_signals` — Individual calibration signals with evidence refs
- `advisory_calibration_summaries` — Periodic calibration summary reports

**Each signal includes:**
- `signal_strength` (0-1) — Magnitude of the calibration concern
- `confidence_score` (0-1) — Reliability based on sample size and consistency
- `risk_of_overcorrection` (0-1) — Risk that acting on this signal could overcorrect

**Safety:** Calibration signals are **advisory only** and do not automatically tune the system. No auto-adjustment of meta-agent scoring, redundancy guard thresholds, historical weighting, or proposal generation behavior.

**Audit events:** `ADVISORY_CALIBRATION_SIGNAL_CREATED`, `ADVISORY_CALIBRATION_SUMMARY_CREATED`, `ADVISORY_CALIBRATION_VIEWED`

---

## 13. End-to-End Execution Flow

```
 1. Task arrives at Orchestrator                        [Execution]
 2. Usage limits enforced                               [Commercial]
 3. Orchestrator queries Selection Engine               [Control]
 4. Selection Engine checks Policy Engine               [Control]
 5. Governance Layer evaluates trust and autonomy       [Control]
 6. Adaptive Router applies routing adjustments         [Control]
 7. Agent selected, GovernanceDecision issued           [Control]
 8. If approval required: ApprovalEngine pauses         [Control]
 9. Orchestrator dispatches to Coordination Manager     [Execution]
10. Coordination assigns roles via Selection Engine     [Control]
11. Agents execute via LLM/Tool Adapters                [Execution]
12. Artifacts stored in Artifact Store                  [Data]
13. Memory updated                                     [Data]
14. Telemetry recorded                                 [Data]
15. Audit record written                               [Data]
16. Events emitted via EventBus                        [Execution]
17. Adaptive Router consumes feedback                  [Control]
18. Learning Agents consume execution data              [Learning]
19. Result returned to caller                          [Execution]
```

---

## 14. Code Organization

```
supabase/functions/_shared/agent-os/
├── index.ts                    # Barrel exports
├── types.ts                    # Core types
├── protocol.ts                 # Runtime protocol
├── capabilities.ts             # Capability model
├── selection.ts                # Selection engine
├── policy-engine.ts            # Policy engine
├── governance.ts               # Governance layer
├── adaptive-routing.ts         # Adaptive routing
├── orchestrator.ts             # Orchestrator
├── registry.ts                 # Agent registry
├── event-bus.ts                # Event bus
├── coordination.ts             # Multi-agent coordination
├── distributed-runtime.ts      # Distributed runtime
├── llm-adapter.ts              # LLM adapter
├── tool-adapter.ts             # Tool adapter
├── artifact-store.ts           # Artifact store
├── memory-system.ts            # Memory system
├── memory.ts                   # Legacy memory (v0.1)
├── observability.ts            # Observability
├── marketplace.ts              # Marketplace (frozen)
├── utils.ts                    # Shared utilities
├── scoring.ts                  # Scoring functions
└── policies.ts                 # Default policies
```

---

## 15. Implementation Status

| Module | Status |
|--------|--------|
| All 14 core modules | ✅ Designed with full TypeScript contracts |
| Orchestrator + DAG Engine | ✅ Implemented and operational |
| Memory System (basic) | ✅ Implemented (`agent_memory` table) |
| Governance (gates, SLAs, audit) | ✅ Implemented |
| Observability + Cost Tracking | ✅ Implemented |
| Adaptive Learning | ✅ Implemented |
| Learning Agents v1 (5 engines) | ✅ Implemented (Sprint 12) |
| Learning Dashboard | ✅ Implemented (Sprint 12) |
| Meta-Agents v1.4 (4 types) | ✅ Implemented (Sprints 13–20) |
| Engineering Memory Full Stack | ✅ Implemented (Sprints 15–18) |
| Memory-Aware Reasoning | ✅ Implemented (Sprint 18) |
| Proposal Quality Feedback Loop | ✅ Implemented (Sprint 19) |
| Advisory Calibration Layer | ✅ Implemented (Sprint 20) |
| Prompt Optimization (A/B + Bounded Promotion) | ✅ Implemented (Sprints 21–22) |
| Self-Improving Fix Agents v2 (Repair Policies) | ✅ Implemented (Sprint 23) |
| Semantic Retrieval | 📋 Planned |
| Marketplace | ❄️ Frozen |
| Distributed Runtime (advanced) | ❄️ Frozen |

---

## 16. Engineering Memory Interaction (Active — Sprints 15–18)

> **Status:** ✅ Active — Full stack operational

### Overview

Engineering Memory is a cross-layer knowledge infrastructure that agents use to retrieve past engineering experience. Agents do **not** write directly to memory — capture is event-driven from layer outputs. Agents **read** memory to inform decisions.

### Agent Retrieval Use Cases

| Agent Class | Retrieval Context | Memory Types Used | Status |
|-------------|-------------------|-------------------|--------|
| **Build Agents** | During repair attempts | Error Memory, Strategy Memory | ✅ Active |
| **Validation Agents** | During preventive checks | Error Memory, Execution Memory | ✅ Active |
| **Architecture Agents** | During planning | Design Memory, Outcome Memory | ✅ Active |
| **Meta-Agents** | During recommendation generation | All memory types + summaries | ✅ Active (Sprint 18) |
| **Proposal Generators** | During artifact generation | Design Memory, Decision Memory | ✅ Active (Sprint 18) |

### Memory-Aware Reasoning (Active — Sprint 18)

1. **Meta-Agent Analysis:** Each meta-agent queries relevant memory entries, summaries, prior decisions, and outcomes via `meta-agent-memory-context.ts`.
2. **Historical Continuity:** `historical-continuity-scoring.ts` computes support/conflict/context scores to measure alignment with prior history.
3. **Redundancy Guard:** `historical-redundancy-guard.ts` suppresses or downgrades recommendations that repeat previously rejected ideas without new evidence.
4. **Proposal Context:** Artifact generation includes Related Historical Context sections with prior decisions, outcomes, and summary references.
5. **Human Review Support:** Review UI surfaces related memory entries, summaries, and historical alignment indicators.

### Safety Boundaries

- Agents may **read** memory but never **write** directly
- Memory retrieval must not block execution (async, best-effort)
- Memory absence must not prevent agent operation (graceful degradation)
- Memory queries must always be scoped by `organization_id` (tenant isolation)
- Memory must not override governance rules or policy engine decisions
- Memory informs but never dictates recommendations or proposals

---

## 17. Governing Principle

> The Agent OS is a contract-driven, plane-separated architecture where decisions flow down from Control, execution flows through Execution, state flows into Data, identity is defined in Core, and discovery extends through Ecosystem. No plane may assume the responsibilities of another. Learning is additive, auditable, and bounded — it cannot mutate the kernel directly. Engineering Memory is informational infrastructure — it informs but never commands. Memory-aware reasoning enriches analysis with historical context but preserves human authority over all structural decisions. Calibration signals diagnose where tuning should happen, but humans decide when and how tuning is applied.
