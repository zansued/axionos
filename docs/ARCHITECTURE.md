# AxionOS — System Architecture

> Technical architecture of the autonomous software engineering system.
>
> **Last updated:** 2026-03-07
>
> **Current state:** Level 5 — Institutional Engineering Memory Platform.
> Seventeen architectural layers active. Execution Strategy Evolution (Sprint 32). Platform Self-Calibration (Sprint 31). Platform Intelligence Entry (Sprint 30). Workspace / Tenant Adaptive Policy Tuning (Sprint 29). Execution Mode Portfolio Optimization (Sprint 28). Execution Policy Intelligence (Sprint 27). Learning Agents v2 with Cross-Stage Policy Synthesis (Sprint 26). Predictive Error Detection Operationalization (Sprint 25). Agent Memory Layer Operationalization (Sprint 24). Self-Improving Fix Agents v2 with memory-aware repair policies (Sprint 23). Prompt Optimization closed-loop with Bounded Promotion & Rollback Guard (Sprint 22). Advisory Calibration Layer operational (Sprint 20).

---

## 1. Project Overview

**AxionOS** is a multi-tenant SaaS platform that operates as an autonomous software engineering system. It orchestrates multiple AI agents to generate complete production-ready applications through a deterministic 32-stage pipeline with self-healing builds, architecture simulation, and preventive validation.

### What AxionOS Is Today

A governed engineering platform with active learning, meta-analysis, platform intelligence, self-calibration, and strategy evolution:

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
- Prompt Optimization Engine with A/B testing and bounded promotion
- Self-Improving Fix Agents v2 with memory-aware repair policies
- Agent Memory Layer with per-agent operational memory
- Predictive Error Detection with runtime preventive actions
- Learning Agents v2 with cross-stage policy synthesis
- Execution Policy Intelligence with bounded global operating modes
- Execution Mode Portfolio Optimization with lifecycle governance
- Tenant/Workspace Adaptive Policy Tuning
- Platform Intelligence with system-level observability and health modeling
- Platform Self-Calibration with bounded threshold tuning
- Execution Strategy Evolution with bounded variant experimentation

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
> **System state:** All 17 architectural layers active and operational.
> **Kernel status:** Stable and operational.
> **Learning status:** Active, rule-based, auditable, cross-stage coordinated.
> **Meta-Agent status:** Active, memory-aware, v1.4 with quality feedback and calibration.
> **Platform Intelligence:** Active, system-level observability with health model.
> **Platform Calibration:** Active, bounded threshold tuning with guardrails and rollback.
> **Strategy Evolution:** Active, bounded variant experimentation with promotion/rollback.

### Implementation Horizons

| Horizon | Focus | Status |
|---------|-------|--------|
| **DONE** | Kernel + Commercial + Learning + Meta-Agents + Proposals + Memory + Quality + Calibration + Prompt Optimization + Repair Policies + Agent Memory + Predictive Detection + Cross-Stage Policies + Execution Policy Intelligence + Portfolio Optimization + Tenant Tuning + Platform Intelligence + Platform Calibration + Strategy Evolution | ✅ 32 Sprints Complete |
| **NEXT** | Semantic Retrieval + Strategy Portfolio Governance + Platform Stabilization | 📋 Planned |
| **LATER** | Autonomous Engineering Advisor + Discovery-Driven Architecture | 🔮 Vision |

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

AxionOS consists of 17 layers organized into 6 architectural tiers.

### Architecture Mind Map

