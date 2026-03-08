# AxionOS — Implementation Plan

> Sprint-by-sprint implementation record mapping capabilities to architectural layers.
>
> **Last updated:** 2026-03-08
> **Current Sprint:** 38 (Architecture Change Simulation & Governance) — ✅ Complete

---

## Implementation Phases

### Phase 1: Foundation (Sprints 1–10)

**Goal:** Build the deterministic execution kernel with self-healing, governance, and observability.

| Sprint | Capability | Architectural Layer |
|--------|-----------|-------------------|
| 1 | Initiative Brief Formalization | Execution Kernel |
| 2 | Initiative Simulation Engine | Execution Kernel |
| 3 | Deploy Contract Completion | Execution Kernel |
| 4 | Product-Level Observability | Execution Kernel (Observability) |
| 5 | Onboarding & Product Packaging | Execution Kernel |
| 6 | Evidence-Oriented Repair Loop | Execution Kernel (Repair) |
| 7 | Error Pattern Library & Learning Foundation | Execution Kernel (Prevention) |
| 8 | Preventive Engineering Layer | Execution Kernel (Prevention) |
| 9 | Adaptive Repair Routing | Execution Kernel (Routing) |
| 10 | Learning Agents Foundation | Execution Kernel (Learning Substrate) |

**Delivered:** 32-stage pipeline, DAG orchestration, CI-based validation, self-healing builds, prevention rules, adaptive routing, governance gates, SLA enforcement, audit logging.

---

### Phase 2: Operational Intelligence (Sprints 11–12)

**Goal:** Add commercial readiness and first-generation learning agents.

| Sprint | Capability | Architectural Layer |
|--------|-----------|-------------------|
| 11 | Commercial Readiness / Billing / Workspace Packaging | Commercial Readiness Layer |
| 12 | Learning Agents v1 (5 engines + dashboard) | Learning Agents Layer |

**Delivered:** Product plans, billing accounts, usage enforcement, prompt outcome analysis, strategy performance tracking, predictive error detection, repair weight adjustment, learning recommendations.

---

### Phase 3: Meta-Intelligence & Memory (Sprints 13–20)

**Goal:** Build meta-level reasoning, engineering memory, quality feedback, and advisory calibration.

| Sprint | Capability | Architectural Layer |
|--------|-----------|-------------------|
| 13 | Meta-Agents v1 (4 types) | Meta-Agent Coordination Layer |
| 14 | Controlled Meta-Agent Actions (proposal generation) | Proposal Generation Layer |
| 15 | Engineering Memory Foundation | Engineering Memory Architecture |
| 16 | Memory Retrieval Surfaces | Engineering Memory Architecture |
| 17 | Memory Summaries | Engineering Memory Architecture |
| 18 | Memory-Aware Meta-Agents | Meta-Agent + Memory (cross-layer) |
| 19 | Proposal Quality Feedback Loop | Proposal Quality & Calibration Layer |
| 20 | Advisory Calibration Layer | Proposal Quality & Calibration Layer |

**Delivered:** 4 memory-aware meta-agents, engineering memory full stack, structured proposal generation, quality scoring, advisory calibration signals across 6 domains.

---

### Phase 4: Learning & Repair Intelligence (Sprints 21–26)

**Goal:** Close the optimization loop with prompt A/B testing, repair policy intelligence, agent memory, predictive detection, and cross-stage learning.

| Sprint | Capability | Architectural Layer |
|--------|-----------|-------------------|
| 21 | Prompt Optimization Engine (A/B testing) | Prompt Optimization Layer |
| 22 | Bounded Promotion & Rollback Guard | Prompt Optimization Layer |
| 23 | Self-Improving Fix Agents v2 (Repair Policies) | Repair Intelligence Layer |
| 24 | Agent Memory Layer Operationalization | Agent Memory Layer |
| 25 | Predictive Error Detection Operationalization | Predictive Detection Layer |
| 26 | Learning Agents v2 (Cross-Stage Policy Synthesis) | Cross-Stage Learning Layer |

**Delivered:** Prompt A/B testing, phased rollout, auto-rollback, memory-aware repair policies, per-agent memory, runtime risk scoring, preventive actions, cross-stage policy synthesis with spillover detection.

---

### Phase 5: Execution Governance (Sprints 27–29)

**Goal:** Add global execution policy intelligence with portfolio optimization and tenant adaptation.

