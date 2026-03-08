# AxionOS — Documentation Index

> Single navigation point for all AxionOS documentation.
> Last updated: 2026-03-08

---

## Document Map

| Document | Authority | Purpose |
|----------|-----------|---------|
| [ROADMAP.md](ROADMAP.md) | Strategic direction | Vision, maturity level, strategic directive, completed canon, committed future arc, reserved horizon, round-enough target |
| [PLAN.md](PLAN.md) | Sprint execution | Canonical sprint ledger, phase grouping, completion status, capability verification, future canon guidance |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System structure | C4 diagrams, capability layers, containers, components, data flow, safety rules, tech stack, forthcoming direction |
| [AGENTS.md](AGENTS.md) | Agent OS reference | 5 planes, 18 modules, agent types, contracts, safety boundaries, events |
| [PIPELINE_CONTRACTS.md](PIPELINE_CONTRACTS.md) | Pipeline product UX | Phase-by-phase user-visible behavior, inputs/outputs, control rules, definition of done |
| [registry/sprints.yml](registry/sprints.yml) | Sprint metadata | Lightweight canonical sprint status registry |
| [registry/blocks.yml](registry/blocks.yml) | Block metadata | Block structure with sprint ranges and status |
| [registry/doc-authority.yml](registry/doc-authority.yml) | Doc ownership | Authority boundaries per document |

---

## How to Continue If Conversation Context Is Lost

If prior chat history is unavailable, follow this sequence to re-establish context:

1. **Read ROADMAP.md first** — understand current maturity, strategic direction, completed canon, committed arc, and reserved horizon
2. **Read PLAN.md next** — identify the current/next sprint, execution status, and future canon guidance
3. **Use ARCHITECTURE.md** for structural context — layers, containers, data flow, forthcoming architectural direction
4. **Use AGENTS.md** for Agent OS reference — only if agent system details are needed
5. **Use PIPELINE_CONTRACTS.md** only if pipeline UX or stage behavior is affected

### Implementation Rules

- Future sprint implementation should proceed **one sprint at a time**
- Each sprint should be reviewed and approved before execution begins
- **Reserved horizon** sprints (57–65) should not be promoted to planned without deliberate review
- **Committed** sprints (55–56) have defined objectives but should still be scoped in detail before implementation
- The **planned** sprint (54) is the next to implement

---

## Sprint Status Taxonomy

| Status | Meaning | Where Tracked |
|--------|---------|---------------|
| `complete` | Implemented and verified | `PLAN.md`, `registry/sprints.yml` |
| `planned` | Next in queue, scope defined, ready for implementation | `PLAN.md`, `registry/sprints.yml` |
| `committed` | Part of committed future arc, objectives defined | `PLAN.md`, `ROADMAP.md`, `registry/sprints.yml` |
| `reserved` | Strategic direction defined, intentionally lightweight | `ROADMAP.md`, `registry/sprints.yml` |
| `frozen` | Explicitly deferred, not scheduled | `ROADMAP.md` (frozen areas) |

### Current Canon Boundaries

- **Sprints 1–53** = canonical complete (implemented and verified)
- **Sprint 54** = planned (next to implement)
- **Sprints 55–56** = committed (objectives defined, not yet implemented)
- **Sprints 57–65** = reserved (strategic direction, intentionally lightweight)

---

## Where Should This Change Go?

| Change type | Target document |
|-------------|----------------|
| Current sprint started or completed | `PLAN.md` |
| Maturity level or strategic horizon changed | `ROADMAP.md` |
| System layer, container, or component added | `ARCHITECTURE.md` |
| Agent OS module, contract, or event added | `AGENTS.md` |
| Pipeline phase UX or contract changed | `PIPELINE_CONTRACTS.md` |
| Sprint metadata (number, name, status, phase) | `registry/sprints.yml` |
| Block structure changed | `registry/blocks.yml` |

---

## Maintenance Protocol

1. **When a sprint completes or starts:** update `PLAN.md` and `registry/sprints.yml`
2. **When strategic block or maturity changes:** update `ROADMAP.md`
3. **When system structure or active architectural layers change:** update `ARCHITECTURE.md`
4. **When Agent OS module inventory, contracts, or operational references change:** update `AGENTS.md`
5. **When user-visible pipeline behavior changes:** update `PIPELINE_CONTRACTS.md`
6. **Always:** keep `registry/sprints.yml` and `registry/blocks.yml` synchronized

---

## Normalization Rules

- Each document has a single authority boundary (defined in `registry/doc-authority.yml`)
- If a fact has one canonical owner, other docs may **summarize or reference** it but must not **redefine** it
- Sprint completion status is canonical in `PLAN.md` only
- Maturity level is canonical in `ROADMAP.md` only
- Architectural layer definitions are canonical in `ARCHITECTURE.md` only
- Module/contract specifications are canonical in `AGENTS.md` only
- Phase UX contracts are canonical in `PIPELINE_CONTRACTS.md` only
- Committed future arc is canonical in `ROADMAP.md` (strategic direction) and `PLAN.md` (execution detail)
- Reserved horizon is canonical in `ROADMAP.md`
- Derived summaries are allowed when clearly referencing the canonical source
