

# Sprint Fix — Node.js Version Alignment (24.x → 20.x)

## Problem
The system has a contradiction: AI prompts instruct `engines.node: "20.x"`, but the sanitizer overwrites it to `"24.x"`. Vercel does not support Node 24, causing build failures.

## Changes (4 files)

### 1. `supabase/functions/_shared/code-sanitizers.ts`
- Line 147: `node: "24.x"` → `node: "20.x"`
- Line 186: `.nvmrc: "24"` → `.nvmrc: "20"`
- Line 187: `.node-version: "24"` → `.node-version: "20"`

### 2. `supabase/functions/_shared/prompt-guardrails.ts`
- Line 60: `Use Node.js engines "24.x"` → `Use Node.js engines "20.x"`

### 3. `scripts/pre-install.js`
- Line 5: `node: '24.x'` → `node: '20.x'`

### 4. `supabase/functions/_shared/canonical-deps.ts`
- Update the `engines` comment/reference if present (already checked — no `engines` entry in canonical deps, so no change needed here).

### Post-Change
- Deploy edge functions that import `code-sanitizers.ts` and `prompt-guardrails.ts` (at minimum: `run-initiative-pipeline`, `pipeline-execution-worker`, `pipeline-build-check`, `pipeline-publish`).

### Impact
All generated projects will now target Node 20.x across `package.json`, `.nvmrc`, `.node-version`, prompt instructions, and the local pre-install script — fully aligned with Vercel's supported runtime.

