# AxionOS — Documentation Index

> Single navigation point for all AxionOS documentation.
> Last updated: 2026-03-08

---

## Document Map

| Document | Authority | Purpose |
|----------|-----------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System structure | C4 diagrams, capability layers, containers, components, data flow, safety rules, tech stack |
| [ROADMAP.md](ROADMAP.md) | Strategic direction | Vision, maturity level, strategic directive, implementation horizons, next phase |
| [PLAN.md](PLAN.md) | Sprint execution | Canonical sprint ledger, phase grouping, completion status, capability verification |
| [AGENTS.md](AGENTS.md) | Agent OS reference | 5 planes, 18 modules, agent types, contracts, safety boundaries, events |
| [PIPELINE_CONTRACTS.md](PIPELINE_CONTRACTS.md) | Pipeline product UX | Phase-by-phase user-visible behavior, inputs/outputs, control rules, definition of done |
| [registry/sprints.yml](registry/sprints.yml) | Sprint metadata | Lightweight canonical sprint status registry |
| [registry/doc-authority.yml](registry/doc-authority.yml) | Doc ownership | Authority boundaries per document |

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

---

## Maintenance Protocol

1. **When a sprint completes or starts:** update `PLAN.md` and `registry/sprints.yml`
2. **When strategic block or maturity changes:** update `ROADMAP.md`
3. **When system structure or active architectural layers change:** update `ARCHITECTURE.md`
4. **When Agent OS module inventory, contracts, or operational references change:** update `AGENTS.md`
5. **When user-visible pipeline behavior changes:** update `PIPELINE_CONTRACTS.md`
6. **Always:** keep `registry/sprints.yml` synchronized as the canonical sprint source

---

## Sprint Status Taxonomy

| Status | Meaning | Where Tracked |
|--------|---------|---------------|
| `complete` | Implemented and verified | `PLAN.md`, `registry/sprints.yml` |
| `planned` | Next in queue, scope defined | `PLAN.md`, `registry/sprints.yml` |
| `proposed` | Strategic direction, not yet scoped for implementation | `ROADMAP.md`, `registry/sprints.yml` |

**Canon vs Proposal:** Sprints 1–50 are canonical (implemented). Sprints 51–53 are proposed strategic direction and may be revised before implementation.

---

## Normalization Rules

- Each document has a single authority boundary (defined in `registry/doc-authority.yml`)
- If a fact has one canonical owner, other docs may **summarize or reference** it but must not **redefine** it
- Sprint completion status is canonical in `PLAN.md` only
- Maturity level is canonical in `ROADMAP.md` only
- Architectural layer definitions are canonical in `ARCHITECTURE.md` only
- Module/contract specifications are canonical in `AGENTS.md` only
- Phase UX contracts are canonical in `PIPELINE_CONTRACTS.md` only
- Proposed future sprints are canonical in `ROADMAP.md` (strategic direction) and `registry/sprints.yml` (metadata)
- Derived summaries (e.g. "35 layers active" in ARCHITECTURE.md header) are allowed when clearly referencing the canonical source