| Sprint | Capability | Architectural Layer |
|--------|-----------|-------------------|
| 27 | Execution Policy Intelligence | Execution Governance Layer |
| 28 | Execution Mode Portfolio Optimization | Execution Governance Layer |
| 29 | Workspace / Tenant Adaptive Policy Tuning | Execution Governance Layer |

**Delivered:** Context classification, policy selection, bounded adjustments, portfolio ranking, lifecycle management, conflict detection, tenant preference profiles, override guards, drift detection.

---

### Phase 6: Platform Intelligence & Calibration (Sprints 30–31)

**Goal:** System-level observability, health modeling, and bounded threshold calibration.

| Sprint | Capability | Architectural Layer |
|--------|-----------|-------------------|
| 30 | Platform Intelligence Entry | Platform Intelligence Layer |
| 31 | Platform Self-Calibration | Platform Calibration Layer |

**Delivered:** Behavior aggregation, bottleneck detection, pattern analysis, insight generation, recommendation engine, health model (6 indices), calibration parameter registry, bounded proposals, guardrails, rollback engine.

---

### Phase 7: Strategy Evolution & Governance (Sprints 32–33)

**Goal:** Bounded strategy variant experimentation with controlled rollout, safe promotion/rollback, and portfolio-level governance.

| Sprint | Capability | Architectural Layer |
|--------|-----------|-------------------|
| 32 | Execution Strategy Evolution | Strategy Evolution Layer |
| 33 | Strategy Portfolio Governance | Strategy Portfolio Governance Layer |

**Delivered:** Strategy family registry, signal interpretation, variant synthesis, mutation guardrails, experiment runner, outcome tracking, promotion rules, rollback engine, lineage/explainability, portfolio evaluation, ranking, lifecycle management, conflict detection.

---

### Phase 8: Platform Stabilization & Advisory Intelligence (Sprints 34–37)

**Goal:** Self-stabilization, autonomous engineering advisory, unified semantic retrieval, and discovery-driven architecture signals across all intelligence layers.

| Sprint | Capability | Architectural Layer |
|--------|-----------|-------------------|
| 34 | Platform Self-Stabilization | Platform Stabilization Layer |
| 35 | Autonomous Engineering Advisor | Engineering Advisory Layer |
| 36 | Semantic Retrieval & Embedding Memory Expansion | Semantic Retrieval Layer |
| 37 | Discovery-Driven Architecture Signals | Discovery Architecture Layer |
| 38 | Architecture Change Simulation & Governance | Architecture Simulation Layer |

**Delivered:** Stability monitoring, stabilization actions, bounded interventions, rollback-safe stabilization, engineering signal aggregation, opportunity synthesis, prioritized recommendations, explainability, review workflows, advisory clustering, unified embedding-backed retrieval, domain registry, index management, ranking, guardrails, retrieval quality evaluation, discovery signal aggregation, architecture stress mapping, architecture opportunity synthesis, discovery-driven recommendations, architecture change proposals, simulation scope profiles, impact simulation, boundary analysis, guardrails, simulation outcomes, review workflows.

---

## Capability Verification Matrix

