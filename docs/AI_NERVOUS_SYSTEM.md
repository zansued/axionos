# AxionOS — AI Nervous System

> **Purpose:** Architecture reference for the AI Nervous System.
> **Last Updated:** 2026-03-15

---

## What It Is

The AI Nervous System is the **real-time operational intelligence backbone** of AxionOS. It converts raw platform signals into governed, auditable operational decisions through a strict, deterministic lifecycle.

It is **not** a chatbot, alerting system, or LLM-powered inference engine.

It is **infrastructure** — a disciplined signal-to-triage pipeline with learning feedback.

---

## Architectural Position

The Nervous System is the **operational cortex**.
The Action Engine stack is the **governed motor system**.

They are **not** parallel systems. They are complementary halves of one organism.

```
┌─────────────────────────────────────────────────────────────────┐
│                    AxionOS Components                           │
│  (Agents, Pipelines, Runtime, Canon, Governance)               │
└──────────────────────┬──────────────────────────────────────────┘
                       │ emit events
                       ▼
              ┌─────────────────┐
              │   NS-01: Ingest │  fingerprint, deduplicate, persist
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │  NS-02: Classify│  domain, severity, novelty, groups
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ NS-03: Context  │  correlate, sequence, link
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │  NS-04: Decide  │  observe / surface / escalate / act / learn
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ NS-05: Surface  │  curate, filter noise, operator workflow
              └────────┬────────┘
                       │ approved items
                       ▼
         ┌───────────────────────────┐
         │  HANDOFF BOUNDARY         │  nervous-system-action-handoff.ts
         │  (spinal cord)            │
         └─────────────┬─────────────┘
                       ▼
    ┌────────────────────────────────────────────┐
    │  EXISTING AXIONOS ACTION ENGINE STACK       │
    │                                             │
    │  action-engine → action_registry_entries    │
    │  approval-expiration → governance timers    │
    │  axion-execution-worker → governed exec     │
    │  action_audit_events → audit trail          │
    └──────────────────┬─────────────────────────┘
                       │ execution outcomes
                       ▼
              ┌─────────────────┐
              │  Learning Loop  │  feedback → calibration hints
              │  (back into NS) │
              └─────────────────┘
```

---

## Lifecycle

Every operational signal follows this progression:

```
new → classified → contextualized → decided → surfaced → [handoff] → executed → learned
```

The Nervous System owns: `new` through `surfaced` (and operator triage).
The Action Engine stack owns: `executed` (formalize, approve, execute, audit).
The Nervous System receives: execution outcomes as learning feedback.

---

## Architecture Layers

### NS-01: Signal Foundation

**Tables:** `nervous_system_events`, `nervous_system_live_state`

- Ingests raw operational events from any system component
- Applies deterministic fingerprinting (djb2 hash) with 5-minute deduplication window
- Validates payload limits (32KB event, 8KB metadata)
- Updates live pulse state asynchronously (non-blocking)
- Hardened RLS: service_role write, authenticated read filtered by org

### NS-02: Signal Classification & Grouping

**Tables:** `nervous_system_signal_groups`, `nervous_system_event_patterns`

- Deterministic rule-based classification (domain, subdomain, severity)
- Novelty scoring and confidence calculation
- Groups recurring signals via composite keys (`domain::event_type::fingerprint`)
- Conservative pattern promotion (minimum 5 evidence events)
- Lifecycle: `new` → `classified`

### NS-03: Context Engine

**Tables:** `nervous_system_event_context_links`

- Correlates classified signals with recent history (30-minute window)
- Detects operational sequences (escalation, recovery, instability)
- Links events to agents, initiatives, and Canon entries
- Calculates contextual confidence based on evidence density
- Lifecycle: `classified` → `contextualized`

### NS-04: Decision Layer

**Tables:** `nervous_system_decisions`

- Converts contextualized events into explicit typed decisions
- Decision types: `observe`, `surface`, `recommend_action`, `escalate`, `queue_for_action`, `mark_for_learning`
- Determines risk level, priority, and recommended action with typed payload
- **Decisions are advisory-operational** — not final action-governance authority
- Lifecycle: `contextualized` → `decided`

### NS-05: Surfacing Layer

**Tables:** `nervous_system_surfaced_items`

- Converts decisions into curated, operator-facing items
- Threshold-based filtering to reduce noise (low-value observes are not surfaced)
- Surface types: `decision_surface`, `escalation_surface`, `recommendation_surface`, `learning_surface`, `queue_surface`
- Operator workflow: `active` → `acknowledged` → `approved` → `resolved` (or `dismissed`)
- **Surfaced items are triage surfaces** — not a second approval domain
- Lifecycle: `decided` → `surfaced`

### Handoff Boundary

**Module:** `_shared/nervous-system-action-handoff.ts`

- Approved surfaced items are translated into `action_registry_entries`
- Uses existing action engine semantics: `trigger_type`, `execution_mode`, `risk_level`, `requires_approval`
- Preserves full NS traceability in action payload: `ns_event_id`, `ns_decision_id`, `ns_surfaced_item_id`, `ns_signal_group_id`
- Writes to existing `action_audit_events` for audit trail
- No second execution worker, no second approval authority

### Learning Feedback

**Tables:** `nervous_system_learning_feedback`

