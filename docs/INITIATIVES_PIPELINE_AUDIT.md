# AxionOS — Initiative Pipeline Operational Audit

---

## 1. Purpose

Ensure the core AxionOS promise — **Idea → Discovery → Architecture → Engineering → Validation → Deploy → Delivered Software** — operates with full traceability, so any operator can explain **what is running, where it failed, and why** within 30 seconds.

---

## 2. Audit Scope

| Dimension | Coverage |
|-----------|----------|
| Pipeline path | Modular (`pipeline-*`) + Legacy (`run-initiative-pipeline`) |
| Stages analyzed | Execution orchestration, validation/fix loop, publish, deploy, state management |
| Out of scope | Canon operations, governance engines, learning loops, marketplace, advisory systems |

---

## 3. Evidence Window

| Parameter | Value |
|-----------|-------|
| **Audit date** | 2026-03-16 |
| **Time window** | All `initiative_jobs` and `action_registry_entries` records up to audit date |
| **Sources consulted** | `initiative_jobs` (status, stage, error, duration), `initiatives` (stage_status, execution_progress, repo_url, deploy_url), `agent_outputs` (validation artifacts), `action_registry_entries` (action lifecycle), `action_approval_requests` (approval lifecycle) |
| **Method** | Direct SQL queries against production database + code review of edge functions |

---

## 4. Executive Summary

The initiative delivery pipeline already covers the full idea-to-deploy journey, but suffers from **operational coherence gaps** rather than missing features. Four systemic findings were identified:

1. **Parallelism bottleneck** — master jobs leak slots, causing `PARALLEL_LIMIT_EXCEEDED`.
2. **Fix Loop instability** — validation runs overlap, timeout, and lack operational trail.
3. **Publish/Deploy unreliability** — three distinct failure classes prevent consistent delivery.
4. **Macro-state inconsistency** — `stage_status` diverges from operational reality.

The root cause across all four is the same: **absence of canonical contracts for job lifecycle, state transitions, and pre-condition validation.**

---

## 5. Findings

### Finding 1 — Parallelism Bottleneck

| Attribute | Detail |
|-----------|--------|
| **Finding** | When the execution orchestrator pauses due to time budget (`batch_incomplete`), the master job remains in `running` status, consuming a parallel slot indefinitely. |
| **Evidence** | `execution_orchestrator` jobs found in `running` status with no active invocation. `execution_worker` jobs failed by stale cleanup. System returned HTTP 402 `PARALLEL_LIMIT_EXCEEDED (8/8)`. |
| **Impact** | Pipeline completely blocks — no new initiative can execute until manual intervention clears stuck jobs. |
| **Status** | **Partially fixed.** Master job now releases on `batch_incomplete`. Orphan cleanup added to orchestrator start. Stale threshold for workers reduced to 5 min. |
| **Remaining risk** | No explicit re-scheduling mechanism for paused batches. Worker and master jobs share the same parallel slot pool. No unified cleanup cron. |

### Finding 2 — Fix Loop Instability

| Attribute | Detail |
|-----------|--------|
| **Finding** | The validation/fix loop executes without sufficient operational trail and with overlapping/interrupted runs. |
| **Evidence** | `pipeline-validation` stage recorded **40 failures** in the evidence window: **24×** timeout/redeploy interruption, **13×** superseded by new validation run, **10×** auto-cleanup by short runtime, **2×** `safeSubtaskIds is not defined` bug. |
| **Impact** | Fix Loop failures are invisible — operator cannot determine which artifact is being validated, which attempt is current, or why it failed. Overlapping runs waste compute and corrupt state. |
| **Status** | **Partially fixed.** Current artifact, phase, and attempt count now persisted in `execution_progress`. |
| **Remaining risk** | No per-artifact timing. No categorized issue summary. No concurrency guard preventing overlapping validation runs. |

### Finding 3 — Publish/Deploy Unreliability

| Attribute | Detail |
|-----------|--------|
| **Finding** | Publish and deploy fail for three independent classes of reasons, none caught by pre-flight validation. |
| **Evidence** | **4×** `Bad credentials` (GitHub token invalid/expired). **4×** blocked dependency `@vitejs/plugin-react` (generated during execution, caught only at publish). **3×** critical files missing (`index.html`, `vite.config.ts`). **1×** deploy attempted without `repo_url` (publish never completed). |
| **Impact** | The final delivery step — the most visible to the user — fails unpredictably. Users see a pipeline that "worked" through execution and validation but cannot deliver. |
| **Status** | **Not fixed.** No pre-flight checks exist for credentials, critical files, or blocked dependencies. |
| **Remaining risk** | All evidence items remain active failure modes. |

### Finding 4 — Initiative Macro-State Inconsistency

