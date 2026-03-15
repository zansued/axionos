# AxionOS — AI Nervous System

> **Purpose:** Architecture reference for the AI Nervous System.
> **Last Updated:** 2026-03-15

---

## What It Is

The AI Nervous System is the **real-time operational intelligence backbone** of AxionOS. It converts raw platform signals into governed, auditable operational actions through a strict, deterministic lifecycle.

It is **not** a chatbot, alerting system, or LLM-powered inference engine.

It is **infrastructure** — a disciplined signal-to-action pipeline with learning feedback.

---

## Lifecycle

Every operational signal follows this progression:

```
new → classified → contextualized → decided → surfaced → executed → learned
```

Each transition is explicit, auditable, and traceable.

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
- All logic is deterministic and rule-based — no LLM
- Lifecycle: `contextualized` → `decided`

### NS-05: Surfacing Layer

**Tables:** `nervous_system_surfaced_items`

- Converts decisions into curated, operator-facing items
- Threshold-based filtering to reduce noise (low-value observes are not surfaced)
- Surface types: `decision_surface`, `escalation_surface`, `recommendation_surface`, `learning_surface`, `queue_surface`
- Operator workflow: `active` → `acknowledged` → `approved` → `resolved` (or `dismissed`)
- Lifecycle: `decided` → `surfaced`

### NS-06: Governed Action Execution & Learning Feedback

**Tables:** `autonomic_actions`, `nervous_system_learning_feedback`

- Creates executable actions only from **approved** surfaced items
- Three execution modes: `manual`, `assisted`, `automatic`
- Only low-risk actions eligible for automatic execution
- Policy snapshot captured at execution time
- Learning feedback captures: success, failure, false positives, threshold calibration hints
- Lifecycle: `surfaced` → `executed` → `learned`

---

## Data Flow Diagram

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
                       ▼
              ┌─────────────────┐
              │ NS-06: Execute  │  governed actions + learning feedback
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Learning Loop  │  calibration hints → future thresholds
              └─────────────────┘
```

---

## Where It Fits in AxionOS

The Nervous System is part of the **Internal System Architecture** (Layer 4).

It operates **below** all user-facing, workspace, and platform governance surfaces.

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
│  │  AI Nervous System         │  │
│  │  (NS-01 → NS-06)          │  │
│  ├────────────────────────────┤  │
│  │  Engines, Canon, AgentOS,  │  │
│  │  Memory, Governance        │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

The Nervous System **connects to** but does not replace:
- **Action Engine** — NS decisions may feed into formal Axion Actions
- **AgentOS** — agent events are ingested as NS signals
- **Canon** — context engine links signals to Canon knowledge
- **Governance** — surfaced items require operator approval before execution

---

## Invariants

1. **No LLM** — all classification, decision, and surfacing logic is deterministic
2. **No approval bypass** — high-risk actions require explicit operator approval
3. **No autonomous mutation** — the system recommends, never self-modifies architecture
4. **Full auditability** — every transition preserves lineage to source event
5. **Tenant isolation** — all queries and state scoped by organization
6. **Noise reduction** — surfacing layer filters low-value signals explicitly
7. **Policy snapshots** — execution captures policy state at action time
8. **Learning is advisory** — feedback produces calibration hints, not automatic changes

---

## Key Tables Summary

| Table | Layer | Purpose |
|-------|-------|---------|
| `nervous_system_events` | NS-01 | Raw operational events |
| `nervous_system_live_state` | NS-01 | Real-time pulse for UI |
| `nervous_system_signal_groups` | NS-02 | Recurring signal aggregation |
| `nervous_system_event_patterns` | NS-02 | Promoted operational patterns |
| `nervous_system_event_context_links` | NS-03 | Temporal and semantic correlations |
| `nervous_system_decisions` | NS-04 | Typed operational decisions |
| `nervous_system_surfaced_items` | NS-05 | Operator-facing curated items |
| `autonomic_actions` | NS-06 | Governed executable actions |
| `nervous_system_learning_feedback` | NS-06 | Execution outcome feedback |

---

## Edge Function

All Nervous System operations are exposed through a single edge function:

**`nervous-system-engine`**

Key actions:
- `ingest_event`, `process_classification_batch`, `process_context_batch`
- `process_decision_batch`, `process_surfacing_batch`, `process_approved_actions_batch`
- `get_pulse`, `get_classified_feed`, `get_surfaced_feed`, `get_action_feed`
- `acknowledge_surface`, `approve_surface`, `dismiss_surface`
- `resolve_surface_item`, `expire_surface_item`, `register_feedback_signal`

---

## Source of Truth

This document must stay synchronized with:
- **[AXION_PRIMER.md](AXION_PRIMER.md)** — system overview
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — full architecture reference
- **[GOVERNANCE.md](GOVERNANCE.md)** — governance contracts
