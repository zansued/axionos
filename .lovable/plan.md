

## Documentation Update Plan — Sprints 19 & 20

All four docs need updating to reflect Sprint 19 (Proposal Quality Feedback Loop) and Sprint 20 (Advisory Calibration Layer).

### Files to Update

**1. `docs/AGENTS.md`** — Header + new sections
- Update header: "Sprint 20 — Advisory Calibration Layer" as latest change
- Add section 12.6: Proposal Quality Feedback Loop (Sprint 19) — tables, scoring, taxonomy, safety
- Add section 12.7: Advisory Calibration Layer (Sprint 20) — calibration domains, signal types, scoring, analysis service
- Update Meta-Agents maturity to v1.4 (quality feedback + calibration)
- Update Implementation Status table (section 15) with Sprint 19 & 20

**2. `docs/ARCHITECTURE.md`** — Header + layers + implementation status
- Update header: "Sprint 20 — Advisory Calibration Layer operational"
- Update Layer 7 (Meta-Agent) to mention quality feedback and calibration integration
- Add Layer 10: Proposal Quality & Calibration Layer (or extend Layer 8) covering:
  - `proposal_quality_feedback` table
  - `advisory_calibration_signals` and `advisory_calibration_summaries` tables
  - Quality scoring service, calibration analysis service
  - Calibration domains and signal types
- Update Implementation Status table (section 12) with rows for Sprint 19 & 20
- Update Database Schema (section 13) with new tables
- Update Planned section to show Sprint 19 & 20 as DONE

**3. `docs/ROADMAP.md`** — Header + sprint entries + status
- Update header: "Sprint 20 — Advisory Calibration Layer"
- Update Current Status table: Meta-Agents v1.4 with quality feedback + calibration
- Add Sprint 19 & Sprint 20 entries to completed sprints (Level 4.5 section)
- Update "DONE — Meta-Agents" section to include Sprint 20
- Update Governing Principle paragraph to mention calibration
- Add Proposal Quality + Calibration to Kernel table

**4. `.lovable/plan.md`** — Current state + completed sprints
- Update header and strategic directive
- Add Sprint 20 to completed sprints table
- Update Current State section to mention calibration layer
- Add calibration to Active Kernel Components table

### Key Content to Add

Sprint 19 tables: `proposal_quality_feedback`, `proposal_quality_summaries`
Sprint 20 tables: `advisory_calibration_signals`, `advisory_calibration_summaries`

Calibration domains: META_AGENT_PERFORMANCE, PROPOSAL_USEFULNESS, HISTORICAL_CONTEXT_VALUE, REDUNDANCY_GUARD_EFFECTIVENESS, NOVELTY_BALANCE, DECISION_FOLLOW_THROUGH

Signal types: UNDERPERFORMING_META_AGENT, HIGH_VALUE_META_AGENT, LOW_USEFULNESS_ARTIFACT_TYPE, REDUNDANCY_GUARD_TOO_STRICT, REDUNDANCY_GUARD_TOO_WEAK, etc.

Safety note in all docs: "Calibration signals are advisory only and do not automatically tune the system."

### Approach
- Preserve existing structure and formatting conventions
- Keep concise — reference modules by file path, don't duplicate full code
- Maintain the governance/non-mutation language consistently

