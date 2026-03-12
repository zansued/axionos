# AxionOS â€” Agent OS Reference

> Consolidated reference for the Agent Operating System architecture.
> Canonical source for planes, modules, agent types, contracts, safety boundaries, and events.
>
> Last updated: 2026-03-11

## Document Authority

| Scope | Rule |
|-------|------|
| **Owns** | Agent OS 5 planes, 18-module inventory, 5 agent types, operational agents, supporting engines, learning agents, meta-agents, memory layers, contracts, safety boundaries, events |
| **Must not define** | System containers/C4 diagrams (â†’ ARCHITECTURE.md), Canon Intelligence Engine architecture (â†’ CANON_INTELLIGENCE_ENGINE.md) |
| **Derived from** | CANON_INTELLIGENCE_ENGINE.md for Canon knowledge layer integration |
| **Update rule** | Update when Agent OS module inventory, contracts, or operational references change |

### Related Subsystems

| Subsystem | Reference |
|-----------|-----------|
| Canon Intelligence Engine | [CANON_INTELLIGENCE_ENGINE.md](CANON_INTELLIGENCE_ENGINE.md) â€” Canon knowledge layer, Agentâ€“Contract relationship model, canonization governance workflow |

---

## 1. Architecture Overview

The Agent OS is a **layered, contract-first** system with 18 modules across 5 architectural planes.

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
- **DAG Execution Engine** â€” Kahn's algorithm, wave computation, 6 concurrent workers
- **Pipeline Orchestrator** â€” 32-stage deterministic pipeline coordination
- **Pipeline Bootstrap** â€” Lifecycle initialization with usage enforcement integration

### Validation Agents
- **Fix Loop Agent** â€” AI-powered code correction (3 iterations)
- **Deep Static Analyzer** â€” Import/reference/type consistency validation
- **Drift Detector** â€” Architecture-to-code conformance checking
- **Runtime Validator** â€” Real tsc + vite build via GitHub Actions CI

### Repair Agents
- **Autonomous Build Repair** â€” Self-healing from CI error logs
- **Fix Orchestrator** â€” Multi-iteration repair coordination with auto-PR
- **Repair Router** â€” Evidence-based strategy selection
- **Repair Policy Engine** â€” Memory-aware, policy-driven repair strategy selection with bounded adjustments (Sprint 23)
- **Retry Path Intelligence** â€” Contextual retry action computation to reduce unproductive loops (Sprint 23)

### Prevention Agents
- **Preventive Validator** â€” Pre-generation guard against known failure patterns
- **Prevention Rule Engine** â€” Active rule management and enforcement
- **Error Pattern Library** â€” Pattern extraction and indexing

### Governance
- **Gate Permissions** â€” Per-role stage access control
- **SLA Enforcement** â€” Per-stage timing constraints
- **Audit Logger** â€” Complete event ledger for all system actions

### Observability
- **Observability Engine** â€” Telemetry aggregation and reporting
- **Initiative Observability** â€” Per-initiative metrics (success rate, cost, MTTR)
- **Cost Tracker** â€” Per-model, per-stage, per-initiative cost tracking

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

## 6. Learning Agents v1 (Sprint 12) â€” Active

Learning Agents v1 introduces five intelligence modules that observe execution data and generate auditable improvement recommendations. These agents follow the chain:

```
Observation â†’ Evidence â†’ Analysis â†’ Recommendation â†’ Human-safe Adjustment
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
| **Formula** | `new_weight = previous_weight + success_factor âˆ’ failure_penalty` |
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

## 7. Core Plane â€” Identity & Contracts

**Purpose:** Define what agents are, what they can do and how they communicate.

### Key Contracts

- `AgentIdentity` / `AgentProfile` â€” Who the agent is
- `CapabilityDeclaration` / `CapabilityCatalog` â€” What it can do
- `AgentTask` / `AgentResponse` â€” How tasks are defined and results returned
- `ArtifactEnvelope` / `ArtifactKind` â€” How outputs are packaged
- `ValidationReport` â€” How quality is assessed
- `RetryPolicy` / `RollbackPolicy` â€” How failures are handled

### Capability Model

Agents declare capabilities with:
- **Domain** â€” what area (frontend, backend, database, architecture)
- **Proficiency** â€” numeric score (0.0 - 1.0)
- **Evidence** â€” historical execution data backing the score
- **Evolution** â€” capabilities improve over time via feedback

Selection uses multi-dimensional scoring: capability match Ã— trust level Ã— cost efficiency Ã— historical performance.

---

## 8. Control Plane â€” Decisions & Governance

**Purpose:** Decide which agent runs, under what rules, with what trust level.

### Selection Engine
- Multi-criteria ranking: capability score, trust tier, cost, latency
- Supports exploration strategies (Îµ-greedy, UCB, Thompson sampling)
- Override management for manual agent assignment

### Policy Engine
- 6 trust tiers: `untrusted` â†’ `provisional` â†’ `standard` â†’ `trusted` â†’ `expert` â†’ `autonomous`
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

## 9. Execution Plane â€” Orchestration & Work

**Purpose:** Execute agent tasks, coordinate multi-agent workflows, distribute work.

### Orchestrator
- DAG-based topological scheduling (Kahn's algorithm)
- Wave computation for maximum parallelism
- 6 concurrent workers per execution
- Time-budget management with auto-continuation

### Coordination Patterns
- **Debate** â€” Multiple agents propose, evaluate, converge
- **Consensus** â€” Voting-based agreement
- **Planner-Executor** â€” One agent plans, others execute
- **Pipeline** â€” Sequential handoff between specialists

### Distributed Runtime
- Worker registration and health monitoring
- Task queue with priority scheduling
- Failure detection and automatic reassignment

### Adapters
- **LLM Adapter** â€” Provider-agnostic LLM invocation with prompt compression, caching, model routing
- **Tool Adapter** â€” External tool execution with sandboxing, timeout, retry

---

## 10. Data Plane â€” State & Knowledge

**Purpose:** Persist artifacts, memory, telemetry and audit records.

### Artifact Store
- Immutable versioning with content-hash deduplication (SHA-256)
- Lineage DAG â€” full provenance tracking from input to output
- Run Artifact Manifest â€” reconstructs complete reasoning chain
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

## 11. Ecosystem Plane â€” Discovery & Distribution

**Purpose:** Enable agent and capability sharing across environments.

> **Status:** âœ… Active â€” Governed capability ecosystem operational (Block P, Sprints 79â€“82).
> Capability packaging, trust/entitlements, partner marketplace pilot, and outcome-aware capability exchange are implemented.

- Capability registry with semantic versioning
- Package management for agent bundles
- Trust scoring for third-party agents
- Dependency resolution between capabilities

---

## 12. Meta-Agents â€” Active (Sprints 13â€“20)

> **Status:** âœ… Active â€” 4 memory-aware meta-agents with quality feedback and advisory calibration
> **Maturity:** v1.4 â€” Quality feedback loop + advisory calibration layer
> **Target:** Level 5 â€” Institutional Engineering Memory

Meta-Agents are higher-order agents that operate above the normal execution and learning agents. They analyze system behavior with historical engineering context, design new agent roles, adjust orchestration strategies, recommend workflow changes, and optimize system architecture. They do **not** execute pipeline tasks directly.

### Memory-Aware Capabilities (Sprint 18)

Each meta-agent receives historical context via `meta-agent-memory-context.ts`:
- `related_memory_entries` â€” Ranked memory entries by type relevance
- `related_summaries` â€” Relevant memory summaries
- `related_decisions` â€” Prior accepted/rejected/deferred decisions
- `related_outcomes` â€” Prior implementation outcomes
- `historical_context_score` â€” Deterministic 0-1 score

Recommendations include structured historical signals:
- `historical_alignment` â€” reinforces_prior_direction | extends_prior_direction | reopens_unresolved_issue | diverges_from_prior_direction | historically_novel
- `decision_history_signal` â€” Prior decision context
- `outcome_history_signal` â€” Prior outcome context
- `historical_novelty_flag` â€” Whether recommendation is historically novel

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
Observability â†’ Learning Agents â†’ Meta-Agents â†’ Recommendations â†’ Human Review â†’ Controlled Implementation
```

Meta-Agents do not bypass human oversight at any point.

---

### 12.6 Proposal Quality Feedback Loop (Sprint 19)

**Purpose:** Track the quality and usefulness of recommendations and artifacts over time to enable evidence-based calibration.

**Tables:**
- `proposal_quality_feedback` â€” Tracks acceptance, implementation, and outcome signals per recommendation/artifact
- `proposal_quality_summaries` â€” Periodic summaries of proposal quality patterns

