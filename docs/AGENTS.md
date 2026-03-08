# AxionOS — Agent OS Reference

> Consolidated reference for the Agent Operating System architecture.
> Canonical source for planes, modules, agent types, contracts, safety boundaries, and events.
>
> Last updated: 2026-03-08

## Document Authority

| Scope | Rule |
|-------|------|
| **Owns** | Agent OS 5 planes, 18-module inventory, 5 agent types, operational agents, supporting engines, learning agents, meta-agents, memory layers, contracts, safety boundaries, events |
| **Must not define** | Roadmap sequencing (→ ROADMAP.md), sprint execution ledger (→ PLAN.md), system containers/C4 diagrams (→ ARCHITECTURE.md) |
| **Derived from** | PLAN.md for sprint context on module introductions |
| **Update rule** | Update when Agent OS module inventory, contracts, or operational references change |

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

> **Canonical sprint-by-sprint record:** [PLAN.md](../PLAN.md)
> **All 18 core Agent OS modules:** ✅ Designed with full TypeScript contracts
> **Key operational systems:** Orchestrator + DAG Engine, Memory System, Governance, Observability, Learning Agents, Meta-Agents, Engineering Memory, Prompt Optimization, Agent Memory, Predictive Error Detection, Semantic Retrieval — all operational.
> **Frozen:** Marketplace, advanced distributed runtime.

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

## 17. Agent Memory Layer (Active — Sprint 24)

> **Status:** ✅ Active — Per-agent operational memory

### Overview

The Agent Memory Layer provides persistent, per-agent memory profiles and structured memory records that agents retrieve and use during execution, repair, planning, validation, and review decisions. Memory is bounded, auditable, and non-invasive.

### Modules

| Module | File | Purpose |
|--------|------|---------|
| Agent Memory Retriever | `agent-memory/agent-memory-retriever.ts` | Fetch, rank, deduplicate relevant memory |
| Agent Memory Injector | `agent-memory/agent-memory-injector.ts` | Assemble bounded memory blocks for prompt injection |
| Agent Memory Writer | `agent-memory/agent-memory-writer.ts` | Write-back useful execution signals to memory |
| Agent Memory Quality | `agent-memory/agent-memory-quality.ts` | Score relevance, detect stale/conflicting memory |

### Memory Types

- `execution_pattern` — Successful execution context patterns
- `repair_pattern` — Effective repair paths
- `validation_pattern` — Validation failure/success patterns
- `review_pattern` — Human review corrections
- `failure_pattern` — Recurring failure contexts
- `success_pattern` — Repeated success patterns

### Safety Boundaries

- Memory cannot mutate pipeline stages, governance, billing, or execution contracts
- Memory injection is bounded by strict relevance and size constraints (max 4000 chars)
- Deprecated memory is never injected
- All profile changes preserve previous state history
- Memory informs but never overrides system prompt hierarchy

### Events

- `agent_memory_retrieved` — Memory fetched for agent context
- `agent_memory_injected` — Memory block assembled and injected
- `agent_memory_written` — New memory record written
- `agent_memory_profile_updated` — Profile created or updated
- `agent_memory_deprecated` — Stale memory deprecated

---

## 18. Predictive Error Detection (Active — Sprint 25)

> **Status:** ✅ Active — Runtime predictive prevention

### Overview

Predictive Error Detection operationalizes historical error patterns and learning signals as a runtime prevention layer. The system scores failure risk at bounded checkpoints before or during pipeline execution, recommends or applies safe preventive actions, and tracks prediction outcomes for calibration.

### Modules

| Module | File | Purpose |
|--------|------|---------|
| Predictive Risk Engine | `predictive/predictive-risk-engine.ts` | Score failure probability from patterns, retries, memory |
| Checkpoint Runner | `predictive/predictive-checkpoint-runner.ts` | Invoke prediction at bounded stage checkpoints |
| Preventive Action Engine | `predictive/preventive-action-engine.ts` | Classify and filter safe preventive actions |
| Evidence Builder | `predictive/prediction-evidence-builder.ts` | Assemble reason codes and evidence references |
| Outcome Tracker | `predictive/predictive-outcome-tracker.ts` | Compare predictions against actual outcomes |

### Risk Bands

- `low` (0–0.35) — Proceed normally
- `moderate` (0.35–0.6) — Proceed with guard
- `high` (0.6–0.8) — Recommend review or apply bounded actions
- `critical` (0.8–1.0) — Pause for review (advisory)

