# Agent Governance Layer — v1.1

> Normative specification for the Agent OS governance, trust, approval and compliance framework.

## 1. Design Rationale

The Agent OS can execute, scale and coordinate agents — but lacks a unified control plane for trust, approval and compliance. The Governance Layer closes this gap by providing:

- **TrustProfile / AgentTrustLevel** — six-tier trust model (blocked → trusted) that gates agent capabilities.
- **AutonomyLimit** — quantitative bounds on steps, cost, tool calls and production access per run.
- **ApprovalEngine** — human-in-the-loop workflows for sensitive actions with timeout and escalation.
- **AccessScope** — environment and tool-level access control per agent.
- **ComplianceConstraint** — organizational and regulatory rules with strict/advisory enforcement.
- **AuditLedger** — immutable decision records for every governance evaluation.
- **OverrideManager** — controlled escape hatches with mandatory justification and expiration.

## 2. Module Structure

```
agent-os/
  governance.ts       ← All types, interfaces and defaults
```

## 3. Trust Model

Six trust levels with numeric rank (0-5):

| Level | Rank | Description |
|---|---|---|
| blocked | 0 | Cannot execute any task |
| deprecated | 1 | Scheduled for removal |
| restricted | 2 | Limited capabilities only |
| experimental | 3 | New/unproven agent (default) |
| certified | 4 | Validated through testing |
| trusted | 5 | Full autonomy within limits |

Trust influences Selection Engine ranking and autonomy limits.

## 4. Autonomy Model

`AutonomyLimit` defines quantitative bounds:
- `max_autonomous_steps` (default: 50)
- `max_cost_usd_without_approval` (default: $5)
- `max_external_tool_calls` (default: 20)
- `allow_production_writes` (default: false)
- `require_human_approval_for` — list of `SensitiveAction` types

## 5. Approval Workflows

The `IApprovalEngine` supports:
- Role-based approval requirements
- Multi-approver workflows
- Timeout with auto-deny
- Escalation paths
- Conditional approvals

## 6. Access Control

`AccessScope` defines per-agent permissions:
- Environment restrictions
- Tool allow/deny lists
- Capability restrictions
- Data classification gates

## 7. Compliance & Risk

`ComplianceConstraint` supports strict and advisory enforcement across categories: data protection, retention, access, environment, tool usage, cost, regulatory and organizational.

`RiskClassification` uses weighted factors to produce a 0-1 score mapped to four levels (low → critical).

## 8. Audit & Override

Every `GovernanceDecision` produces an `AuditRecord`. The `IAuditLedger` supports query and export.

`OverrideRequest` requires justification, risk acknowledgement, scope and expiration. Overrides are tracked and can be revoked.

## 9. Integration Points

| System | Integration |
|---|---|
| Policy Engine | Governance rules extend policy evaluation |
| Selection Engine | Trust level influences candidate ranking |
| Tool Adapter | Access scope gates tool execution |
| Distributed Runtime | Autonomy limits enforced per worker task |
| Observability | Governance decisions emit telemetry |
| Marketplace | Trust scores feed from registry reputation |
| Memory | Governance profiles persisted as memory records |
| Artifact Store | Approval decisions recorded as artifacts |

## 10. EventBus Events

21 event types covering evaluation, approval, trust, autonomy, compliance, override and audit lifecycle.

## 11. Extension Points

- Organizational governance packs
- Enterprise approval chains (multi-level)
- Regulatory compliance templates (GDPR, SOC2, HIPAA)
- Cross-environment governance federation
- Governance analytics dashboards
