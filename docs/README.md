# AxionOS — Documentation Index

> Single navigation point for all AxionOS documentation.
> Last updated: 2026-03-13

---

## Document Map

| Document | Authority | Purpose |
|----------|-----------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System structure | C4 diagrams, capability layers, containers, components, data flow, safety rules, product boundary model |
| [GOVERNANCE.md](GOVERNANCE.md) | Agent OS & governance reference | 5 planes, module inventory, agent types, contracts, safety boundaries, events |
| [CANON_INTELLIGENCE_ENGINE.md](CANON_INTELLIGENCE_ENGINE.md) | Canon Intelligence Engine | Agent–Contract model, Canon knowledge layer, canonization workflow, runtime consultation |
| [UI_BLUEPRINT.md](UI_BLUEPRINT.md) | Interface architecture | Screen map, design system, navigation flows, UX rules |
| [AXION_CONTEXT.md](AXION_CONTEXT.md) | Quick context restore | System identity, engines, invariants, sprint canon, development principles |
| [AXION_PRIMER.md](AXION_PRIMER.md) | AI cognitive anchor | Ultra-short system explanation (~2 min read) |
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
- Sprints 1–200 are the completed canon — do not casually reopen
- All blocks (Foundation through AP) are complete
- Do not collapse internal architecture and user-facing journey into the same surface

---

## Product Thesis

AxionOS is a **governed Operating System for Autonomous Product Creation** — a platform that transforms ideas into validated software artifacts while improving its own ability to do so over time, under governance.

The platform promise remains: **from idea to delivered software**.

The default user-facing journey remains:
> Idea → Discovery → Architecture → Engineering → Validation → Deploy → Delivered Software

---

## Current Canon Note

> Public documentation reflects the **stable architecture line** through Sprint 200 (all blocks Foundation through AP).
>
> Internal roadmap and experimental canon may be ahead of this baseline.
> This notice exists to preserve credibility — not to obscure progress.

---

## Canonical Boundary Model

| # | Layer | Description |
|---|-------|-------------|
| 1 | **Internal System Architecture** | Engines, governance, intelligence, memory, calibration, evidence loops, benchmarking, sovereign institutional intelligence |
| 2 | **Advanced Operator Surface (Owner Mode)** | System intelligence, governance insights, governance decisions, execution handoff, application tracking, security, canon intelligence |
| 3 | **Platform Governance Surface** | Routing, debates, working memory, swarm, marketplace, meta-agents, calibration, observability |
| 4 | **User-Facing Product Surface (Builder Mode)** | Dashboard, Projects, Agents, Pipelines, Runtime, Execution Observability, Settings |

---

## Workspace Mode Separation

AxionOS separates its interface into two operational modes:

| Mode | Path | Purpose |
|------|------|---------|
| **Builder Mode** | `/builder/*` | Tactical engineering focused on product delivery — Dashboard, Projects, Agents, Pipelines, Runtime, Observability |
| **Owner Mode** | `/owner/*` | Strategic platform governance — System Intelligence, Canon Intelligence, Governance Decisions, Insights, Handoff, Application Tracking, Security |

Builder Mode is for building and shipping software.
Owner Mode is for governing the platform's intelligence and evolution.

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

## Key Capabilities Added After Sprint 138

| Sprint Range | Block | Capability |
|-------------|-------|-----------|
| 139–142 | AE | Action Engine — trigger intake, intent mapping, policy-aware resolution, registry, audit, dispatch, approval hooks, operational flows, Action Center UI, recovery hooks |
| 143–146 | AF | Security Surface — threat domain mapping, security surface mapping, agent/contract risk profiles, Security War Room |
| 147–150 | AG | Adoption Intelligence & User Journey — adoption models, friction detection, outcome tracking, user journey orchestration |
| 151–154 | AG | Landing Page, Axion Prompt Drawer, Builder/Owner Mode separation |
| 155–158 | AH | Governance Review Workflow — decision state machine, governance review surface, proposal lifecycle |
| 159–163 | AH | Governance Surfaces — Insights, Decision Surface, Execution Handoff, Change Application Tracking |
| 164–171 | AI | Repository Intelligence & Institutional Learning — Canon candidate review, deduplication, promotion, retrieval, skill distillation, intelligence graph, agent injection, learning governance |
| 172–179 | AJ | Self-Improving Architecture Engine — Canon distillation, micro-skills, token budgeting, multi-layer memory, architecture heuristics, self-improvement proposals, efficiency dashboard, self-improvement governance |
| 180–181 | AK | Knowledge Provenance & Trust-Weighted Intelligence — Repo trust scoring, pattern weighting, confidence recalibration, knowledge lineage, provenance navigation, integrity alerts |
| 182–183 | AL | Knowledge Renewal & Revalidation Engine — Renewal triggers, revalidation workflows, confidence recovery, renewal proposals, renewal history |
| 184 | AM | Canon Intelligence Hub Restructuring — Cognitive domain grouping, Skills layer tables, operational reorganization |
| 185 | AN | Execution Architecture Evolution — Adaptive risk-based execution routing (OX/DX sprints), evidence-informed policy tuning |

### Axion Action Engine

The Axion Action Engine is now **implemented and operational**. It formalizes triggers into governed ActionRecords using Axion-style XML artifacts (`<axionArtifact>`, `<axionAction>`), applies policy-aware resolution with the strictest-wins principle (Blocked > Manual > Approval > Auto), and integrates with the AIOS Round Robin Scheduler for dispatch.

---

## After Sprint 185 — Current Strategic State

The platform has completed 185 sprints across all blocks from Foundation through AN. The system operates as a governed adaptive organism with:

- ✅ Full Axion Action Engine with governed execution pipeline
- ✅ Governance decision lifecycle (proposal → review → handoff → application tracking)
- ✅ Security surface with threat domain mapping and risk profiles
- ✅ Builder/Owner Mode separation for clear workspace boundaries
- ✅ Adoption intelligence and user journey orchestration
- ✅ Repository intelligence and institutional learning pipeline
- ✅ Self-improving architecture engine with governed self-evolution
- ✅ Knowledge provenance, trust-weighted intelligence, and renewal engine
- ✅ Canon Intelligence Hub with cognitive domain structure
- ✅ Emerging Skills layer (skill_bundles, engineering_skills, skill_capabilities)
- ✅ Adaptive execution routing with evidence-informed policy tuning
- ✅ 200+ Edge Functions deployed

The focus shifts to:
- Deepening intelligence quality and advisory precision
- Strengthening the product experience and adoption feedback loop
- Hardening institutional governance across distributed and federated contexts
- Connecting the Action Engine to real downstream execution
- Improving end-to-end delivery reliability
- Maturing the Skills layer into full operational depth

---

## How To Continue Safely After Sprint 185

1. Read **this README** for canon boundaries and invariants
2. Use **ARCHITECTURE.md** for structural context, the product boundary model, and the role/surface model
3. Use **GOVERNANCE.md** for Agent OS modules, contracts, and governance reference
4. Implement future work **sprint by sprint** with human review
5. Do **not** collapse internal architecture and user-facing journey into the same surface
6. Do **not** casually reopen completed canon (Sprints 1–185) without deliberate review
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

- **Sprints 1–185** = canonical complete (Foundation through Block AN)

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