```
                         ┌─────────────────────────────────────┐
                         │        STRATEGY EVOLUTION           │
                         │-------------------------------------│
                         │ Strategy Families Registry          │
                         │ Strategy Signal Interpreter         │
                         │ Variant Synthesizer                 │
                         │ Experiment Runner                   │
                         │ Outcome Tracker                     │
                         │ Promotion Rules                     │
                         │ Rollback Engine                     │
                         │ Strategy Lineage                    │
                         └─────────────────┬───────────────────┘
                                           │
                                           ▼
                         ┌─────────────────────────────────────┐
                         │      PLATFORM SELF-CALIBRATION      │
                         │-------------------------------------│
                         │ Calibration Parameter Registry      │
                         │ Calibration Signal Interpreter      │
                         │ Calibration Proposal Engine         │
                         │ Calibration Guardrails              │
                         │ Calibration Runner                  │
                         │ Outcome Tracker                     │
                         │ Rollback Engine                     │
                         └─────────────────┬───────────────────┘
                                           │
                                           ▼
                         ┌─────────────────────────────────────┐
                         │      PLATFORM INTELLIGENCE          │
                         │-------------------------------------│
                         │ Platform Behavior Aggregator        │
                         │ Bottleneck Detector                 │
                         │ Pattern Analyzer                    │
                         │ Insight Generator                   │
                         │ Recommendation Engine               │
                         │ Platform Health Model               │
                         └─────────────────┬───────────────────┘
                                           │
                                           ▼
                         ┌─────────────────────────────────────┐
                         │      EXECUTION GOVERNANCE           │
                         │-------------------------------------│
                         │ Execution Policy Intelligence       │
                         │ Policy Portfolio Optimization       │
                         │ Tenant / Workspace Adaptive Tuning  │
                         │ Policy Routing                      │
                         └─────────────────┬───────────────────┘
                                           │
                                           ▼
                         ┌─────────────────────────────────────┐
                         │           LEARNING LAYER            │
                         │-------------------------------------│
                         │ Prompt Optimization Engine          │
                         │ Bounded Promotion & Rollback        │
                         │ Self-Improving Fix Agents           │
                         │ Agent Memory                        │
                         │ Predictive Error Detection          │
                         │ Learning Agents v2                  │
                         └─────────────────┬───────────────────┘
                                           │
                                           ▼
                         ┌─────────────────────────────────────┐
                         │      OPERATIONAL INTELLIGENCE       │
                         │-------------------------------------│
                         │ Error Pattern Library               │
                         │ Repair Strategy Tracking            │
                         │ Adaptive Repair Routing             │
                         │ Prevention Rule Candidates          │
                         └─────────────────┬───────────────────┘
                                           │
                                           ▼
                         ┌─────────────────────────────────────┐
                         │      DETERMINISTIC PIPELINE         │
                         │-------------------------------------│
                         │ Stage Execution Engine              │
                         │ Artifact Governance                 │
                         │ Validation Engine                   │
                         │ Publish Pipeline                    │
                         │ Observability Feed                  │
                         └─────────────────────────────────────┘
```

### Layer Architecture

```
  ═══════════════════════════════════════════════════════════════════
  TIER 6: STRATEGY EVOLUTION LAYER
  ═══════════════════════════════════════════════════════════════════
  Layer 17: Execution Strategy Evolution          ← Active (Sprint 32)

  ═══════════════════════════════════════════════════════════════════
  TIER 5: PLATFORM INTELLIGENCE & CALIBRATION LAYER
  ═══════════════════════════════════════════════════════════════════
  Layer 16: Platform Self-Calibration             ← Active (Sprint 31)
  Layer 15: Platform Intelligence Entry           ← Active (Sprint 30)

  ═══════════════════════════════════════════════════════════════════
  TIER 4: EXECUTION GOVERNANCE LAYER
  ═══════════════════════════════════════════════════════════════════
  Layer 14: Tenant/Workspace Adaptive Tuning      ← Active (Sprint 29)
  Layer 13: Execution Mode Portfolio Optimization  ← Active (Sprint 28)
  Layer 12: Execution Policy Intelligence         ← Active (Sprint 27)

  ═══════════════════════════════════════════════════════════════════
  TIER 3: LEARNING & INTELLIGENCE LAYER
  ═══════════════════════════════════════════════════════════════════
  Layer 11: Cross-Stage Policy Synthesis (LA v2)  ← Active (Sprint 26)
  Layer 10: Predictive Error Detection            ← Active (Sprint 25)
  Layer 9:  Agent Memory Operationalization       ← Active (Sprint 24)
  Layer 8:  Self-Improving Fix Agents v2          ← Active (Sprint 23)
  Layer 7:  Prompt Optimization + Rollback        ← Active (Sprints 21-22)

  ═══════════════════════════════════════════════════════════════════
  TIER 2: META-INTELLIGENCE & MEMORY LAYER
  ═══════════════════════════════════════════════════════════════════
  Layer 6:  Proposal Quality & Calibration        ← Active (Sprints 19-20)
  Layer 5:  Engineering Memory Architecture       ← Cross-layer (Sprints 15-18)
  Layer 4:  Proposal Generation + Meta-Agents     ← Active (Sprints 13-14)

  ═══════════════════════════════════════════════════════════════════
  TIER 1: FOUNDATION LAYER
  ═══════════════════════════════════════════════════════════════════
  Layer 3:  Learning Agents v1                    ← Active (Sprint 12)
  Layer 2:  Commercial Readiness                  ← Active (Sprint 11)
  Layer 1:  Execution Kernel                      ← Active (Sprints 1-10)
            (Pipeline + Prevention + Routing + Governance + Observability)
```

