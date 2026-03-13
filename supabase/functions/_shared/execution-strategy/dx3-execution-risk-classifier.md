# Sprint DX-3 — Execution Risk Classifier

**Status**: Implemented  
**Depends on**: OX-5, DX-1, DX-2  
**Date**: 2026-03-13

---

## Goal

Create a single explicit, rule-based decision layer that classifies execution tasks
by risk and determines the full execution posture — replacing scattered heuristics
with one inspectable classifier.

## Classifier Contract

### Inputs (`ClassifierInput`)

| Field | Source | Description |
|-------|--------|-------------|
| `filePath` | Payload | Target file path |
| `fileType` | Payload | File type classification (component, hook, schema, etc.) |
| `contextLength` | Computed | Total chars of context being fed to AI |
| `waveNum` | Payload | Wave number in execution DAG |
| `codeContent` | Generated | The generated code (for signal extraction) |
| `retryCount` | Payload | Number of prior failed attempts |
| `explicitOverride` | Payload | Manual fast/safe override flag |

### Outputs (`ExecutionClassification`)

| Field | Type | Description |
|-------|------|-------------|
| `risk_tier` | `low \| medium \| high \| critical` | Final risk classification |
| `execution_path` | `fast_2call \| safe_3call` | Recommended execution path |
| `validation_posture` | `standard \| strict \| extra_strict` | Validation intensity |
| `context_posture` | `lean \| normal \| full` | Context feeding strategy |
| `confidence` | `0–1` | Classifier confidence in this decision |
| `primary_reason` | `string` | Top-level explanation |
| `factors` | `ClassifierFactor[]` | All contributing factors with impact/explanation |
| `override_applied` | `boolean` | Whether a manual override was used |
| `legacy_fast_path` | `FastPathEligibility` | OX-5 result (backward compat) |
| `risk_assessment` | `RiskAssessment` | DX-2 signals (audit) |

## Risk Tiers & Execution Postures

| Tier | Path | Validation | Context | Trigger |
|------|------|------------|---------|---------|
| **Low** | fast_2call | standard | lean | 0 escalating factors, composite < 0.20 |
| **Medium** | safe_3call | standard | normal | 1 escalating factor |
| **High** | safe_3call | strict | full | 2+ factors OR composite ≥ 0.20 OR OX-5 ineligible |
| **Critical** | safe_3call | extra_strict | full | 3+ factors OR retry+auth OR composite ≥ 0.45 |

## Classification Rules

Each rule produces a factor with `escalate`, `neutral`, or `de_escalate` impact:

1. **Structural block** — OX-5 high-risk file type or complex path pattern → escalate
2. **Retry escalation** — Any retry (`retryCount > 0`) → escalate
3. **Auth/schema sensitivity** — Pattern match on path/content → escalate
4. **Import density** — > 10 imports → escalate
5. **Dependency fan-out** — > 8 unique modules → escalate
6. **Barrel file** — Re-export pattern detected → escalate
7. **Operational sensitivity** — Score > 0.4 → escalate
8. **Content complexity** — Score > 0.5 → escalate (weaker signal)
9. **Wave 1** — Foundational files → escalate

## Decision Flow

```
Input → Manual Override? → Yes → Return immediately
                        → No  → Run OX-5 structural check
                               → Compute DX-2 risk signals
                               → Apply 9 classification rules
                               → Count escalating factors
                               → Determine risk tier
                               → Derive postures from tier
                               → Return full classification
```

## Dual Classification (Pre/Post Generation)

The worker runs the classifier **twice**:
1. **Pre-generation** — with empty code content (uses structural signals only)
   → Drives routing decision (fast vs safe path)
2. **Post-generation** — with actual generated code (uses all signals)
   → Logged for audit, comparison, and future policy tuning

This reveals when pre-routing decisions would have been different with full signals.

## Sample Classifications

### Simple Component (`src/components/Card.tsx`, wave 3)
```
pre:  tier=low, path=fast_2call, validation=standard, confidence=0.9
post: tier=low, path=fast_2call, composite=0.05, factors=[]
```

### Auth Hook (`src/hooks/useAuth.ts`, wave 2)
```
pre:  tier=high, path=safe_3call, validation=strict, confidence=0.9
      factors: [auth_schema_sensitivity, structural_block(complex_path)]
post: tier=high, path=safe_3call, composite=0.48
      factors: [auth_schema, high_import_density(12), operational_sensitivity(0.45)]
```

### Edge Function (`supabase/functions/process-payment/index.ts`, wave 1)
```
pre:  tier=critical, path=safe_3call, validation=extra_strict, confidence=0.9
      factors: [structural_block(high_risk_file_type), wave_1]
post: tier=critical, composite=0.62
      factors: [structural_block, wave_1, auth_schema, high_complexity(0.55)]
```

### Utility (`src/lib/format.ts`, wave 4)
```
pre:  tier=low, path=fast_2call, validation=standard, confidence=0.9
post: tier=low, path=fast_2call, composite=0.03, factors=[]
```

### Index Barrel (`src/components/index.ts`, wave 3)
```
pre:  tier=low, path=fast_2call, validation=standard, confidence=0.9
post: tier=medium, path=safe_3call, composite=0.41
      factors: [barrel_file, high_import_density(15), high_fan_out(15)]
NOTE: Pre/post mismatch — barrel pattern only detectable post-generation.
      This is a known limitation; barrel files are fast-pathed pre-gen
      but flagged in audit for future policy refinement.
```

### Retry of Failed Page (`src/pages/Dashboard.tsx`, wave 2, retry=1)
```
pre:  tier=high, path=safe_3call, validation=strict, confidence=0.9
      factors: [is_retry]
post: tier=high, composite=0.38
      factors: [is_retry, high_import_density(9)]
```

## Observability

Every execution logs to `pipeline_job_metrics.metadata`:
- `dx3_pre_classification` — Full classification at routing time
- `dx3_post_classification` — Full classification after code generation
- Both include all factors, risk assessment, and legacy OX-5 result

Console output per execution:
```
[DX-3] src/components/Card.tsx: tier=low, path=fast_2call, validation=standard, confidence=0.9, reason=all_signals_within_normal_range
[DX-3] src/components/Card.tsx post-gen: tier=low, composite=0.05, factors=[]
```

## Files

- `supabase/functions/_shared/execution-risk-classifier.ts` — Classifier implementation
- `supabase/functions/pipeline-execution-worker/index.ts` — Integration (dual classification)
- `supabase/functions/_shared/execution-strategy/dx3-execution-risk-classifier.md` — This document

## Remaining Edge Cases & Deferred

| Item | Status | Notes |
|------|--------|-------|
| Pre/post classification mismatch for barrel files | Known limitation | Barrel pattern only detectable post-generation |
| Historical fix rate integration | Deferred | Requires `pipeline_job_metrics` table (P0 blocker) |
| Validation failure history lookup | Deferred | Same dependency |
| Adaptive threshold tuning | Deferred | Next sprint can tune thresholds based on data |
| Context posture enforcement | Partial | Classifier recommends posture, worker doesn't yet trim/expand context based on it |
| Validation posture enforcement | Partial | Classifier recommends, but strict/extra_strict validation logic not yet differentiated |

## Constraints Honored

- ✅ No ML
- ✅ No self-modifying policy
- ✅ No hidden scoring — every factor inspectable
- ✅ Manual overrides preserved
- ✅ Backward compatible with OX-5 (legacy result included in output)
- ✅ Rule-based with explicit thresholds
