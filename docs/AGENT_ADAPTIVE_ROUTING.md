# Agent OS — Adaptive Routing System (v0.7)

> Normative specification for performance-driven dynamic routing in Agent OS.

## 1. Design Rationale

Adaptive Routing transforms the Selection Engine from a **static rule evaluator** into a **learning system** that improves routing decisions based on observed outcomes. It bridges telemetry (what happened) with selection (what to do next).

### Principles

1. **Feedback-driven** — Every execution produces `RoutingDecisionFeedback` that updates performance profiles.
2. **Signal-based** — Raw metrics are distilled into `RoutingSignal` objects (reliability, cost_efficiency, etc.).
3. **Adjustment-based** — Signals produce `RoutingAdjustment` modifiers that influence the Selection Engine ranking.
4. **Strategy-configurable** — Five built-in modes (performance_first, cost_first, balanced, exploration, stability) + custom weights.
5. **Exploration-aware** — Epsilon-greedy, softmax, UCB1, and Thompson Sampling prevent premature convergence.
6. **Transparent** — Every adjustment is traceable to its source signal and strategy.

## 2. Module Structure

```
agent-os/
├── adaptive-routing.ts  ← Contracts (this spec)
├── index.ts             ← Re-exports
└── (future)
    ├── routing-analyzer.ts
    ├── routing-bandit.ts
    └── routing-reinforcement.ts
```

## 3. Architecture

```
Observability Layer          Memory System
       │                          │
       ▼                          ▼
PerformanceSnapshot      Historical Outcomes
       │                          │
       └──────────┬───────────────┘
                  │
                  ▼
         RoutingAnalyzer
                  │
                  ▼
          RoutingSignal[]
                  │
                  ▼
    RoutingAdjustmentEngine
                  │
                  ▼
       RoutingAdjustment[]
                  │
                  ▼
        Selection Engine
         (modified ranking)
                  │
                  ▼
        Agent Execution
                  │
                  ▼
   RoutingDecisionFeedback
                  │
                  ▼
         RoutingAnalyzer (loop)
```

## 4. Routing Signals

| Signal Type | Source | Meaning |
|---|---|---|
| `reliability` | success_rate + retry_rate | Agent trustworthiness |
| `capability_stability` | variance of validation scores | Consistency of output quality |
| `cost_efficiency` | cost vs. validation score | Value per dollar |
| `validation_performance` | avg validation score | Output quality |
| `latency_performance` | avg latency vs. SLA | Speed |
| `confidence_calibration` | predicted vs. actual confidence | Self-awareness accuracy |
| `tool_reliability` | tool success rate | External dependency health |
| `retry_burden` | retries per invocation | Operational overhead |
| `drift_detected` | trend analysis | Performance degradation |

## 5. Routing Strategies

| Mode | Description | Weight Emphasis |
|---|---|---|
| `performance_first` | Maximize validation scores | reliability + performance |
| `cost_first` | Minimize cost per task | cost_efficiency |
| `balanced` | Blend all dimensions | even distribution |
| `exploration` | Discover better agents | controlled randomness |
| `stability` | Favor proven agents only | reliability |
| `latency_first` | Minimize execution time | latency |
| `custom` | User-defined weights | configurable |

## 6. Exploration Methods

| Method | Description |
|---|---|
| `epsilon_greedy` | Explore with probability ε (default 0.1, decays to 0.01) |
| `softmax` | Temperature-based weighted random selection |
| `ucb1` | Upper Confidence Bound (balances mean + uncertainty) |
| `thompson` | Thompson Sampling via Beta distribution |
| `round_robin` | Cycle through candidates systematically |

## 7. Adjustment Actions

| Action | Effect |
|---|---|
| `boost_score` | Increase agent's ranking score |
| `penalize_score` | Decrease ranking score |
| `prefer_agent` | Soft routing preference |
| `avoid_agent` | Soft routing avoidance |
| `block_agent` | Hard block (escalated to Policy Engine) |
| `promote_capability` | Boost capability ranking |
| `suppress_capability` | Reduce capability ranking |
| `limit_retries` | Reduce retry budget for agent |
| `force_exploration` | Force testing alternatives |
| `lock_routing` | Lock current best, no changes |

All adjustments have TTL (default 1 hour) and are fully traceable.

## 8. Integration Points

| Module | Integration |
|---|---|
| **Selection Engine** | Consumes `RoutingAdjustment[]` to modify candidate ranking |
| **Observability** | Source of `PerformanceSnapshot` and telemetry data |
| **Memory System** | Stores historical performance profiles and feedback |
| **Policy Engine** | `block_agent` adjustments escalate to policy violations |
| **EventBus** | 12 event types for routing lifecycle visibility |

## 9. Event Taxonomy

| Event | When |
|---|---|
| `routing.signal_computed` | New signal derived from metrics |
| `routing.adjustment_applied` | Adjustment modifies ranking |
| `routing.adjustment_expired` | TTL expired |
| `routing.feedback_recorded` | Execution outcome captured |
| `routing.strategy_changed` | Strategy mode switched |
| `routing.exploration_triggered` | Exploration selected alternative |
| `routing.degradation_detected` | Performance drop > threshold |
| `routing.agent_promoted` | Agent boosted after strong performance |
| `routing.agent_demoted` | Agent penalized after poor performance |
| `routing.capability_suppressed` | Capability suppressed |
| `routing.lock_engaged` | Routing locked to current best |
| `routing.lock_released` | Routing lock released |

## 10. Roadmap Alignment

Completes **Phase 0.7** of the Agent OS Evolution Roadmap.

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

Next phase: **v0.8 — Multi-Agent Coordination**.