**Key modules:**
- `proposal-quality-scoring.ts` â€” Deterministic quality scoring based on acceptance, implementation, and outcome signals
- `proposal-quality-feedback-service.ts` â€” Feedback collection and aggregation
- `proposal-quality-summary-service.ts` â€” Periodic quality summary generation

**Metrics tracked:**
- Recommendation acceptance rate per meta-agent type
- Artifact implementation rate per artifact type
- Downstream outcome quality (positive/negative/neutral)
- Reviewer feedback scores
- Confidence calibration accuracy

**Safety:** Read-only analysis. Does not modify recommendations, artifacts, or meta-agent behavior.

---

### 12.7 Advisory Calibration Layer (Sprint 20)

**Purpose:** Produce structured, explainable calibration signals that diagnose how AxionOS advisory intelligence should be tuned â€” without applying tuning automatically.

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
- `calibration/types.ts` â€” Calibration taxonomy (domains, signal types)
- `calibration/scoring.ts` â€” Deterministic scoring (signal_strength, confidence_score, risk_of_overcorrection)
- `calibration/analysis-service.ts` â€” Analysis functions per domain
- `advisory-calibration-engine/index.ts` â€” Edge function exposing calibration API

**Tables:**
- `advisory_calibration_signals` â€” Individual calibration signals with evidence refs
- `advisory_calibration_summaries` â€” Periodic calibration summary reports

