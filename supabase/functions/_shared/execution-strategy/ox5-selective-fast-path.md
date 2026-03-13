# Sprint OX-5 — Selective Execution Fast-Path
## Status: COMPLETE

### Precondition Check
- **OX-2**: ✅ Efficiency layer was parasitic in execution (9-39s overhead) — `skipEfficiency=true` applied
- **OX-3**: ✅ 2-call prototype exists and is structurally sound
- **OX-4**: ✅ Decision gate approved selective rollout with eligibility gating
- **Conclusion**: Evidence supports proceeding

### Eligibility Policy

| Criterion | Result | Rationale |
|-----------|--------|-----------|
| High-risk file types (schema, migration, edge_function, auth_config) | → 3-call | Separate architect pass adds safety for DB/infra code |
| Complex path patterns (edge functions, migrations, integrations) | → 3-call | Structural files need full specification |
| `.sql` extensions | → 3-call | SQL benefits from architectural review |
| Context size > 12,000 chars | → 3-call | Large context needs architect to organize |
| Wave 1 (foundational files) | → 3-call | Foundation files are high-impact |
| Explicit `useConsolidatedWorker` flag | → overrides auto | Caller can force either path |
| All other files (components, pages, hooks, utils) | → 2-call | Low-risk, merged path is sufficient |

### Changes Applied
1. **`execution-fast-path.ts`** (new): Eligibility evaluator with `FastPathEligibility` output
2. **`pipeline-execution-worker/index.ts`**: Auto-selects path based on eligibility instead of requiring explicit flag
3. **Metrics**: `pipeline_job_metrics.metadata.ox5_fast_path` records eligibility decision for every file

### Fallback Behavior
- Any file failing eligibility silently falls back to the standard 3-call path
- `useConsolidatedWorker=false` in payload forces 3-call regardless of eligibility
- `useConsolidatedWorker=true` forces 2-call (for testing/override)
- No global switch — each file is evaluated independently

### Expected Impact
- **Eligible files** (components, pages, hooks, styles, configs): ~8-20s saved per file
- **Ineligible files** (schemas, edge functions, migrations, wave-1): no change, full safety preserved
- **Typical project**: ~60-70% of files are eligible → significant aggregate savings
- **Quality risk**: Low for eligible files (simple components don't benefit from separate architect)

### Measured Impact
To be collected from `pipeline_job_metrics` after real workloads run:
- Latency comparison: fast-path vs standard per file type
- Quality: integration error rate by path
- Fallback rate: % of files routed to each path
- Cost: token savings from eliminated AI calls

### OX-5 Summary
Introduced automatic eligibility-based routing between the 2-call and 3-call worker paths. High-risk files (DB schemas, edge functions, migrations, foundational wave-1 files, large-context files) stay on the safer 3-call path. Standard components, pages, and utilities use the faster 2-call path. Every decision is logged to `pipeline_job_metrics` for post-hoc analysis. The explicit `useConsolidatedWorker` flag remains as an override for testing.
