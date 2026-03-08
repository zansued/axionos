

# Sprint 58 — External Trust & Admission Layer — Implementation Plan

## Overview
Add external trust/admission governance infrastructure following the exact patterns established in Sprints 56-57. This creates the trust evaluation, actor classification, and admission review framework for future ecosystem participation — all advisory-first, no live external access.

## 1. Database Migration
Create 6 tables with RLS and validation triggers:

| Table | Purpose |
|-------|---------|
| `external_actor_registry` | Candidate external actors with classification metadata |
| `external_trust_tiers` | Trust tier definitions (unknown, restricted-candidate, provisional, sandbox-eligible, controlled-future-candidate, never-admit) |
| `external_admission_cases` | Formal admission governance cases |
| `external_admission_requirements` | Evidence, policy, auditability prerequisites |
| `external_admission_reviews` | Review workflow and decision lifecycle |
| `external_trust_outcomes` | Expected vs realized outcomes |

All tables: `organization_id` FK, RLS via `is_org_member`, validation triggers for enum fields, `created_at`/`updated_at` defaults.

## 2. Shared Modules
Create `supabase/functions/_shared/external-trust-admission/`:

- `external-actor-registry-manager.ts` — actor record management
- `external-trust-tier-classifier.ts` — trust tier assignment scoring
- `external-admission-case-builder.ts` — case creation from actors
- `external-admission-requirement-engine.ts` — prerequisite evaluation
- `external-risk-posture-analyzer.ts` — risk/restriction analysis
- `external-admission-review-manager.ts` — governance state machine
- `external-trust-drift-detector.ts` — confidence degradation detection
- `external-trust-recommendation-engine.ts` — advisory recommendations
- `external-trust-admission-explainer.ts` — structured explanations

## 3. Edge Function
Create `supabase/functions/external-trust-admission-engine/index.ts`:

Actions: `overview`, `register_actors`, `classify_trust`, `build_admission_cases`, `evaluate_requirements`, `review_queue`, `trust_outcomes`, `explain`

Same auth/CORS pattern as `capability-exposure-governance-engine`.

## 4. Frontend

### Hook: `src/hooks/useExternalTrustAdmission.ts`
Invokes `external-trust-admission-engine` with queries for each action.

### Dashboard: `src/components/observability/ExternalTrustAdmissionDashboard.tsx`
Sections: Overview stats, Actor Registry, Trust Tiers, Admission Cases, Requirements/Restrictions, Review Queue, Outcome Validation.

### Integration: Add "TrustGov" tab to `src/pages/Observability.tsx`
- Import dashboard + add `UserCheck` icon
- Add tab trigger and content (position before ExposureGov)
- Update grid columns from 44 to 45

## 5. Metrics (14)
`admission_readiness_score`, `trust_tier_confidence_score`, `identity_confidence_score`, `evidence_completeness_score`, `auditability_score`, `policy_alignment_score`, `risk_score`, `restriction_level_score`, `admission_review_priority_score`, `trust_drift_score`, `admission_recommendation_quality_score`, `admission_outcome_accuracy_score`, `bounded_participation_viability_score`, `never_admit_confidence_score`

## 6. Documentation Updates
- **PLAN.md**: Sprint 57 complete → Sprint 58 complete, Sprint 59 planned
- **ROADMAP.md**: Update layer count (43), note Sprint 58 complete
- **ARCHITECTURE.md**: Update layer count, add External Trust & Admission to forthcoming direction
- **AGENTS.md**: Note trust/admission layer added, ecosystem plane still frozen
- **README.md**: Update sprint count
- **registry/sprints.yml**: Sprint 58 → complete, Sprint 59 → planned

## 7. Safety Constraints
- Advisory-first only — no live external access
- No marketplace activation
- No autonomous partner enablement or trust establishment
- Tenant isolation via RLS
- Full evidence lineage in all tables

