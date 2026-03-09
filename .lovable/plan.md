
## Sprint 106 Fix Plan — Final Gap Closure

### Current State
The edge function already imports and uses all 7 shared modules. The UI has KnowledgeConcentrationPanel, ExplainCard, readiness scores, transition risks, and handoff viability. Loading/empty/error states are present.

**One remaining gap:** Succession plan transfer sequences (JSONB fields) are not visible in the UI. The plans table shows only code/type/status/trigger/viability — but the actual handoff_sequence, knowledge_transfer_steps, authority_transfer_steps, and continuity_checks are hidden.

### Plan

**1. Expand Succession Plans tab in `src/pages/StrategicSuccession.tsx`**
- Add an expandable row or detail card for each plan that shows:
  - **Handoff Sequence** — ordered steps
  - **Knowledge Transfer Steps** — what knowledge moves where
  - **Authority Transfer Steps** — formal authority reassignment
  - **Continuity Checks** — verification gates
- Each section renders the JSONB array items as a numbered list
- Collapsible per plan (click to expand) to avoid clutter

**2. Redeploy edge function**
- Deploy `strategic-succession-long-horizon-continuity` to ensure the latest module-wired version is live
- Test with invoke to confirm runtime behavior

**3. QA validation pass**
- After fixes, run the edge function with test payloads for `overview`, `compute_assessment`, `explain`, and `recommendations`
- Confirm modules are called at runtime (not dead code)
- Report results

### Files Changed
- `src/pages/StrategicSuccession.tsx` — expand plans tab with JSONB detail rendering
- Edge function redeployment (no code change needed, already wired)