### Preventive Action Types

- `strategy_fallback` — Switch to safer strategy
- `prompt_fallback` — Fall back to known-good prompt variant
- `extra_validation` — Add validation before proceeding
- `extra_context` — Retrieve additional context
- `human_review` — Recommend human review (advisory only)
- `pause_execution` — Pause pipeline (advisory only)

### Safety Boundaries

- Cannot alter pipeline topology, governance, billing, or enforcement
- Cannot auto-apply unsafe actions (human_review, pause_execution)
- Low-confidence predictions remain advisory-only
- All applied actions are auditable with outcome tracking
- Cannot delete historical prediction evidence
- Critical pause behavior is advisory, not forced

### Events

- `predictive_risk_assessed` — Risk scored for context
- `predictive_checkpoint_evaluated` — Checkpoint decision made
- `preventive_action_recommended` — Action recommended
- `preventive_action_applied` — Action applied
- `predictive_outcome_recorded` — Outcome tracked
- `predictive_false_positive_flagged` — False positive detected
- `predictive_false_negative_flagged` — False negative detected

---

## 19. Learning Agents v2 — Cross-Stage Policy Synthesis (Active — Sprint 26)

> **Status:** ✅ Active — Cross-stage coordinated learning

### Overview

Learning Agents v2 extends learning from local stage optimization to system-level adaptive intelligence. The system detects cross-stage performance patterns, synthesizes bounded policies spanning multiple stages, and tracks downstream outcomes for continuous calibration.

### Modules

| Module | File | Purpose |
|--------|------|---------|
| Policy Synthesizer | `cross-stage/cross-stage-policy-synthesizer.ts` | Detect patterns and synthesize policy candidates |
| Policy Evaluator | `cross-stage/cross-stage-policy-evaluator.ts` | Compare baseline vs policy outcomes, detect spillover |
| Policy Runner | `cross-stage/cross-stage-policy-runner.ts` | Match and apply policies at runtime |
| Policy Lineage | `cross-stage/cross-stage-policy-lineage.ts` | Preserve provenance and audit trail |

### Relationship Types

- `failure_propagation` — Failure in stage A causes downstream failure in stage B
- `success_dependency` — Success in stage A improves outcomes in stage B
- `retry_correlation` — Retries in stage A correlate with retries in stage B
- `cost_amplification` — Cost in stage A amplifies cost in stage B
- `validation_cascade` — Validation failure cascades across stages
- `repair_influence` — Repair in stage A influences repair needs in stage B

### Policy Types

- `prompt_coordination` — Coordinate prompt variants across stages
- `strategy_coordination` — Coordinate repair/execution strategies
- `validation_guard` — Add validation guards between stages
- `repair_preemption` — Preempt repair needs based on upstream signals
- `context_enrichment` — Inject upstream context into downstream agents
- `review_escalation` — Escalate review for risky stage chains

### Safety Boundaries

- Cannot mutate pipeline topology, governance, billing, or enforcement
- Cannot auto-apply broad policies without feature flag
- Low-confidence policies remain advisory-only
- All synthesized policies are auditable and reversible
- Harmful or spillover-affected policies are pushed to watch/deprecated
- No policy may affect stages outside its declared scope

### Events

- `cross_stage_pattern_detected` — Pattern identified in learning graph
- `cross_stage_policy_synthesized` — Policy candidate created
- `cross_stage_policy_activated` — Policy promoted to active
- `cross_stage_policy_applied` — Policy applied at runtime
- `cross_stage_policy_outcome_recorded` — Outcome tracked
- `cross_stage_policy_deprecated` — Policy deprecated

---

## 20. Execution Policy Intelligence (Active — Sprint 27)

> **Status:** ✅ Active — Bounded global execution policy selection

### Overview

Execution Policy Intelligence classifies execution context and selects bounded operating modes for the pipeline. The system coordinates quality, cost, speed, and risk sensitivity across the entire pipeline without mutating kernel structure.

### Modules

| Module | File | Purpose |
|--------|------|---------|
| Context Classifier | `execution-policy/execution-context-classifier.ts` | Classify execution context into policy modes |
| Policy Selector | `execution-policy/execution-policy-selector.ts` | Select best policy by context, scope, priority |
| Policy Adjuster | `execution-policy/execution-policy-adjuster.ts` | Compute bounded runtime adjustments |
| Policy Runner | `execution-policy/execution-policy-runner.ts` | Apply policy at runtime checkpoints |
| Policy Feedback | `execution-policy/execution-policy-feedback.ts` | Bounded feedback loops for policy improvement |

