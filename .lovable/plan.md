

## Sprint 67 — Role-Based Experience Layer — Implementation Plan

### Problem
The platform currently exposes all 52+ observability tabs and all sidebar items to every user regardless of role. Internal system complexity leaks into the default user experience. Sprint 67 separates surfaces by role: Default User, Operator, and Admin/System.

### Architecture Overview

```text
┌─────────────────────────────────────────────────┐
│  Role-Based Experience Engine (Edge Function)   │
│  overview | define_role_models | evaluate_nav   │
│  evaluate_permissions | detect_leakage | explain│
└──────────────┬──────────────────────────────────┘
               │
┌──────────────┴──────────────────────────────────┐
│  9 Shared Modules (_shared/role-based-experience)│
│  role-model-mgr | nav-orchestrator | perms      │
│  info-layers | leakage-detector | approval-vis  │
│  quality-analyzer | outcome-validator | explainer│
└──────────────┬──────────────────────────────────┘
               │
┌──────────────┴──────────────────────────────────┐
│  6 Tables (RLS by organization_id)              │
│  role_experience_models | role_navigation_profiles│
│  role_surface_permissions | role_information_layers│
│  role_experience_overrides | role_experience_outcomes│
└─────────────────────────────────────────────────┘
```

### 1. Database Migration (1 migration file)

Create 6 tables with full RLS policies (SELECT/INSERT/UPDATE for org members), validation triggers, and timestamps. Fields as specified in the sprint prompt.

### 2. Shared Modules

Create `supabase/functions/_shared/role-based-experience/` with 9 modules:
- `role-experience-model-manager.ts` — role definitions (default_user, operator, admin)
- `role-navigation-orchestrator.ts` — builds sidebar/tab lists per role
- `role-surface-permission-engine.ts` — action/view permissions per role
- `role-information-layer-manager.ts` — information density control
- `complexity-leakage-detector.ts` — detects internal complexity in default surface
- `approval-visibility-router.ts` — routes approvals to correct role
- `role-experience-quality-analyzer.ts` — quality scoring per surface
- `role-experience-outcome-validator.ts` — expected vs realized outcomes
- `role-based-experience-explainer.ts` — structured explanations

All deterministic, pure-function modules following existing patterns.

### 3. Edge Function

Create `supabase/functions/role-based-experience-engine/index.ts` with actions:
`overview`, `define_role_models`, `evaluate_navigation`, `evaluate_permissions`, `evaluate_information_layers`, `detect_complexity_leakage`, `role_experience_outcomes`, `explain`

### 4. Frontend Changes

**A. Role-aware navigation in AppSidebar.tsx**
- Add role concept (default_user / operator / admin) using org member role mapping
- Default users see: Dashboard, Journey, Initiatives, Stories, Kanban, Workspace, Deployments
- Operators additionally see: Agents, Code, Audit, Observability, Connections
- Admins see everything including Meta-Agents, Meta-Artifacts, Calibration, Prompt Opt, Billing, Settings
- Add a role indicator badge in sidebar footer

**B. Role-aware Observability tabs**
- Operator role: sees performance, costs, quality, repair, patterns, prevention, predictive, live, cross-stage, exec-policy tabs
- Admin role: sees all 52+ tabs
- Default users: redirected to Journey page (Observability not in their nav)

**C. New components**
- `src/hooks/useRoleBasedExperience.ts` — hook calling edge function + local role derivation from org member role
- `src/components/observability/RoleBasedExperienceDashboard.tsx` — admin-facing dashboard showing role definitions, navigation mapping, permission posture, complexity leakage analysis, and outcome validation
- Add "RoleExp" tab to Observability (admin-only visible)
- `src/components/RoleGuard.tsx` — wrapper component that shows/hides content by role

**D. Role derivation logic**
- Map existing `org_role` (owner/admin → admin surface, editor → operator surface, viewer → default_user surface)
- No new auth system needed — reuses existing `organization_members.role`

### 5. Core Metrics (14)

All computed deterministically in shared modules:
`role_experience_quality_score`, `navigation_clarity_score`, `complexity_exposure_score`, `internal_complexity_leakage_score`, `approval_visibility_score`, `information_summarization_score`, `operator_surface_effectiveness_score`, `default_user_journey_clarity_score`, `admin_surface_integrity_score`, `permission_alignment_score`, `role_friction_score`, `role_experience_outcome_accuracy_score`, `bounded_visibility_coherence_score`, `role_surface_separation_score`

### 6. Documentation Updates

Update: `ROADMAP.md`, `PLAN.md`, `ARCHITECTURE.md`, `PIPELINE_CONTRACTS.md`, `README.md`, `registry/sprints.yml`
- Mark Sprint 67 complete, Sprint 68 as next planned
- Update layer count to 51
- Document the three-surface model and role derivation

### 7. Safety Constraints

- No privilege escalation — role mapping is read-only from existing org membership
- No weakening of approvals — operator/admin surfaces retain full governance visibility
- No hiding material risk from operator/admin roles
- Tenant isolation via RLS
- Advisory-first: role surfaces are recommendations, not hard access control (governance remains in existing RLS)

### 8. Key Implementation Decisions

- Role derivation reuses existing `organization_members.role` enum — no new role table needed
- Sidebar filtering is client-side based on derived role — keeps it simple and reversible
- Observability tabs filtered by role — admin sees all, operator sees operational subset, default user doesn't access Observability
- The RoleBasedExperienceDashboard is itself an admin-only diagnostic surface

### Estimated Deliverables
- 1 migration file (6 tables + RLS + triggers)
- 9 shared modules
- 1 edge function
- 4 new frontend files (hook, dashboard, RoleGuard, updated sidebar)
- 5 doc files updated
- 1 registry file updated

