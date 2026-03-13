# Sprint OX-6 — Fast-Path Validation & Policy Tuning

**Status**: Implemented  
**Depends on**: OX-1, OX-2, OX-3, OX-4, OX-5  

## Objective

Transform the fast-path from initial heuristic into data-driven policy.

## Preconditions Met

1. **OX-2**: AI Efficiency Layer confirmed harmful in execution (9-39s overhead) → disabled
2. **OX-3**: 2-call worker prototype implemented and structurally sound
3. **OX-5**: Selective routing implemented with eligibility gating

## What Changed

### 1. Enhanced Metrics Instrumentation

Every worker execution now logs structured `execution_metrics` to `pipeline_job_metrics`:

```typescript
execution_metrics: {
  path: "fast_2call" | "safe_3call",
  file_type, wave, context_length,
  latency_ms, ai_calls,
  tokens_used, cost_usd,
  integration_severity: "none" | "minor_fix" | "major_fix",
  integration_edit_ratio: number, // 0-1
  output_size,
  fast_path_reason, risk_tier,
  retry_count,
}
```

### 2. Validation Signals

Post-generation quality checks:

```typescript
validation_signals: {
  import_resolution_ok: boolean,  // import paths resolve
  syntax_valid: boolean,          // balanced braces, valid structure
  integration_passed: boolean,    // severity != "major_fix"
}
```

### 3. Integration Severity Classification

Replaced boolean `integrationModified` with 3-level severity:

| Level | Criteria | Meaning |
|-------|----------|---------|
| `none` | Code unchanged | Integration Agent found no issues |
| `minor_fix` | Edit distance < 5% | Small corrections (typos, import fixes) |
| `major_fix` | Edit distance ≥ 5% | Significant structural changes needed |

### 4. Policy Learning Data Structure

Prepared `FastPathPolicyRecord` for future adaptive heuristics:

```typescript
{
  file_type, context_length, wave,
  import_density,        // number of imports
  historical_fix_rate,   // from accumulated data
  path_used, needed_major_fix, validation_passed,
}
```

No ML implementation yet — data collection only.

## Metrics to Evaluate

### Performance (per path)
- `avg_latency_per_file`, `p95_latency`
- `avg_tokens`, `avg_cost`

### Quality (per path)
- `integration_fix_rate` = files where severity != "none"
- `major_fix_rate` = files where severity == "major_fix"
- `retry_rate`
- `validation_failure_rate`

### Eligibility Accuracy
- `files_routed_fast_path` / `files_routed_safe_path`
- `fast_path_failure_rate` = major_fixes on fast_path / total fast_path files

## Promotion Criteria

Promote 2-call as default path if:
- `latency_reduction ≥ 25%`
- AND `major_fix_rate ≤ 15%`
- AND `validation_failure_rate ≤ 5%`

## Policy Tuning Parameters

### Context Threshold
Current: `MAX_CONTEXT_FOR_FAST_PATH = 12000`  
Evaluate: 8000, 10000, 16000 based on collected data.

### File-Type Sensitivity
Possible adjustments based on data:
- hooks → safe path if > 5 imports
- utils → fast path always
- components → fast path
- pages → conditional

### Integration Severity Feedback Loop
If `major_fix_rate_fast_path > 25%` for a file type:
→ Downgrade that file type to safe path

## Validation Dataset Distribution

Target 20 files across:
- Components: 5
- Hooks: 3
- Utils: 3
- Pages: 3
- Backend edge functions: 3
- SQL/migrations: 3

## Files Created/Modified

- `supabase/functions/_shared/integration-severity.ts` — severity classification
- `supabase/functions/_shared/execution-metrics-contract.ts` — metrics contract + validation
- `supabase/functions/_shared/execution-fast-path.ts` — updated eligibility (import density)
- `supabase/functions/pipeline-execution-worker/index.ts` — full instrumentation
- `supabase/functions/_shared/consolidated-worker-prototype.ts` — severity support

## Philosophy

> The architecture moves from static pipeline to adaptive pipeline by risk and context.
> AxionOS learns when to accelerate and when to be cautious — based on evidence, not intuition.
