# AxionOS — Documentation Index

> Single navigation point for all AxionOS documentation.
> Last updated: 2026-03-08

---

## Document Map

| Document | Authority | Purpose |
|----------|-----------|---------|
| [ROADMAP.md](ROADMAP.md) | Strategic direction | Vision, maturity level, strategic directive, completed canon, post-65 direction, Block M definition |
| [PLAN.md](PLAN.md) | Sprint execution | Canonical sprint ledger, phase grouping, completion status, capability verification, future canon guidance |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System structure | C4 diagrams, capability layers, containers, components, data flow, safety rules, product boundary model, tech stack |
| [AGENTS.md](AGENTS.md) | Agent OS reference | 5 planes, 18 modules, agent types, contracts, safety boundaries, events |
| [PIPELINE_CONTRACTS.md](PIPELINE_CONTRACTS.md) | Pipeline product UX | Phase-by-phase user-visible behavior, inputs/outputs, control rules, definition of done |
| [registry/sprints.yml](registry/sprints.yml) | Sprint metadata | Lightweight canonical sprint status registry |
| [registry/blocks.yml](registry/blocks.yml) | Block metadata | Block structure with sprint ranges and status |
| [registry/doc-authority.yml](registry/doc-authority.yml) | Doc ownership | Authority boundaries per document |

---

## How to Continue If Conversation Context Is Lost

If prior chat history is unavailable, follow this sequence to re-establish context:

1. **Read ROADMAP.md first** — understand current maturity, strategic direction, completed canon, post-65 direction, and Block M thesis
2. **Read PLAN.md next** — identify the current/next sprint, execution status, and future canon guidance
3. **Use ARCHITECTURE.md** for structural context — layers, containers, data flow, product boundary model, forthcoming architectural direction
4. **Use PIPELINE_CONTRACTS.md** for the visible journey contract — Idea → Discovery → Architecture → Engineering → Deploy
5. **Use AGENTS.md** for Agent OS reference — only if agent system details are needed

### Implementation Rules

- Future sprint implementation should proceed **one sprint at a time**
- Each sprint should be reviewed and approved before execution begins
- Sprints 1–65 are the completed first mature operating canon — do not casually reopen
- Block M sprints (66–70) focus on user-visible product experience, not internal layering
- Do not collapse internal architecture and user-facing journey into the same surface

---

## After Sprint 70 — What Changes Strategically

The platform has completed its **product-ready operating baseline** at Sprint 70. Block M (Product Experience & Delivery Maturity) is complete. The internal architecture and user-facing product experience are mature.

The next strategic arc is **governed self-improvement and ecosystem evolution**:

- **Block N (71–74, Planned)** — Evidence-Governed Improvement Loop: turning operational evidence into bounded improvement proposals under governance
- **Block O (75–78, Reserved)** — Advanced Multi-Agent Coordination
- **Block P (79–82, Reserved)** — Governed Capability Ecosystem & Early Marketplace
- **Block Q (83–86, Reserved)** — Delivery Optimization & Outcome Assurance 2.0
- **Block R (87–90, Reserved)** — Advanced Distributed Runtime & Scaled Execution
- **Block S (91–94, Reserved)** — Research Sandbox for Architecture Evolution

Internal sophistication remains critical. Future blocks deepen it through evidence-governed improvement, not uncontrolled autonomy.

---

## How To Continue Safely After Sprint 70

1. Read **ROADMAP.md** first for strategic direction and post-70 roadmap
2. Read **PLAN.md** next for current and next sprint
3. Use **ARCHITECTURE.md** for structural context and the product boundary model
4. Use **PIPELINE_CONTRACTS.md** for the user-visible journey contract
5. Use **AGENTS.md** for internal agent system reference only
6. Implement future work **sprint by sprint** with human review
7. Do **not** collapse internal architecture and user-facing journey into the same surface
8. Do **not** casually reopen completed canon (Sprints 1–70) without deliberate review
9. Internal layers are backstage support — the default product surface is the user journey
10. Block N (Sprints 71–74) is the next planned block — scope each sprint before implementation

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

- **Sprints 1–70** = canonical complete (first mature operating baseline + Block M: Product Experience & Delivery Maturity)
- **Sprints 71–74** = planned (Block N: Evidence-Governed Improvement Loop)
- **Sprints 75–94** = reserved (Blocks O–S: future strategic horizon)

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
