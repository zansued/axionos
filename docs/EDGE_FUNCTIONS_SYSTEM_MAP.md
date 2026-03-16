# AxionOS — Edge Functions System Map

> **Purpose:** Complete catalog of ALL edge functions in the repository, organized by domain.  
> **This is the system-wide index.** For detailed pipeline stage mapping, see [`INITIATIVE_DELIVERY_PIPELINE_MAP.md`](./INITIATIVE_DELIVERY_PIPELINE_MAP.md).  
> **Last Updated:** 2026-03-16

---

## Domain 1 — Initiative Delivery Pipeline

> Fully documented in [`INITIATIVE_DELIVERY_PIPELINE_MAP.md`](./INITIATIVE_DELIVERY_PIPELINE_MAP.md).

| Function | Domain Role |
|----------|-------------|
| `pipeline-discovery` | Problem comprehension — idea refinement |
| `pipeline-comprehension` | Deep multi-agent comprehension |
| `pipeline-squad` | AI squad formation |
| `pipeline-architecture-simulation` | Architecture model validation |
| `pipeline-planning` | Story/subtask generation |
| `pipeline-foundation-scaffold` | Buildable project scaffold |
| `pipeline-module-graph-simulation` | Module resolution simulation |
| `pipeline-dependency-intelligence` | npm dependency validation |
| `pipeline-execution-orchestrator` | DAG-based parallel code generation |
| `pipeline-execution-worker` | Individual file generation worker |
| `pipeline-execution` | Sequential execution fallback |
| `pipeline-validation` | Static/runtime validation + fix loop |
| `pipeline-deep-validation` | Deep static analysis |
| `pipeline-preventive-validation` | Preventive architecture validation |
| `pipeline-full-review` | Final holistic review |
| `pipeline-runtime-validation` | Real tsc/vite build via GitHub Actions |
| `pipeline-ci-webhook` | GitHub Actions results ingestion |
| `pipeline-fix-orchestrator` | CI-triggered fix swarm |
| `pipeline-publish` | GitHub push + post-deploy verification |
| `pipeline-approve` | Stage advancement gate |
| `pipeline-reject` | Stage rollback gate |
| `pipeline-fast-modify` | Quick single-file modification |
| `pipeline-drift-detection` | Architectural drift detection |
| `pipeline-architecture` | Architecture stage helper |
| `run-initiative-pipeline` | **Legacy** monolith — deprecation candidate |

---

## Domain 2 — Governed Action & Execution Stack

| Function | Domain Role |
|----------|-------------|
| `action-engine` | Formalizes AI actions into `action_registry_entries` |
| `approval-expiration` | Cron: expires stale approval requests, propagates to registry |
| `axion-execution-worker` | Executes governed+approved actions with full audit |
| `decision-engine` | Decision evaluation and routing |
| `execution-policy-engine` | Execution policy selection and evaluation |
| `execution-policy-portfolio-engine` | Policy portfolio optimization |
| `execution-strategy-evolution` | Strategy evolution for execution policies |
| `execution-harness-run` | Execution harness runtime |

---

## Domain 3 — Canon / Knowledge

| Function | Domain Role |
|----------|-------------|
| `canon-ingestion-agent` | Ingests new knowledge into canon |
| `canon-retrieval` | Retrieves canon entries for context |
| `canon-review-engine` | Reviews canon entries for quality |
| `canon-candidate-review-engine` | Reviews canon candidates |
| `canon-promotion-pipeline` | Promotes validated canon entries |
| `canon-evolution-engine` | Evolves canon based on learning signals |
| `canon-evolution-control` | Controls canon evolution boundaries |
| `canon-evolution-from-learning` | Canon evolution triggered by learning feedback |
| `canon-governance` | Canon governance rules |
| `canon-integrity-drift-governance-engine` | Canon integrity and drift detection |
| `canon-learning` | Canon learning integration |
| `canon-poisoning-prevention` | Prevents canon poisoning attacks |
| `canon-reuse-engine` | Canon reuse optimization |
| `canon-runtime` | Canon runtime operations |
| `canon-scheduled-pipeline` | Scheduled canon processing |
| `canon-stewardship` | Canon stewardship and lifecycle |
| `canon-intake` | Canon intake processing |

---

## Domain 4 — Learning & Calibration