### Policy Modes

- `balanced_default` — Standard operating mode
- `high_quality` — Increased validation and deploy hardening
- `cost_optimized` — Reduced validation, minimal context
- `rapid_iteration` — Speed-first with lower guardrails
- `risk_sensitive` — Maximum safety parameters
- `deploy_hardened` — Zero experimentation, maximum deploy safety
- `repair_conservative` — Conservative repair with fewer retries
- `validation_heavy` — Maximum validation sensitivity

### Safety Boundaries

- Cannot mutate pipeline topology, governance, billing, or enforcement
- Cannot disable mandatory review or validation gates
- Broad low-confidence policies remain advisory-only
- All policy applications are auditable with lineage
- Harmful or low-confidence policies are contained through watch/deprecate rules
- No policy may auto-expand scope beyond declared bounds

### Events

- `execution_context_classified` — Context classified into policy mode
- `execution_policy_selected` — Policy selected for execution
- `execution_policy_applied` — Policy applied at checkpoint
- `execution_policy_adjustment_applied` — Adjustments applied at runtime
- `execution_policy_outcome_recorded` — Outcome tracked
- `execution_policy_deprecated` — Policy deprecated

---

## 21. Execution Mode Portfolio Optimization (Active — Sprint 28)

> **Status:** ✅ Active — Bounded portfolio optimization for execution policies

### Overview

Execution Mode Portfolio Optimization manages the set of available execution policies as a governed portfolio. The system evaluates, ranks, and manages the lifecycle of execution modes based on real outcome performance across context classes, detecting conflicts and generating actionable recommendations.

### Modules

| Module | File | Purpose |
|--------|------|---------|
| Portfolio Evaluator | `execution-policy/execution-policy-portfolio-evaluator.ts` | Compute composite scores per policy per context |
| Ranking Engine | `execution-policy/execution-policy-ranking-engine.ts` | Deterministic ranking with penalties and boosts |
| Lifecycle Manager | `execution-policy/execution-policy-lifecycle-manager.ts` | Bounded lifecycle transitions with lineage |
| Conflict Resolver | `execution-policy/execution-policy-conflict-resolver.ts` | Overlap, contradiction, and tradeoff detection |

### Lifecycle Statuses

- `candidate` — New entry, pending evaluation
- `active` — Performing well, available for selection
- `watch` — Under observation due to concerning signals
- `limited` — Restricted to narrow contexts
- `deprecated` — Excluded from selection

### Recommendation Types

- `promote` — Promote policy for a context class
- `limit` — Limit policy to specific flows
- `deprecate` — Deprecate due to harmful spillover
- `split` — Split broad policy into narrower scoped policies
- `merge` — Merge similar policies
- `reprioritize` — Adjust portfolio rank

### Safety Boundaries

- Cannot mutate pipeline topology, governance, billing, or enforcement
- Cannot auto-activate broad-scope policies without explicit allowance
- Cannot delete historical policy evidence
- All portfolio transitions are auditable with lineage
- balanced_default is always protected from deprecation

### Events

- `execution_policy_portfolio_recomputed` — Portfolio evaluated and ranked
- `execution_policy_rank_updated` — Policy rank changed
- `execution_policy_lifecycle_changed` — Lifecycle status transitioned
- `execution_policy_conflict_detected` — Conflict identified
- `execution_policy_portfolio_recommendation_created` — Recommendation generated
- `execution_policy_portfolio_recommendation_reviewed` — Recommendation accepted/rejected

---

## 22. Workspace / Tenant Adaptive Policy Tuning (Active — Sprint 29)

> **Status:** ✅ Active — Bounded tenant/workspace policy adaptation

### Overview

Workspace / Tenant Adaptive Policy Tuning allows AxionOS to specialize global execution policy behavior per organization and workspace without fragmenting governance or mutating kernel structure. The system tunes policy preferences based on tenant-specific outcomes, detects drift, and maintains override guards.

### Modules

| Module | File | Purpose |
|--------|------|---------|
| Tuning Engine | `tenant-policy/tenant-policy-tuning-engine.ts` | Combine global portfolio with tenant preferences |
| Override Guard | `tenant-policy/tenant-policy-override-guard.ts` | Validate and clamp local overrides within bounds |
| Tenant-Aware Selector | `tenant-policy/tenant-aware-policy-selector.ts` | Select policy considering tenant/workspace context |
| Drift Detector | `tenant-policy/tenant-policy-drift-detector.ts` | Detect harmful drift, staleness, overfit |