| Attribute | Detail |
|-----------|--------|
| **Finding** | Initiative `stage_status` can diverge from operational reality — showing an earlier stage while `execution_progress`, `repo_url`, and `deploy_url` indicate completion. |
| **Evidence** | At least one initiative found with `stage_status = planning`, `execution_progress` showing completed work, and URLs populated. |
| **Impact** | Operator cannot trust `stage_status` as source of truth. UI shows incorrect progress. Subsequent pipeline stages may re-execute completed work or skip incomplete work. |
| **Status** | **Not fixed.** No state machine contract exists. No reconciliation mechanism. |
| **Remaining risk** | Any edge function can set `stage_status` to any value without validation. |

---

## 6. Canonical Contracts at Risk

These are not isolated bugs — they are **structural contract violations** that enable recurring failures:

| Contract | Expected Behavior | Observed Violation |
|----------|-------------------|-------------------|
| **Job lifecycle finality** | Every job that starts must reach a terminal state (`completed`, `failed`) within bounded time. | Master jobs remain `running` after invocation ends. Workers accumulate as orphans. |
| **State transition validity** | `stage_status` transitions follow a defined state machine. No stage can be skipped or regressed without explicit rollback. | `stage_status` set directly by any function without transition validation. Observed: `planning` while operationally `published`. |
| **Publish pre-conditions** | Publish only executes when: (a) GitHub credentials valid, (b) critical files present, (c) no blocked dependencies. | Publish attempts execution and fails mid-way for each of these conditions. |
| **Deploy pre-conditions** | Deploy only executes when publish has completed and `repo_url` is confirmed. | Deploy attempted without confirmed `repo_url`. |
| **Validation exclusivity** | Only one validation run per initiative at a time. New runs cancel or wait for existing ones. | 13 validation runs superseded by concurrent new runs. |

---

## 7. Mandatory Operational Checklist

### A. Execution Traceability

| Requirement | Status | Owner | Notes |
|-------------|--------|-------|-------|
| Show current subtask during execution | ✅ Done | — | Persisted in `execution_progress` |
| Persist `current_subtask_description`, `current_file`, `current_story_id`, `current_stage` | ✅ Done | — | Sprint 200 |
| Show `wave_number`, current agent, retry count per node | ⬜ Todo | — | Needs `execution_progress` schema extension |
| Display last 5 completed/failed subtasks history | ⬜ Todo | — | UI component update |

### B. Fix Loop Traceability

| Requirement | Status | Owner | Notes |
|-------------|--------|-------|-------|
| Persist current artifact being validated | ✅ Done | — | Sprint 200 |
| Persist current phase (`analysis`, `fixing`, `reanalysis`, `approved`, `escalated`, `failed`) | ✅ Done | — | Sprint 200 |
| Persist current attempt and primary blocker | ✅ Done | — | Sprint 200 |
| Persist categorized issue summary per artifact | ⬜ Todo | — | — |
| Display time elapsed per validated artifact | ⬜ Todo | — | — |

### C. Orchestrator Robustness

| Requirement | Status | Owner | Notes |
|-------------|--------|-------|-------|
| Release master job on `time_budget` pause | ✅ Done | — | Sprint 200 |
| Explicit re-scheduling for paused batches (not implicit frontend retry) | ⬜ Todo | — | Backend continuation job |
| Separate parallelism counting: master vs worker slots | ⬜ Todo | — | `usage-limit-enforcer.ts` |
| Unified orphan job cleanup policy (cron or invocation-start) | ⬜ Todo | — | — |
| Concurrency guard: prevent overlapping validation runs per initiative | ⬜ Todo | — | Lock or status check |

### D. Publish/Deploy

| Requirement | Status | Owner | Notes |
|-------------|--------|-------|-------|
| Validate GitHub connection before publish start | ⬜ Todo | — | `GET /user` with token |
| Fail early on invalid token/credentials | ⬜ Todo | — | — |
| Validate critical files before publish | ⬜ Todo | — | `index.html`, `vite.config.ts`, `package.json`, `tsconfig.json` |
| Block forbidden dependencies at execution, not publish | ⬜ Todo | — | `code-sanitizers.ts` |
| Reject deploy without confirmed `repo_url` | ⬜ Todo | — | — |

### E. State Consistency

| Requirement | Status | Owner | Notes |
|-------------|--------|-------|-------|
| Canonical state transition map (enum/contract with valid transitions) | ⬜ Todo | — | New `initiative-state-machine.ts` |
| All `pipeline-*` functions validate transition before altering `stage_status` | ⬜ Todo | — | `pipeline-helpers.ts` guard |
| Reconciliation routine for divergent macro-state | ⬜ Todo | — | Detect and repair |
| `published` status requires `repo_url` to be set | ⬜ Todo | — | Trigger or guard |

---

## 8. Remediation Plan

### P0 — Unblock execution and provide visibility