| Function | Domain Role |
|----------|-------------|
| `adaptive-learning-engine` | Adaptive learning from execution outcomes |
| `learning-foundation-engine` | Learning foundation operations |
| `learning-extraction-engine` | Extracts learnings from execution data |
| `learning-feedback-loop` | Processes learning feedback signals |
| `learning-recommendation-engine` | Learning-based recommendations |
| `learning-dashboard` | Learning metrics and insights |
| `cross-stage-learning-engine` | Cross-stage learning transfer |
| `purple-learning` | Purple team learning integration |
| `advisory-calibration-engine` | Advisory calibration signals |
| `platform-self-calibration` | Platform-level self-calibration |
| `readiness-tuning-hooks` | Readiness tuning from outcomes |
| `policy-tuning-hooks` | Policy tuning from outcomes |
| `agent-selection-tuning-hooks` | Agent selection tuning |
| `prompt-optimization-engine` | Prompt optimization from outcomes |
| `prompt-outcome-analyzer` | Analyzes prompt→outcome correlation |

---

## Domain 5 — Governance & Policy

| Function | Domain Role |
|----------|-------------|
| `capability-governance` | Capability governance rules |
| `capability-registry` | Capability registration and discovery |
| `capability-registry-governance-engine` | Governance over capability registry |
| `capability-exposure-governance-engine` | Controls capability exposure |
| `change-advisory-orchestrator` | Change advisory board orchestration |
| `benchmark-governance` | Benchmark governance rules |
| `strategy-portfolio-governance` | Strategic portfolio governance |
| `convergence-governance-engine` | Platform convergence governance |
| `evolution-proposal-governance` | Evolution proposal review |
| `dependency-sovereignty-governance` | Dependency sovereignty rules |
| `multi-party-policy-revenue-governance-engine` | Multi-party policy governance |
| `resilience-continuity-governance` | Resilience and continuity governance |
| `architecture-portfolio-governance` | Architecture portfolio governance |

---

## Domain 6 — Architecture Evolution & Research

| Function | Domain Role |
|----------|-------------|
| `architecture-evolution-engine` | Architecture evolution proposals |
| `architecture-fitness` | Architecture fitness function evaluation |
| `architecture-hypotheses` | Architecture hypothesis testing |
| `architecture-promotion` | Architecture promotion decisions |
| `architecture-change-planning` | Architecture change planning |
| `architecture-migration-execution` | Architecture migration execution |
| `architecture-rollout-pilot` | Pilot rollout for architecture changes |
| `architecture-rollout-sandbox` | Sandbox for architecture experiments |
| `architecture-simulation` | Architecture simulation (non-pipeline) |
| `architecture-subjob-retry` | Architecture subjob retry logic |
| `architectural-mutation-control` | Prevents unauthorized architectural mutations |
| `research-sandbox` | Research sandbox for experiments |
| `research-patterns` | Research pattern analysis |
| `discovery-architecture` | Architecture discovery |
| `tenant-architecture-modes` | Tenant-specific architecture modes |

---

## Domain 7 — Agent Coordination & Routing

| Function | Domain Role |
|----------|-------------|
| `agent-routing` | Agent routing decisions |
| `agent-debate` | Multi-agent debate sessions |
| `agent-memory-engine` | Agent memory operations |
| `aios-agent-scheduler` | AIOS agent scheduler (round robin) |
| `generate-agents` | Agent generation |
| `swarm-execution` | Swarm execution coordination |
| `working-memory` | Agent working memory |
| `adaptive-resource-router` | Adaptive resource routing |
| `attention-allocation-engine` | Attention allocation across agents |
| `run-meta-agent-analysis` | Meta-agent analysis |

---

## Domain 8 — Error Intelligence & Repair

| Function | Domain Role |
|----------|-------------|
| `error-intelligence` | Error pattern detection and analysis |
| `error-pattern-library-engine` | Error pattern library |
| `predictive-error-engine` | Predictive error analysis |
| `predictive-error-runtime` | Runtime predictive error detection |
| `prevention-rule-engine` | Prevention rule management |
| `autonomous-build-repair` | Autonomous build repair |
| `build-self-healing` | Build self-healing |
| `repair-intelligence-archive` | Repair intelligence archive |
| `repair-learning-engine` | Learns from repair outcomes |
| `repair-policy-engine` | Repair policy evaluation |
| `repair-routing-engine` | Repair routing decisions |

---

## Domain 9 — Delivery Outcomes & Tuning

| Function | Domain Role |
|----------|-------------|
| `delivery-outcomes` | Delivery outcome tracking |
| `delivery-tuning` | Delivery parameter tuning |
| `outcome-assurance` | Outcome assurance checks |
| `outcome-based-autonomy` | Autonomy level based on outcomes |
| `post-deploy-feedback` | Post-deploy feedback collection |
| `initiative-deploy-engine` | Initiative deployment engine |
| `one-click-delivery-deploy-assurance-engine` | One-click deploy assurance |