### Preference Scopes

- `organization` — Organization-wide preference
- `workspace` — Workspace-specific preference (takes precedence)

### Applied Modes

- `global_default` — No tenant tuning applied
- `tenant_tuned` — Organization preference applied
- `workspace_tuned` — Workspace preference applied

### Drift Signal Types

- `harmful_drift` — Local tuning producing harmful outcomes
- `stale_profile` — Preference not updated in 30+ days
- `overfit_local` — High confidence with insufficient sample
- `divergence_from_global` — Local performance significantly below global
- `low_sample_tuning` — Active tuning with too few outcomes

### Safety Boundaries

- Cannot mutate pipeline topology, governance, billing, or enforcement
- Cannot exceed declared override limits (hard cap at 0.3 delta)
- Cannot bypass mandatory review or validation gates
- Cannot auto-create broad unsafe local policies
- All local tuning decisions are auditable with lineage
- All transitions preserve rollback capability
- Falls back to global defaults when tenant confidence is low

### Events

- `tenant_policy_profile_activated` — Preference profile activated
- `tenant_policy_tuning_computed` — Tuning recomputed for tenant
- `tenant_policy_selected` — Policy selected with tenant context
- `tenant_policy_locally_tuned` — Local tuning applied
- `tenant_policy_drift_detected` — Drift signal detected
- `tenant_policy_recommendation_created` — Recommendation generated
- `tenant_policy_profile_deprecated` — Preference deprecated

---

## 23. Platform Intelligence Entry (Active — Sprint 30)

> **Status:** ✅ Active — System-level advisory intelligence

### Overview

Platform Intelligence observes and reasons about system-level behavior across all tenants, workspaces, execution contexts, and policy layers. It detects structural performance patterns, systemic bottlenecks, and platform-level inefficiencies, generating prioritized insights and recommendations without mutating kernel architecture.

### Modules

| Module | File | Purpose |
|--------|------|---------|
| Behavior Aggregator | `platform-intelligence/platform-behavior-aggregator.ts` | Collect signals across contexts, tenants, policies |
| Bottleneck Detector | `platform-intelligence/platform-bottleneck-detector.ts` | Identify systemic bottlenecks by stage |
| Pattern Analyzer | `platform-intelligence/platform-pattern-analyzer.ts` | Detect cross-platform patterns |
| Insight Generator | `platform-intelligence/platform-insight-generator.ts` | Generate structured, explainable insights |
| Recommendation Engine | `platform-intelligence/platform-recommendation-engine.ts` | Prioritized advisory recommendations |
| Health Model | `platform-intelligence/platform-health-model.ts` | Global health indices (reliability, stability, cost, deploy, policy) |

### Health Indices

- `reliability_index` — 1 - failure_rate
- `execution_stability_index` — Penalized by retry rate and bottleneck count
- `repair_burden_index` — Repair rate across executions
- `cost_efficiency_index` — Normalized cost per execution
- `deploy_success_index` — Deploy success rate
- `policy_effectiveness_index` — Weighted policy success rate

### Safety Boundaries

- Cannot mutate pipeline topology, governance, billing, or enforcement
- Cannot auto-create execution policies or change policy scopes
- Cannot bypass validation or review gates
- All recommendations remain advisory-first unless explicitly approved
- All insights are auditable with evidence references

### Events

- `platform_intelligence_recomputed` — Full recomputation completed
- `platform_bottleneck_detected` — Bottleneck identified
- `platform_pattern_detected` — Cross-platform pattern detected
- `platform_insight_generated` — Insight created
- `platform_recommendation_created` — Recommendation generated
- `platform_recommendation_reviewed` — Recommendation accepted/rejected

---

## 24. Platform Self-Calibration (Active — Sprint 31)

> **Status:** ✅ Active — Bounded operational threshold calibration

### Overview

Platform Self-Calibration allows AxionOS to safely adjust operational thresholds and sensitivities based on real system behavior observed by Platform Intelligence. The system interprets calibration signals, generates bounded proposals, applies them within safe envelopes, tracks outcomes, and supports rollback.

### Modules

