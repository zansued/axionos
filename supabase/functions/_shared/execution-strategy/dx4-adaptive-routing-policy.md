# Sprint DX-4 — Adaptive Routing Policy

**Status**: Implemented  
**Depends on**: DX-3  
**Date**: 2026-03-13

---

## What "Adaptive" Means at This Stage

- Policy parameters are **tunable** based on observed execution outcomes
- Adjustments are **bounded** (min/max guard rails, max step size per cycle)
- **Low-risk** adjustments auto-apply; **medium/high-risk** require operator approval
- Every change produces an **audit entry** with evidence and rationale
- Policy can be **frozen** (no changes) or **reverted** to defaults at any time
- This is **recommendation-first** adaptation, not autonomous mutation

## Tunable Policy Parameters

| Parameter | Default | Min | Max | Step | Auto-Adjust |
|-----------|---------|-----|-----|------|-------------|
| `high_import_density` | 10 | 5 | 20 | 2 | ✅ Yes |
| `high_fan_out` | 8 | 4 | 15 | 2 | ✅ Yes |
| `high_operational_sensitivity` | 0.4 | 0.2 | 0.7 | 0.1 | ❌ Manual only |
| `high_complexity` | 0.5 | 0.3 | 0.8 | 0.1 | ❌ Manual only |
| `composite_high` | 0.45 | 0.30 | 0.60 | 0.05 | ✅ Yes |
| `composite_medium` | 0.20 | 0.10 | 0.35 | 0.05 | ✅ Yes |
| `large_context` | 12000 | 6000 | 20000 | 2000 | ✅ Yes |
| `max_fast_path_fix_rate` | 0.15 | 0.05 | 0.30 | 0.05 | ❌ Manual only |

## Adaptation Rules

| # | Trigger | Action | Risk | Auto? |
|---|---------|--------|------|-------|
| 1 | Fast-path major fix rate > threshold | Tighten `composite_medium` | Low | ✅ |
| 2 | Fix rate < 30% of threshold + low validation failures | Loosen `composite_medium` | Low | ✅ |
| 3 | Specific file type fix rate > 25% | Add type to safe-path forced list | Medium | ❌ |
| 4 | High-import bucket fix rate >> medium-import | Tighten `high_import_density` | Low | ✅ |
| 5 | High latency savings + acceptable fix rate | Loosen `large_context` | Low | ✅ |

## Evidence Model (`PolicyEvidence`)

Evidence is aggregated over a time window and includes:
- Execution counts (fast-path vs safe-path)
- Major fix rates per path
- Validation failure rates
- Retry rates
- Latency and cost savings
- Per-file-type breakdown
- Per-import-density-bucket breakdown
- Per-risk-tier failure rates

## Integration Architecture

```
ClassifierInput
     │
     ▼
classifyExecutionRisk()
     │
     ├── getThresholds() ◄── getActivePolicy() ◄── PolicyTuner
     │                                                  ▲
     ├── evaluateFastPathEligibility() (legacy)         │
     │                                            PolicyEvidence
     └── computeExecutionRiskSignals() (DX-2)           │
                                                  (from pipeline_job_metrics)
```

The classifier now reads thresholds from the adaptive policy instead of hardcoded constants.

## Auto-Apply Criteria

A recommendation auto-applies only if ALL of:
- `auto_applicable = true` (parameter permits it)
- `change_risk = "low"`
- `confidence >= 0.7`
- Policy is not frozen
- New value is within guard-rail bounds
- Change is within max step size

## Policy Observability

### Audit Trail (`PolicyAuditEntry`)
Every applied change records:
- `from_version` / `to_version`
- `recommendations_applied` — full recommendation objects
- `evidence` — the data that drove the change
- `trigger` — `auto_adjust`, `operator_approval`, or `manual_override`
- `applied_at` — timestamp

### Operator Controls
- `freezePolicy()` — halt all adjustments
- `unfreezePolicy()` — resume
- `revertParameter(key)` — reset a single param to default
- `resetPolicyToDefaults()` — full reset
- `getPendingRecommendations()` — view deferred recommendations
- `getPolicyAuditLog()` — full history

## Sample Policy Recommendations

### Scenario A: Fast-path fix rate too high
```
Evidence: 30 fast-path executions, 20% major fix rate (threshold: 15%)
Recommendation: Tighten composite_medium from 0.20 → 0.15
Action: auto_apply (low risk, high confidence)
Result: More files routed to safe path
```

### Scenario B: Fast-path performing well
```
Evidence: 50 fast-path executions, 3% fix rate, 1% validation failure
Recommendation: Loosen composite_medium from 0.20 → 0.25
Action: auto_apply (low risk, confidence 0.85)
Result: More files eligible for fast path, saving ~10s/file
```

### Scenario C: Hooks failing on fast path
```
Evidence: "hook" type has 30% major fix rate on fast path
Recommendation: Add "hook" to safe_path_forced_types
Action: deferred (medium risk, requires operator approval)
Result: Operator reviews and decides
```

## Files

| File | Change |
|------|--------|
| `supabase/functions/_shared/execution-policy-tuner.ts` | **New** — Full adaptive policy layer |
| `supabase/functions/_shared/execution-risk-classifier.ts` | **Updated** — Reads thresholds from policy tuner |
| `supabase/functions/_shared/execution-strategy/dx4-adaptive-routing-policy.md` | **New** — This document |

## Deferred

| Item | Reason |
|------|--------|
| Persistent policy storage (DB) | In-memory for now; needs `pipeline_job_metrics` table first |
| Automated evidence aggregation | Requires metrics table to query from |
| Scheduled policy evaluation cycles | Needs cron/trigger infrastructure |
| Multi-tenant policy isolation | All tenants share same policy currently |

## Constraints Honored

- ✅ No ML
- ✅ No uncontrolled self-modification
- ✅ No silent critical routing changes
- ✅ Recommendation-first for medium/high-risk changes
- ✅ Guard rails on all parameters (min/max bounds, step limits)
- ✅ Full audit trail
- ✅ Operator freeze/revert controls
