# Agent OS — Multi-Agent Coordination System (v0.8)

> Normative specification for structured multi-agent collaboration in Agent OS.

## 1. Design Rationale

Single-agent execution hits quality ceilings on complex tasks. Multi-Agent Coordination introduces **structured interaction patterns** where specialized agents collaborate through defined roles, producing progressively better artifacts via iterative refinement.

### Principles

1. **Strategy-driven** — 9 coordination patterns (planner_executor, debate, consensus, ensemble, etc.)
2. **Role-based** — 11 agent role types with explicit responsibilities and artifact contracts
3. **Iteration-controlled** — Quality thresholds, cost limits, and degradation detection govern loops
4. **Artifact-mediated** — Agents interact by producing/consuming artifacts, not direct messaging
5. **Observable** — 14 event types for full coordination visibility
6. **Selection-integrated** — The Selection Engine assigns agents to roles

## 2. Module Structure

```
agent-os/
├── coordination.ts    ← Contracts (this spec)
├── index.ts           ← Re-exports
└── (future)
    ├── coord-planner-critic.ts
    ├── coord-debate.ts
    ├── coord-consensus.ts
    └── coord-ensemble.ts
```

## 3. Architecture

```
Task Input
    │
    ▼
CoordinationStrategy selected
    │
    ▼
ICoordinationManager.createPlan()
    │
    ├─ Selection Engine assigns agents to roles
    │
    ▼
CoordinationPlan
    │
    ▼
ICoordinationManager.execute()
    │
    ┌─────────── Iteration Loop ──────────┐
    │                                     │
    │  Step 1: Planner → plan artifact    │
    │  Step 2: Builder → code artifact    │
    │  Step 3: Critic → review artifact   │
    │  Step 4: Validator → score          │
    │                                     │
    │  quality_score >= threshold? ──► Exit│
    │  quality degrading? ──► Abort       │
    │  max_iterations? ──► Exit           │
    │                                     │
    └─────────────────────────────────────┘
    │
    ▼
CoordinationResult
```

## 4. Coordination Strategies

| Strategy | Roles | Flow |
|---|---|---|
| `planner_executor` | Planner → Executor | Sequential |
| `builder_reviewer` | Builder → Reviewer | Sequential |
| `planner_builder_critic` | Planner → Builder → Critic | Iterative |
| `research_synthesize_validate` | Researcher → Synthesizer → Validator | Sequential |
| `iterative_refinement` | Builder → Critic → Refiner | Loop |
| `debate` | Multiple debaters + Moderator | Argumentative |
| `consensus` | Multiple voters + Moderator | Voting |
| `ensemble` | Parallel executors + Merger | Parallel + merge |
| `custom` | User-defined | Configurable |

## 5. Agent Roles

| Role | Responsibility |
|---|---|
| `planner` | Produce execution plans |
| `executor` | Execute plans |
| `builder` | Generate code/artifacts |
| `researcher` | Gather information |
| `critic` | Evaluate and critique |
| `reviewer` | Review for quality |
| `refiner` | Improve existing artifacts |
| `validator` | Validate against criteria |
| `synthesizer` | Combine multiple inputs |
| `moderator` | Control debate/consensus |
| `observer` | Monitor without participating |

## 6. Iteration & Termination

| Rule | Default |
|---|---|
| Max iterations | 5 |
| Max critique cycles | 3 |
| Quality threshold (early exit) | 0.85 |
| Quality floor (abort) | 0.30 |
| Max quality degradations | 2 |
| Max duration | 5 minutes |
| Max cost | $5.00 |
| Consensus threshold | 67% |

10 termination reasons tracked for auditability.

## 7. Integration Points

| Module | Integration |
|---|---|
| **Selection Engine** | Assigns agents to roles |
| **Artifact Store** | Stores all coordination artifacts |
| **Observability** | Records coordination metrics and traces |
| **Memory System** | Stores coordination outcomes for learning |
| **Adaptive Routing** | Feedback from coordination improves future routing |
| **Policy Engine** | Enforces cost/duration limits |
| **EventBus** | 14 event types |

## 8. Event Taxonomy

| Event | When |
|---|---|
| `coordination.plan_created` | Plan generated from strategy |
| `coordination.started` | Execution begins |
| `coordination.role_assigned` | Agent assigned to role |
| `coordination.step_started` | Step execution begins |
| `coordination.step_completed` | Step produces output |
| `coordination.step_failed` | Step fails |
| `coordination.iteration_completed` | Full iteration cycle done |
| `coordination.quality_improved` | Score increased |
| `coordination.quality_degraded` | Score decreased |
| `coordination.vote_cast` | Agent votes (consensus/debate) |
| `coordination.consensus_reached` | Voting threshold met |
| `coordination.consensus_failed` | Voting failed |
| `coordination.completed` | Coordination finished |
| `coordination.aborted` | Coordination aborted |

## 9. Roadmap Alignment

Completes **Phase 0.8** of the Agent OS Evolution Roadmap.

Kernel status:
- ✅ Runtime Protocol (v0.1)
- ✅ Capability Model (v0.2)
- ✅ Selection Engine (v0.2)
- ✅ Policy Engine (v0.1)
- ✅ Artifact Store (v0.2)
- ✅ Observability Layer (v0.3)
- ✅ LLM Adapter Layer (v0.4)
- ✅ Tool Adapter Layer (v0.5)
- ✅ Memory System (v0.6)
- ✅ Adaptive Routing (v0.7)
- ✅ Multi-Agent Coordination (v0.8)

Next phase: **v0.9 — Distributed Agent Runtime**.