Engineering Memory (Layer 5) is a **cross-layer infrastructure** that captures knowledge from all layers but does not interfere with their operation.

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
- Prevention and routing layer (preventive validation, active prevention rules, adaptive repair routing, error pattern library)
- Governance and audit layer (trust boundaries, approval gates, SLA enforcement, audit logs)
- Observability layer (per-initiative metrics, cost tracking, telemetry)

**Key modules:**
- `pipeline-bootstrap.ts` — Pipeline lifecycle initialization with usage enforcement
- `dependency-scheduler.ts` — Kahn's algorithm, wave computation, 6 workers
- `pipeline-execution-orchestrator` / `pipeline-execution-worker` — DAG agent swarm
- `pipeline-helpers.ts` — Standardized logging, jobs, messages
- `autonomous-build-repair` — Self-healing builds from CI error logs
- `pipeline-fix-orchestrator` — Multi-iteration fix coordination
- `pipeline-preventive-validation` — Pre-generation guard
- `prevention-rule-engine` — Active prevention rule management
- `repair-routing-engine` — Adaptive strategy selection
- `error-pattern-library-engine` — Pattern extraction and indexing
- `observability-engine` / `initiative-observability-engine` — Telemetry
- `usage-limit-enforcer.ts` — Plan limits enforcement
- 50+ Edge Functions covering all 32 stages

**Persistence:** `initiative_jobs`, `active_prevention_rules`, `error_patterns`, `prevention_rule_candidates`, `repair_routing_log`, `pipeline_gate_permissions`, `stage_sla_configs`, `audit_logs`, `initiative_observability`

---

### Layer 2: Commercial Readiness Layer

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

---

### Layer 3: Learning Agents Layer (v1)

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

---

### Layer 4: Meta-Agent Coordination + Proposal Generation Layer

**Purpose:** Higher-order agents that reason about the system itself and generate structured engineering proposals.

**Status:** ✅ Active (Sprints 13-14, memory-aware Sprint 18)

**Four Meta-Agent Types:**

| Meta-Agent | Purpose | Output Types |
|-----------|---------|--------------|
| **Architecture Meta-Agent** | Analyze execution outcomes and suggest pipeline improvements | `PIPELINE_OPTIMIZATION`, `STAGE_REORDERING_SUGGESTION`, `STAGE_SPLIT_OR_MERGE` |
| **Agent Role Designer** | Analyze task distribution and propose new agent roles | `NEW_AGENT_ROLE`, `AGENT_SPECIALIZATION`, `AGENT_DEPRECATION` |
| **Workflow Optimizer** | Improve pipeline efficiency by analyzing duration and retries | `WORKFLOW_PARALLELIZATION`, `STEP_ELIMINATION`, `STEP_REORDERING` |
| **System Evolution Advisor** | Produce high-level system evolution guidance | `TECHNICAL_DEBT_ALERT`, `ARCHITECTURE_CHANGE_PROPOSAL`, `SYSTEM_EVOLUTION_REPORT` |

**Key modules:** `meta-agents/architecture-meta-agent.ts`, `meta-agents/agent-role-designer.ts`, `meta-agents/workflow-optimizer.ts`, `meta-agents/system-evolution-advisor.ts`, `meta-agents/meta-agent-memory-context.ts`, `meta-agents/historical-continuity-scoring.ts`, `meta-agents/historical-redundancy-guard.ts`

**Persistence:** `meta_agent_recommendations`, `meta_agent_artifacts`

**Critical constraint:** Meta-Agents are **recommendation-only**. All recommendations require human review.

---

### Layer 5: Engineering Memory Architecture (Cross-Layer)

**Purpose:** Cross-layer knowledge infrastructure that captures, structures, indexes, and retrieves engineering experience over time.

**Status:** Full stack operational (Sprints 15–18). Foundation, retrieval surfaces, summaries, and memory-aware reasoning all active.

**Memory Types:** ExecutionMemory, ErrorMemory, StrategyMemory, DesignMemory, DecisionMemory, OutcomeMemory.