**Each signal includes:**
- `signal_strength` (0-1) â€” Magnitude of the calibration concern
- `confidence_score` (0-1) â€” Reliability based on sample size and consistency
- `risk_of_overcorrection` (0-1) â€” Risk that acting on this signal could overcorrect

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
â”œâ”€â”€ index.ts                    # Barrel exports
â”œâ”€â”€ types.ts                    # Core types
â”œâ”€â”€ protocol.ts                 # Runtime protocol
â”œâ”€â”€ capabilities.ts             # Capability model
â”œâ”€â”€ selection.ts                # Selection engine
â”œâ”€â”€ policy-engine.ts            # Policy engine
â”œâ”€â”€ governance.ts               # Governance layer
â”œâ”€â”€ adaptive-routing.ts         # Adaptive routing
â”œâ”€â”€ orchestrator.ts             # Orchestrator
â”œâ”€â”€ registry.ts                 # Agent registry
â”œâ”€â”€ event-bus.ts                # Event bus
â”œâ”€â”€ coordination.ts             # Multi-agent coordination
â”œâ”€â”€ distributed-runtime.ts      # Distributed runtime
â”œâ”€â”€ llm-adapter.ts              # LLM adapter
â”œâ”€â”€ tool-adapter.ts             # Tool adapter
â”œâ”€â”€ artifact-store.ts           # Artifact store
â”œâ”€â”€ memory-system.ts            # Memory system
â”œâ”€â”€ memory.ts                   # Legacy memory (v0.1)
â”œâ”€â”€ observability.ts            # Observability
â”œâ”€â”€ marketplace.ts              # Marketplace (frozen)
â”œâ”€â”€ utils.ts                    # Shared utilities
â”œâ”€â”€ scoring.ts                  # Scoring functions
â””â”€â”€ policies.ts                 # Default policies
```

---

## 15. Implementation Status

> **Canonical sprint-by-sprint record:** [PLAN.md](../PLAN.md)
> **All 18 core Agent OS modules:** âœ… Designed with full TypeScript contracts
> **Key operational systems:** Orchestrator + DAG Engine, Memory System, Governance, Observability, Learning Agents, Meta-Agents, Engineering Memory, Prompt Optimization, Agent Memory, Predictive Error Detection, Semantic Retrieval â€” all operational.
> **Frozen:** Marketplace, advanced distributed runtime.

---

## 16. Engineering Memory Interaction (Active â€” Sprints 15â€“18)

> **Status:** âœ… Active â€” Full stack operational

### Overview

Engineering Memory is a cross-layer knowledge infrastructure that agents use to retrieve past engineering experience. Agents do **not** write directly to memory â€” capture is event-driven from layer outputs. Agents **read** memory to inform decisions.

### Agent Retrieval Use Cases

| Agent Class | Retrieval Context | Memory Types Used | Status |
|-------------|-------------------|-------------------|--------|
| **Build Agents** | During repair attempts | Error Memory, Strategy Memory | âœ… Active |
| **Validation Agents** | During preventive checks | Error Memory, Execution Memory | âœ… Active |
| **Architecture Agents** | During planning | Design Memory, Outcome Memory | âœ… Active |
| **Meta-Agents** | During recommendation generation | All memory types + summaries | âœ… Active (Sprint 18) |
| **Proposal Generators** | During artifact generation | Design Memory, Decision Memory | âœ… Active (Sprint 18) |

### Memory-Aware Reasoning (Active â€” Sprint 18)

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

## 17. Agent Memory Layer (Active â€” Sprint 24)

> **Status:** âœ… Active â€” Per-agent operational memory

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

- `execution_pattern` â€” Successful execution context patterns
- `repair_pattern` â€” Effective repair paths
- `validation_pattern` â€” Validation failure/success patterns
- `review_pattern` â€” Human review corrections
- `failure_pattern` â€” Recurring failure contexts
- `success_pattern` â€” Repeated success patterns

### Safety Boundaries

- Memory cannot mutate pipeline stages, governance, billing, or execution contracts
- Memory injection is bounded by strict relevance and size constraints (max 4000 chars)
- Deprecated memory is never injected
- All profile changes preserve previous state history
- Memory informs but never overrides system prompt hierarchy

### Events

- `agent_memory_retrieved` â€” Memory fetched for agent context
- `agent_memory_injected` â€” Memory block assembled and injected
- `agent_memory_written` â€” New memory record written
- `agent_memory_profile_updated` â€” Profile created or updated
- `agent_memory_deprecated` â€” Stale memory deprecated

---

## 18. Predictive Error Detection (Active â€” Sprint 25)

> **Status:** âœ… Active â€” Runtime predictive prevention

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

- `low` (0â€“0.35) â€” Proceed normally
- `moderate` (0.35â€“0.6) â€” Proceed with guard
- `high` (0.6â€“0.8) â€” Recommend review or apply bounded actions
- `critical` (0.8â€“1.0) â€” Pause for review (advisory)

### Preventive Action Types

- `strategy_fallback` â€” Switch to safer strategy
- `prompt_fallback` â€” Fall back to known-good prompt variant
- `extra_validation` â€” Add validation before proceeding
- `extra_context` â€” Retrieve additional context
- `human_review` â€” Recommend human review (advisory only)
- `pause_execution` â€” Pause pipeline (advisory only)

### Safety Boundaries

- Cannot alter pipeline topology, governance, billing, or enforcement
- Cannot auto-apply unsafe actions (human_review, pause_execution)
- Low-confidence predictions remain advisory-only
- All applied actions are auditable with outcome tracking
- Cannot delete historical prediction evidence
- Critical pause behavior is advisory, not forced

### Events

- `predictive_risk_assessed` â€” Risk scored for context
- `predictive_checkpoint_evaluated` â€” Checkpoint decision made
- `preventive_action_recommended` â€” Action recommended
- `preventive_action_applied` â€” Action applied
- `predictive_outcome_recorded` â€” Outcome tracked
- `predictive_false_positive_flagged` â€” False positive detected
- `predictive_false_negative_flagged` â€” False negative detected

---

## 19. Learning Agents v2 â€” Cross-Stage Policy Synthesis (Active â€” Sprint 26)

> **Status:** âœ… Active â€” Cross-stage coordinated learning

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

- `failure_propagation` â€” Failure in stage A causes downstream failure in stage B
- `success_dependency` â€” Success in stage A improves outcomes in stage B
- `retry_correlation` â€” Retries in stage A correlate with retries in stage B
- `cost_amplification` â€” Cost in stage A amplifies cost in stage B
- `validation_cascade` â€” Validation failure cascades across stages
- `repair_influence` â€” Repair in stage A influences repair needs in stage B

### Policy Types

- `prompt_coordination` â€” Coordinate prompt variants across stages
- `strategy_coordination` â€” Coordinate repair/execution strategies
- `validation_guard` â€” Add validation guards between stages
- `repair_preemption` â€” Preempt repair needs based on upstream signals
- `context_enrichment` â€” Inject upstream context into downstream agents
- `review_escalation` â€” Escalate review for risky stage chains

### Safety Boundaries

- Cannot mutate pipeline topology, governance, billing, or enforcement
- Cannot auto-apply broad policies without feature flag
- Low-confidence policies remain advisory-only
- All synthesized policies are auditable and reversible
- Harmful or spillover-affected policies are pushed to watch/deprecated
- No policy may affect stages outside its declared scope

### Events

- `cross_stage_pattern_detected` â€” Pattern identified in learning graph
- `cross_stage_policy_synthesized` â€” Policy candidate created
- `cross_stage_policy_activated` â€” Policy promoted to active
- `cross_stage_policy_applied` â€” Policy applied at runtime
- `cross_stage_policy_outcome_recorded` â€” Outcome tracked
- `cross_stage_policy_deprecated` â€” Policy deprecated

---

## 20. Execution Policy Intelligence (Active â€” Sprint 27)

> **Status:** âœ… Active â€” Bounded global execution policy selection

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

- `balanced_default` â€” Standard operating mode
- `high_quality` â€” Increased validation and deploy hardening
- `cost_optimized` â€” Reduced validation, minimal context
- `rapid_iteration` â€” Speed-first with lower guardrails
- `risk_sensitive` â€” Maximum safety parameters
- `deploy_hardened` â€” Zero experimentation, maximum deploy safety
- `repair_conservative` â€” Conservative repair with fewer retries
- `validation_heavy` â€” Maximum validation sensitivity

### Safety Boundaries

- Cannot mutate pipeline topology, governance, billing, or enforcement
- Cannot disable mandatory review or validation gates
- Broad low-confidence policies remain advisory-only
- All policy applications are auditable with lineage
- Harmful or low-confidence policies are contained through watch/deprecate rules
- No policy may auto-expand scope beyond declared bounds

### Events

- `execution_context_classified` â€” Context classified into policy mode
- `execution_policy_selected` â€” Policy selected for execution
- `execution_policy_applied` â€” Policy applied at checkpoint
- `execution_policy_adjustment_applied` â€” Adjustments applied at runtime
- `execution_policy_outcome_recorded` â€” Outcome tracked
- `execution_policy_deprecated` â€” Policy deprecated

---

## 21. Execution Mode Portfolio Optimization (Active â€” Sprint 28)

> **Status:** âœ… Active â€” Bounded portfolio optimization for execution policies

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

- `candidate` â€” New entry, pending evaluation
- `active` â€” Performing well, available for selection
- `watch` â€” Under observation due to concerning signals
- `limited` â€” Restricted to narrow contexts
- `deprecated` â€” Excluded from selection

### Recommendation Types

- `promote` â€” Promote policy for a context class
- `limit` â€” Limit policy to specific flows
- `deprecate` â€” Deprecate due to harmful spillover
- `split` â€” Split broad policy into narrower scoped policies
- `merge` â€” Merge similar policies
- `reprioritize` â€” Adjust portfolio rank

### Safety Boundaries

- Cannot mutate pipeline topology, governance, billing, or enforcement
- Cannot auto-activate broad-scope policies without explicit allowance
- Cannot delete historical policy evidence
- All portfolio transitions are auditable with lineage
- balanced_default is always protected from deprecation

### Events

- `execution_policy_portfolio_recomputed` â€” Portfolio evaluated and ranked
- `execution_policy_rank_updated` â€” Policy rank changed
- `execution_policy_lifecycle_changed` â€” Lifecycle status transitioned
- `execution_policy_conflict_detected` â€” Conflict identified
- `execution_policy_portfolio_recommendation_created` â€” Recommendation generated
- `execution_policy_portfolio_recommendation_reviewed` â€” Recommendation accepted/rejected

---

## 22. Workspace / Tenant Adaptive Policy Tuning (Active â€” Sprint 29)

> **Status:** âœ… Active â€” Bounded tenant/workspace policy adaptation

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

- `organization` â€” Organization-wide preference
- `workspace` â€” Workspace-specific preference (takes precedence)

### Applied Modes

- `global_default` â€” No tenant tuning applied
- `tenant_tuned` â€” Organization preference applied
- `workspace_tuned` â€” Workspace preference applied

### Drift Signal Types

- `harmful_drift` â€” Local tuning producing harmful outcomes
- `stale_profile` â€” Preference not updated in 30+ days
- `overfit_local` â€” High confidence with insufficient sample
- `divergence_from_global` â€” Local performance significantly below global
- `low_sample_tuning` â€” Active tuning with too few outcomes

### Safety Boundaries

- Cannot mutate pipeline topology, governance, billing, or enforcement
- Cannot exceed declared override limits (hard cap at 0.3 delta)
- Cannot bypass mandatory review or validation gates
- Cannot auto-create broad unsafe local policies
- All local tuning decisions are auditable with lineage
- All transitions preserve rollback capability
- Falls back to global defaults when tenant confidence is low

### Events

- `tenant_policy_profile_activated` â€” Preference profile activated
- `tenant_policy_tuning_computed` â€” Tuning recomputed for tenant
- `tenant_policy_selected` â€” Policy selected with tenant context
- `tenant_policy_locally_tuned` â€” Local tuning applied
- `tenant_policy_drift_detected` â€” Drift signal detected
- `tenant_policy_recommendation_created` â€” Recommendation generated
- `tenant_policy_profile_deprecated` â€” Preference deprecated

---

## 23. Platform Intelligence Entry (Active â€” Sprint 30)

> **Status:** âœ… Active â€” System-level advisory intelligence

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

- `reliability_index` â€” 1 - failure_rate
- `execution_stability_index` â€” Penalized by retry rate and bottleneck count
- `repair_burden_index` â€” Repair rate across executions
- `cost_efficiency_index` â€” Normalized cost per execution
- `deploy_success_index` â€” Deploy success rate
- `policy_effectiveness_index` â€” Weighted policy success rate

### Safety Boundaries

- Cannot mutate pipeline topology, governance, billing, or enforcement
- Cannot auto-create execution policies or change policy scopes
- Cannot bypass validation or review gates
- All recommendations remain advisory-first unless explicitly approved
- All insights are auditable with evidence references

### Events

- `platform_intelligence_recomputed` â€” Full recomputation completed
- `platform_bottleneck_detected` â€” Bottleneck identified
- `platform_pattern_detected` â€” Cross-platform pattern detected
- `platform_insight_generated` â€” Insight created
- `platform_recommendation_created` â€” Recommendation generated
- `platform_recommendation_reviewed` â€” Recommendation accepted/rejected

---

## 24. Platform Self-Calibration (Active â€” Sprint 31)

> **Status:** âœ… Active â€” Bounded operational threshold calibration

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

- `manual_only` â€” Proposals are advisory, require explicit human approval
- `bounded_auto` â€” Eligible for auto-application within safe envelopes (requires sufficient confidence)

### Parameter Statuses

- `active` â€” Available for calibration
- `watch` â€” Under observation, calibration allowed with warnings
- `frozen` â€” Cannot be changed
- `deprecated` â€” Cannot be reactivated

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

- `platform_calibration_signal_detected` â€” Calibration opportunity identified
- `platform_calibration_proposal_created` â€” Proposal generated
- `platform_calibration_reviewed` â€” Proposal reviewed
- `platform_calibration_applied` â€” Calibration applied
- `platform_calibration_outcome_recorded` â€” Outcome tracked
- `platform_calibration_rolled_back` â€” Calibration rolled back

---

## 25. Execution Strategy Evolution (Active â€” Sprint 32)

> **Status:** âœ… Active â€” Bounded strategy variant experimentation

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

- `repair_escalation_sequencing` â€” Repair strategy ordering
- `retry_switching_heuristics` â€” Retry switching logic
- `validation_intensity_ladders` â€” Validation sensitivity levels
- `predictive_checkpoint_ordering` â€” Predictive checkpoint sequencing
- `review_escalation_timing` â€” Review escalation timing
- `deploy_hardening_sequencing` â€” Deploy hardening steps
- `context_enrichment_sequencing` â€” Context enrichment ordering
- `strategy_fallback_ladders` â€” Strategy fallback chains

### Safety Boundaries

- Cannot mutate pipeline topology, governance, billing, or enforcement
- Cannot create new strategy families automatically
- Cannot mutate outside declared envelopes
- Maximum absolute delta per mutation: 0.25
- Every experiment preserves rollback capability
- Advisory-first remains the default posture
- Frozen/deprecated families cannot accept variants

### Events

- `execution_strategy_opportunity_detected` â€” Evolution opportunity identified
- `execution_strategy_variant_created` â€” Variant proposed
- `execution_strategy_variant_reviewed` â€” Variant approved/rejected
- `execution_strategy_experiment_started` â€” Experiment launched
- `execution_strategy_outcome_recorded` â€” Outcome tracked
- `execution_strategy_variant_promoted` â€” Variant promoted to baseline
- `execution_strategy_variant_rolled_back` â€” Variant rolled back

---

## 27. Semantic Retrieval & Embedding Memory Expansion (Active â€” Sprint 36)

> **Status:** âœ… Active â€” Unified semantic retrieval across all intelligence layers

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

- `engineering_memory` â€” Engineering memory entries
- `agent_memory` â€” Agent memory records
- `repair_history` â€” Error patterns and repair evidence
- `platform_insights` â€” Platform intelligence signals
- `strategy_variants` â€” Strategy evolution evidence
- `execution_policies` â€” Execution policy profiles
- `engineering_advisory` â€” Advisory recommendations
- `platform_calibration` â€” Calibration parameters
- `stabilization_actions` â€” Stabilization history
- `cross_stage_policies` â€” Cross-stage policy profiles
- `predictive_signals` â€” Predictive error signals
- `strategy_portfolio` â€” Strategy portfolio evidence

### Safety Boundaries

- Cannot mutate pipeline topology, governance, billing, or enforcement
- Cannot retrieve from forbidden domains (billing_data, auth_credentials)
- Cannot bypass tenant isolation (organization_id required)
- Falls back to structured retrieval when embeddings unavailable
- All sessions persisted with full audit lineage
- Advisory-first â€” retrieval informs but never commands

### Events

- `semantic_retrieval_requested` â€” Retrieval session initiated
- `semantic_retrieval_completed` â€” Evidence pack returned
- `semantic_retrieval_feedback_recorded` â€” Usefulness feedback logged
- `semantic_index_rebuild_started` â€” Index rebuild triggered
- `semantic_index_rebuild_completed` â€” Index rebuild finished
- `semantic_index_frozen` â€” Index frozen for protection
- `semantic_retrieval_guardrail_blocked` â€” Guardrail prevented unsafe retrieval

---

## 28. Discovery-Driven Architecture Signals (Active â€” Sprint 37)

> **Status:** âœ… Active â€” External/product signal correlation with architecture recommendations

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

- `discovery_signal_detected` â€” External/product signal detected
- `discovery_signal_correlated` â€” Signal correlated with internal evidence
- `discovery_recommendation_created` â€” Architecture recommendation generated
- `discovery_recommendation_reviewed` â€” Recommendation reviewed

---

## 29. Architecture Change Simulation & Governance (Active â€” Sprint 38)

> **Status:** âœ… Active â€” Bounded simulation of architectural changes

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

- `architecture_change_proposal_created` â€” Proposal registered
- `architecture_simulation_started` â€” Simulation initiated
- `architecture_simulation_completed` â€” Simulation completed
- `architecture_simulation_guardrail_blocked` â€” Guardrail blocked proposal
- `architecture_simulation_reviewed` â€” Simulation reviewed
- `architecture_simulation_accepted` â€” Simulation accepted
- `architecture_simulation_rejected` â€” Simulation rejected

---

## 30. Architecture Change Planning & Rollout Readiness (Active â€” Sprint 39)

> **Status:** âœ… Active â€” Governed implementation plans with blast radius and rollback

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

- `architecture_change_plan_created` â€” Plan created from accepted simulation
- `architecture_dependency_graph_generated` â€” Dependency graph generated
- `architecture_rollout_readiness_scored` â€” Readiness score computed
- `architecture_validation_blueprint_generated` â€” Validation blueprint created
- `architecture_rollback_blueprint_generated` â€” Rollback blueprint created
- `architecture_change_plan_reviewed` â€” Plan reviewed
- `architecture_change_plan_ready` â€” Plan marked rollout-ready
- `architecture_change_plan_blocked` â€” Plan blocked
- `architecture_change_plan_rejected` â€” Plan rejected

---

## 31. Architecture Rollout Sandbox & Controlled Migration Readiness (Active â€” Sprint 40)

> **Status:** âœ… Active â€” Bounded rehearsal of approved architecture plans

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

- `dry_run` â€” Simulate without any side effects
- `staged_preview` â€” Preview staged migration steps
- `shadow_readiness` â€” Shadow readiness assessment (highest fidelity)

### Safety Boundaries

- Cannot mutate production topology, governance, billing, or enforcement
- Cannot change execution contracts or hard safety constraints
- Cannot override tenant isolation
- Cannot auto-approve migration execution
- Cannot auto-run production rollout
- All outputs remain advisory-first and review-driven

### Events

- `architecture_rollout_sandbox_created` â€” Sandbox created
- `architecture_migration_sequence_rehearsed` â€” Migration sequence rehearsed
- `architecture_rollout_fragility_detected` â€” Fragility detected
- `architecture_migration_readiness_scored` â€” Readiness scored
- `architecture_rollback_viability_rehearsed` â€” Rollback viability rehearsed
- `architecture_rollout_sandbox_guardrail_blocked` â€” Guardrail blocked rehearsal
- `architecture_rollout_sandbox_reviewed` â€” Sandbox reviewed
- `architecture_rollout_sandbox_migration_ready` â€” Sandbox marked migration-ready
- `architecture_rollout_sandbox_blocked` â€” Sandbox blocked
- `architecture_rollout_sandbox_rejected` â€” Sandbox rejected

---

## 32. Governing Principle

> **Canonical governing principle:** [ARCHITECTURE.md](ARCHITECTURE.md#15-governing-principle)
>
> The Agent OS is contract-driven and plane-separated. Learning is additive, bounded, and auditable. Memory informs but never commands. All structural evolution requires human review. Forbidden mutation families are immutable by automated systems. All advisory layers remain bounded, explainable, and review-driven.

---

## 33. Future Strategic Arc â€” Agent OS Implications

> **Status:** No Agent OS plane expansion is planned or required.

Sprints 51â€“65 have been completed, reusing existing Agent OS planes:

| Completed Capability | Existing Planes/Modules Used |
|---------------------|------------------------------|
| Institutional Convergence Memory | Data Plane (Memory System, Artifact Store), Control Plane (Governance) |
| Operating Profiles & Policy Packs | Control Plane (Policy Engine, Selection Engine, Governance), Data Plane (Memory) |
| Product Intelligence Entry | Data Plane (Observability, Memory), Control Plane (Governance), Execution Plane (Orchestrator) |
| Product Intelligence Operations | Data Plane (Observability, Memory), Control Plane (Governance, Selection Engine), Execution Plane (Orchestrator) |
| Product Opportunity Portfolio Governance | Control Plane (Governance, Policy Engine, Selection Engine), Data Plane (Memory, Observability), Execution Plane (Orchestrator) |
| Controlled Ecosystem Readiness | Control Plane (Governance, Policy Engine), Data Plane (Memory, Observability), Execution Plane (Orchestrator) |
| Capability Exposure Governance | Control Plane (Governance, Policy Engine, Selection Engine), Data Plane (Memory, Observability), Execution Plane (Orchestrator) |
| External Trust & Admission | Control Plane (Governance, Policy Engine, Selection Engine), Data Plane (Memory, Observability), Execution Plane (Orchestrator) |
| Ecosystem Simulation & Sandbox | Execution Plane (Orchestrator), Data Plane (Memory, Observability), Control Plane (Governance, Policy Engine) |
| Limited Marketplace Pilot | Ecosystem Plane (bounded pilot activation), Control Plane (Governance, Policy Engine, Selection Engine), Data Plane (Memory, Observability), Execution Plane (Orchestrator) |
| Capability Registry Governance | Control Plane (Governance, Policy Engine), Data Plane (Memory, Observability), Ecosystem Plane (bounded registry) |
| Multi-Party Policy & Revenue Governance | Control Plane (Governance, Policy Engine), Data Plane (Memory, Observability), Execution Plane (Orchestrator) |
| Institutional Outcome Assurance | Data Plane (Observability, Memory), Control Plane (Governance), Execution Plane (Orchestrator) |
| Canon Integrity & Drift Governance | Data Plane (Observability, Memory), Control Plane (Governance, Policy Engine) |
| Operating Completion | All planes (verification and coherence assessment) |

The Ecosystem Plane has been activated in bounded pilot-only mode (Sprint 60). Full marketplace activation remains staged and will not expand without explicit human approval.

The 5-plane, 18-module architecture remains stable and sufficient for future work.

---

## Post-70 Strategic Note â€” Agent Evolution Roadmap

Block M (Product Experience & Delivery Maturity, Sprints 66â€“70) is complete. It reused the existing Agent OS foundation without new plane expansion.

The following describes **how agents may evolve** in future blocks. None of this is implemented unless explicitly noted.

### Block N â€” Evidence-Governed Improvement Loop (Planned, Sprints 71â€“74)

Agents may gain evidence-aware improvement capabilities:
- Structured evidence collection from agent execution outcomes
- Bounded improvement proposal generation from evidence aggregation
- Governed testing and promotion of improvement candidates
- Rollback-safe agent-level experimentation

This reuses existing Learning Engine, Memory System, and Governance Layer infrastructure.

### Block O â€” Advanced Multi-Agent Coordination (Reserved, Sprints 75â€“78)

The Agent OS Execution Plane may evolve:
- Advanced role arbitration beyond current selection engine
- Structured debate and consensus patterns (extends existing coordination module v0.8)
- Shared working memory for multi-agent collaboration
- Bounded multi-agent execution with governance oversight

### Block P â€” Governed Capability Ecosystem (Reserved, Sprints 79â€“82)

Agents may participate in a governed capability exchange:
- Agent capability publishing and discovery through the Ecosystem Plane
- Governed admission, trust scoring, and sandbox testing for external agents
- This extends the existing bounded pilot (Sprint 60) â€” not a full open marketplace

### Block S â€” Research Sandbox for Architecture Evolution (Reserved, Sprints 91â€“94)

Agent-driven architecture research may emerge:
- Architecture hypothesis generation by meta-agents
- Simulated evolution campaigns in sandboxed environments
- Cross-tenant pattern synthesis under governed conditions
- All promotion requires explicit human approval â€” no autonomous architecture mutation

### Block X â€” Reflexive Governance & Evolution Control (Planned, Sprints 111â€“114)

The Agent OS may evolve to support reflexive governance:
- Evolution proposal governance â€” agents propose system changes under governed approval
- Mutation control â€” agents evaluate reversibility, blast radius, coupling before structural changes
- Self-revision audit â€” agents track whether self-corrections actually improved outcomes
- Kernel integrity â€” agents monitor for corrosion, bloat, and governance drift

### Block Y â€” Implementation Canon & Knowledge Governance (Future, Sprints 115â€“118)

New knowledge-governance agent roles may emerge:
- **Canon Steward** â€” governs canon lifecycle (entry approval, versioning, deprecation, quality enforcement)
- **Pattern Librarian** â€” curates and indexes implementation patterns for retrieval by execution agents
- **Failure Archivist** â€” captures, classifies, and maintains failure/repair knowledge for institutional reuse
- **External Research Curator** â€” reviews and validates external knowledge before canon admission
- **Retrieval Guide** â€” optimizes pattern retrieval relevance for agent queries at runtime

**Critical principle:** These roles exist for operational enablement. Knowledge only counts as system capability when it is consumed by planning, execution, repair, or validation flows. A pattern not retrieved by agents is documentation, not implementation intelligence.

### Invariants Across All Future Evolution

The 5-plane, 18-module architecture remains stable. Future agent evolution must:
- Preserve the existing plane dependency hierarchy
- Maintain advisory-first, governance-before-autonomy
- Ensure all structural changes require human review
- Preserve tenant isolation (organization_id + RLS)
- Maintain rollback capability for all agent-level changes
- Never allow agents to mutate pipeline topology, governance rules, billing, or safety constraints


# AxionOS â€” Pipeline Product Contracts

> **This document represents the user-visible journey contract of AxionOS.**
>
> The core product promise: **"From idea to delivered software."**
>
> Each phase answers:
> - Does the user understand what is happening?
> - Does the system show visible value?
> - Does this step bring the user closer to the final result?
>
> Last updated: 2026-03-08
>
> **Note:** This document is the canonical user-visible pipeline contract. Internal governance, policy, ecosystem, and intelligence layers operate behind the scenes to ensure quality, safety, and auditability â€” but they do not change the user-facing journey contract unless a direct UX impact is required. Post-65 work (Block M: Product Experience & Delivery Maturity) increasingly optimizes clarity, approvals, transitions, delivery visibility, and deployment legibility. Sprint 67 introduced role-based surface separation. Sprint 68 introduced governed one-click delivery with deploy assurance, blocker detection, rollback posture, and output visibility. Sprint 69 introduced guided onboarding, reusable templates, and domain-specific vertical starters. Sprint 70 introduced adoption intelligence and customer success loops â€” measuring real adoption, friction patterns, template effectiveness, and delivery-adoption correlation to close the feedback loop. Block M is now complete.

## Document Authority

| Scope | Rule |
|-------|------|
| **Owns** | Phase-by-phase product contract (Idea â†’ Discovery â†’ Architecture â†’ Engineering â†’ Validation â†’ Deploy â†’ Delivered Software), user-visible stage behavior, inputs/outputs, control rules, state machines, definition of done, commercial/learning layer contracts, engineering memory pipeline contract |
| **Must not define** | Broader roadmap strategy (â†’ ROADMAP.md), architecture layer narrative (â†’ ARCHITECTURE.md), sprint history unrelated to pipeline UX |
| **Derived from** | AGENTS.md for agent references |
| **Update rule** | Update when user-visible pipeline behavior changes |

---

## VisÃ£o Geral do Ciclo

```
  Idea â†’ Discovery â†’ Architecture â†’ Engineering â†’ Validation â†’ Deploy â†’ Delivered Software
    â”‚         â”‚            â”‚              â”‚            â”‚          â”‚          â”‚
    â”‚         â”‚            â”‚              â”‚            â”‚          â”‚          â””â”€ Software acessÃ­vel, URL publicada, handoff completo
    â”‚         â”‚            â”‚              â”‚            â”‚          â””â”€ RepositÃ³rio publicado e deploy executado
    â”‚         â”‚            â”‚              â”‚            â””â”€ CÃ³digo validado, reparado, build OK
    â”‚         â”‚            â”‚              â””â”€ CÃ³digo gerado: schema, lÃ³gica, API, UI
    â”‚         â”‚            â””â”€ Plano tÃ©cnico completo com simulaÃ§Ã£o
    â”‚         â””â”€ Oportunidade validada com mercado e estratÃ©gia
    â””â”€ Captura da ideia bruta do usuÃ¡rio
