# AxionOS — Documentation Index

> Single navigation point for all AxionOS documentation.
> Last updated: 2026-03-09

---

## Document Map

| Document | Authority | Purpose |
|----------|-----------|---------|
| [ROADMAP.md](ROADMAP.md) | Strategic direction | Vision, maturity level, strategic directive, completed canon, post-71 direction, Block N–S definitions |
| [PLAN.md](PLAN.md) | Sprint execution | Canonical sprint ledger, phase grouping, completion status, capability verification, future canon guidance |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System structure | C4 diagrams, capability layers, containers, components, data flow, safety rules, product boundary model, role/surface model, tech stack |
| [AGENTS.md](AGENTS.md) | Agent OS reference | 5 planes, 18 modules, agent types, contracts, safety boundaries, events |
| [PIPELINE_CONTRACTS.md](PIPELINE_CONTRACTS.md) | Pipeline product UX | Phase-by-phase user-visible behavior, inputs/outputs, control rules, definition of done |
| [registry/sprints.yml](registry/sprints.yml) | Sprint metadata | Lightweight canonical sprint status registry |
| [registry/blocks.yml](registry/blocks.yml) | Block metadata | Block structure with sprint ranges and status |
| [registry/doc-authority.yml](registry/doc-authority.yml) | Doc ownership | Authority boundaries per document |

---

## How to Continue If Conversation Context Is Lost

If prior chat history is unavailable, follow this sequence to re-establish context:

1. **Read ROADMAP.md first** — understand current maturity, strategic direction, completed canon through Sprint 71, and Block N–S roadmap
2. **Read PLAN.md next** — identify the current/next sprint, execution status, and future canon guidance
3. **Use ARCHITECTURE.md** for structural context — layers, containers, data flow, product boundary model, role/surface model, forthcoming architectural direction
4. **Use PIPELINE_CONTRACTS.md** for the visible journey contract — Idea → Discovery → Architecture → Engineering → Deploy
5. **Use AGENTS.md** for Agent OS reference — only if agent system details are needed

### Implementation Rules

- Future sprint implementation should proceed **one sprint at a time**
- Each sprint should be reviewed and approved before execution begins
- Sprints 1–71 are the completed canon — do not casually reopen
- Block N (72–74) is the next planned block — evidence-governed improvement loop
- Blocks O–S (75–94) are reserved — do not treat as implemented
- Do not collapse internal architecture and user-facing journey into the same surface

---

## Product Thesis

AxionOS is a **governed self-improving software factory** that is moving toward **governed intelligence and decision maturity**.

The platform promise remains: **from idea to delivered software**.

The default user-facing journey remains:
> Idea → Discovery → Architecture → Engineering → Validation → Deploy → Delivered Software

---

## Canonical Boundary Model

| # | Layer | Description |
|---|-------|-------------|
| 1 | **Internal System Architecture** | Engines, governance, intelligence, memory, calibration, evidence loops, benchmarking |
| 2 | **Advanced Operator Surface** | Workspace governance, evidence review, candidates, benchmarks, delivery outcomes, audit |
| 3 | **Platform Governance Surface** | Routing, debates, working memory, swarm, marketplace, meta-agents, calibration, observability |
| 4 | **User-Facing Product Surface** | Dashboard, Journey, Onboarding, Initiatives, Stories, Code, Deployments, AutoPilot |

---

## Role and Surface Access Model

| Role | Product | Workspace | Platform |
|------|---------|-----------|----------|
| End User | ✅ | — | — |
| Operator | ✅ | ✅ | — |
| Tenant Owner | ✅ | ✅ | — |
| Platform Reviewer | ✅ | ✅ | ✅ |
| Platform Admin | ✅ | ✅ | ✅ |

---

## After Sprint 94 — What Changes Strategically

The platform has completed its **full canon implementation** at Sprint 94, spanning all blocks from Foundation through Research Sandbox for Architecture Evolution.

The next strategic arc is **Governed Intelligence & Decision Maturity**:

All 94 sprints are complete. The focus shifts from building new internal layers to converting existing sophistication into higher-order capabilities:
- Contextual guidance and copilot systems
- Evidence-governed learning
- Role-aware decision support
- Decision quality and legibility

Internal sophistication remains critical. The next level deepens it through governed intelligence, not uncontrolled autonomy.

---

## How To Continue Safely After Sprint 71

1. Read **ROADMAP.md** first for strategic direction and post-71 roadmap
2. Read **PLAN.md** next for current and next sprint
3. Use **ARCHITECTURE.md** for structural context, the product boundary model, and the role/surface model
4. Use **PIPELINE_CONTRACTS.md** for the user-visible journey contract
5. Use **AGENTS.md** for internal agent system reference only
6. Implement future work **sprint by sprint** with human review
7. Do **not** collapse internal architecture and user-facing journey into the same surface
8. Do **not** casually reopen completed canon (Sprints 1–71) without deliberate review
9. Internal layers are backstage support — the default product surface is the user journey
10. Block N (Sprints 72–74) is the next planned block — scope each sprint before implementation

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

- **Sprints 1–71** = canonical complete (first mature operating baseline + Block M + Governed Extensibility)
- **Sprints 72–74** = planned — active thaw now (Block N: Evidence-Governed Improvement Loop)
- **Sprint 75** = reserved — partial thaw next (Role Arbitration & Capability Routing 2.0)
- **Sprints 76–94** = reserved — still reserved (rest of Blocks O–S)

---

## Invariants

- **advisory-first** — all intelligence outputs are recommendations
- **governance before autonomy** — human approval for structural change
- **rollback everywhere** — every change preserves rollback capability
- **bounded adaptation** — all learning within declared envelopes
- **human approval for structural change** — no autonomous architecture mutation
- **tenant isolation** — all data scoped by organization_id with RLS
- **no autonomous architecture mutation** — forbidden mutation families enforced

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
