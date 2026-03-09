
## Sprint Context

The codebase has a 3-tier role model (`default_user`, `operator`, `admin`) derived from org membership roles (`viewer`, `editor`, `owner`/`admin`/`reviewer`). The sidebar is a flat ~35-item list with coarse role filtering and no surface grouping. Routes are auth-gated only (no role/surface gating). The `CommandPalette` has no role filtering at all.

## Role Mapping

Existing org roles map to the 6 canonical roles:

```text
viewer   → end_user
editor   → operator
owner    → tenant_owner
reviewer → platform_reviewer
admin    → platform_admin
null     → end_user
```

## Surface Assignment

```text
PRODUCT (all roles)
  Dashboard, Journey, Onboarding, Initiatives, Stories, Code, Workspace, Kanban, Deployments
  + AutoPilot entry (→ /journey, styled as mode CTA, not a nav link)

WORKSPACE GOVERNANCE (operator subset, tenant_owner full, platform_admin full)
  Full:   Adoption, Evidence, Candidates, Benchmarks, Delivery Out., Post-Deploy,
          Capabilities, Cap. Gov., Extensions, Audit, Settings, Billing, Connections
  Operator subset (no cap gov, extensions, settings, billing, connections)

PLATFORM GOVERNANCE (platform_reviewer subset, platform_admin full)
  Full:   Agents, Routing, Debates, Working Mem., Swarm, Pilot Mkt., Mkt. Outcomes,
          Meta-Agents, Meta-Artifacts, Calibration, Prompt Opt., Observability,
          Dist. Jobs, Regions, Tenant Runtime, Orchestration, Rel. Tuning, Assurance 2.0,
          Hypotheses, Sim. Sandbox, Res. Patterns, Promotion
  Reviewer subset: Observability, Hypotheses, Sim. Sandbox, Res. Patterns, Promotion
```

## Files to Create / Modify

### 1. `src/lib/permissions.ts` (NEW)
Central authority for all access logic.
- `CanonicalRole` type: `"end_user" | "operator" | "tenant_owner" | "platform_reviewer" | "platform_admin"`
- `deriveCanonicalRole(orgRole)`: maps org membership role string → CanonicalRole
- `PRODUCT_ROUTES`, `WORKSPACE_ROUTES`, `PLATFORM_ROUTES`: Sets of route paths per surface
- `getNavGroups(role)`: returns `{ product, workspace, platform }` nav item arrays (only the surfaces the role can access, with the correct subset per role)
- `canAccessRoute(role, path)`: boolean, used by both SurfaceGuard and CommandPalette
- `CANONICAL_ROLE_LABELS` and `CANONICAL_ROLE_BADGE_STYLES`: for UI display

### 2. `src/hooks/useRoleBasedExperience.ts` (UPDATE)
- Import `deriveCanonicalRole`, `canAccessRoute`, `getNavGroups` from permissions
- Expose `canonicalRole: CanonicalRole` (new)
- Expose `canAccessRoute(path: string): boolean` (new)
- Keep `roleSurface: RoleSurface` for backward compat with `RoleGuard` (mapped: `end_user`→`default_user`, `operator`/`tenant_owner`/`platform_reviewer`→`operator`, `platform_admin`→`admin`)
- Keep existing `isAdmin`, `isOperator`, `isDefaultUser` working

### 3. `src/components/AccessDenied.tsx` (NEW)
Clean restricted-access state component:
- Lock icon + "Restricted Area" heading
- Description of which surface this is and why the user cannot access it
- Shows current role label
- "Return to Dashboard" button

### 4. `src/components/SurfaceGuard.tsx` (NEW)
Route-level permission gate:
- Props: `surface: "workspace" | "platform"`, `children`
- Reads `canonicalRole` from `useRoleBasedExperience`
- Renders `<AccessDenied>` if the role cannot access that surface
- Wrapped in `AppLayout` so the sidebar still renders (user can navigate away)

### 5. `src/components/AppSidebar.tsx` (REWRITE)
New sidebar with three labeled surface sections:
- Each surface only renders if the current role has access to it
- `SidebarGroupLabel` for "Product", "Workspace", "Platform"
- AutoPilot entry at bottom of Product group: styled differently (accent button row with `Zap` icon, "AutoPilot" label, navigates to `/journey`)
- Footer badge updated to show canonical role label (User / Operator / Owner / Reviewer / Admin)
- Operators see Platform group hidden entirely; tenant_owners see Platform hidden; platform_reviewer sees Workspace hidden

### 6. `src/components/CommandPalette.tsx` (UPDATE)
- Import `useRoleBasedExperience`
- Replace hardcoded `NAV_ITEMS` with items filtered from `getNavGroups(canonicalRole)` (flattened)
- Group by surface in the command list: "Product", "Workspace", "Platform"

### 7. `src/App.tsx` (UPDATE)
Wrap surface-specific routes with `SurfaceGuard`:
- Workspace routes (adoption, improvement-*, capability-*, delivery-outcomes, post-deploy-feedback, delivery-tuning, outcome-assurance, extensions, audit, connections, billing, org) → `<SurfaceGuard surface="workspace">`
- Platform routes (agent-routing, agent-debates, working-memory, swarm-execution, pilot-marketplace, marketplace-outcomes, meta-agents, meta-artifacts, calibration, prompt-optimization, observability, agents, distributed-jobs, cross-region-recovery, tenant-runtime, large-scale-orchestration, architecture-hypotheses, research-sandbox, research-patterns, architecture-promotion) → `<SurfaceGuard surface="platform">`
- Product routes keep `ProtectedRoute` as-is

### 8. `src/components/RoleGuard.tsx` (UPDATE)
Expand `ROLE_HIERARCHY` to recognize new canonical role names alongside old ones for smooth coexistence.

## Sidebar Visual Structure (collapsed into design diagram)

```text
End User sidebar:          Operator sidebar:           Platform Admin sidebar:
─────────────────          ──────────────────          ───────────────────────
⚡ AxionOS                 ⚡ AxionOS                  ⚡ AxionOS
[Search]                   [Search]                    [Search]
───                        ───                         ───
PRODUCT                    PRODUCT                     PRODUCT
  Dashboard                  (same)                      (same)
  Journey                ───                         ───
  Onboarding             WORKSPACE                   WORKSPACE
  Initiatives              Adoption                    (full: 13 items)
  Stories                  Evidence                ───
  Code                     Candidates              PLATFORM
  Workspace                Benchmarks                Agents, Routing ...
  Kanban                   Delivery Out.             (22 items)
  Deployments              Post-Deploy             ───
  [⚡ AutoPilot]           Capabilities            [admin@x.com] [Admin]
───                        Audit                   [Sign Out]
[user@x.com] [User]    ───
[Sign Out]             [op@x.com] [Operator]
                       [Sign Out]
```

## Non-changes
- No existing page is deleted
- No existing route URL changes
- `OrgContext`, `AuthContext`, `PipelineContext` untouched
- All existing `RoleGuard` usage stays functional via backward-compat `roleSurface`
- AutoPilot is an honest nav entry pointing to `/journey` (no fake backend)