**Key modules:** `engineering-memory-retriever.ts`, `engineering-memory-service`, `memory-retrieval-surface`, `run-memory-summaries`, `memory-summary-scoring.ts`

**Persistence:** `engineering_memory_entries`, `memory_links`, `memory_retrieval_log`, `memory_summaries`

**Safety:** Memory never mutates system configuration or runtime behavior. Informational infrastructure only.

---

### Layer 6: Proposal Quality & Calibration Layer

**Purpose:** Measure proposal quality over time and produce structured calibration signals.

**Status:** ✅ Active (Sprints 19–20)

**Key modules:** `proposal-quality-scoring.ts`, `proposal-quality-feedback-service.ts`, `calibration/types.ts`, `calibration/scoring.ts`, `calibration/analysis-service.ts`, `advisory-calibration-engine/index.ts`

**Persistence:** `proposal_quality_feedback`, `proposal_quality_summaries`, `advisory_calibration_signals`, `advisory_calibration_summaries`

**Calibration Domains:** META_AGENT_PERFORMANCE, PROPOSAL_USEFULNESS, HISTORICAL_CONTEXT_VALUE, REDUNDANCY_GUARD_EFFECTIVENESS, NOVELTY_BALANCE, DECISION_FOLLOW_THROUGH

**Critical constraint:** Calibration signals are **advisory only**. They do not apply tuning automatically.

---

### Layer 7: Prompt Optimization + Bounded Promotion & Rollback Guard

**Purpose:** A/B testing of prompt variations with phased rollout, promotion rules, and rollback safety.

**Status:** ✅ Active (Sprints 21–22)

**Key modules:** `learning/prompt-variant-selector.ts`, `learning/prompt-variant-metrics.ts`, `learning/prompt-promotion-rules.ts`, `learning/prompt-rollout-engine.ts`, `learning/prompt-rollback-engine.ts`, `learning/prompt-health-guard.ts`, `learning/prompt-lineage-view.ts`, `prompt-optimization-engine/index.ts`

**Persistence:** `prompt_variants`, `prompt_variant_executions`, `prompt_variant_metrics`, `prompt_variant_promotions`, `prompt_rollout_windows`, `prompt_promotion_health_checks`, `prompt_rollback_events`

---

### Layer 8: Self-Improving Fix Agents v2

**Purpose:** Memory-aware, policy-driven repair strategy selection with bounded adjustments.

**Status:** ✅ Active (Sprint 23)

**Key modules:** `repair/repair-policy-engine.ts`, `repair/repair-policy-updater.ts`, `repair/repair-policy-explainer.ts`, `repair/repair-memory-retriever.ts`, `repair/retry-path-intelligence.ts`, `repair-policy-engine/index.ts`

**Persistence:** `repair_policy_profiles`, `repair_policy_decisions`, `repair_policy_adjustments`

---

### Layer 9: Agent Memory Operationalization

**Purpose:** Per-agent operational memory profiles and structured memory records.

**Status:** ✅ Active (Sprint 24)

**Key modules:** `agent-memory/agent-memory-retriever.ts`, `agent-memory/agent-memory-injector.ts`, `agent-memory/agent-memory-writer.ts`, `agent-memory/agent-memory-quality.ts`, `agent-memory-engine/index.ts`

**Persistence:** `agent_memory_profiles`, `agent_memory_records`

---

### Layer 10: Predictive Error Detection Operationalization

**Purpose:** Runtime failure risk scoring with bounded preventive actions.

**Status:** ✅ Active (Sprint 25)

**Key modules:** `predictive/predictive-risk-engine.ts`, `predictive/predictive-checkpoint-runner.ts`, `predictive/preventive-action-engine.ts`, `predictive/prediction-evidence-builder.ts`, `predictive/predictive-outcome-tracker.ts`, `predictive-error-runtime/index.ts`

**Persistence:** `predictive_risk_assessments`, `predictive_runtime_checkpoints`, `predictive_preventive_actions`

---

### Layer 11: Learning Agents v2 — Cross-Stage Policy Synthesis

**Purpose:** Cross-stage coordinated learning with policy synthesis spanning multiple stages.

**Status:** ✅ Active (Sprint 26)