| Module | File | Purpose |
|--------|------|---------|
| Signal Interpreter | `platform-calibration/platform-calibration-signal-interpreter.ts` | Interpret platform signals into calibration opportunities |
| Proposal Engine | `platform-calibration/platform-calibration-proposal-engine.ts` | Generate structured calibration proposals |
| Guardrails | `platform-calibration/platform-calibration-guardrails.ts` | Validate proposal safety before application |
| Runner | `platform-calibration/platform-calibration-runner.ts` | Apply calibration with lineage |
| Outcome Tracker | `platform-calibration/platform-calibration-outcome-tracker.ts` | Compare before/after performance |
| Rollback Engine | `platform-calibration/platform-calibration-rollback-engine.ts` | Restore previous values when harmful |

### Calibration Modes

- `manual_only` — Proposals are advisory, require explicit human approval
- `bounded_auto` — Eligible for auto-application within safe envelopes (requires sufficient confidence)

### Parameter Statuses

- `active` — Available for calibration
- `watch` — Under observation, calibration allowed with warnings
- `frozen` — Cannot be changed
- `deprecated` — Cannot be reactivated

### Forbidden Parameter Families

These families can never be calibrated:
- `pipeline_topology`
- `governance_rules`
- `billing_logic`
- `plan_enforcement`
- `execution_contracts`
- `hard_safety_constraints`

### Safety Boundaries

- Cannot mutate pipeline topology, governance, billing, or enforcement
- Maximum absolute delta per calibration: 0.2
- Frozen and deprecated parameters are immutable
- All applications include rollback guards
- Advisory-first by default; bounded_auto requires high confidence
- Harmful outcomes trigger rollback recommendation

### Events

- `platform_calibration_signal_detected` — Calibration opportunity identified
- `platform_calibration_proposal_created` — Proposal generated
- `platform_calibration_reviewed` — Proposal reviewed
- `platform_calibration_applied` — Calibration applied
- `platform_calibration_outcome_recorded` — Outcome tracked
- `platform_calibration_rolled_back` — Calibration rolled back

---

## 25. Execution Strategy Evolution (Active — Sprint 32)

> **Status:** ✅ Active — Bounded strategy variant experimentation

### Overview

Execution Strategy Evolution enables AxionOS to propose, test, and evaluate improved variants of operational execution strategies. The system detects strategy-level inefficiencies, synthesizes bounded variants within declared mutation envelopes, runs controlled experiments comparing variant vs baseline, and supports safe promotion or rollback based on outcome evidence.

### Modules

| Module | File | Purpose |
|--------|------|---------|
| Signal Interpreter | `execution-strategy/execution-strategy-signal-interpreter.ts` | Detect strategy evolution opportunities |
| Variant Synthesizer | `execution-strategy/execution-strategy-variant-synthesizer.ts` | Propose bounded strategy variants |
| Guardrails | `execution-strategy/execution-strategy-guardrails.ts` | Validate variant safety before experimentation |
| Experiment Runner | `execution-strategy/execution-strategy-experiment-runner.ts` | Manage controlled baseline vs variant experiments |
| Outcome Tracker | `execution-strategy/execution-strategy-outcome-tracker.ts` | Compare outcomes across declared metrics |
| Promotion Rules | `execution-strategy/execution-strategy-promotion-rules.ts` | Determine promotion eligibility |
| Rollback Engine | `execution-strategy/execution-strategy-rollback-engine.ts` | Safe rollback of harmful variants |
| Lineage | `execution-strategy/execution-strategy-lineage.ts` | Full provenance and explainability |

### Strategy Families

- `repair_escalation_sequencing` — Repair strategy ordering
- `retry_switching_heuristics` — Retry switching logic
- `validation_intensity_ladders` — Validation sensitivity levels
- `predictive_checkpoint_ordering` — Predictive checkpoint sequencing
- `review_escalation_timing` — Review escalation timing
- `deploy_hardening_sequencing` — Deploy hardening steps
- `context_enrichment_sequencing` — Context enrichment ordering
- `strategy_fallback_ladders` — Strategy fallback chains

### Safety Boundaries

- Cannot mutate pipeline topology, governance, billing, or enforcement
- Cannot create new strategy families automatically
- Cannot mutate outside declared envelopes
- Maximum absolute delta per mutation: 0.25
- Every experiment preserves rollback capability
- Advisory-first remains the default posture
- Frozen/deprecated families cannot accept variants

### Events

- `execution_strategy_opportunity_detected` — Evolution opportunity identified
- `execution_strategy_variant_created` — Variant proposed
- `execution_strategy_variant_reviewed` — Variant approved/rejected
- `execution_strategy_experiment_started` — Experiment launched
- `execution_strategy_outcome_recorded` — Outcome tracked
- `execution_strategy_variant_promoted` — Variant promoted to baseline
- `execution_strategy_variant_rolled_back` — Variant rolled back

