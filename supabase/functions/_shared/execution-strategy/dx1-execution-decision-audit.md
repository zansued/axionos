# Sprint DX-1 — Execution Decision Audit

**Status**: Complete  
**Depends on**: OX-1 through OX-6  
**Type**: Audit — no code changes  

---

## A. Sample Analyzed & Scope

### Data Sources Examined

1. **`pipeline_subjobs` table**: 40 records, ALL in `architecture` stage. Zero execution-stage records exist.
2. **`pipeline_job_metrics` table**: Does not exist in the database. The worker code (line 333-350 of `pipeline-execution-worker/index.ts`) writes to this table fire-and-forget — the insert silently fails every time.
3. **Worker code**: Full analysis of `pipeline-execution-worker/index.ts` (442 lines) and `consolidated-worker-prototype.ts` (234 lines).
4. **Fast-path eligibility code**: `execution-fast-path.ts` (143 lines).
5. **Metrics contracts**: `execution-metrics-contract.ts`, `integration-severity.ts`.

### Critical Finding: No Empirical Execution Data Exists

**The pipeline has never completed an execution-stage run that reached the worker.** All 40 `pipeline_subjobs` records are architecture stage. The metrics instrumentation added in OX-5/OX-6 has never captured a single data point because:

1. The `pipeline_job_metrics` table was never created via migration
2. No execution-stage subjobs exist in the database
3. The worker's fire-and-forget insert (line 348: `.then(() => {}).catch(...)`) silently swallows the "relation does not exist" error

**Sample size for empirical analysis: 0.**

This audit therefore proceeds as a **structural code audit** of the routing policy, identifying issues from code analysis rather than runtime data.

---

## B. Execution Decision Outcome Table (Code-Based Analysis)

Since no runtime data exists, we classify outcomes by analyzing what the code *would* do for representative file types:

| File Pattern | Fast-Path Eligible? | Reason | Assessment |
|---|---|---|---|
| `src/components/Button.tsx` (wave 2, ctx 5000) | ✅ Yes | Standard component | **Likely correct** — simple components don't need architect pass |
| `src/components/Dashboard.tsx` (wave 2, ctx 14000) | ❌ No | `large_context` | **Possibly over-conservative** — context threshold may be too low |
| `src/hooks/useAuth.ts` (wave 2, ctx 8000) | ✅ Yes | Standard hook | **Risky** — auth hooks have integration sensitivity not captured by type |
| `src/utils/format.ts` (wave 3, ctx 2000) | ✅ Yes | Standard util | **Likely correct** — pure utils are lowest risk |
| `src/pages/Settings.tsx` (wave 2, ctx 11000) | ✅ Yes | Standard page | **Uncertain** — pages with many integrations may need architect |
| `supabase/functions/worker/index.ts` (wave 2) | ❌ No | `complex_path_pattern` | **Correct** — edge functions need full pipeline |
| `src/integrations/supabase/hooks.ts` (wave 2) | ❌ No | `complex_path_pattern` | **Correct** — integration layer files are high-risk |
| Any file (wave 1) | ❌ No | `foundational_wave` | **Correct** — wave-1 files set project foundation |
| `schema.sql` | ❌ No | `complex_extension` | **Correct** — SQL needs architectural review |
| `src/components/Form.tsx` (wave 2, ctx 5000, 12 imports) | ✅ Yes | Standard component | **Possibly wrong** — high import density not checked |

---

## C. Factors That Best Explain Fast-Path Success/Failure

### Factors Currently Used (and their quality)

| Factor | Used In Policy? | Predictive Quality | Notes |
|---|---|---|---|
| **File type** (`fileType`) | ✅ Yes | **Medium** | Good for extremes (schema=risky, util=safe), but too coarse for hooks/pages |
| **Wave number** | ✅ Yes | **Medium-High** | Wave 1 exclusion is sound. But wave 2+ is treated uniformly — later waves could be more aggressively fast-pathed |
| **Context length** | ✅ Yes | **Low-Medium** | 12,000 char threshold is arbitrary. Context length alone doesn't predict complexity |
| **Path pattern** (regex) | ✅ Yes | **High** | Edge functions, migrations, integrations correctly excluded |
| **File extension** | ✅ Yes | **High** for `.sql` | Correct for SQL; not useful for `.ts`/`.tsx` since those span all complexity levels |

### Factors NOT Currently Used (predicted quality)

| Factor | Available? | Expected Predictive Quality | Notes |
|---|---|---|---|
| **Import density** | ✅ Code exists (`countImports`) | **Medium-High** | High import count = many integration points = higher risk. Currently computed but not used in eligibility |
| **Integration severity history** | ❌ No data | **High** | If a file type consistently gets `major_fix`, it should route to safe path. No data collected yet |
| **Retry count** | ✅ In payload | **High** | Retried files should never use fast path. Currently NOT checked in eligibility |
| **File name patterns** | ✅ Available | **Medium** | Files containing "auth", "config", "provider" in name are likely higher risk regardless of type |
| **Downstream dependency count** | ❌ Not available | **Medium-High** | Files depended on by many others are higher-impact |
| **Previous generation failure** | ❌ Not tracked | **High** | If prior attempt failed, the next attempt should use safe path |