**Key modules:** `cross-stage/cross-stage-policy-synthesizer.ts`, `cross-stage/cross-stage-policy-evaluator.ts`, `cross-stage/cross-stage-policy-runner.ts`, `cross-stage/cross-stage-policy-lineage.ts`, `cross-stage-learning-engine/index.ts`

**Persistence:** `cross_stage_learning_edges`, `cross_stage_policy_profiles`, `cross_stage_policy_outcomes`

---

### Layer 12: Execution Policy Intelligence

**Purpose:** Global execution policy selection based on context classification with bounded runtime adjustments.

**Status:** ✅ Active (Sprint 27)

**Key modules:** `execution-policy/execution-context-classifier.ts`, `execution-policy/execution-policy-selector.ts`, `execution-policy/execution-policy-adjuster.ts`, `execution-policy/execution-policy-runner.ts`, `execution-policy/execution-policy-feedback.ts`, `execution-policy-engine/index.ts`

**Persistence:** `execution_policy_profiles`, `execution_policy_outcomes`, `execution_policy_decisions`

---

### Layer 13: Execution Mode Portfolio Optimization

**Purpose:** Governed portfolio management of execution policies with lifecycle, ranking, and conflict detection.

**Status:** ✅ Active (Sprint 28)

**Key modules:** `execution-policy/execution-policy-portfolio-evaluator.ts`, `execution-policy/execution-policy-ranking-engine.ts`, `execution-policy/execution-policy-lifecycle-manager.ts`, `execution-policy/execution-policy-conflict-resolver.ts`, `execution-policy-portfolio-engine/index.ts`

**Persistence:** `execution_policy_portfolio_entries`, `execution_policy_portfolio_recommendations`

---

### Layer 14: Tenant/Workspace Adaptive Policy Tuning

**Purpose:** Specialize execution policies per organization and workspace while preserving central governance.

**Status:** ✅ Active (Sprint 29)

**Key modules:** `tenant-policy/tenant-policy-tuning-engine.ts`, `tenant-policy/tenant-policy-override-guard.ts`, `tenant-policy/tenant-aware-policy-selector.ts`, `tenant-policy/tenant-policy-drift-detector.ts`, `tenant-policy-engine/index.ts`

**Persistence:** `tenant_policy_preference_profiles`, `tenant_policy_outcomes`, `tenant_policy_recommendations`

---

### Layer 15: Platform Intelligence Entry

**Purpose:** System-level behavior observation, bottleneck detection, pattern analysis, and advisory recommendations.

**Status:** ✅ Active (Sprint 30)

**Key modules:** `platform-intelligence/platform-behavior-aggregator.ts`, `platform-intelligence/platform-bottleneck-detector.ts`, `platform-intelligence/platform-pattern-analyzer.ts`, `platform-intelligence/platform-insight-generator.ts`, `platform-intelligence/platform-recommendation-engine.ts`, `platform-intelligence/platform-health-model.ts`, `platform-intelligence-engine/index.ts`

**Persistence:** `platform_insights`, `platform_recommendations`

**Health Indices:** reliability_index, execution_stability_index, repair_burden_index, cost_efficiency_index, deploy_success_index, policy_effectiveness_index

---

### Layer 16: Platform Self-Calibration

**Purpose:** Bounded adjustment of operational thresholds and sensitivities based on platform intelligence signals.

**Status:** ✅ Active (Sprint 31)

**Key modules:** `platform-calibration/platform-calibration-signal-interpreter.ts`, `platform-calibration/platform-calibration-proposal-engine.ts`, `platform-calibration/platform-calibration-guardrails.ts`, `platform-calibration/platform-calibration-runner.ts`, `platform-calibration/platform-calibration-outcome-tracker.ts`, `platform-calibration/platform-calibration-rollback-engine.ts`, `platform-self-calibration/index.ts`

**Persistence:** `platform_calibration_parameters`, `platform_calibration_proposals`, `platform_calibration_applications`, `platform_calibration_rollbacks`

**Forbidden Families:** pipeline_topology, governance_rules, billing_logic, plan_enforcement, execution_contracts, hard_safety_constraints

**Max delta:** 0.2 per calibration. Advisory-first by default.

---

### Layer 17: Execution Strategy Evolution

**Purpose:** Bounded experimentation with strategy variants, comparing against baselines, with safe promotion or rollback.

**Status:** ✅ Active (Sprint 32)