```

---

## Fase 1: Idea

### Contrato de Produto

| Campo | Valor |
|-------|-------|
| **Objetivo** | Capturar a ideia do usuÃ¡rio e transformÃ¡-la em um brief estruturado |
| **Input esperado** | Texto livre descrevendo a ideia (+ opcionais: tipo de produto, mercado alvo, problema) |
| **Output gerado** | `initiative` criada com tÃ­tulo, descriÃ§Ã£o, tipo, mercado, URL de referÃªncia |
| **CritÃ©rios de sucesso** | Iniciativa criada no banco com `stage_status = draft` |
| **PossÃ­veis falhas** | Ideia vaga demais (sem contexto suficiente para Discovery) |
| **AÃ§Ã£o do usuÃ¡rio** | "Iniciar Opportunity Discovery" ou "Pular para CompreensÃ£o" |

### Artefatos

| Artefato | Tipo | DescriÃ§Ã£o |
|----------|------|-----------|
| Initiative Record | DB | Registro da iniciativa com metadados de negÃ³cio |
| AI Blueprint (opcional) | JSON | AnÃ¡lise inicial gerada por IA com escopo, mercado e competidores |

### Regras de Controle

| CondiÃ§Ã£o | AÃ§Ã£o disponÃ­vel |
|----------|----------------|
| `stage_status = draft` | Iniciar Discovery (aÃ§Ã£o primÃ¡ria) |
| Ideia tem URL de referÃªncia | Blueprint inclui scraping da referÃªncia |
| Sempre | UsuÃ¡rio pode editar tÃ­tulo/descriÃ§Ã£o antes de avanÃ§ar |

### Definition of Done

âœ… Iniciativa existe no banco com tÃ­tulo e descriÃ§Ã£o
âœ… UsuÃ¡rio pode visualizar e editar antes de prosseguir
âœ… Pelo menos um caminho de avanÃ§o disponÃ­vel

---

## Fase 2: Discovery

### Contrato de Produto

| Campo | Valor |
|-------|-------|
| **Objetivo** | Validar a oportunidade de negÃ³cio e refinar a ideia com inteligÃªncia de mercado |
| **Input esperado** | Iniciativa com ideia bruta + metadados opcionais |
| **Output gerado** | Blueprint refinado: oportunidade, mercado, validaÃ§Ã£o, estratÃ©gia de receita, PRD, arquitetura inicial |
| **CritÃ©rios de sucesso** | Todas as sub-etapas concluÃ­das com artefatos gerados |
| **PossÃ­veis falhas** | Timeout de IA, mercado nÃ£o identificÃ¡vel, viabilidade muito baixa |
| **AÃ§Ã£o do usuÃ¡rio** | Aprovar Discovery â†’ avanÃ§ar para Architecture |

### Sub-etapas (sequenciais, automÃ¡ticas apÃ³s a primeira)

| # | Sub-etapa | Edge Function | Output |
|---|-----------|---------------|--------|
| S02 | Opportunity Discovery | `opportunity-discovery-engine` | Score de oportunidade, TAM, anÃ¡lise competitiva |
| S03 | Market Signal Analysis | `market-signal-analyzer` | Viability index, timing, TAM/SAM/SOM |
| S04 | Product Validation | `product-validation-engine` | AnÃ¡lise 7 dimensÃµes, go/no-go, personas |
| S05 | Revenue Strategy | `revenue-strategy-engine` | Modelo de precificaÃ§Ã£o, tiers, projeÃ§Ãµes MRR/ARR |
| S06 | CompreensÃ£o (4 agentes) | `pipeline-comprehension` | PRD, requisitos, anÃ¡lise de mercado consolidada |

### Artefatos

| Artefato | Origem | PersistÃªncia |
|----------|--------|-------------|
| `opportunity_score.json` | S02 | `initiative_jobs.outputs` |
| `market_signals.json` | S03 | `initiative_jobs.outputs` |
| `product_validation.json` | S04 | `initiative_jobs.outputs` |
| `revenue_strategy.json` | S05 | `initiative_jobs.outputs` |
| `prd_content` | S06 | `initiatives.prd_content` |
| `market_analysis` | S06 | `initiatives.market_analysis` |
| `refined_idea` | S06 | `initiatives.refined_idea` |

### Regras de Controle

| CondiÃ§Ã£o | AÃ§Ã£o |
|----------|------|
| Sub-etapa concluÃ­da com sucesso | PrÃ³xima sub-etapa inicia automaticamente |
| Sub-etapa falhou | Mostrar qual falhou + botÃ£o "Re-executar" |
| Todas sub-etapas concluÃ­das | Mostrar "Aprovar Discovery" (aÃ§Ã£o primÃ¡ria) |
| UsuÃ¡rio desaprova | "Solicitar Ajustes" â†’ volta ao estÃ¡gio anterior |
| Viabilidade muito baixa (S04) | Sugerir "Descartar Oportunidade" |

### TransiÃ§Ã£o para Architecture

âœ… Todas as 5 sub-etapas com outputs vÃ¡lidos
âœ… UsuÃ¡rio aprovou explicitamente
âœ… `initiatives.approved_at_discovery` preenchido
âœ… Status avanÃ§a para `architecture_ready`

---

## Fase 3: Architecture

### Contrato de Produto

| Campo | Valor |
|-------|-------|
| **Objetivo** | Criar o plano tÃ©cnico completo: arquitetura, simulaÃ§Ã£o, validaÃ§Ã£o preventiva, scaffold |
| **Input esperado** | PRD, requisitos, anÃ¡lise de mercado (outputs de Discovery) |
| **Output gerado** | Arquitetura validada, schema DB, scaffold de projeto, grafo de dependÃªncias |
| **CritÃ©rios de sucesso** | Arquitetura simulada e validada sem riscos crÃ­ticos |
| **PossÃ­veis falhas** | DependÃªncias circulares, conflitos de pacotes, componentes desconectados |
| **AÃ§Ã£o do usuÃ¡rio** | Aprovar em pontos-chave (pÃ³s-compreensÃ£o, pÃ³s-dependencies) |

### Sub-etapas

| # | Sub-etapa | Edge Function | Output |
|---|-----------|---------------|--------|
| S07 | Arquitetura (4 agentes) | `pipeline-architecture` | `architecture_content`, stack, componentes |
| S08 | SimulaÃ§Ã£o de Arquitetura | `pipeline-architecture-simulation` | Grafo dirigido, detecÃ§Ã£o de problemas, auto-reparo |
| S09 | ValidaÃ§Ã£o Preventiva | `pipeline-preventive-validation` | Auditoria contra padrÃµes de falha histÃ³ricos |
| S10 | Bootstrap Intelligence | `project-bootstrap-intelligence` | Plano de bootstrap com verificaÃ§Ãµes |
| S11 | Foundation Scaffold | `pipeline-foundation-scaffold` | Estrutura inicial de arquivos e configs |
| S12 | Module Graph Simulation | `pipeline-module-graph-simulation` | Grafo de mÃ³dulos com resoluÃ§Ã£o de dependÃªncias |
| S13 | Dependency Intelligence | `pipeline-dependency-intelligence` | AnÃ¡lise de compatibilidade de packages |

### TransiÃ§Ã£o para Engineering

âœ… Dependency Intelligence concluÃ­do com sucesso
âœ… Nenhum conflito crÃ­tico de dependÃªncias
âœ… Status avanÃ§a para `bootstrapping_schema`

---

## Fase 4: Engineering

### Contrato de Produto

| Campo | Valor |
|-------|-------|
| **Objetivo** | Gerar todo o cÃ³digo do produto: schema, modelos, lÃ³gica, API, UI |
| **Input esperado** | Arquitetura validada, scaffold, grafo de dependÃªncias |
| **Output gerado** | CÃ³digo completo: DB schema, domain models, business logic, API, UI |
| **CritÃ©rios de sucesso** | Todos os arquivos gerados e associados a subtasks |
| **PossÃ­veis falhas** | Timeout de IA, schema invÃ¡lido, lÃ³gica inconsistente |
| **AÃ§Ã£o do usuÃ¡rio** | Cada sub-etapa avanÃ§a automaticamente; aprovaÃ§Ã£o no final |

### Sub-etapas

| # | Sub-etapa | Edge Function | Output |
|---|-----------|---------------|--------|
| S14 | Schema Bootstrap | `supabase-schema-bootstrap` | SQL de criaÃ§Ã£o de tabelas |
| S15 | DB Provisioning | `supabase-provisioning-engine` | ExecuÃ§Ã£o do schema no banco |
| S16 | Domain Analysis | `ai-domain-model-analyzer` | Entidades, relaÃ§Ãµes, atributos |
| S17 | Data Model Generation | `supabase-data-model-generator` | Tabelas, FK, indexes, RLS |
| S18 | Business Logic Synthesis | `ai-business-logic-synthesizer` | ServiÃ§os, workflows, validaÃ§Ãµes |
| S19 | API Generation | `autonomous-api-generator` | REST/RPC endpoints, webhooks |
| S20 | UI Generation | `autonomous-ui-generator` | PÃ¡ginas, componentes, hooks, navegaÃ§Ã£o |
| S21 | Squad Formation | `pipeline-squad` | Squad de agentes com roles |
| S22 | Planning | `generate-planning-content` | Stories, phases, subtasks com DAG |
| S23 | Execution (Agent Swarm) | `pipeline-execution-orchestrator` | CÃ³digo gerado em paralelo (6 workers) |

### TransiÃ§Ã£o para Deploy

âœ… Todas as subtasks executadas
âœ… Arquivos de cÃ³digo gerados e persistidos
âœ… Status avanÃ§a para `validating`

---

## Fase 5: Validation

### Contrato de Produto

| Campo | Valor |
|-------|-------|
| **Objetivo** | Validar o cÃ³digo gerado, reparar erros automaticamente, garantir conformidade com arquitetura |
| **Input esperado** | CÃ³digo gerado (story_subtasks com outputs) |
| **Output gerado** | CÃ³digo validado, build OK, conformidade verificada |
| **CritÃ©rios de sucesso** | Build passa (tsc + vite), anÃ¡lise estÃ¡tica OK, drift detection OK |
| **PossÃ­veis falhas** | Erros de TypeScript, build failure, drift arquitetural |
| **AÃ§Ã£o do usuÃ¡rio** | Um clique: "Iniciar ValidaÃ§Ã£o Completa" â†’ tudo roda automaticamente |

### Sub-etapas (sequenciais, totalmente automÃ¡ticas)

| # | Sub-etapa | Edge Function | O que faz |
|---|-----------|---------------|-----------|
| 1 | Fix Loop (AI) | `pipeline-validation` | IA corrige erros atÃ© 3 iteraÃ§Ãµes |
| 2 | Deep Static Analysis | `pipeline-deep-validation` | Imports, referÃªncias, consistÃªncia |
| 3 | Drift Detection | `pipeline-drift-detection` | Conformidade com arquitetura planejada |
| 4 | Runtime Validation | `pipeline-runtime-validation` | tsc + vite build real via CI |
| 5 | Build Repair (se falhar) | `autonomous-build-repair` | Auto-reparo com patches e retry |

### TransiÃ§Ã£o para Deploy

âœ… Build passa no CI (tsc + vite)
âœ… AnÃ¡lise estÃ¡tica e drift detection OK
âœ… Status avanÃ§a para `ready_to_publish`

---

## Fase 6: Deploy â†’ Delivered Software

### Contrato de Produto

| Campo | Valor |
|-------|-------|
| **Objetivo** | Publicar no repositÃ³rio Git, executar deploy, e entregar software acessÃ­vel |
| **Input esperado** | CÃ³digo validado (build OK) |
| **Output gerado** | RepositÃ³rio Git publicado + deploy em produÃ§Ã£o + URLs acessÃ­veis |
| **CritÃ©rios de sucesso** | CÃ³digo publicado, deploy acessÃ­vel, handoff completo |
| **PossÃ­veis falhas** | Token Git invÃ¡lido, deploy failure |
| **AÃ§Ã£o do usuÃ¡rio** | Um clique: "Deploy" (governado â€” respeita gates de validaÃ§Ã£o e aprovaÃ§Ã£o) |

### Deploy State Machine

```
  ready_to_publish
       â”‚
       â–¼
  published â”€â”€â”€â”€â”€â”€â–º deploying
                        â”‚
                   â”Œâ”€â”€â”€â”€â”´â”€â”€â”€â”€â”
                   â–¼         â–¼
              deployed   deploy_failed
