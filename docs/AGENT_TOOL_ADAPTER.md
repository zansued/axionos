# Agent OS — Tool Adapter Layer (v0.5)

> Normative specification for provider-agnostic tool interactions in Agent OS.

## 1. Design Rationale

Agents must **never call external services directly**. All tool invocations flow through the Tool Adapter Layer, which enforces permissions, applies timeouts, normalizes errors, records metrics, and ensures auditability.

### Principles

1. **Provider-agnostic** — Tools are accessed through `IToolAdapter`; swap implementations freely.
2. **Permission-first** — Every invocation passes through `IToolPermissionEvaluator` before execution.
3. **Observable** — Every execution emits events to the EventBus and records `ToolExecutionMetrics`.
4. **Error-normalized** — 10 structured error types with retry guidance.
5. **Policy-integrated** — The Policy Engine controls tool access via `ToolPermissionKind`.
6. **Sandboxable** — Execution modes include `sandboxed` for future isolation.

## 2. Module Structure

```
agent-os/
├── tool-adapter.ts     ← Contracts (this spec)
├── index.ts            ← Re-exports
└── (future)
    ├── tool-web-search.ts
    ├── tool-code-exec.ts
    ├── tool-database.ts
    ├── tool-api-connector.ts
    ├── tool-filesystem.ts
    └── tool-browser.ts
```

## 3. Architecture

```
Agent / Orchestrator
       │
       ▼
ToolInvocationRequest
       │
       ▼
 IToolPermissionEvaluator ──► Policy Engine
       │
       ▼ (granted)
 IToolAdapterRegistry
       │
       ├─ resolveAdapter(tool_id)
       │
       ▼
   IToolAdapter
       │
       ├─ WebSearchAdapter
       ├─ CodeExecutionAdapter
       ├─ DatabaseAdapter
       ├─ APIConnectorAdapter
       ├─ FileSystemAdapter
       └─ BrowserAdapter
              │
              ▼
       External Service
              │
              ▼
  ToolExecutionResult (normalized)
              │
              ▼
     Observability Layer
```

## 4. Execution Flow

```
1. Agent creates ToolInvocationRequest with trace metadata
2. ToolPermissionEvaluator checks required_permissions vs granted_permissions
3. If denied → tool.permission_denied event, ToolPermissionResult returned
4. If granted → tool.permission_granted event
5. IToolAdapterRegistry resolves adapter for tool_id
6. EventBus emits tool.invocation_started
7. IToolAdapter.execute() called with timeout
8. Result normalized to ToolExecutionResult
9. Observability records ToolExecutionMetrics
10. EventBus emits tool.invocation_completed (or tool.invocation_failed)
11. ToolExecutionResult returned to agent
```

### On Error:
```
1. ToolExecutionError created with retry guidance
2. If retryable → exponential backoff → retry (up to max_retries)
3. EventBus emits tool.retry_triggered
4. If exhausted → tool.invocation_failed
```

## 5. Permission Model

11 permission kinds control tool access:

| Permission | Description |
|---|---|
| `read_external_api` | Read from external APIs |
| `write_external_api` | Write to external APIs |
| `read_database` | Query databases |
| `write_database` | Mutate database records |
| `execute_code` | Run arbitrary code |
| `access_filesystem` | Read/write files |
| `internet_access` | General internet access |
| `send_email` | Send emails |
| `send_notification` | Send notifications |
| `access_secrets` | Access secrets/credentials |
| `browser_automation` | Control a browser |

The Policy Engine maps stage + agent + environment to granted permissions.

## 6. Error Types

| Error Type | Retryable | Description |
|---|---|---|
| `tool_timeout` | Yes | Execution exceeded timeout |
| `tool_permission_denied` | No | Missing required permissions |
| `tool_not_found` | No | Tool id not in registry |
| `tool_execution_error` | Maybe | Generic execution failure |
| `tool_validation_error` | No | Input/output schema mismatch |
| `tool_rate_limited` | Yes | Provider rate limit hit |
| `tool_network_error` | Yes | Network connectivity issue |
| `tool_sandbox_error` | No | Sandbox environment failure |
| `tool_cost_exceeded` | No | Cost limit reached |
| `tool_unknown_error` | No | Unclassified error |

## 7. Integration Points

| Module | Integration |
|---|---|
| **Policy Engine** | Permission evaluation via `IToolPermissionEvaluator` |
| **Observability** | `ToolExecutionMetrics`, `CostRecord`, trace entries |
| **EventBus** | 12 event types for lifecycle visibility |
| **Orchestrator** | Routes `ToolInvocationRequest` and returns results |
| **Artifact Store** | Tool outputs may become artifacts |
| **LLM Adapter** | LLM tool calls translated to `ToolInvocationRequest` |

## 8. Default Configuration

```typescript
{
  default_timeout_ms: 30_000,
  default_max_retries: 2,
  retry_base_delay_ms: 500,
  max_payload_bytes: 10_485_760, // 10MB
  permissions_enabled: true,
  cost_tracking_enabled: true,
  default_resource_limits: {
    max_duration_ms: 30_000,
    max_payload_bytes: 10_485_760,
    max_retries: 2,
    max_cost_usd: 1.0,
  },
}
```

## 9. Event Taxonomy

| Event | When |
|---|---|
| `tool.invocation_started` | Execution begins |
| `tool.invocation_completed` | Successful execution |
| `tool.invocation_failed` | All retries exhausted |
| `tool.timeout` | Execution exceeded timeout |
| `tool.permission_denied` | Permission check failed |
| `tool.permission_granted` | Permission check passed |
| `tool.retry_triggered` | Retrying after error |
| `tool.adapter_registered` | New adapter registered |
| `tool.adapter_unregistered` | Adapter removed |
| `tool.adapter_unhealthy` | Health check failed |
| `tool.cost_recorded` | Cost tracked |
| `tool.rate_limited` | Rate limit hit |

## 10. Roadmap Alignment

Completes **Phase 0.5** of the Agent OS Evolution Roadmap.

Kernel status:
- ✅ Runtime Protocol (v0.1)
- ✅ Capability Model (v0.2)
- ✅ Selection Engine (v0.2)
- ✅ Policy Engine (v0.1)
- ✅ Artifact Store (v0.2)
- ✅ Observability Layer (v0.3)
- ✅ LLM Adapter Layer (v0.4)
- ✅ Tool Adapter Layer (v0.5)

Next phase: **v0.6 — Persistent Memory System**.