---

## 27. Semantic Retrieval & Embedding Memory Expansion (Active — Sprint 36)

> **Status:** ✅ Active — Unified semantic retrieval across all intelligence layers

### Overview

Semantic Retrieval provides a unified engine for embedding-backed contextual evidence retrieval across engineering memory, agent memory, platform intelligence, strategies, policies, and advisory signals. The system selects relevant domains, performs bounded ranking with deduplication, and returns structured evidence packs with full explainability.

### Modules

| Module | File | Purpose |
|--------|------|---------|
| Retrieval Engine | `semantic-retrieval/semantic-retrieval-engine.ts` | Core retrieval with domain selection and evidence packing |
| Ranker | `semantic-retrieval/semantic-retrieval-ranker.ts` | Deterministic composite ranking |
| Guardrails | `semantic-retrieval/semantic-retrieval-guardrails.ts` | Tenant isolation, forbidden domain blocking |
| Quality Evaluator | `semantic-retrieval/semantic-retrieval-quality-evaluator.ts` | Retrieval effectiveness metrics |
| Index Manager | `semantic-retrieval/semantic-retrieval-index-manager.ts` | Rebuild, freeze, stale detection |
| Runtime Context Builder | `semantic-retrieval/runtime-retrieval-context-builder.ts` | Agent/repair/predictive contexts |
| Advisory Context Builder | `semantic-retrieval/advisory-retrieval-context-builder.ts` | Advisory/cross-stage contexts |
| Strategy Context Builder | `semantic-retrieval/strategy-retrieval-context-builder.ts` | Strategy/portfolio/policy contexts |
| Platform Context Builder | `semantic-retrieval/platform-retrieval-context-builder.ts` | Platform intelligence/calibration/stabilization contexts |

### Retrieval Domains

- `engineering_memory` — Engineering memory entries
- `agent_memory` — Agent memory records
- `repair_history` — Error patterns and repair evidence
- `platform_insights` — Platform intelligence signals
- `strategy_variants` — Strategy evolution evidence
- `execution_policies` — Execution policy profiles
- `engineering_advisory` — Advisory recommendations
- `platform_calibration` — Calibration parameters
- `stabilization_actions` — Stabilization history
- `cross_stage_policies` — Cross-stage policy profiles
- `predictive_signals` — Predictive error signals
- `strategy_portfolio` — Strategy portfolio evidence

### Safety Boundaries

- Cannot mutate pipeline topology, governance, billing, or enforcement
- Cannot retrieve from forbidden domains (billing_data, auth_credentials)
- Cannot bypass tenant isolation (organization_id required)
- Falls back to structured retrieval when embeddings unavailable
- All sessions persisted with full audit lineage
- Advisory-first — retrieval informs but never commands

### Events

- `semantic_retrieval_requested` — Retrieval session initiated
- `semantic_retrieval_completed` — Evidence pack returned
- `semantic_retrieval_feedback_recorded` — Usefulness feedback logged
- `semantic_index_rebuild_started` — Index rebuild triggered
- `semantic_index_rebuild_completed` — Index rebuild finished
- `semantic_index_frozen` — Index frozen for protection
- `semantic_retrieval_guardrail_blocked` — Guardrail prevented unsafe retrieval

---

## 28. Discovery-Driven Architecture Signals (Active — Sprint 37)

> **Status:** ✅ Active — External/product signal correlation with architecture recommendations

### Overview

Discovery-Driven Architecture Signals detect external and product-facing pressure indicators and correlate them with internal execution evidence to generate advisory architecture recommendations. The system identifies opportunities for architectural improvement based on real usage patterns, performance signals, and product evolution needs.

### Modules

| Module | File | Purpose |
|--------|------|---------|
| Signal Correlator | `discovery-architecture/discovery-signal-correlator.ts` | Correlate external signals with internal evidence |
| Recommendation Generator | `discovery-architecture/discovery-recommendation-generator.ts` | Generate architecture recommendations |
| Evidence Linker | `discovery-architecture/discovery-evidence-linker.ts` | Link signals to recommendations with provenance |

### Safety Boundaries

- Cannot mutate pipeline topology, governance, billing, or enforcement
- All recommendations are advisory-first
- Cannot bypass tenant isolation
- Cannot auto-approve architecture changes

### Events

