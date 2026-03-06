# Agent OS Evolution Roadmap

**Version:** 0.1 → 1.0  
**Module:** `supabase/functions/_shared/agent-os/`  
**Last Updated:** 2026-03-06

---

## Vision

The Agent OS evolves through 5 structural phases:

```
Foundation → Controlled Execution → Intelligent Routing → Adaptive System → Autonomous Platform
```

Each phase adds **structural capability**, not merely features.

### Strategic Implementation Rule

Always build in this order:

```
Semantics → Decision → Persistence → Observability → External Integration → Learning → Scale
```

Inverting this order produces rapid growth on an unstable foundation.

---

## Phase 0.1 — Foundation Layer

**Status:** ✅ Implemented  
**Goal:** Build the semantic and contractual foundations.

### Modules

| Module | File | Status |
|--------|------|--------|
| Runtime Protocol | `protocol.ts` | ✅ v0.1.1 |
| Capability Model | `capabilities.ts` | ✅ v0.2 |
| Selection Engine | `selection.ts` | ✅ v0.2 |
| Policy Engine | `policy-engine.ts` | ✅ v0.1 |
| Orchestrator | `orchestrator.ts` | ✅ |
| Registry | `registry.ts` | ✅ |
| Memory (in-process) | `memory.ts` | ✅ |
| Event Bus | `event-bus.ts` | ✅ |
| Scoring | `scoring.ts` | ✅ |
| Policies (stage flow) | `policies.ts` | ✅ |
| Utilities | `utils.ts` | ✅ |
| Barrel Exports | `index.ts` | ✅ |

### Architecture

```
Orchestrator
│
├─ Runtime Protocol      (execution contracts)
├─ Capability Registry   (agent skills)
├─ Selection Engine      (agent assignment)
├─ Policy Engine         (rule evaluation)
│
├─ Memory                (in-process state)
├─ Event Bus             (internal events)
├─ Scoring               (validation heuristics)
└─ Utilities             (ID generation, timestamps)
```

### Capabilities

- ✅ Execute cognitive pipeline (perception → design → build → validation → evolution)
- ✅ Select agents by capability matching with 5-component scoring
- ✅ Validate outputs with multi-dimensional scoring
- ✅ Apply policies with scope hierarchy and 8 built-in rules
- ✅ Register events via EventBus
- ✅ Support retry, retry_other, rollback semantics
- ✅ Deterministic, explainable decisions

### Not Yet

- ❌ Persistent artifact storage
- ❌ External adapters (LLM, tools)
- ❌ Production observability
- ❌ Adaptive learning

---

## Phase 0.2 — Artifact System

**Status:** 📋 Planned  
**Goal:** Transform outputs into persistent, versioned, queryable objects.

### Module: `artifact-store.ts`

```
Artifact Store
│
├─ ArtifactRepository       (CRUD operations)
├─ ArtifactVersioning       (version chains)
├─ ArtifactLineage          (parent/child tracking)
├─ ArtifactHashIndex        (SHA-256 deduplication)
└─ ArtifactQuery            (search by kind, stage, run, hash)
```

### Contracts to Define

| Contract | Purpose |
|----------|---------|
| `IArtifactStore` | Repository interface |
| `ArtifactVersion` | Version chain entry |
| `ArtifactLineageGraph` | Full lineage DAG |
| `ArtifactQuery` | Typed query parameters |
| `ArtifactQueryResult` | Paginated results |
| `ArtifactStoreConfig` | Retention, dedup settings |
| `ArtifactStoreEventType` | Store-specific events |

### Benefits

- Complete audit trail of all pipeline outputs
- Artifact reuse across runs (deduplication by `content_hash`)
- Execution reconstruction from artifact lineage
- Foundation for learning (training data from versioned artifacts)

### Dependencies

- `ArtifactEnvelope` from `protocol.ts`
- `ArtifactKind`, `ArtifactLineage`, `ArtifactQuality` from `protocol.ts`

---

## Phase 0.3 — Observability & Telemetry

**Status:** 📋 Planned  
**Goal:** Make the system observable in production.

### Module: `observability.ts`

```
Telemetry
│
├─ Event Pipeline          (structured event streaming)
├─ Metrics Aggregator      (rollup computation)
├─ Run Analytics           (per-run summary)
├─ Cost Tracking           (per-stage, per-model attribution)
└─ Performance Dashboard   (query interface)
```

### Contracts to Define

| Contract | Purpose |
|----------|---------|
| `TelemetryEvent` | Structured telemetry record |
| `MetricDefinition` | Named metric with type and unit |
| `MetricAggregation` | Rollup (sum, avg, p95, count) |
| `RunSummary` | Per-run cost, latency, success metrics |
| `StageSummary` | Per-stage metrics |
| `AgentSummary` | Per-agent performance over window |
| `ObservabilityQuery` | Query interface for dashboards |
| `IObservabilityEngine` | Engine interface |

### Key Metrics

| Metric | Dimension |
|--------|-----------|
| Latency | per stage, per agent, per capability |
| Cost | per run, per stage, per model |
| Success rate | per capability, per agent |
| Confidence drift | per agent, per capability |
| Fallback frequency | per capability |
| Retry frequency | per stage, per run |