**Key modules:** `execution-strategy/execution-strategy-signal-interpreter.ts`, `execution-strategy/execution-strategy-variant-synthesizer.ts`, `execution-strategy/execution-strategy-guardrails.ts`, `execution-strategy/execution-strategy-experiment-runner.ts`, `execution-strategy/execution-strategy-outcome-tracker.ts`, `execution-strategy/execution-strategy-promotion-rules.ts`, `execution-strategy/execution-strategy-rollback-engine.ts`, `execution-strategy/execution-strategy-lineage.ts`, `execution-strategy-evolution/index.ts`

**Persistence:** `execution_strategy_families`, `execution_strategy_variants`, `execution_strategy_experiments`, `execution_strategy_outcomes`

**Strategy Families:** repair_escalation_sequencing, retry_switching_heuristics, validation_intensity_ladders, predictive_checkpoint_ordering, review_escalation_timing, deploy_hardening_sequencing, context_enrichment_sequencing, strategy_fallback_ladders

**Max delta:** 0.25 per mutation. Advisory-first default.

---

## 3. Safety Architecture

### Structural Safety Rules

1. **Recommendations do not execute changes.** All recommendations require human review.
2. **Artifacts do not execute changes.** Engineering artifacts are documents for review.
3. **Memory is not a mutation engine.** Engineering Memory is informational infrastructure only.
4. **Calibration is advisory-first.** Calibration signals diagnose; humans decide.
5. **Strategy evolution is bounded.** Variants stay within declared mutation envelopes.
6. **Human review remains required for structural evolution.** Any pipeline/governance/billing change requires human action.
7. **Tenant isolation is absolute.** All data scoped by `organization_id` with RLS enforcement.
8. **Learning is bounded and reversible.** Weight adjustments have min/max constraints.
9. **Forbidden domains are immutable.** Pipeline topology, governance, billing, enforcement, execution contracts, and hard safety constraints cannot be calibrated or mutated by any automated system.

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
| **Execution** | ✅ Partial | Orchestrator + DAG operational. Advanced coordination/distributed runtime frozen |
| **Data** | ✅ Implemented | Artifact store, memory, observability operational |
| **Ecosystem** | ❄️ Frozen | Marketplace designed but not needed |

### Module Inventory