- `discovery_signal_detected` — External/product signal detected
- `discovery_signal_correlated` — Signal correlated with internal evidence
- `discovery_recommendation_created` — Architecture recommendation generated
- `discovery_recommendation_reviewed` — Recommendation reviewed

---

## 29. Architecture Change Simulation & Governance (Active — Sprint 38)

> **Status:** ✅ Active — Bounded simulation of architectural changes

### Overview

Architecture Change Simulation evaluates proposed architectural changes through bounded simulation before any real implementation. The system estimates impact across execution, governance, strategies, memory, platform intelligence, and tenant contexts, surfacing risks, tradeoffs, and confidence levels with full explainability.

### Modules

| Module | File | Purpose |
|--------|------|---------|
| Impact Simulator | `architecture-simulation/architecture-impact-simulator.ts` | Estimate impact across 10 dimensions |
| Boundary Analyzer | `architecture-simulation/architecture-boundary-analyzer.ts` | Detect overlapping subsystems and dependency chains |
| Guardrails | `architecture-simulation/architecture-simulation-guardrails.ts` | Hard simulation guardrails for forbidden mutations |
| Recommendation Linker | `architecture-simulation/architecture-recommendation-linker.ts` | Map recommendations to change proposals |
| Review Manager | `architecture-simulation/architecture-simulation-review-manager.ts` | Review lifecycle management |
| Explainer | `architecture-simulation/architecture-simulation-explainer.ts` | Structured simulation explainability |

### Safety Boundaries

- Cannot mutate pipeline topology, governance, billing, or enforcement
- Cannot change execution contracts or hard safety constraints
- Cannot override tenant isolation
- Cannot auto-approve implementations
- All outputs remain advisory-first

### Events

- `architecture_change_proposal_created` — Proposal registered
- `architecture_simulation_started` — Simulation initiated
- `architecture_simulation_completed` — Simulation completed
- `architecture_simulation_guardrail_blocked` — Guardrail blocked proposal
- `architecture_simulation_reviewed` — Simulation reviewed
- `architecture_simulation_accepted` — Simulation accepted
- `architecture_simulation_rejected` — Simulation rejected

---

## 30. Architecture Change Planning & Rollout Readiness (Active — Sprint 39)

> **Status:** ✅ Active — Governed implementation plans with blast radius and rollback

### Overview

Architecture Change Planning converts accepted simulation outcomes into structured implementation plans with dependency mapping, blast radius estimation, validation requirements, rollback blueprints, and readiness scoring. Plans go through a governed review lifecycle before rollout approval.

### Modules

| Module | File | Purpose |
|--------|------|---------|
| Dependency Planner | `architecture-planning/architecture-change-dependency-planner.ts` | Map blast radius, dependencies, sequencing |
| Readiness Assessor | `architecture-planning/architecture-rollout-readiness-assessor.ts` | Compute readiness scores |
| Validation Blueprint | `architecture-planning/architecture-validation-blueprint-synthesizer.ts` | Generate validation checkpoints |
| Rollback Blueprint | `architecture-planning/architecture-rollback-blueprint-synthesizer.ts` | Synthesize rollback requirements |
| Plan Clustering | `architecture-planning/architecture-plan-clustering.ts` | Deduplicate and cluster similar plans |
| Review Manager | `architecture-planning/architecture-change-plan-review-manager.ts` | Plan review lifecycle |
| Explainer | `architecture-planning/architecture-change-plan-explainer.ts` | Structured plan explainability |

### Safety Boundaries

- Cannot mutate pipeline topology, governance, billing, or enforcement
- Cannot change execution contracts or hard safety constraints
- Cannot override tenant isolation
- Cannot auto-approve rollout
- All outputs remain advisory-first and review-driven

### Events

- `architecture_change_plan_created` — Plan created from accepted simulation
- `architecture_dependency_graph_generated` — Dependency graph generated
- `architecture_rollout_readiness_scored` — Readiness score computed
- `architecture_validation_blueprint_generated` — Validation blueprint created
- `architecture_rollback_blueprint_generated` — Rollback blueprint created
- `architecture_change_plan_reviewed` — Plan reviewed
- `architecture_change_plan_ready` — Plan marked rollout-ready
- `architecture_change_plan_blocked` — Plan blocked
- `architecture_change_plan_rejected` — Plan rejected

---

## 31. Architecture Rollout Sandbox & Controlled Migration Readiness (Active — Sprint 40)