### Questions the System Answers

- Which agent costs the most?
- Which capability fails most often?
- Which stage is the bottleneck?
- Which agent should be retired?
- What is the cost trend over time?

---

## Phase 0.4 — LLM Adapter Layer

**Status:** 📋 Planned  
**Goal:** Decouple the runtime from any specific AI provider.

### Module: `llm-adapter.ts`

```
LLM Adapter
│
├─ ILLMAdapter             (provider interface)
├─ OpenAIAdapter           (GPT-5, GPT-5-mini, etc.)
├─ GeminiAdapter           (Gemini 2.5/3 family)
├─ LocalModelAdapter       (self-hosted models)
└─ LLMRouter               (cost/quality-based routing)
```

### Contracts to Define

| Contract | Purpose |
|----------|---------|
| `ILLMAdapter` | Provider interface |
| `LLMInvocation` | Request to LLM |
| `LLMResponse` | Response from LLM |
| `LLMUsageMetrics` | Tokens, cost, latency |
| `LLMError` | Typed error with retry hint |
| `LLMRoutingPolicy` | Cost/quality/latency preferences |
| `LLMAdapterConfig` | Provider-specific config |

### Benefits

- Swap models without changing agent logic
- Route by cost tier (cheap for drafts, premium for production)
- Fallback between providers (OpenAI → Gemini → local)
- Token budget enforcement
- Per-model cost tracking

---

## Phase 0.5 — Tool Adapter Layer

**Status:** 📋 Planned  
**Goal:** Standardize external tool access with safety controls.

### Module: `tool-adapter.ts`

```
Tool Adapter
│
├─ IToolAdapter            (tool interface)
├─ WebSearchTool
├─ CodeExecutionTool
├─ DatabaseQueryTool
├─ APIConnectorTool
└─ FileSystemTool
```

### Contracts to Define

| Contract | Purpose |
|----------|---------|
| `IToolAdapter` | Tool interface |
| `ToolRegistration` | Register tool with capabilities |
| `ToolPermission` | Permission model |
| `ToolSandboxConfig` | Sandbox and isolation settings |
| `ToolRateLimit` | Rate limiting per tool |

### Runtime Controls

- Sandbox isolation per tool
- Timeout enforcement
- Rate limiting
- Permission checks (via Policy Engine)
- Cost attribution per tool call

### Dependencies

- `ToolCapability`, `ToolInvocation`, `ToolExecutionResult` from `protocol.ts`
- `PolicyEngine` for `deny_tool` enforcement

---

## Phase 0.6 — Persistent Memory

**Status:** 📋 Planned  
**Goal:** Transform in-process memory into accumulated knowledge.

### Module: `persistent-memory.ts`

```
Memory System
│
├─ RunMemory               (per-run state)
├─ StageMemory             (per-stage context)
├─ AgentMemory             (per-agent learning history)
├─ GlobalKnowledge         (cross-run patterns)
└─ VectorMemory            (semantic retrieval via embeddings)
```

### Contracts to Define

| Contract | Purpose |
|----------|---------|
| `IPersistentMemory` | Persistent memory interface (extends `IMemory`) |
| `MemoryScope` | run, stage, agent, global |
| `MemoryQuery` | Semantic + structured query |
| `MemoryRetentionPolicy` | TTL, relevance decay |
| `VectorSearchResult` | Embedding-based retrieval result |

### Capabilities

- Task history across runs
- Semantic retrieval of past decisions
- Project-level memory (patterns, errors, fixes)
- Learning from execution outcomes

### Dependencies

- `IMemory` from `types.ts`
- `MemoryEntry` from `protocol.ts`
- Artifact Store for linking memory to artifacts

---

## Phase 0.7 — Adaptive Routing

**Status:** 📋 Planned  
**Goal:** The system starts learning from its own decisions.

### Module: `adaptive-router.ts`

```
Adaptive Router
│
├─ Performance Learning    (outcome-based weight tuning)
├─ Cost Optimization       (budget-aware selection)
├─ Capability Reinforcement (reward successful capabilities)
└─ Dynamic Ranking         (context-aware weight adjustment)
```

### Algorithms

| Algorithm | Use Case |
|-----------|----------|
| Multi-Armed Bandit | Exploration vs exploitation for new agents |
| Epsilon-Greedy | Controlled exploration with decay |
| UCB (Upper Confidence Bound) | Optimistic exploration |
| Cost-Aware Routing | Maximize quality within budget envelope |
| Domain-Aware Routing | Specialize routing by problem domain |

### Contracts to Define

| Contract | Purpose |
|----------|---------|
| `IAdaptiveRouter` | Router interface (extends `ISelectionEngine`) |
| `RoutingExperiment` | A/B test definition |
| `RoutingOutcome` | Decision + observed result |
| `WeightTuningResult` | Recommended weight changes |
| `ExplorationPolicy` | Exploration vs exploitation config |

### Example Logic

