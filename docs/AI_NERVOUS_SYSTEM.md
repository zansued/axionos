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
10. **Temporal layer is advisory** — produces hints for decision/surfacing boost, never triggers actions directly

---

## NS-Temporal: Temporal Accumulation Layer (LIF)

**Table:** `nervous_system_temporal_state`
**Module:** `_shared/nervous-system-temporal-engine.ts`

A complementary layer inspired by Leaky Integrate-and-Fire (LIF) models that adds temporal awareness to the Nervous System without altering the NS-01 to NS-05 pipeline.

### How It Works

1. **Integrate** — Each classified event contributes charge to its domain's accumulator, weighted by severity, novelty, and confidence
2. **Leak** — Charge decays exponentially over time: `charge(t) = charge(t-1) × e^(-λ × Δt)`
3. **Fire** — When accumulated charge exceeds the fire threshold, a spike is recorded and charge is reset to 50% (refractory period)
4. **State** — Derived operational states based on charge, spikes, and duration:

| State | Condition | Priority Boost |
|-------|-----------|----------------|
| `nominal` | charge < 0.3 | 0.0 |
| `elevated` | charge ≥ 0.3 | 0.05 |
| `stressed` | charge ≥ 0.6 | 0.15 |
| `pain` | charge ≥ 0.85 + spikes ≥ 3 + avg_severity ≥ 0.7 | 0.25 |
| `fatigued` | charge ≥ 0.5 + stressed for 2h+ | 0.20 |
| `recovering` | was stressed+, charge < 0.2 for 15min | 0.0 |
| `critical_cascade` | 3+ domains in stressed/pain simultaneously | 0.30 |

### Integration with NS-04 (Decision Engine)

The Decision Engine queries temporal hints before making decisions. If a domain is under stress/pain/cascade, the hint boosts decision confidence and surfacing attention — strictly advisory.

### Rollback

The temporal layer is 100% reversible. Removing it does not affect NS-01 to NS-05. All temporal data is in a separate table and metadata extensions are additive.

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
| `nervous_system_temporal_state` | NS-Temporal | LIF accumulation, decay, operational states |
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

## Sprint 2 — Memory Evolution Layer

### Overview

The Memory Evolution layer (Sprint 2) introduces three new modules that complement the existing memory infrastructure:

1. **Unified Memory Context Assembler** (`_shared/memory-evolution/unified-memory-assembler.ts`)
   - Assembles bounded context from ALL memory layers (agent, engineering, organism, institutional)
   - Deduplication by `context_signature`
   - Composite scoring: `relevance * 0.35 + confidence * 0.25 + freshness * 0.25 + access * 0.15`
   - Tier classification: `ephemeral → operational → historical → archived`
   - Health snapshot with freshness, stale ratio, tier distribution

2. **Memory Lifecycle & Decay Engine** (`_shared/memory-evolution/memory-lifecycle-engine.ts`)
   - Time-based decay: `effective = base * e^(-λ * age_days) + access_boost`
   - Per-type decay rates (λ): `run=0.5`, `episodic=0.02`, `strategic=0.01`, `doctrinal=0.002`
   - Tier transition thresholds: `archive < 0.1`, `historical < 0.25`, `operational ≥ 0.5`
   - Advisory sweep: evaluates all entries, recommends transitions
   - Bounded eviction: max 50 per call, auditable

3. **Memory Consolidation Engine** (`_shared/memory-evolution/memory-consolidation-engine.ts`)
   - Exact dedup by `context_signature`
   - Cross-layer merge detection via Jaccard similarity (threshold: 0.6)
   - Prune detection for entries below composite score 0.15
   - Advisory-first: produces recommendations, not automatic mutations

### New Edge Function Actions

Added to `organism-memory-engine`:
- `unified_retrieve` — cross-layer contextual retrieval
- `lifecycle_sweep` — advisory decay & tier transition analysis
- `consolidate` — redundancy detection report
- `memory_health` — comprehensive health assessment
- `apply_evictions` — bounded, auditable cleanup

### New Tables

- `memory_lifecycle_events` — audit trail for tier transitions
- `memory_consolidation_log` — records of consolidation actions

### Architectural Invariants Preserved

- Advisory-first: all sweep/consolidation results are recommendations
- Bounded adaptation: max entries, max evictions, decay caps
- Tenant isolation: all queries scoped by `organization_id` with RLS
- Rollback: eviction is the only destructive action, bounded and logged
- No autonomous architecture mutation

---

## Source of Truth

This document must stay synchronized with:
- **[AXION_PRIMER.md](AXION_PRIMER.md)** — system overview
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — full architecture reference
- **[GOVERNANCE.md](GOVERNANCE.md)** — governance contracts