> **Status:** ✅ Active — Bounded rehearsal of approved architecture plans

### Overview

Architecture Rollout Sandbox allows approved architecture change plans to be rehearsed in bounded sandbox environments before any production implementation. The system validates migration sequencing, dependency activation order, analyzes fragility, assesses rollback viability, and scores migration readiness through controlled rehearsals.

### Modules

| Module | File | Purpose |
|--------|------|---------|
| Migration Sequence Rehearsal | `architecture-rollout/architecture-migration-sequence-rehearsal.ts` | Rehearse activation order and sequencing |
| Fragility Analyzer | `architecture-rollout/architecture-rollout-fragility-analyzer.ts` | Evaluate rollback difficulty and dependency brittleness |
| Migration Readiness Assessor | `architecture-rollout/architecture-migration-readiness-assessor.ts` | Score migration readiness |
| Rollback Viability Rehearsal | `architecture-rollout/architecture-rollback-viability-rehearsal.ts` | Rehearse rollback viability |
| Sandbox Guardrails | `architecture-rollout/architecture-rollout-sandbox-guardrails.ts` | Hard guardrails for sandbox rehearsals |
| Review Manager | `architecture-rollout/architecture-rollout-sandbox-review-manager.ts` | Sandbox review lifecycle |
| Explainer | `architecture-rollout/architecture-rollout-sandbox-explainer.ts` | Structured sandbox explainability |

### Rehearsal Modes

- `dry_run` — Simulate without any side effects
- `staged_preview` — Preview staged migration steps
- `shadow_readiness` — Shadow readiness assessment (highest fidelity)

### Safety Boundaries

- Cannot mutate production topology, governance, billing, or enforcement
- Cannot change execution contracts or hard safety constraints
- Cannot override tenant isolation
- Cannot auto-approve migration execution
- Cannot auto-run production rollout
- All outputs remain advisory-first and review-driven

### Events

- `architecture_rollout_sandbox_created` — Sandbox created
- `architecture_migration_sequence_rehearsed` — Migration sequence rehearsed
- `architecture_rollout_fragility_detected` — Fragility detected
- `architecture_migration_readiness_scored` — Readiness scored
- `architecture_rollback_viability_rehearsed` — Rollback viability rehearsed
- `architecture_rollout_sandbox_guardrail_blocked` — Guardrail blocked rehearsal
- `architecture_rollout_sandbox_reviewed` — Sandbox reviewed
- `architecture_rollout_sandbox_migration_ready` — Sandbox marked migration-ready
- `architecture_rollout_sandbox_blocked` — Sandbox blocked
- `architecture_rollout_sandbox_rejected` — Sandbox rejected

---

## 32. Governing Principle

> **Canonical governing principle:** [ARCHITECTURE.md](ARCHITECTURE.md#15-governing-principle)
>
> The Agent OS is contract-driven and plane-separated. Learning is additive, bounded, and auditable. Memory informs but never commands. All structural evolution requires human review. Forbidden mutation families are immutable by automated systems. All advisory layers remain bounded, explainable, and review-driven.

---

## 33. Future Strategic Arc — Agent OS Implications

> **Status:** No Agent OS plane expansion is planned or required.

Sprints 51–54 (Institutional Convergence Memory, Operating Profiles, Product Intelligence Entry, Product Intelligence Operations) have been completed, reusing existing Agent OS planes:

| Completed Capability | Existing Planes/Modules Used |
|---------------------|------------------------------|
| Institutional Convergence Memory | Data Plane (Memory System, Artifact Store), Control Plane (Governance) |
| Operating Profiles & Policy Packs | Control Plane (Policy Engine, Selection Engine, Governance), Data Plane (Memory) |
| Product Intelligence Entry | Data Plane (Observability, Memory), Control Plane (Governance), Execution Plane (Orchestrator) |
| Product Intelligence Operations | Data Plane (Observability, Memory), Control Plane (Governance, Selection Engine), Execution Plane (Orchestrator) |

The committed future arc (Sprints 55–56: opportunity governance, ecosystem readiness) and reserved horizon (Sprints 57–65: ecosystem foundation, activation, operating completion) are higher-order governance and orchestration concerns. They reuse existing Agent OS planes without expansion.

The Ecosystem Plane remains frozen. Its activation is staged across Sprints 57–62 in the reserved horizon and will not begin until the committed arc (54–56) is complete and explicitly approved. Any future ecosystem-plane activation remains governed and incremental.

The 5-plane, 18-module architecture remains stable.