| # | Module | File | Plane | Version |
|---|--------|------|-------|---------|
| 1 | Runtime Protocol | `protocol.ts` | Core | v0.1 |
| 2 | Capability Model | `capabilities.ts` | Core | v0.2 |
| 3 | Core Types | `types.ts` | Core | v0.1 |
| 4 | Selection Engine | `selection.ts` | Control | v0.2 |
| 5 | Policy Engine | `policy-engine.ts` | Control | v0.2 |
| 6 | Governance Layer | `governance.ts` | Control | v1.1 |
| 7 | Adaptive Routing | `adaptive-routing.ts` | Control | v0.7 |
| 8 | Orchestrator | `orchestrator.ts` | Execution | v0.1 |
| 9 | Agent Registry | `registry.ts` | Execution | v0.1 |
| 10 | Event Bus | `event-bus.ts` | Execution | v0.1 |
| 11 | Multi-Agent Coordination | `coordination.ts` | Execution | v0.8 |
| 12 | Distributed Runtime | `distributed-runtime.ts` | Execution | v0.9 |
| 13 | LLM Adapter | `llm-adapter.ts` | Execution | v0.4 |
| 14 | Tool Adapter | `tool-adapter.ts` | Execution | v0.5 |
| 15 | Artifact Store | `artifact-store.ts` | Data | v0.1 |
| 16 | Memory System | `memory-system.ts` | Data | v0.6 |
| 17 | Observability | `observability.ts` | Data | v0.3 |
| 18 | Marketplace | `marketplace.ts` | Ecosystem | v1.0 |

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
+-- Prompt Optimization             (1 function -- Sprint 21-22)
+-- Repair Policy                   (1 function -- Sprint 23)
+-- Agent Memory                    (1 function -- Sprint 24)
+-- Predictive Error Detection      (2 functions -- Sprint 25)
+-- Cross-Stage Learning            (1 function -- Sprint 26)
+-- Execution Policy Intelligence   (1 function -- Sprint 27)
+-- Portfolio Optimization          (1 function -- Sprint 28)
+-- Tenant Adaptive Tuning          (1 function -- Sprint 29)
+-- Platform Intelligence           (1 function -- Sprint 30)
+-- Platform Self-Calibration       (1 function -- Sprint 31)
+-- Strategy Evolution              (1 function -- Sprint 32)
+-- Support                         (11 functions)
+-- _shared/                        (15+ helper modules)
    +-- agent-os/                   (14 Agent OS modules)
    +-- meta-agents/               (Meta-agent types, scoring, validation, memory, quality)
    +-- calibration/               (Calibration types, scoring, analysis service)
    +-- learning/                  (Prompt optimization, promotion, rollback)
    +-- repair/                    (Repair policies, strategies, memory, intelligence)
    +-- prevention/                (Prevention evaluator)
    +-- agent-memory/              (Agent memory retriever, injector, writer, quality)
    +-- predictive/                (Risk engine, checkpoint runner, preventive actions, outcome tracker)
    +-- cross-stage/               (Policy synthesizer, evaluator, runner, lineage)
    +-- execution-policy/          (Classifier, selector, adjuster, runner, feedback, portfolio, ranking, lifecycle, conflict)
    +-- tenant-policy/             (Tuning engine, override guard, selector, drift detector)
    +-- platform-intelligence/     (Behavior aggregator, bottleneck detector, pattern analyzer, insight generator, recommendation engine, health model)
    +-- platform-calibration/      (Signal interpreter, proposal engine, guardrails, runner, outcome tracker, rollback engine)
    +-- execution-strategy/        (Signal interpreter, variant synthesizer, guardrails, experiment runner, outcome tracker, promotion rules, rollback engine, lineage)
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
| 26 | Prompt Optimization Engine | 21 | A/B testing, variant selection, performance metrics |
| 27 | Bounded Promotion & Rollback Guard | 22 | Phased rollout, health monitoring, auto-rollback |
| 28 | Self-Improving Fix Agents v2 | 23 | Memory-aware repair policies, bounded adjustments, retry intelligence |
| 29 | Agent Memory Operationalization | 24 | Per-agent memory profiles, structured memory records, quality scoring |
| 30 | Predictive Error Detection | 25 | Runtime risk scoring, checkpoint evaluation, preventive actions |
| 31 | Cross-Stage Policy Synthesis (LA v2) | 26 | Learning graph, policy synthesis, spillover detection |
| 32 | Execution Policy Intelligence | 27 | Context classification, policy selection, bounded adjustments |
| 33 | Portfolio Optimization | 28 | Portfolio evaluation, ranking, lifecycle, conflict detection |
| 34 | Tenant Adaptive Tuning | 29 | Tenant preferences, override guards, drift detection |
| 35 | Platform Intelligence Entry | 30 | Behavior aggregation, bottleneck detection, health model |
| 36 | Platform Self-Calibration | 31 | Parameter registry, bounded proposals, guardrails, rollback |
| 37 | Execution Strategy Evolution | 32 | Strategy families, variant synthesis, experiment runner, promotion/rollback |

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
| NEXT | Semantic Retrieval via Embeddings | P1 |
| NEXT | Strategy Portfolio Governance | P1 |
| LATER | Autonomous Engineering Advisor | P2 |
| LATER | Platform Self-Stabilization | P2 |
| FUTURE | Discovery-Driven Architecture | P3 |

---

## 13. Database Schema (80+ tables)

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
- `meta_agent_recommendations` — Architectural recommendations
- `meta_agent_artifacts` — Engineering proposals

### Engineering Memory Tables (Sprints 15–17)
- `engineering_memory_entries` — Core memory storage with type taxonomy
- `memory_links` — Typed relationships between memory entries
- `memory_retrieval_log` — Retrieval tracking
- `memory_summaries` — Periodic historical synthesis

### Proposal Quality Tables (Sprint 19)
- `proposal_quality_feedback` — Quality and outcome tracking
- `proposal_quality_summaries` — Periodic quality summaries

### Advisory Calibration Tables (Sprint 20)
- `advisory_calibration_signals` — Structured diagnostic signals
- `advisory_calibration_summaries` — Periodic calibration summaries

### Prompt Optimization Tables (Sprints 21–22)
- `prompt_variants` — Prompt variant registry with A/B testing
- `prompt_variant_executions` — Execution telemetry per variant
- `prompt_variant_metrics` — Aggregated variant performance metrics
- `prompt_variant_promotions` — Promotion events with lineage
- `prompt_rollout_windows` — Phased rollout tracking
- `prompt_promotion_health_checks` — Post-promotion health monitoring
- `prompt_rollback_events` — Rollback events