| Capability | Status | Sprint | Key Modules |
|-----------|--------|--------|-------------|
| Deterministic execution pipeline | ✅ IMPLEMENTED | 1-10 | `pipeline-bootstrap.ts`, `dependency-scheduler.ts`, 50+ edge functions |
| Artifact governance | ✅ IMPLEMENTED | 1-10 | `pipeline-helpers.ts`, `agent_outputs` table |
| Validation and publishing pipeline | ✅ IMPLEMENTED | 1-10 | `pipeline-validation`, `pipeline-publish`, `pipeline-runtime-validation` |
| Observability primitives | ✅ IMPLEMENTED | 4 | `observability-engine`, `initiative-observability-engine` |
| Error pattern library | ✅ IMPLEMENTED | 7 | `error-pattern-library-engine`, `error_patterns` table |
| Repair strategy tracking | ✅ IMPLEMENTED | 6, 12 | `repair-routing-engine`, `strategy-performance-engine` |
| Adaptive repair routing | ✅ IMPLEMENTED | 9 | `repair-routing-engine`, `repair_routing_log` |
| Prevention rule candidates | ✅ IMPLEMENTED | 8 | `prevention-rule-engine`, `prevention_rule_candidates` |
| Observability expansion | ✅ IMPLEMENTED | 4, 24 | `observability-engine`, Observability UI |
| Prompt optimization engine | ✅ IMPLEMENTED | 21 | `prompt-optimization-engine`, `learning/prompt-*.ts` |
| Bounded promotion and rollback guard | ✅ IMPLEMENTED | 22 | `learning/prompt-promotion-rules.ts`, `learning/prompt-rollback-engine.ts` |
| Self-improving fix agents | ✅ IMPLEMENTED | 23 | `repair/repair-policy-engine.ts`, `repair-policy-engine` |
| Agent memory operationalization | ✅ IMPLEMENTED | 24 | `agent-memory/agent-memory-*.ts`, `agent-memory-engine` |
| Predictive error detection | ✅ IMPLEMENTED | 25 | `predictive/predictive-*.ts`, `predictive-error-runtime` |
| Learning agents v2 (cross-stage) | ✅ IMPLEMENTED | 26 | `cross-stage/cross-stage-policy-*.ts`, `cross-stage-learning-engine` |
| Execution policy intelligence | ✅ IMPLEMENTED | 27 | `execution-policy/execution-*.ts`, `execution-policy-engine` |
| Policy portfolio optimization | ✅ IMPLEMENTED | 28 | `execution-policy/execution-policy-portfolio-*.ts`, `execution-policy-portfolio-engine` |
| Tenant/workspace adaptive tuning | ✅ IMPLEMENTED | 29 | `tenant-policy/tenant-*.ts`, `tenant-policy-engine` |
| Platform behavior aggregation | ✅ IMPLEMENTED | 30 | `platform-intelligence/platform-behavior-aggregator.ts` |
| System bottleneck detection | ✅ IMPLEMENTED | 30 | `platform-intelligence/platform-bottleneck-detector.ts` |
| Pattern analysis | ✅ IMPLEMENTED | 30 | `platform-intelligence/platform-pattern-analyzer.ts` |
| Platform insights | ✅ IMPLEMENTED | 30 | `platform-intelligence/platform-insight-generator.ts` |
| Recommendation engine | ✅ IMPLEMENTED | 30 | `platform-intelligence/platform-recommendation-engine.ts` |
| Platform health model | ✅ IMPLEMENTED | 30 | `platform-intelligence/platform-health-model.ts` |
| Calibration parameter registry | ✅ IMPLEMENTED | 31 | `platform_calibration_parameters` table |
| Calibration proposals | ✅ IMPLEMENTED | 31 | `platform-calibration/platform-calibration-proposal-engine.ts` |
| Calibration guardrails | ✅ IMPLEMENTED | 31 | `platform-calibration/platform-calibration-guardrails.ts` |
| Calibration runner | ✅ IMPLEMENTED | 31 | `platform-calibration/platform-calibration-runner.ts` |
| Calibration outcome tracking | ✅ IMPLEMENTED | 31 | `platform-calibration/platform-calibration-outcome-tracker.ts` |
| Calibration rollback engine | ✅ IMPLEMENTED | 31 | `platform-calibration/platform-calibration-rollback-engine.ts` |
| Strategy family registry | ✅ IMPLEMENTED | 32 | `execution_strategy_families` table |
| Strategy signal interpreter | ✅ IMPLEMENTED | 32 | `execution-strategy/execution-strategy-signal-interpreter.ts` |
| Strategy variant synthesizer | ✅ IMPLEMENTED | 32 | `execution-strategy/execution-strategy-variant-synthesizer.ts` |
| Strategy experiment runner | ✅ IMPLEMENTED | 32 | `execution-strategy/execution-strategy-experiment-runner.ts` |
| Strategy outcome tracking | ✅ IMPLEMENTED | 32 | `execution-strategy/execution-strategy-outcome-tracker.ts` |
| Strategy promotion / rollback rules | ✅ IMPLEMENTED | 32 | `execution-strategy/execution-strategy-promotion-rules.ts`, `execution-strategy-rollback-engine.ts` |
| Strategy portfolio governance | ✅ IMPLEMENTED | 33 | `strategy-portfolio/strategy-portfolio-*.ts`, `strategy-portfolio-engine` |
| Platform self-stabilization | ✅ IMPLEMENTED | 34 | `platform-stabilization/platform-stabilization-*.ts`, `platform-stabilization-engine` |
| Autonomous engineering advisor | ✅ IMPLEMENTED | 35 | `engineering-advisor/engineering-advisory-*.ts`, `engineering-advisor` |
| Semantic retrieval via embeddings | ✅ IMPLEMENTED | 36 | `semantic-retrieval/semantic-retrieval-*.ts`, `semantic-retrieval` |
| Discovery signal aggregation | ✅ IMPLEMENTED | 37 | `discovery-architecture/discovery-signal-aggregator.ts` |
| Architecture opportunity synthesis | ✅ IMPLEMENTED | 37 | `discovery-architecture/discovery-architecture-opportunity-synthesizer.ts` |
| Discovery architecture recommendations | ✅ IMPLEMENTED | 37 | `discovery-architecture/discovery-architecture-recommendation-engine.ts` |
| Architecture stress map | ✅ IMPLEMENTED | 37 | `discovery-architecture/architecture-stress-map.ts` |