---

## Domain 10 — Product Intelligence & Analytics

| Function | Domain Role |
|----------|-------------|
| `product-analytics-engine` | Product analytics |
| `product-dashboard` | Product dashboard data |
| `product-evolution-engine` | Product evolution tracking |
| `product-intelligence-entry-engine` | Product intelligence entry |
| `product-intelligence-operations-engine` | Product intelligence operations |
| `product-validation-engine` | Product validation |
| `product-opportunity-portfolio-governance-engine` | Product opportunity governance |
| `market-signal-analyzer` | Market signal analysis |
| `user-behavior-analyzer` | User behavior analysis |

---

## Domain 11 — Adoption & Customer Success

| Function | Domain Role |
|----------|-------------|
| `adoption-intelligence-customer-success-engine` | Adoption intelligence |
| `user-journey-orchestration-engine` | User journey orchestration |
| `role-based-experience-engine` | Role-based UX adaptation |
| `onboarding-templates-vertical-starters-engine` | Onboarding templates |
| `growth-optimization-engine` | Growth optimization |

---

## Domain 12 — Platform Operations & Observability

| Function | Domain Role |
|----------|-------------|
| `observability-engine` | Platform observability |
| `observability-bootstrap` | Observability setup |
| `initiative-observability-engine` | Initiative-level observability |
| `system-health-engine` | System health monitoring |
| `platform-intelligence-engine` | Platform intelligence |
| `platform-convergence-engine` | Platform convergence |
| `platform-stabilization-v2` | Platform stabilization |
| `platform-self-stabilization` | Self-stabilization |
| `operational-cycle-engine` | Operational cycle management |
| `operational-posture-engine` | Operational posture |
| `operating-profiles-engine` | Operating profiles |
| `operating-completion-engine` | Operating completion tracking |
| `organism-console` | Organism console |
| `organism-memory-engine` | Organism memory |
| `nervous-system-engine` | Nervous system engine |
| `neural-feedback-loop` | Neural feedback loop |
| `runtime-feedback-mesh` | Runtime feedback mesh |
| `multi-loop-orchestrator` | Multi-loop orchestration |
| `frontend-errors` | Frontend error collection |

---

## Domain 13 — Security & Trust

| Function | Domain Role |
|----------|-------------|
| `security-intelligence` | Security intelligence |
| `security-monitoring-engine` | Security monitoring |
| `red-team-simulation` | Red team simulation |
| `blue-team-defense` | Blue team defense |
| `kernel-integrity-guard` | Kernel integrity guard |
| `repo-trust-score-engine` | Repository trust scoring |
| `external-trust-admission-engine` | External trust admission |
| `mission-integrity-drift-prevention` | Mission integrity drift prevention |

---

## Domain 14 — Ecosystem & Marketplace

| Function | Domain Role |
|----------|-------------|
| `pilot-marketplace` | Pilot marketplace |
| `limited-marketplace-pilot-engine` | Limited marketplace pilot |
| `marketplace-outcomes` | Marketplace outcome tracking |
| `ecosystem-drift-intelligence` | Ecosystem drift detection |
| `ecosystem-simulation-sandbox-engine` | Ecosystem simulation sandbox |
| `controlled-ecosystem-readiness-engine` | Ecosystem readiness |
| `extension-management` | Extension management |
| `sovereign-capabilities-engine` | Sovereign capabilities |

---

## Domain 15 — Knowledge & Memory

| Function | Domain Role |
|----------|-------------|
| `knowledge-acquisition-orchestrator` | Knowledge acquisition orchestration |
| `knowledge-acquisition-planner` | Knowledge acquisition planning |
| `knowledge-acquisition-roi-engine` | Knowledge acquisition ROI |
| `knowledge-demand-forecast` | Knowledge demand forecasting |
| `knowledge-lineage-engine` | Knowledge lineage tracking |
| `knowledge-portfolio-engine` | Knowledge portfolio management |
| `knowledge-renewal-engine` | Knowledge renewal |
| `institutional-memory` | Institutional memory |
| `institutional-memory-constitution` | Institutional memory constitution |
| `institutional-conflict-resolution-engine` | Institutional conflict resolution |
| `institutional-convergence-memory-engine` | Convergence memory |
| `institutional-outcome-assurance-engine` | Institutional outcome assurance |
| `institutional-tradeoff-arbitration-system` | Tradeoff arbitration |
| `engineering-memory-service` | Engineering memory service |
| `memory-retrieval-surface` | Memory retrieval surface |
| `run-memory-summaries` | Memory summary generation |
| `semantic-retrieval` | Semantic search retrieval |
| `generate-embeddings` | Embedding generation |