### Repair Policy Tables (Sprint 23)
- `repair_policy_profiles` — Memory-aware repair strategy profiles
- `repair_policy_decisions` — Logged repair decisions
- `repair_policy_adjustments` — Bounded, reversible adjustments

### Agent Memory Tables (Sprint 24)
- `agent_memory_profiles` — Per-agent persistent memory profiles
- `agent_memory_records` — Reusable memory units

### Predictive Error Detection Tables (Sprint 25)
- `predictive_risk_assessments` — Runtime risk scoring
- `predictive_runtime_checkpoints` — Checkpoint evaluations
- `predictive_preventive_actions` — Preventive actions

### Cross-Stage Learning Tables (Sprint 26)
- `cross_stage_learning_edges` — Learning graph edges
- `cross_stage_policy_profiles` — Synthesized cross-stage policies
- `cross_stage_policy_outcomes` — Policy outcome tracking

### Execution Policy Intelligence Tables (Sprint 27)
- `execution_policy_profiles` — Bounded execution policy modes
- `execution_policy_outcomes` — Outcome tracking per policy
- `execution_policy_decisions` — Audit trail of policy decisions

### Execution Mode Portfolio Tables (Sprint 28)
- `execution_policy_portfolio_entries` — Portfolio entries with scores
- `execution_policy_portfolio_recommendations` — Portfolio recommendations

### Tenant Adaptive Policy Tuning Tables (Sprint 29)
- `tenant_policy_preference_profiles` — Org/workspace preferences
- `tenant_policy_outcomes` — Tenant-specific outcomes
- `tenant_policy_recommendations` — Tenant recommendations

### Platform Intelligence Tables (Sprint 30)
- `platform_insights` — Platform-level insights
- `platform_recommendations` — Prioritized advisory recommendations

### Platform Self-Calibration Tables (Sprint 31)
- `platform_calibration_parameters` — Calibratable parameter registry
- `platform_calibration_proposals` — Calibration proposals
- `platform_calibration_applications` — Applied calibrations
- `platform_calibration_rollbacks` — Rollback records

### Execution Strategy Evolution Tables (Sprint 32)
- `execution_strategy_families` — Strategy family registry
- `execution_strategy_variants` — Bounded variant proposals
- `execution_strategy_experiments` — Controlled experiments
- `execution_strategy_outcomes` — Experiment outcome tracking

---

## 14. Governing Principle

> The Agent OS is a contract-driven, plane-separated architecture where decisions flow down from Control, execution flows through Execution, state flows into Data, identity is defined in Core, and discovery extends through Ecosystem. No plane may assume the responsibilities of another. Learning is additive, auditable, and bounded — it cannot mutate the kernel directly. Engineering Memory is informational infrastructure — it informs but never commands. Memory-aware reasoning enriches analysis with historical context but preserves human authority over all structural decisions. Calibration signals diagnose where tuning should happen, but humans decide when and how tuning is applied. Repair policies are memory-aware and self-improving, but bounded to strategy selection only. Agent memory profiles persist per-agent operational context but remain non-invasive — they inform reasoning without dictating execution. Predictive error detection scores runtime risk and recommends bounded preventive actions, but cannot force pipeline changes or bypass governance. Cross-stage policy synthesis extends learning beyond local optimization, synthesizing bounded policies across stage boundaries while preserving kernel safety and auditability. Execution policy intelligence selects global operating modes based on context classification, applying bounded adjustments at safe runtime boundaries without mutating kernel structure. Execution mode portfolio optimization governs the set of available policies as a managed portfolio, ranking, evaluating lifecycle status, detecting conflicts, and generating recommendations — all auditable, reversible, and organization-isolated. Tenant adaptive policy tuning specializes global policy behavior per organization and workspace while preserving central governance, override guards, drift detection, and safe fallback to global defaults. Platform Intelligence observes system-level behavior across all layers, detecting structural bottlenecks and cross-platform patterns, generating advisory insights and prioritized recommendations without mutating kernel architecture. Platform Self-Calibration tunes operational thresholds within safe envelopes based on platform intelligence signals, with guardrails, rollback, and advisory-first governance preserving kernel integrity. Execution Strategy Evolution enables bounded experimentation with strategy variants, comparing them against baselines under governed conditions, and supporting safe promotion or rollback based on real outcome evidence.
