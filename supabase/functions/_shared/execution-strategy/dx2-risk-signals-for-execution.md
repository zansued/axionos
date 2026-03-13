# Sprint DX-2 — Risk Signals for Execution

**Status**: Implemented  
**Depends on**: OX-5, OX-6, DX-1  
**Date**: 2026-03-13

---

## Goal

Add richer, explainable execution risk signals so the system can evaluate task risk
more intelligently than by file type, wave, and context length alone.

## Selected Signals

Based on DX-1 audit findings, 7 signals were selected for implementation:

### 1. Import Density
- **What**: Number of `import` statements in generated code
- **Computation**: Regex count of `^import\s` lines
- **Type**: Derived (post-generation)
- **Confidence**: High — directly measurable, strong DX-1 correlation with integration failures
- **Normalization**: 0–1 via `min(1, count / 15)`

### 2. Dependency Fan-Out
- **What**: Number of unique module paths imported
- **Computation**: Unique `from '...'` path extraction
- **Type**: Derived (post-generation)
- **Confidence**: High — distinct from import density, measures integration surface area
- **Normalization**: 0–1 via `min(1, count / 10)`

### 3. Auth/Schema Sensitivity
- **What**: Whether the file touches authentication, authorization, or schema definitions
- **Computation**: Pattern matching on file path (auth, login, schema, migration, etc.)
  and code content (supabase.auth, RLS, CREATE TABLE, signIn/signUp, etc.)
- **Type**: Static (deterministic from inputs)
- **Confidence**: Medium — pattern-based, may have false positives on files that merely
  reference auth without being auth-critical
- **Weight**: 0.20 (highest individual weight due to blast radius)

### 4. Operational Sensitivity
- **What**: 0–1 score for infrastructure criticality based on naming/content patterns
- **Computation**: Weighted pattern matching for provider, config, client, middleware,
  context, store, index files, env variables, storage APIs
- **Type**: Static/derived
- **Confidence**: Medium — heuristic but aligns with DX-1 findings
- **Patterns detected**: provider (0.3), client (0.25), config (0.2), middleware (0.3),
  context (0.2), env vars (0.2), etc.

### 5. Re-export Pattern (Barrel Files)
- **What**: Whether the file is primarily a re-export hub
- **Computation**: Ratio of `export { } from` / `export *` lines to total exports
- **Type**: Derived
- **Confidence**: High — directly detectable, cascade risk is well-understood
- **Threshold**: >50% of exports are re-exports → flagged

### 6. Retry Indicator
- **What**: Whether this execution is a retry of a previously failed attempt
- **Computation**: `retryCount > 0` from payload
- **Type**: Static (from input)
- **Confidence**: High — binary, no ambiguity
- **DX-1 finding**: Completely ignored by current routing, should be a first-class signal

### 7. Content Complexity Estimate
- **What**: Rough complexity proxy based on nesting depth, async patterns,
  conditional density, error handling, and type complexity
- **Computation**: Multi-factor heuristic on generated code
- **Type**: Derived (post-generation)
- **Confidence**: Low-Medium — not a real AST analysis
- **Limitation**: Computed post-generation, so can't guide pre-routing decisions.
  Useful for auditing and future adaptive policy only.

## Composite Risk Score

All signals are combined into a weighted composite (0–1):

| Signal                    | Weight | Confidence |
|---------------------------|--------|------------|
| auth_schema_sensitivity   | 0.20   | Medium     |
| import_density            | 0.15   | High       |
| dependency_fan_out        | 0.15   | High       |
| operational_sensitivity   | 0.15   | Medium     |
| is_retry                  | 0.15   | High       |
| has_reexport_pattern      | 0.10   | High       |
| content_complexity        | 0.10   | Low-Medium |

The composite score is **NOT used for routing decisions** in this sprint.
It is logged for observability and future classifier development.

## Where Signals Are Stored

Every worker execution now logs `dx2_risk_assessment` in the `pipeline_job_metrics`
metadata alongside existing OX-5/OX-6 metrics:

```json
{
  "dx2_risk_assessment": {
    "signals": {
      "import_density": 8,
      "dependency_fan_out": 5,
      "auth_schema_sensitivity": true,
      "operational_sensitivity": 0.45,
      "has_reexport_pattern": false,
      "is_retry": false,
      "content_complexity_estimate": 0.35
    },
    "composite_score": 0.482,
    "top_factors": [
      "auth_schema: touches security-critical patterns",
      "high_import_density: 8 imports",
      "operational_sensitivity: infrastructure-critical patterns detected"
    ],
    "weak_signals": [
      "content_complexity: low confidence, rough heuristic"
    ]
  }
}
```

## Sample Signal Computations

### Example 1: Simple React Component (`src/components/Button.tsx`)
```
import_density: 2, dependency_fan_out: 2, auth_schema: false,
operational_sensitivity: 0.0, barrel: false, retry: false, complexity: 0.1
composite: 0.055 → LOW RISK ✓ (fast-path appropriate)
```

### Example 2: Auth Provider (`src/providers/AuthProvider.tsx`)
```
import_density: 7, dependency_fan_out: 5, auth_schema: true,
operational_sensitivity: 0.5, barrel: false, retry: false, complexity: 0.4
composite: 0.530 → MEDIUM-HIGH RISK (safe-path recommended)
```

### Example 3: Index Barrel (`src/components/index.ts`)
```
import_density: 15, dependency_fan_out: 15, auth_schema: false,
operational_sensitivity: 0.1, barrel: true, retry: false, complexity: 0.05
composite: 0.405 → MEDIUM RISK (cascade risk from barrel pattern)
```

### Example 4: Retry of Failed Hook (`src/hooks/useData.ts`, retry=1)
```
import_density: 5, dependency_fan_out: 4, auth_schema: false,
operational_sensitivity: 0.0, barrel: false, retry: true, complexity: 0.3
composite: 0.330 → MEDIUM RISK (elevated by retry signal)
```

## Deferred / Weak Signals

| Signal | Status | Reason |
|--------|--------|--------|
| Historical integration fix rate | Deferred | Requires `pipeline_job_metrics` table (P0 blocker from DX-1) and aggregation query |
| DAG criticality / inbound edge count | Deferred | Requires runtime graph query, too expensive for this sprint |
| Project-context complexity | Deferred | Ambiguous definition, hard to compute reliably |
| Validation failure history | Deferred | Same dependency on `pipeline_job_metrics` table |
| Dependency centrality (PageRank-style) | Deferred | Over-engineered for current data availability |

## Files

- `supabase/functions/_shared/execution-risk-signals.ts` — Signal extraction + composite scoring
- `supabase/functions/pipeline-execution-worker/index.ts` — Integration (compute + log)
- `supabase/functions/_shared/execution-strategy/dx2-risk-signals-for-execution.md` — This document

## Constraints Honored

- ✅ No classifier built
- ✅ No adaptive routing engine
- ✅ No ML
- ✅ No routing policy changes
- ✅ Small strong set (7 signals) over large weak set
- ✅ All signals explainable and inspectable

## Next Steps

When `pipeline_job_metrics` table is created (P0 from DX-1), the system will be able to:
1. Correlate risk signals with actual outcomes (integration severity, validation failures)
2. Validate which signals are truly predictive vs merely correlated
3. Build an explicit execution risk classifier using these signals as features
