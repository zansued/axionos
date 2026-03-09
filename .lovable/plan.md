

## Governance Mentor Mode — Implementation Plan

### What We're Building

A specialized **Governance Mentor Mode** panel that extends the existing Copilot Drawer for platform-governance pages. When a `platform_admin` or `platform_reviewer` opens the Copilot on governance-sensitive pages, they see an enhanced mentor view with decision summary, risk/blast radius, rollback posture, recommendation, confidence/uncertainty, and trade-offs.

This builds directly on the existing `ContextualCopilotDrawer`, `PageGuidanceShell`, and `useCopilotDrawer` architecture.

### Architecture

```text
PageGuidanceShell
  └─ CopilotTrigger (existing)
  └─ ContextualCopilotDrawer (existing — standard mode)
  └─ GovernanceMentorDrawer (NEW — replaces drawer when mentor mode applies)

useCopilotDrawer → detects if governance mentor mode should activate
  based on: canonicalRole ∈ {platform_admin, platform_reviewer}
          + page has governance mentor content
```

### New Files

1. **`src/lib/guidance/governance-mentor-content.ts`** — Centralized registry of mentor content per governance page (routing, extensions, capability-governance, audit, observability, benchmarks, candidates). Each entry provides:
   - `decisionType`, `summary`, `whyNow`
   - `riskLevel` (low/medium/high), `blastRadius` (local/tenant/platform)
   - `rollbackPosture` (clear/partial/complex)
   - `recommendation` (approve/approve_with_caution/defer/reject/needs_evidence/send_to_benchmark/restrict_scope)
   - `recommendationReason`, `confidence` (0-1), `uncertainties[]`
   - `tradeoffs[]` (each with two sides)
   - `suggestedActions[]`

2. **`src/lib/guidance/governance-mentor-types.ts`** — Type definitions for `GovernanceMentorContent`, `RiskLevel`, `BlastRadius`, `RollbackPosture`, `MentorRecommendation`, `TradeOff`.

3. **`src/components/guidance/GovernanceMentorDrawer.tsx`** — The mentor panel component. Structured sections:
   - Decision summary header with decision type badge
   - Why review matters now
   - Recommendation with status badge + reason + confidence bar
   - Risk & blast radius (color-coded)
   - Rollback posture
   - Uncertainty list
   - Trade-offs (two-column)
   - Suggested actions
   - Footer: "Advisory only — does not approve or execute"

4. **`src/hooks/useGovernanceMentor.ts`** — Hook that checks if mentor mode should activate (role + page has mentor content) and returns resolved content.

### Modified Files

5. **`src/components/guidance/PageGuidanceShell.tsx`** — Render `GovernanceMentorDrawer` instead of `ContextualCopilotDrawer` when `useGovernanceMentor` returns active content.

6. **`src/components/guidance/index.ts`** — Export new component.

### Design Details

- **Role gate**: Only `platform_admin` and `platform_reviewer` see mentor mode. Other roles get the standard copilot drawer as before.
- **7 priority pages**: routing, capability-governance, audit, observability, extensions, benchmarks, candidates.
- **Visual language**: Compact sections with icons, color-coded risk/recommendation badges, confidence progress bar, structured uncertainty list. Premium, calm, high-signal.
- **Canon compliance**: Footer and recommendation labels explicitly state advisory-only posture. No approve/reject buttons that execute actions — only navigation suggestions.

### Content Examples

**Routing page mentor:**
- Decision type: "Routing Policy Review"
- Risk: medium, blast radius: platform
- Rollback: clear
- Recommendation: "Approve with caution"
- Confidence: 0.75
- Uncertainty: "Fallback cost impact under high load not yet benchmarked"
- Trade-off: "Speed vs Safety — faster routing reduces latency but may skip quality checks"

**Capability Governance mentor:**
- Decision type: "Capability Trust Level Change"
- Risk: high, blast radius: platform
- Rollback: partial
- Recommendation: "Needs more evidence"
- Confidence: 0.55