---

## Domain 16 — Strategic & Economic

| Function | Domain Role |
|----------|-------------|
| `revenue-strategy-engine` | Revenue strategy |
| `economic-optimization-engine` | Economic optimization |
| `strategy-performance-engine` | Strategy performance |
| `compounding-advantage-engine` | Compounding advantage tracking |
| `multi-horizon-strategic-alignment-engine` | Multi-horizon strategic alignment |
| `startup-portfolio-manager` | Startup portfolio management |
| `opportunity-discovery-engine` | Opportunity discovery |
| `sovereign-decision-rights-orchestration` | Sovereign decision rights |

---

## Domain 17 — Code Generation & Utilities

| Function | Domain Role |
|----------|-------------|
| `autonomous-api-generator` | Autonomous API generation |
| `autonomous-ui-generator` | Autonomous UI generation |
| `autonomous-ops` | Autonomous operations |
| `ai-business-logic-synthesizer` | Business logic synthesis |
| `ai-domain-model-analyzer` | Domain model analysis |
| `supabase-data-model-generator` | Supabase data model generation |
| `supabase-provisioning-engine` | Supabase provisioning |
| `supabase-schema-bootstrap` | Schema bootstrapping |
| `deep-repo-absorber-engine` | Deep repo absorption |
| `source-discovery-agent` | Source code discovery |
| `project-bootstrap-intelligence` | Project bootstrap intelligence |
| `generate-avatar` | Avatar generation |
| `generate-initiative-blueprint` | Initiative blueprint generation |
| `generate-planning-content` | Planning content generation |
| `generate-stories` | Story generation |
| `organize-stories` | Story organization |
| `execute-subtask` | Individual subtask execution |
| `rework-artifact` | Artifact rework |
| `analyze-artifact` | Artifact analysis |
| `github-proxy` | GitHub API proxy |
| `github-ci-webhook` | GitHub CI webhook (non-pipeline) |

---

## Domain 18 — Meta & Governance Intelligence

| Function | Domain Role |
|----------|-------------|
| `meta-artifact-generator` | Meta-artifact generation |
| `meta-artifact-review` | Meta-artifact review |
| `meta-recommendation-review` | Meta-recommendation review |
| `evidence-management` | Evidence management |
| `candidate-distillation` | Candidate distillation |
| `proposal-quality-engine` | Proposal quality evaluation |
| `reflective-validation-audit` | Reflective validation audit |
| `doctrine-synthesis` | Doctrine synthesis |
| `cross-context-doctrine-adaptation` | Cross-context doctrine adaptation |
| `tenant-doctrine-engine` | Tenant doctrine |
| `tenant-policy-engine` | Tenant policy |
| `tenant-runtime` | Tenant runtime |
| `skill-extraction-engine` | Skill extraction |
| `pattern-distillation-engine` | Pattern distillation |

---

## Domain 19 — Special Systems

| Function | Domain Role |
|----------|-------------|
| `brain-sync` | Brain graph synchronization |
| `distributed-jobs` | Distributed job management |
| `large-scale-orchestration` | Large-scale orchestration |
| `initiative-intake-engine` | Initiative intake processing |
| `initiative-simulation-engine` | Initiative simulation |
| `civilizational-continuity-simulation-layer` | Long-horizon continuity simulation |
| `strategic-succession-long-horizon-continuity` | Strategic succession planning |
| `cross-region-recovery` | Cross-region recovery |
| `federated-intelligence-boundaries` | Federated intelligence boundaries |
| `engineering-advisor` | Engineering advisory |

---

## Summary

| Domain | Function Count |
|--------|---------------|
| Initiative Delivery Pipeline | 25 |
| Governed Action & Execution | 8 |
| Canon / Knowledge | 18 |
| Learning & Calibration | 15 |
| Governance & Policy | 13 |
| Architecture Evolution & Research | 15 |
| Agent Coordination & Routing | 10 |
| Error Intelligence & Repair | 11 |
| Delivery Outcomes & Tuning | 7 |
| Product Intelligence & Analytics | 10 |
| Adoption & Customer Success | 5 |
| Platform Operations & Observability | 17 |
| Security & Trust | 8 |
| Ecosystem & Marketplace | 8 |
| Knowledge & Memory | 18 |
| Strategic & Economic | 8 |
| Code Generation & Utilities | 20 |
| Meta & Governance Intelligence | 15 |
| Special Systems | 10 |
| **Total** | **~236** |
