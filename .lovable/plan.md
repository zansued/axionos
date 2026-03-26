# AxionOS — Current Plan

## Last Completed: Sprint 74 (Block AT)

### Block AT — Edge Function Modernization (Sprints 72–74)

| Sprint | Focus | Status |
|--------|-------|--------|
| 72 | Migrate all `esm.sh` imports to `npm:` specifiers | ✅ Done |
| 73 | Migrate `deno.land/x` and `deno.land/std` to native `Deno.serve()` + `npm:`/`jsr:` | ✅ Done |
| 74 | CI governance & linting to prevent CDN/legacy regressions | ✅ Done |

### Key Artifacts
- `supabase/functions/_shared/edge-import-governance.ts` — programmatic import validator
- `scripts/lint-edge-imports.sh` — CLI linter (0 violations confirmed)
- All 225+ Edge Functions use `npm:@supabase/supabase-js@2` and native `Deno.serve()`

---

## Next Steps (Planned)

### Sprints 75–78 — Advanced Multi-Agent Coordination (Reserved)
### Sprints 79–82 — Governed Capability Ecosystem & Early Marketplace (Reserved)
### Sprints 83–86 — Autonomous Delivery Optimization & Outcome Assurance 2.0 (Reserved)
### Sprints 87–90 — Advanced Distributed Runtime & Scaled Execution (Reserved)
### Sprints 91–94 — Research Sandbox for Architecture Evolution (Reserved)

---

## Known Issues
- `pipeline-publish`: GitHub tree creation fails when paths end with `/` — needs path sanitization in tree builder.
