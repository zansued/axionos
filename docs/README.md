# AxionOS — Documentation Index

> Single navigation point for all AxionOS documentation.
> Last updated: 2026-03-10

---

## Document Map

| Document | Authority | Purpose |
|----------|-----------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System structure | C4 diagrams, capability layers, containers, components, data flow, safety rules, product boundary model |
| [GOVERNANCE.md](GOVERNANCE.md) | Agent OS & governance reference | 5 planes, module inventory, agent types, contracts, safety boundaries, events |
| [registry/doc-authority.yml](registry/doc-authority.yml) | Doc ownership | Authority boundaries per document |

---

## How to Continue If Conversation Context Is Lost

If prior chat history is unavailable, follow this sequence to re-establish context:

1. **Read this README first** — understand current canon note, boundaries, and invariants
2. **Read ARCHITECTURE.md** — structural context: layers, containers, data flow, product boundary model, role/surface model
3. **Read GOVERNANCE.md** — Agent OS reference: modules, contracts, governance, safety boundaries

### Implementation Rules

- Future sprint implementation should proceed **one sprint at a time**
- Each sprint should be reviewed and approved before execution begins
- Sprints 1–138 are the completed canon — do not casually reopen
- All blocks (Foundation through AD) are complete
- Do not collapse internal architecture and user-facing journey into the same surface

---

## Product Thesis

AxionOS is a **governed Operating System for Autonomous Product Creation** — a platform that transforms ideas into validated software artifacts while improving its own ability to do so over time, under governance.

The platform promise remains: **from idea to delivered software**.

The default user-facing journey remains:
> Idea → Discovery → Architecture → Engineering → Validation → Deploy → Delivered Software

---

## Current Canon Note

> Public documentation reflects the **stable public architecture line** through Sprint 138 (all blocks Foundation through AD).
>
> Internal roadmap and experimental canon may be ahead of this baseline.
> This notice exists to preserve credibility — not to obscure progress.

---

## Canonical Boundary Model

| # | Layer | Description |
|---|-------|-------------|
| 1 | **Internal System Architecture** | Engines, governance, intelligence, memory, calibration, evidence loops, benchmarking, sovereign institutional intelligence |
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

## After Sprint 138 — What Changes Strategically

The platform has completed its **Adaptive Operational Organism** at Sprint 138, spanning all blocks from Foundation through Block AD.

All 138 sprints are complete. The platform has achieved Level 10+ — Adaptive Operational Organism. The focus shifts from building new layers to:
- Deepening intelligence quality and advisory precision
- Strengthening the product experience and adoption feedback loop
- Hardening institutional governance across distributed and federated contexts
- Long-horizon institutional resilience and strategic succession maturity
- Defining the next strategic arc beyond Sprint 138

Internal sophistication remains critical. The next level deepens it through adaptive institutional coherence, not uncontrolled autonomy.

---

## How To Continue Safely After Sprint 138

1. Read **this README** for canon boundaries and invariants
2. Use **ARCHITECTURE.md** for structural context, the product boundary model, and the role/surface model
3. Use **GOVERNANCE.md** for Agent OS modules, contracts, and governance reference
4. Implement future work **sprint by sprint** with human review
5. Do **not** collapse internal architecture and user-facing journey into the same surface
6. Do **not** casually reopen completed canon (Sprints 1–138) without deliberate review
7. Internal layers are backstage support — the default product surface is the user journey

---

## Sprint Status Taxonomy

| Status | Meaning |
|--------|---------|
| `complete` | Implemented and verified |
| `planned` | Next in queue, scope defined, ready for implementation |
| `committed` | Part of committed future arc, objectives defined |
| `reserved` | Strategic direction defined, intentionally lightweight |
| `frozen` | Explicitly deferred, not scheduled |

### Current Canon Boundaries

- **Sprints 1–138** = canonical complete (full canon — Foundation through Block AD)

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
| System layer, container, or component added | `ARCHITECTURE.md` |
| Agent OS module, contract, or event added | `GOVERNANCE.md` |
| Document structure or canon boundaries changed | `README.md` |

---

## Maintenance Protocol

1. **When system structure or active architectural layers change:** update `ARCHITECTURE.md`
2. **When Agent OS module inventory, contracts, or operational references change:** update `GOVERNANCE.md`
3. **When document structure, canon boundaries, or status taxonomy change:** update `README.md`

---

## Normalization Rules

- Each document has a single authority boundary (defined in `registry/doc-authority.yml`)
- If a fact has one canonical owner, other docs may **summarize or reference** it but must not **redefine** it
- Architectural layer definitions are canonical in `ARCHITECTURE.md` only
- Module/contract specifications are canonical in `GOVERNANCE.md` only
- Derived summaries are allowed when clearly referencing the canonical source