```

### Sub-etapas

| # | Sub-etapa | Edge Function | O que faz |
|---|-----------|---------------|-----------|
| 1 | PublicaÃ§Ã£o | `pipeline-publish` | Atomic commits via Tree API |
| 2 | Deploy | `pipeline-deploy` | Deploy para Vercel/Netlify |

### Outputs VisÃ­veis ao UsuÃ¡rio

| Output | DescriÃ§Ã£o |
|--------|-----------|
| `repo_url` | URL do repositÃ³rio Git publicado |
| `deploy_url` | URL do deploy acessÃ­vel e verificado |
| `preview_url` | URL de preview (quando disponÃ­vel) |
| Deploy timestamp | Data/hora do Ãºltimo deploy |
| Rollback posture | IndicaÃ§Ã£o se rollback estÃ¡ disponÃ­vel |

### Definition of Done da Iniciativa

âœ… Build passa no CI (tsc + vite)
âœ… CÃ³digo publicado no repositÃ³rio Git
âœ… `repo_url` disponÃ­vel na interface
âœ… Deploy executado com sucesso
âœ… `deploy_url` acessÃ­vel e verificado
âœ… Todos os artefatos rastreÃ¡veis no pipeline
âœ… Custos registrados por estÃ¡gio

---

## Fase 7: Growth (SecundÃ¡ria)

> **Status:** Implementada mas secundÃ¡ria para o produto-prova atual.
> O foco Ã© fechar o ciclo Idea â†’ Deploy primeiro.

| Sub-etapa | PropÃ³sito |
|-----------|-----------|
| Observability | Health score do sistema gerado |
| Product Analytics | Funis AARRR, mÃ©tricas de uso |
| User Behavior | FricÃ§Ã£o, drop-off, retenÃ§Ã£o |
| Growth Optimization | Experimentos prioritizados (ICE score) |
| Adaptive Learning | Regras de prevenÃ§Ã£o aprendidas |
| Product Evolution | Roadmap de features baseado em dados |
| Architecture Evolution | EvoluÃ§Ã£o tÃ©cnica do sistema |
| Portfolio Manager | GestÃ£o multi-produto |
| System Evolution | Meta-learning da plataforma |

---

## Contratos da Camada Comercial (Sprint 11)

### Contrato: VerificaÃ§Ã£o de Limites de Uso

**Ponto de aplicaÃ§Ã£o:** Entrada do pipeline (`pipeline-bootstrap.ts`, `run-initiative-pipeline`)

| Campo | Valor |
|-------|-------|
| **Input** | `organization_id`, tipo de limite a verificar |
| **Output (sucesso)** | Pipeline prossegue normalmente |
| **Output (bloqueio)** | HTTP 402, `{ error: "USAGE_LIMIT_EXCEEDED", limit_type, current_value, max_value }` |
| **PersistÃªncia** | `audit_logs` com aÃ§Ã£o `usage_limit_blocked` |

### Limites verificados

| Limite | Fonte | Tipo |
|--------|-------|------|
| `max_initiatives_per_month` | `product_plans` | Contagem de iniciativas no perÃ­odo |
| `max_tokens_per_month` | `product_plans` | Soma de tokens usados |
| `max_deploys_per_month` | `product_plans` | Contagem de deploys com status `"success"` |
| `max_parallel_runs` | `product_plans` | Jobs com status `running` no momento |

### Contrato: CÃ¡lculo de Custo

| Campo | Valor |
|-------|-------|
| **Input** | `organization_id` |
| **Output** | `{ total_cost_usd, stage_breakdown[], model_breakdown[], estimated_monthly_cost }` |
| **Fonte de verdade** | `initiative_jobs.cost_usd` (nÃ£o duplica com tokens) |
| **Isolamento** | Filtra jobs apenas de iniciativas da organizaÃ§Ã£o solicitante |

### Contrato: Dados de Workspace

| Campo | Valor |
|-------|-------|
| **Regra** | Todas as consultas agregadas devem filtrar por `organization_id` |
| **ProibiÃ§Ã£o** | Consultas sem filtro de organizaÃ§Ã£o sÃ£o proibidas |
| **VerificaÃ§Ã£o** | Jobs sÃ£o agregados via IDs de iniciativas da organizaÃ§Ã£o |

---

## Contratos da Camada de Learning (Sprint 12)

### Contrato: Prompt Strategy Metrics

| Campo | Valor |
|-------|-------|
| **Gerado por** | `prompt-outcome-analyzer` |
| **Schema** | `{ stage_name, prompt_signature, runs_count, success_rate, average_quality_score, average_cost, retry_rate }` |
| **FrequÃªncia** | Sob demanda (invocaÃ§Ã£o explÃ­cita) |
| **Isolamento** | Filtrado por `organization_id` |

### Contrato: Strategy Effectiveness Metrics

| Campo | Valor |
|-------|-------|
| **Gerado por** | `strategy-performance-engine` |
| **Schema** | `{ strategy_name, error_type, runs_count, success_rate, avg_resolution_time, avg_cost, error_recurrence_rate }` |
| **Isolamento** | Filtrado por `organization_id` |

### Contrato: Predictive Error Patterns

| Campo | Valor |
|-------|-------|
| **Gerado por** | `predictive-error-engine` |
| **Schema** | `{ stage_name, error_signature, probability_score, observations_count, recommended_prevention_rule }` |
| **Threshold** | Se `probability_score > 0.7`, gera `prevention_rule_candidate` |
| **Isolamento** | Filtrado por `organization_id` |

### Contrato: Learning Recommendations

| Campo | Valor |
|-------|-------|
| **Gerado por** | `learning-recommendation-engine` |
| **Schema** | `{ recommendation_type, target_component, description, confidence_score, supporting_evidence[], metrics_summary, expected_improvement }` |
| **Tipos** | `PROMPT_OPTIMIZATION`, `STRATEGY_RANKING_ADJUSTMENT`, `NEW_PREVENTION_RULE`, `PIPELINE_CONFIGURATION_HINT` |
| **Status** | Criadas como `pending`. Requerem revisÃ£o humana. |
| **Isolamento** | Filtrado por `organization_id` |

### Contrato: Repair Strategy Weights

| Campo | Valor |
|-------|-------|
| **Gerado por** | `repair-learning-engine` |
| **Schema** | `{ strategy_name, stage_name, current_weight, previous_weight, adjustment_reason, adjusted_at }` |
| **FÃ³rmula** | `new_weight = previous_weight + success_factor âˆ’ failure_penalty` |
| **Limites** | Pesos limitados a intervalo seguro, reversÃ­veis |
| **Auditoria** | Cada ajuste gera evento `LEARNING_UPDATE` em `audit_logs` |
| **Isolamento** | Filtrado por `organization_id` |

---

## PrincÃ­pios de SeguranÃ§a de Contratos

### Estabilidade

- Contratos de stage IO devem permanecer estÃ¡veis
- MudanÃ§as em contratos requerem versionamento explÃ­cito
- Learning nÃ£o pode alterar a forma (shape) de contratos existentes
- Meta-Agents nÃ£o podem modificar contratos diretamente

### Isolamento

- Camadas comerciais consomem dados de observabilidade, nÃ£o duplicam o kernel
- Acesso cross-tenant a contratos Ã© **proibido**
- Todas as consultas agregadas devem incluir filtro `organization_id`
- Meta-Agents tÃªm acesso somente leitura a dados de observabilidade e learning

### SeparaÃ§Ã£o de Responsabilidades

- Learning gera recomendaÃ§Ãµes, nÃ£o executa mudanÃ§as automaticamente
- Commercial verifica limites, nÃ£o modifica comportamento do pipeline
- O kernel processa estÃ¡gios, nÃ£o conhece billing ou learning
- Meta-Agents geram recomendaÃ§Ãµes de alto nÃ­vel, nÃ£o mutam o sistema

### Auditabilidade

- Toda decisÃ£o de learning Ã© registrada em `audit_logs`
- Todo bloqueio de uso Ã© registrado em `audit_logs`
- Eventos rastreÃ¡veis: `LEARNING_UPDATE`, `USAGE_LIMIT_EXCEEDED`, `PIPELINE_EXECUTION`, `REPAIR_APPLIED`
- Meta-Agent recommendations sÃ£o rastreÃ¡veis via `meta_agent_recommendations` table

---

## InteraÃ§Ã£o com Meta-Agents (Active â€” Sprints 13+)

> **Status:** âœ… Active â€” Meta-Agents v1.4 operational (Sprints 13â€“20)

Meta-Agents interact with the pipeline **only** through read access:

| Fonte | Tipo de Acesso | PropÃ³sito |
|-------|---------------|-----------|
| `initiative_observability` | Leitura | MÃ©tricas de estÃ¡gio, duraÃ§Ãµes, distribuiÃ§Ã£o de falhas |
| `prompt_strategy_metrics` | Leitura | TendÃªncias de performance de prompts |
| `strategy_effectiveness_metrics` | Leitura | Efetividade de estratÃ©gias de reparo |
| `predictive_error_patterns` | Leitura | PrevisÃµes de falhas |
| `learning_recommendations` | Leitura | RecomendaÃ§Ãµes existentes |
| `repair_evidence` | Leitura | HistÃ³rico de resultados de reparo |
| `audit_logs` | Leitura | HistÃ³rico de eventos do sistema |

**Meta-Agents nÃ£o modificam contratos de pipeline diretamente.** Suas saÃ­das sÃ£o recomendaÃ§Ãµes estruturadas que passam por revisÃ£o humana antes de qualquer implementaÃ§Ã£o.

---

## PadrÃ£o de VisualizaÃ§Ã£o de Artefatos

Cada artefato no sistema segue este padrÃ£o:

1. **Nomeado** â€” nome claro que indica o conteÃºdo
2. **ClicÃ¡vel** â€” abre detalhes/conteÃºdo no Context Panel
3. **Origem clara** â€” mostra qual agente/estÃ¡gio gerou
4. **RastreÃ¡vel** â€” ligado a decisÃµes (`project_decisions`), erros (`project_errors`) e regras de prevenÃ§Ã£o (`project_prevention_rules`)
5. **Versionado** â€” hash de conteÃºdo para deduplicaÃ§Ã£o

### Centro de EvidÃªncia (Project Brain)

O Project Brain serve como centro de evidÃªncia visual:
- Grafo de dependÃªncias (DAG) interativo
- NÃ³s tipados (file, domain_model, data_model, business_logic, api_spec, ui_structure)
- Arestas com relaÃ§Ãµes semÃ¢nticas (depends_on, imports, renders_component, calls_service, stores_entity)
- Busca semÃ¢ntica por embeddings (pgvector 768-dim)

---

## PrincÃ­pios de Controle

### Quando aparece "Aprovar"
- ApÃ³s conclusÃ£o de uma fase completa (Discovery, Architecture, UI, Squad, Planning)
- Sempre com botÃ£o primÃ¡rio destacado

### Quando aparece "Re-executar"
- Quando uma sub-etapa falhou
- Sempre disponÃ­vel como aÃ§Ã£o secundÃ¡ria em estÃ¡gios concluÃ­dos

### Quando bloqueia avanÃ§o
- Sub-etapa obrigatÃ³ria nÃ£o concluÃ­da
- Erro crÃ­tico sem reparo automÃ¡tico
- **Limite de uso excedido** (HTTP 402, `USAGE_LIMIT_EXCEEDED`)

### Quando permite avanÃ§o parcial
- Sub-etapas opcionais (ex: Adaptive Learning pode ser pulado)
- AprovaÃ§Ã£o manual override em casos de urgÃªncia

---

## MÃ©tricas de Sucesso do Pipeline

| MÃ©trica | Target |
|---------|--------|
| Taxa de sucesso sem intervenÃ§Ã£o manual | > 80% |
| Taxa de build OK na primeira tentativa | > 90% |
| Retries mÃ©dios por iniciativa | < 2 |
| Taxa de reparo automÃ¡tico com sucesso | > 70% |
| Custo por iniciativa | Rastreado e declinante |
| Tempo ideia â†’ software entregue | < 15 min |
| Clareza do progresso para o usuÃ¡rio | Feedback visual claro |

---

## Engineering Memory â€” Pipeline Contract (Active)

> **Status:** âœ… Implemented â€” Sprints 15â€“18 (Foundation, Retrieval, Summaries, Memory-Aware Meta-Agents)

### Interaction Model

Engineering Memory is **read-only** from the pipeline's perspective:

- The pipeline **emits events** that trigger memory capture (by the memory layer, not the pipeline itself)
- Pipeline stages **query** memory for contextual information (repair strategies, past failures)
- Pipeline execution **never depends** on memory availability â€” graceful degradation is enforced

### Safety Rules

| Rule | Description |
|------|-------------|
| **No execution dependency** | Pipeline must complete successfully even with zero memory entries |
| **No write coupling** | Pipeline stages do not write to memory tables directly |
| **No governance bypass** | Memory retrieval cannot override gate permissions or SLA rules |
| **Tenant isolation** | All memory queries must include organization_id scope |
| **Performance isolation** | Memory queries must not block stage execution (async, timeout-bounded) |

### Memory as Context (Active)

Memory provides **optional enrichment** to pipeline stages:

- **Preventive Validation:** Queries Error Memory for known failure patterns on similar architectures
- **Build Repair:** Queries Strategy Memory for previously successful repair strategies
- **Architecture Stage:** Queries Design Memory for relevant prior architecture decisions
- **Deploy Stage:** Queries Outcome Memory for deployment risk signals from similar initiatives
- **Meta-Agents:** Query all memory types + summaries for recommendation generation (Sprint 18)
- **Semantic Retrieval:** Unified embedding-backed retrieval across all domains (Sprint 36)

Memory enrichment is always **additive** â€” it enhances decisions but never gates them.

---

## Forward-Looking Pipeline Evolution

> **Status:** The following describes how **future planned and reserved blocks** may affect the visible pipeline. None of this is implemented unless explicitly noted. The canonical roadmap is in [ROADMAP.md](ROADMAP.md).

### Block N â€” Evidence-Governed Improvement Loop (Planned, Sprints 71â€“74)

Block N may improve the **quality and learning loops behind the pipeline** without changing the visible journey contract:
- Pipeline outcomes feed structured evidence collection
- Repair, validation, and delivery patterns are aggregated for bounded improvement proposals
- Improvement candidates are tested and promoted under governance
- The user-facing journey (Idea â†’ Discovery â†’ Architecture â†’ Engineering â†’ Validation â†’ Deploy â†’ Delivered Software) remains unchanged

**Pipeline impact:** Internal quality improvement. No new user-visible stages or approval gates.

### Blocks Oâ€“S â€” Reserved Future Direction (Sprints 75â€“94)

Later blocks may affect the pipeline in these ways:
- **Block O (Advanced Multi-Agent Coordination):** May improve agent coordination during Engineering and Validation phases â€” internal optimization, not journey-visible
- **Block P (Governed Capability Ecosystem):** May allow extensions to enrich pipeline stages â€” any visible impact must be legible and bounded
- **Block Q (Delivery Optimization):** May improve deploy confidence, post-deploy learning, and delivery reliability â€” visible as better outcomes, not more complexity
- **Block R (Distributed Runtime):** May improve execution scale and resilience â€” transparent to the user journey
- **Block S (Research Sandbox):** Architecture evolution research â€” sandboxed, no direct pipeline impact

### Pipeline Stability Guarantee

The default user-facing journey remains:

> **Idea â†’ Discovery â†’ Architecture â†’ Engineering â†’ Validation â†’ Deploy â†’ Delivered Software**

Future blocks may deepen the intelligence, coordination, and reliability behind each stage, but the visible pipeline contract is stable. Internal complexity must not leak into the default user journey.