- Receives execution outcomes from the existing Action Engine stack
- Classifies as: `execution_success`, `execution_failure`, `false_positive`, `dismissal_signal`, etc.
- Produces calibration hints (advisory only — no autonomous recalibration)
- Re-emits outcome events back into NS for future signal processing

---

## Where It Fits in AxionOS

The Nervous System is part of the **Internal System Architecture** (Layer 4).

```
┌──────────────────────────────────┐
│  User Product Surface            │  ← what users see
├──────────────────────────────────┤
│  Workspace Governance Surface    │  ← what operators manage
├──────────────────────────────────┤
│  Platform Governance Surface     │  ← what platform admins govern
├──────────────────────────────────┤
│  Internal System Architecture    │  ← where the Nervous System lives
│  ┌────────────────────────────┐  │
│  │  AI Nervous System         │  │  operational cortex
│  │  (NS-01 → NS-05 + triage) │  │
│  ├────────────────────────────┤  │
│  │  Action Engine Stack       │  │  governed motor system
│  │  (formalize → execute)     │  │
│  ├────────────────────────────┤  │
│  │  Handoff Boundary          │  │  spinal cord
│  ├────────────────────────────┤  │
│  │  Canon, AgentOS, Memory,   │  │
│  │  Governance                │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

---

## Integration Map

| Responsibility | Owner | Tables |
|---|---|---|
| Signal ingestion, fingerprinting, dedup | Nervous System | `nervous_system_events` |
| Classification, grouping, patterns | Nervous System | `nervous_system_signal_groups`, `nervous_system_event_patterns` |
| Contextualization, sequence detection | Nervous System | `nervous_system_event_context_links` |
| Advisory decisions | Nervous System | `nervous_system_decisions` |
| Operator triage surfaces | Nervous System | `nervous_system_surfaced_items` |
| Action formalization | Action Engine | `action_registry_entries` |
| Approval workflow + TTL | Action Engine | `action_approval_requests`, `approval-expiration` |
| Governed execution | Action Engine | `axion-execution-worker` |
| Execution audit trail | Action Engine | `action_audit_events` |
| Handoff bridge | Handoff Module | `nervous_system_surfaced_items.handoff_*` → `action_registry_entries` |
| Learning feedback | Nervous System | `nervous_system_learning_feedback` |
| Live state | Nervous System | `nervous_system_live_state` |

---

## Deprecated Components

| Component | Status | Reason |
|---|---|---|
| `autonomic_actions` table | **Deprecated** | Duplicated `action_registry_entries`. Handoff module replaces. |
| `nervous-system-action-engine.ts` execution functions | **Deprecated** | `createActionFromApprovedSurface`, `executeGovernedAction`, `processApprovedActionsBatch` replaced by handoff. `resolveSurfacedItem`, `expireSurfacedItem` still active. |
| `process_approved_actions_batch` API action | **Removed** | Replaced by `handoff_surface_to_action_engine`. |
| `list_actions`, `get_action_feed` API actions | **Removed** | Use existing action registry queries. |

---

## Invariants

1. **No LLM** — all classification, decision, and surfacing logic is deterministic
2. **No approval bypass** — high-risk actions require explicit operator approval
3. **No autonomous mutation** — the system recommends, never self-modifies architecture
4. **No parallel execution** — one action engine, one execution worker, one audit trail
5. **Full auditability** — every transition preserves lineage to source event
6. **Tenant isolation** — all queries and state scoped by organization
7. **Noise reduction** — surfacing layer filters low-value signals explicitly
8. **Learning is advisory** — feedback produces calibration hints, not automatic changes
9. **Handoff traceability** — every handed-off action carries `ns_event_id`, `ns_decision_id`, `ns_surfaced_item_id`

---

## Key Tables Summary

| Table | Layer | Purpose |
|-------|-------|---------|
| `nervous_system_events` | NS-01 | Raw operational events |
| `nervous_system_live_state` | NS-01 | Real-time pulse for UI |
| `nervous_system_signal_groups` | NS-02 | Recurring signal aggregation |
| `nervous_system_event_patterns` | NS-02 | Promoted operational patterns |
| `nervous_system_event_context_links` | NS-03 | Temporal and semantic correlations |
| `nervous_system_decisions` | NS-04 | Typed advisory decisions |
| `nervous_system_surfaced_items` | NS-05 | Operator-facing curated items |
| `nervous_system_learning_feedback` | NS-06 | Execution outcome feedback |
| `action_registry_entries` | Action Engine | Governed executable actions |
| `action_approval_requests` | Action Engine | Approval workflow |
| `action_audit_events` | Action Engine | Execution audit trail |

---

## Edge Function

All Nervous System operations are exposed through a single edge function:

**`nervous-system-engine`**

Key actions:
- `emit_event`, `process_pending`, `process_context_batch`, `process_decision_batch`
- `process_surfacing_batch`, `get_pulse`, `get_classified_feed`, `get_surfaced_feed`
- `acknowledge_surface`, `approve_surface`, `dismiss_surface`
- `handoff_surface_to_action_engine`, `get_handoff_status`, `ingest_execution_outcome`
- `resolve_surface_item`, `expire_surface_item`, `register_feedback_signal`

---

## Source of Truth

This document must stay synchronized with:
- **[AXION_PRIMER.md](AXION_PRIMER.md)** — system overview
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — full architecture reference
- **[GOVERNANCE.md](GOVERNANCE.md)** — governance contracts