```
if task.domain == "code_generation":
  prefer agent with highest validation_score for code artifacts
  
if task.complexity == "critical":
  prefer agent with highest success_rate regardless of cost
```

### Dependencies

- `SelectionDecision` from `selection.ts`
- `CapabilityScorecard` from `capabilities.ts`
- Observability data for outcome tracking

---

## Phase 0.8 — Multi-Agent Coordination

**Status:** 📋 Planned  
**Goal:** Enable collaboration between agents within a stage.

### Module: `multi-agent.ts`

### Coordination Patterns

| Pattern | Description |
|---------|-------------|
| Debate | Two agents argue opposing positions |
| Consensus | Multiple agents vote on a decision |
| Self-Critique | Agent reviews its own output |
| Iterative Refinement | Agent improves output in cycles |
| Planner-Executor | One agent plans, another executes |
| Critic-Builder | Builder produces, critic evaluates |

### Example Flow

```
Planner Agent (Design mode)
      ↓
Builder Agent (Implement mode)
      ↓
Critic Agent (Review mode)
      ↓
Refinement (Builder re-executes with feedback)
```

### Contracts to Define

| Contract | Purpose |
|----------|---------|
| `CoordinationStrategy` | Pattern definition |
| `CoordinationSession` | Active multi-agent session |
| `AgentMessage` | Inter-agent communication |
| `ConsensusResult` | Voting outcome |
| `RefinementCycle` | Iteration tracking |

### Dependencies

- Selection Engine for selecting multiple agents
- `ISelectionEngine.selectMultiple()` (new method)

---

## Phase 0.9 — Distributed Agent Runtime

**Status:** 📋 Planned  
**Goal:** Scale execution across multiple workers.

### Module: `distributed-runtime.ts`

```
Distributed Runtime
│
├─ Task Queue              (persistent job queue)
├─ Worker Nodes            (execution workers)
├─ Agent Sandboxes         (isolated execution environments)
├─ Execution Scheduler     (assignment + load balancing)
└─ Load Balancer           (distribute across workers)
```

### Contracts to Define

| Contract | Purpose |
|----------|---------|
| `ITaskQueue` | Queue interface |
| `WorkerRegistration` | Worker capabilities and capacity |
| `ExecutionSlot` | Reserved execution slot |
| `DistributedRunState` | Run state across workers |
| `ILoadBalancer` | Load balancing strategy |

### Capabilities

- Parallel stage execution
- Remote agent invocation
- Horizontal scaling
- Worker health monitoring

---

## Phase 1.0 — Autonomous Agent Platform

**Status:** 🔮 Vision  
**Goal:** Agent OS becomes a platform for pluggable agents.

### Architecture

```
Agent OS Platform
│
├─ Kernel
│   ├─ Runtime Protocol
│   ├─ Capability Model
│   ├─ Selection Engine
│   └─ Policy Engine
│
├─ Infrastructure
│   ├─ Artifact Store
│   ├─ Memory System
│   └─ Observability
│
├─ Adapters
│   ├─ LLM Adapters
│   └─ Tool Adapters
│
├─ Intelligence
│   ├─ Adaptive Router
│   └─ Multi-Agent Coordination
│
└─ Scale
    └─ Distributed Runtime
```

### New Concepts

| Concept | Description |
|---------|-------------|
| Agent Marketplace | Third-party agents register and participate |
| Capability Marketplace | Reusable capability declarations |
| Policy Marketplace | Shared policy rule sets |
| Tool Marketplace | Community-contributed tool adapters |
| Federated Runtime | Execute across organizational boundaries |
| Certified Capabilities | Quality-verified capability packages |

---

## Intelligence Evolution

| Phase | System Capability |
|-------|-------------------|
| v0.1 | Cognitive pipeline with deterministic routing |
| v0.3 | Observable pipeline with cost and performance tracking |
| v0.5 | Integrated pipeline with external tools and models |
| v0.7 | Adaptive pipeline that learns from outcomes |
| v0.9 | Distributed pipeline with horizontal scaling |
| v1.0 | Autonomous platform with pluggable agents |

---

## Module Implementation Sequence

```
 1. Runtime Protocol       ✅
 2. Capability Model       ✅
 3. Selection Engine       ✅
 4. Policy Engine          ✅
 ─────────────────────────────
 5. Artifact Store         📋
 6. Observability          📋
 7. LLM Adapter            📋
 8. Tool Adapter           📋
 9. Persistent Memory      📋
10. Adaptive Router        📋
11. Multi-Agent Coord.     📋
12. Distributed Runtime    📋
```

---

## Relationship to AxionOS Horizons

The Agent OS roadmap maps to the broader AxionOS evolution:

| Agent OS Phase | AxionOS Horizon | Maturity Level |
|----------------|-----------------|----------------|
| v0.1–0.3 | NOW (Stabilize Kernel) | Level 3 → 4 |
| v0.4–0.6 | NEXT (Learning Agents) | Level 4 |
| v0.7–0.8 | LATER (Product Intelligence) | Level 4 → 5 |
| v0.9–1.0 | FUTURE (Market Intelligence) | Level 5 |
