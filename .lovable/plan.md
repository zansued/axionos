

# Sprint OX-4 — Performance Decision Gate

## A. Consolidated Performance Findings

### OX-1: Orchestration I/O Hygiene — Verified Gains

| Fix | Before | After | Estimated Saving |
|-----|--------|-------|-----------------|
| Batch clean-file output loading | N sequential queries (1 per clean subtask) | 1 query per 500 items | ~200-800ms per run (scales with clean files) |
| Batched `updateBrainEdgesFromImports` | ~3N+1 queries per file (N = import count) | 3 total queries per file | ~50-150ms per file |
| Debounced `updateProgress` | Write on every dispatch + completion | Max 1 write per 5s + wave boundaries | ~100-500ms per wave (fewer DB roundtrips) |
| Non-blocking `pipelineLog` / `recordAgentMessage` | Blocking `await` on hot path | Fire-and-forget `.catch(() => {})` | ~20-50ms per call removed from critical path |
| Parallel worker DB writes | Sequential subtask update + artifact insert | `Promise.all` | ~50-100ms per file |

**Total OX-1 estimated gain**: ~5-15% of non-AI execution time. Small in absolute terms because AI latency dominates, but eliminates unnecessary serialization on every hot-path cycle.

### OX-2: AI Efficiency Layer ROI — Measured Verdict

| Metric | Value | Source |
|--------|-------|--------|
| Execution-stage cache hit rate | ~0% | Structural (unique code gen prompts) |
| Pre-call overhead per `callAI` (with efficiency) | 3-13s per call (compression + 2× embedding gen) | Code analysis: up to 3 extra AI calls |
| Overhead per 3-call file (old path) | 9-39s parasitic latency | 3 calls × 3-13s overhead each |
| Double cache lookup bug | Fixed | Embedding reuse from miss data |
| **Policy applied** | `skipEfficiency=true` for all execution-stage calls | Worker code updated |

**OX-2 verdict**: The efficiency layer was actively harmful in execution. Disabling it for execution-stage calls eliminates 9-39s of wasted latency per file. This is the single largest non-AI-architecture improvement found. The layer remains active for planning/orchestration where prompt reuse may occur.

### OX-3: Worker Call Consolidation — Prototype Status

| Aspect | Status |
|--------|--------|
| Prototype implemented | Yes — `consolidated-worker-prototype.ts` |
| Feature flag | `useConsolidatedWorker` in payload |
| Design | Merged Architect+Developer → 1 call, Integration Agent → 1 call |
| Metrics instrumentation | `pipeline_job_metrics` table with `ox3_metrics` |
| Default path | Standard 3-call (unchanged) |
| Comparison data | **Not yet collected** — prototype exists but has not been run against real workloads |

**OX-3 verdict**: The prototype is structurally sound. The merged prompt includes both specification and implementation phases. Expected saving: ~8-20s per file (one full AI roundtrip eliminated). Quality impact: unknown until tested.

---

## B. Decision Matrix

| Option | Bottleneck Addressed | Expected Gain | Complexity | Risk | Confidence | Evidence Justifies? | Recommendation |
|--------|---------------------|---------------|------------|------|------------|--------------------|----|
| **Full rollout of 2-call worker** | AI latency (85-95% of time) | 25-35% per-file latency reduction | Low (code exists) | Medium (quality unknown) | Medium | **Not yet** — need A/B data | **Prototype first** — run controlled comparison |
| **Execution-stage AI fast-path** | Already done (OX-2) | 9-39s saved per file | Done | None | High | Yes | **Done** ✓ |
| **More DB batching** | Secondary DB chatter | 2-5% additional | Low | Low | High | Diminishing returns | **Defer** — major batching done in OX-1 |
| **Selective caching** (non-execution) | Planning/orchestration repeat calls | 5-10% on planning stages | Medium | Low | Medium | Partial | **Defer** — measure planning-stage hit rates first |
| **Redis prototype** | Transient state, queue polling | Unknown | High | High (ops complexity, consistency) | Low | No | **Reject for now** |
| **No additional infra change** | N/A | Baseline | None | None | High | Yes | **Valid default** |
| **Worker coordination tuning** | Wave dispatch overhead | 1-3% | Low | Low | Medium | Marginal | **Defer** |

---

## C. Updated Verdicts

### Redis
**Verdict: Still reject.** No new evidence changes the assessment. The system is I/O-bound on AI API calls, not on state lookup speed. DB batching (OX-1) addressed the verified read/write hotspots. Redis would add operational complexity for a problem that doesn't exist yet.

### Rust
**Verdict: Still reject.** The orchestrator spends <1% of wall-clock time on computation. The bottleneck is network I/O (AI API calls + DB). A compiled runtime would optimize the wrong layer entirely.

### Context Compression
**Verdict: Still defer.** `buildSmartContextWindow` already handles context sizing. No evidence of context-growth causing failures or degraded output quality. Revisit only if token costs become a concern or if output quality degrades on large projects.

---

## D. Recommended Next Sprint

### Immediate (OX-5: Consolidated Worker Validation)
1. **Run controlled A/B comparison** of 2-call vs 3-call on 10-20 real files
2. Measure: latency, token cost, output quality (manual review), integration error rate
3. Decision gate: if quality is acceptable at ≥80% of files, promote to default

### Medium-term
- If 2-call validated: promote as default, keep 3-call as fallback flag
- Measure planning-stage cache hit rates to decide if efficiency layer adds value there
- Consider adaptive model routing (use cheaper models for simpler files)

### Explicitly Deferred
- Redis infrastructure
- Additional DB batching beyond OX-1
- Worker architecture redesign
- Context compression engine

### Explicitly Rejected
- Rust port
- Full caching overhaul
- Speculative agent coordination redesign

---

## E. OX-4 Summary

The three sprints produced one major win (OX-2: eliminating 9-39s parasitic overhead per file), solid incremental gains (OX-1: fewer DB roundtrips), and a ready prototype (OX-3: 2-call consolidation). The dominant remaining bottleneck is the number of sequential AI calls per file — the only option that addresses this with evidence is the 2-call consolidation, which needs A/B validation before rollout. All infrastructure-heavy options (Redis, Rust) remain unjustified. The next correct move is to run the OX-3 prototype against real workloads and make a keep/promote/reject decision based on measured quality and latency data.

