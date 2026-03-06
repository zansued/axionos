# Agent OS — Distributed Agent Runtime (v0.9)

> Normative specification for distributed task execution in Agent OS.

## 1. Design Rationale

The single-process orchestrator becomes a bottleneck under load. The Distributed Runtime introduces **task queuing, worker pools, and fault-tolerant scheduling** while keeping the orchestrator as the coordination brain.

### Principles

1. **Infrastructure-agnostic** — Interfaces only; adapters provide queue/worker implementations.
2. **Queue-based** — Priority task queue with dead letter support.
3. **Worker-declarative** — Workers declare capabilities, resources, and capacity.
4. **Fault-tolerant** — Retry policies, task reassignment, worker exclusion, dead letter queue.
5. **Observable** — 18 event types for distributed execution visibility.
6. **Horizontally scalable** — Add workers without changing orchestrator logic.

## 2. Module Structure

```
agent-os/
├── distributed-runtime.ts  ← Contracts (this spec)
├── index.ts                ← Re-exports
└── (future)
    ├── queue-memory.ts        ← In-memory queue adapter
    ├── queue-supabase.ts      ← Supabase-backed queue
    ├── worker-edge.ts         ← Edge function workers
    └── scheduler-round-robin.ts
```

## 3. Architecture

```
Orchestrator / CoordinationManager
              │
              ▼
    IDistributedRuntime.submitTask()
              │
              ▼
        ITaskScheduler
              │
              ├─ ITaskQueue.enqueue()
              │
              ▼
        ┌─ IWorkerRegistry ─┐
        │                    │
     Worker A            Worker B
    (general)            (gpu)
        │                    │
        ▼                    ▼
  TaskExecution        TaskExecution
        │                    │
        ▼                    ▼
  TaskExecutionResult  TaskExecutionResult
        │                    │
        └────────┬───────────┘
                 │
                 ▼
          Observability
```

## 4. Task Lifecycle

```
pending → queued → assigned → running → completed
                                      → failed → retrying → assigned
                                               → dead_letter
                                      → timeout → retrying
                    → cancelled
```

## 5. Task Priorities

| Priority | Value | Use Case |
|---|---|---|
| `critical` | 0 | System-critical operations |
| `high` | 1 | User-facing tasks |
| `normal` | 2 | Standard pipeline execution |
| `low` | 3 | Background optimization |
| `background` | 4 | Maintenance, cleanup |

## 6. Worker Types

| Type | Description |
|---|---|
| `general` | Standard execution |
| `compute` | CPU-intensive tasks |
| `gpu` | GPU-accelerated (embeddings, inference) |
| `llm` | LLM invocation specialist |
| `tool` | External tool execution |
| `sandbox` | Isolated sandbox environment |
| `serverless` | Ephemeral serverless workers |

## 7. Failure Recovery

| Failure | Recovery |
|---|---|
| `worker_crash` | Reassign to another worker |
| `task_timeout` | Retry with backoff |
| `agent_failure` | Retry or dead letter |
| `tool_failure` | Retry with delay |
| `resource_exhausted` | Reassign to capable worker |
| `sandbox_violation` | Dead letter (no retry) |
| `network_error` | Retry with backoff |

Default: 3 retries, exponential backoff (1s base, 2x multiplier, 30s max).

## 8. Worker Health

Workers send heartbeats every 10s. After 3 missed heartbeats:

| Action | Trigger |
|---|---|
| `warn` | 1 missed heartbeat |
| `drain` | 2 missed + high error rate |
| `exclude` | 3 missed |
| `terminate` | Persistent failures |

## 9. Integration Points

| Module | Integration |
|---|---|
| **Orchestrator** | Submits tasks via `IDistributedRuntime` |
| **Coordination** | Coordination steps become distributed tasks |
| **Selection Engine** | Worker capability matching |
| **Observability** | Task metrics, queue depth, worker utilization |
| **Policy Engine** | Resource limits, scheduling constraints |
| **Adaptive Routing** | Worker performance feeds routing signals |
| **EventBus** | 18 event types |

## 10. Event Taxonomy

| Event | When |
|---|---|
| `distributed.task_created` | Task submitted |
| `distributed.task_queued` | Task enters queue |
| `distributed.task_assigned` | Task assigned to worker |
| `distributed.task_started` | Worker begins execution |
| `distributed.task_completed` | Successful completion |
| `distributed.task_failed` | Execution failed |
| `distributed.task_retrying` | Retry initiated |
| `distributed.task_timeout` | Execution exceeded timeout |
| `distributed.task_cancelled` | Task cancelled |
| `distributed.task_dead_lettered` | Moved to dead letter |
| `distributed.worker_registered` | Worker joins pool |
| `distributed.worker_heartbeat` | Heartbeat received |
| `distributed.worker_unhealthy` | Health check failed |
| `distributed.worker_drained` | Worker draining |
| `distributed.worker_excluded` | Worker excluded |
| `distributed.worker_terminated` | Worker terminated |
| `distributed.queue_backlog_warning` | Queue depth > threshold |
| `distributed.scheduler_rebalance` | Scheduler rebalancing |

## 11. Roadmap Alignment

Completes **Phase 0.9** of the Agent OS Evolution Roadmap.

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
- ✅ Distributed Runtime (v0.9)

Next phase: **v1.0 — Autonomous Agent Platform**.