| # | Item | Target | Definition of Done |
|---|------|--------|-------------------|
| 1 | Explicit re-scheduling for paused batches | `pipeline-execution-orchestrator` | Paused batch automatically resumes without frontend intervention. No manual retry needed. |
| 2 | Separate master/worker parallel slot counting | `usage-limit-enforcer.ts` | Workers do not consume orchestrator slots. Verified by running 6 workers + 1 orchestrator simultaneously. |
| 3 | Unified orphan cleanup | `usage-limit-enforcer.ts` + helper | Zero jobs in `running` state older than 5 min for workers, 15 min for orchestrators. Verified by query. |
| 4 | Validation concurrency guard | `pipeline-validation` | Only one validation run per initiative active at any time. Verified by concurrent invocation test. |

**Validation query (P0 complete):**
```sql
SELECT count(*) FROM initiative_jobs
WHERE status = 'running'
AND started_at < now() - interval '15 minutes';
-- Expected: 0
```

### P1 — Reliable publish and deploy

| # | Item | Target | Definition of Done |
|---|------|--------|-------------------|
| 1 | GitHub credential pre-flight | `pipeline-publish` | Publish with invalid token fails in <2s with structured error. Verified by revoking test token. |
| 2 | Critical file pre-flight | `pipeline-publish` | Publish without `index.html` fails before GitHub API call. Verified by deleting artifact. |
| 3 | Block forbidden deps at execution | `pipeline-execution-worker` + `code-sanitizers.ts` | `@vitejs/plugin-react` never appears in generated `package.json`. Verified by grep on outputs. |
| 4 | Deploy guard | `initiative-deploy-engine` | Deploy without `repo_url` returns 400 with clear message. Verified by direct invocation. |

**Validation query (P1 complete):**
```sql
SELECT count(*) FROM initiative_jobs
WHERE stage IN ('publish', 'deploy')
AND status = 'failed'
AND error LIKE '%Bad credentials%'
AND created_at > now() - interval '7 days';
-- Expected: 0
```

### P2 — Structural alignment and observability

| # | Item | Target | Definition of Done |
|---|------|--------|-------------------|
| 1 | Canonical state machine | `initiative-state-machine.ts` | Invalid transition throws error. Verified by unit test for all edge cases. |
| 2 | State reconciliation routine | Helper or scheduled function | Divergent initiatives detected and reported. Verified by seeding a divergent state and running reconciler. |
| 3 | Unified initiative timeline | UI component + SQL view | Operator sees chronological event list for any initiative in <1s. |
| 4 | Pipeline failure dashboard | UI component + SQL query | Top 5 failure reasons per stage visible for last 7 days. |

**Validation query (P2 complete):**
```sql
SELECT count(*) FROM initiatives
WHERE stage_status = 'planning'
AND (repo_url IS NOT NULL OR deploy_url IS NOT NULL);
-- Expected: 0
```

---

## 9. Definition of Done — Full Audit Resolution

The initiative pipeline audit is considered **resolved** when ALL of the following operational metrics hold for 7 consecutive days:

| Metric | Target |
|--------|--------|
| **TTA (Time to Answer pipeline state)** | < 30 seconds via UI |
| **Orphan master jobs** | 0 |
| **`PARALLEL_LIMIT_EXCEEDED` errors** | 0 (from job leaks) |
| **Deploy attempts without confirmed publish** | 0 |
| **Macro-state divergence incidents** | 0 |
| **Validation runs without artifact/phase visibility** | 0 |
| **Publish failures from pre-condition violations** | 0 |
| **Overlapping validation runs per initiative** | 0 |

---

## 10. Open Risks / Follow-up

| Risk | Severity | Mitigation |
|------|----------|------------|
| Frontend retry logic for validation may create race conditions if backend concurrency guard is not implemented first | High | Implement C.5 (concurrency guard) before migrating retry to backend |
| Legacy `run-initiative-pipeline` may bypass new state machine guards | Medium | Add deprecation warning log; route all new initiatives through modular path |
| GitHub token rotation/expiration between publish stages | Medium | Cache validation result for max 5 min; re-validate on retry |
| Stale `execution_progress` data if worker crashes between DB writes | Low | Reconciler (P2.2) handles this as secondary check |

---

## Source of Truth

This document must stay synchronized with:
- [`SPRINT_PLAN_PIPELINE_RELIABILITY.md`](./SPRINT_PLAN_PIPELINE_RELIABILITY.md) — Implementation sprints
- [`INITIATIVE_DELIVERY_PIPELINE_MAP.md`](./INITIATIVE_DELIVERY_PIPELINE_MAP.md) — Stage-to-function mapping
- [`EDGE_FUNCTIONS_SYSTEM_MAP.md`](./EDGE_FUNCTIONS_SYSTEM_MAP.md) — Full system catalog