---

## D. Factors That Are Weak/Noisy

| Factor | Why Weak |
|---|---|
| **Context length alone** | A 15,000 char context for a simple component with verbose dependency code is not inherently risky. Context length conflates *input volume* with *task complexity* |
| **`fileType` as sole discriminator** | `fileType` categories are too broad. A `component` can range from a 20-line button to a 500-line dashboard with 15 integrations |
| **Wave number > 1 treated uniformly** | Wave 5 is much safer than wave 2 for fast-path. No gradient exists |
| **Binary eligible/ineligible** | The current system returns boolean eligibility. A confidence score would allow soft boundaries |

---

## E. Current Policy Weaknesses

### 1. **CRITICAL: Metrics sink is broken**
The `pipeline_job_metrics` table does not exist. All OX-6 instrumentation silently fails. No data-driven policy tuning is possible until this is fixed.

**Impact**: The entire OX-6 feedback loop (metrics → evaluation → policy adjustment) is non-functional.

### 2. **Import density computed but not used**
`countImports()` is called (line 325) and stored in the policy record, but `evaluateFastPathEligibility()` does not consider it. Files with 15+ imports are treated the same as files with 2 imports.

**Impact**: High-integration files (forms with many hooks, pages with many service calls) may be incorrectly fast-pathed.

### 3. **Retry count not considered**
The eligibility function does not check retry count. A file being retried after failure should escalate to the safe path, not repeat the same fast-path attempt.

**Impact**: Repeated failures on the same file without path escalation.

### 4. **No semantic file-name sensitivity**
Files named `AuthProvider.tsx`, `ProtectedRoute.tsx`, or `DatabaseContext.tsx` are treated as standard components despite having infrastructure-level responsibility.

**Impact**: Critical auth/infra files may get insufficient architectural specification.

### 5. **Context threshold is a single static number**
`MAX_CONTEXT_FOR_FAST_PATH = 12,000` applies uniformly. This doesn't account for the fact that a utility file at 13,000 chars (due to verbose dependency context) is very different from a page at 13,000 chars (due to genuine complexity).

**Impact**: Some files are over-conservatively routed; others are under-conservatively routed. The threshold doesn't interact with other factors.

### 6. **No wave gradient**
Wave 1 → safe path. Wave 2+ → fast path eligible. But wave 2 (early-stage, many dependencies not yet generated) is meaningfully riskier than wave 5 (most dependencies exist).

**Impact**: Early-wave files with incomplete context may generate poorly on the fast path.

### 7. **No execution-stage records in pipeline_subjobs**
All 40 existing `pipeline_subjobs` records are architecture-stage only. The execution pipeline either hasn't been triggered end-to-end, or worker results aren't being recorded as subjobs.

**Impact**: No audit trail of execution decisions exists in any queryable form.

---

## F. DX-1 Summary

### What We Know

1. **The current fast-path policy is structurally reasonable** for its extremes: SQL/migrations/edge-functions correctly stay on the safe path; simple utils/components correctly get fast-pathed.

2. **The middle ground is under-specified**: hooks with many imports, pages with integration complexity, and auth-related components are eligible for fast-path when they probably shouldn't be.

3. **The metrics pipeline is broken**: `pipeline_job_metrics` doesn't exist as a table, so all OX-6 instrumentation is silently discarded. Zero empirical data has been collected.

4. **Three factors deserve promotion to first-class risk signals**:
   - **Import density** (already computed, not used)
   - **Retry count** (available in payload, not checked)
   - **Semantic file-name patterns** (auth, config, provider, context)

5. **Two factors are weaker than assumed**:
   - Context length alone (conflates volume with complexity)
   - File type alone (too coarse for the component/hook/page spectrum)

### Recommendations for Next Sprint

| Priority | Action | Justification |
|---|---|---|
| **P0** | Create `pipeline_job_metrics` table via migration | Without this, all metrics instrumentation is wasted |
| **P1** | Add `import_density` to eligibility check | Already computed; high-import files are measurably riskier |
| **P1** | Add `retry_count > 0 → safe path` rule | Failed files should never repeat the same path |
| **P2** | Add semantic name patterns (auth, config, provider) as risk signals | Low cost, meaningful safety improvement |
| **P2** | Add wave gradient (wave 2 = medium risk, wave 4+ = low risk) | Better than binary wave 1 vs wave 2+ |
| **P3** | Replace static context threshold with composite score | Requires data to calibrate; defer until metrics pipeline works |

### What We Cannot Yet Know

- Actual fast-path quality (no execution data)
- Whether the 2-call path produces worse code than the 3-call path
- Integration severity distribution in practice
- Whether the 12,000 char threshold is too high or too low
- Cost/latency savings from the fast path in production

**All of these require the metrics pipeline to function first.**

---

## Philosophy

> This audit found that the current policy's logic is sound at the boundaries but fragile in the middle. Before tuning heuristics or building adaptive routing, the foundation must be fixed: the metrics table must exist, and real execution data must flow. Optimizing a routing policy without measurement data is not engineering — it's guessing.