---

## Shared Module Registry

| Directory | Module Count | Purpose |
|-----------|-------------|---------|
| `_shared/agent-os/` | 14+ | Agent OS core modules (types, protocol, capabilities, governance, orchestrator, etc.) |
| `_shared/meta-agents/` | 14 | Meta-agent types, scoring, validation, memory context, quality feedback |
| `_shared/calibration/` | 3 | Advisory calibration types, scoring, analysis |
| `_shared/learning/` | 7 | Prompt optimization, promotion, rollback, health guard, lineage |
| `_shared/repair/` | 8 | Repair policies, strategies, memory, intelligence, retry path |
| `_shared/prevention/` | 1 | Prevention evaluator |
| `_shared/agent-memory/` | 4 | Agent memory retriever, injector, writer, quality |
| `_shared/predictive/` | 5 | Risk engine, checkpoint runner, preventive actions, evidence, outcome tracker |
| `_shared/cross-stage/` | 4 | Policy synthesizer, evaluator, runner, lineage |
| `_shared/execution-policy/` | 9 | Classifier, selector, adjuster, runner, feedback, portfolio, ranking, lifecycle, conflict |
| `_shared/tenant-policy/` | 4 | Tuning engine, override guard, selector, drift detector |
| `_shared/platform-intelligence/` | 6 | Behavior aggregator, bottleneck detector, pattern analyzer, insight generator, recommendation engine, health model |
| `_shared/platform-calibration/` | 6 | Signal interpreter, proposal engine, guardrails, runner, outcome tracker, rollback engine |
| `_shared/execution-strategy/` | 8 | Signal interpreter, variant synthesizer, guardrails, experiment runner, outcome tracker, promotion rules, rollback engine, lineage |
| `_shared/strategy-portfolio/` | 5 | Portfolio evaluator, ranking, lifecycle manager, conflict resolver, lineage |
| `_shared/platform-stabilization/` | 6 | Stability monitor, stabilization engine, action engine, guardrails, outcome tracker, rollback engine |
| `_shared/engineering-advisor/` | 8 | Signal aggregator, opportunity synthesizer, recommendation engine, prioritizer, explainer, review manager, lineage, clustering |
| `_shared/semantic-retrieval/` | 8 | Retrieval engine, ranker, guardrails, quality evaluator, index manager, context builders (runtime, advisory, strategy, platform) |

---

## Edge Function Registry

| Category | Functions | Sprints |
|----------|----------|---------|
| Discovery & Architecture | 5 | 1-10 |
| Infrastructure & Modeling | 8 | 1-10 |
| Code Generation | 3 | 1-10 |
| Validation & Publish | 6 | 1-10 |
| Growth & Evolution | 9 | 1-10 |
| Pipeline Control | 7 | 1-10 |
| Commercial Readiness | 2 | 11 |
| Learning Agents | 6 | 12 |
| Meta-Agents + Proposals | 3 | 13-14, 18 |
| Engineering Memory | 2 | 15, 17 |
| Proposal Quality | 1 | 19 |
| Advisory Calibration | 1 | 20 |
| Prompt Optimization | 1 | 21-22 |
| Repair Policy | 1 | 23 |
| Agent Memory | 1 | 24 |
| Predictive Error Detection | 2 | 25 |
| Cross-Stage Learning | 1 | 26 |
| Execution Policy Intelligence | 1 | 27 |
| Portfolio Optimization | 1 | 28 |
| Tenant Adaptive Tuning | 1 | 29 |
| Platform Intelligence | 1 | 30 |
| Platform Self-Calibration | 1 | 31 |
| Strategy Evolution | 1 | 32 |
| Strategy Portfolio Governance | 1 | 33 |
| Platform Self-Stabilization | 1 | 34 |
| Autonomous Engineering Advisor | 1 | 35 |
| Semantic Retrieval | 1 | 36 |
| Support | 11 | Various |
| **Total** | **~81** | |
