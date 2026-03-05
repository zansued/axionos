# SynkrAIOS — Architectural Review & Evolution Plan

> Deep technical analysis of the AI-orchestrated software generation system.  
> Last updated: 2026-03-05

---

## 1. Project Overview

**SynkrAIOS** (formerly AxionOS) is a multi-tenant SaaS platform that orchestrates multiple AI agents to collaboratively generate complete software projects — from a raw idea to a deployed GitHub repository.

### Core Value Proposition
A human provides an idea → AI agents autonomously analyze, plan, architect, code, validate, and publish a working application.

### Technology Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui |
| State Management | TanStack React Query + React Context |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions, RLS) |
| AI Engine | Hybrid: OpenAI GPT-4o-mini or Google Gemini 2.5 Flash/Pro via Lovable AI Gateway |
| Git Integration | GitHub API v3 (create repo, commit files, create PRs) |
| URL Scraping | Firecrawl (self-hosted or cloud) |
| Deployment | Vercel/Netlify configs auto-generated |

### Multi-Tenancy Model
- **Organizations** → **Workspaces** → **Initiatives**
- RLS policies enforce isolation per `organization_id`
- Role-based access: `owner`, `admin`, `editor`, `reviewer`, `viewer`
- Auto-provisioning: first login creates a default org via `create_organization_with_owner` RPC

---

## 2. Current Architecture

### 2.1 Pipeline Stages (How It Works Today)

The system implements a **6-stage governance pipeline** with human gates. Each stage transitions through granular `stage_status` values:

```
draft → discovering → discovered → squad_ready → forming_squad → squad_formed
→ planning_ready → planning → planned → in_progress → validating
→ ready_to_publish → published → completed
```

#### Stage 1: Discovery
**Edge Function:** `run-initiative-pipeline` (stage=discovery)  
**Input:** Title, description, optional reference URL  
**Process:**
1. Optionally scrapes reference URL via Firecrawl
2. Single AI call produces a JSON analysis: refined idea, business model, MVP scope, complexity, risk, stack, market analysis, feasibility, target user, effort estimate
3. Results stored in `initiatives` table (`discovery_payload`, `refined_idea`, `business_model`, etc.)

**Output:** Structured discovery JSON  
**Gate:** Human approves → moves to `squad_ready`

#### Stage 2: Squad Formation
**Edge Function:** `run-initiative-pipeline` (stage=squad_formation)  
**Process:**
1. AI generates optimal squad composition (3-8 agents) based on project complexity
2. Role normalization maps AI-generated roles to strict enum values (`dev`, `architect`, `qa`, `pm`, etc.)
3. Creates `agents` records, `squads` record, and `squad_members` linkages
4. Cleans up old squads on re-runs

**Output:** Squad with specialized agents  
**Gate:** Human approves → moves to `planning_ready`

#### Stage 3: Planning
**Edge Function:** `run-initiative-pipeline` (stage=planning)  
**Process:**
1. **PRD Generation** — AI creates a Product Requirements Document (markdown)
2. **Architecture Generation** — AI creates technical architecture based on PRD (stack, data model, components, APIs, security)
3. **Code-Aware Story Generation** — AI generates user stories where **each subtask maps to exactly one file** with `file_path` and `file_type`
4. Creates `stories` → `story_phases` → `story_subtasks` hierarchy

**Output:** PRD + Architecture + Stories with file-level subtasks  
**Gate:** Human approves → moves to `in_progress`

#### Stage 4: Execution (Chain-of-Agents)
**Edge Function:** `run-initiative-pipeline` (stage=execution)  
**Process (per subtask with file_path):**
1. **Architect** analyzes task and defines technical structure (interfaces, patterns, edge cases)
2. **Dev** receives Architect's spec and generates complete file code
3. **QA** reviews code and returns JSON verdict (approved/issues/score)
4. If QA rejects (score < 80), **Dev** fixes and QA re-reviews (max 2 iterations)
5. Each exchange recorded as `agent_message` for traceability

**Parallelization:**
- Config/scaffold/style files execute in parallel (batches of 3)
- Component/logic files execute sequentially (to build context)

**Context Injection:**
- Previously generated files included in prompts (up to 6KB)
- Agent memory + org knowledge base injected
- Supabase connection info injected when configured

**Deterministic Overrides:**
- `vercel.json`, `tsconfig.json`, `vite.config.ts`, `postcss.config.js`, etc. use hardcoded correct content
- `package.json` post-processed to fix common AI mistakes (invalid packages, missing deps)

**Output:** Generated code files as `agent_outputs` + `code_artifacts`  
**Real-time:** `execution_progress` JSON updated in `initiatives` table, consumed via Supabase Realtime

#### Stage 5: Validation
**Edge Function:** `run-initiative-pipeline` (stage=validation)  
**Process:**
1. Processes artifacts in batches of 8 (to avoid edge function timeouts)
2. For each artifact, AI validates with 5 criteria: correctness, best practices, security, completeness, consistency
3. **Auto-approval:** score ≥ 70 → approved
4. **Auto-rework:** score 50-69 → AI rewrites, re-validates (max 2 attempts)
5. **Auto-rejection:** score < 50 → rejected
6. **Architect Cross-Review:** Code artifacts get additional architectural review
7. **Escalation:** After max rework attempts, escalated to human review
8. Client auto-continues batches until all processed

**Gate:** All artifacts approved → moves to `ready_to_publish`

#### Stage 6: Publish
**Edge Function:** `run-initiative-pipeline` (stage=publish)  
**Process:**
1. Creates a new GitHub repository (or uses existing)
2. AI generates semantic commit messages (Conventional Commits)
3. Build Health Report checks: package.json validity, vite config, tsconfig, deploy configs
4. Auto-fixes detected issues (sanitizes package.json, ensures deploy configs)
5. Commits files directly to main branch via GitHub Contents API
6. Ensures required deploy files exist (`vercel.json`, `_redirects`, etc.)

**Output:** GitHub repo URL with committed code

#### Additional Stages
- **Fast Modify:** Single-file AI modification + auto-republish via PR
- **Full Review:** AI reviews entire project, fixes multiple files, creates PR

### 2.2 Agent Roles

| Role | Responsibilities |
|------|-----------------|
| `architect` | Technical structure, interfaces, patterns, architectural decisions (ADRs) |
| `dev` | Code generation, implementation |
| `qa` | Code review, quality scoring |
| `pm` | Product management, PRD |
| `po` | Product ownership, backlog |
| `sm` | Scrum master, team organization |
| `analyst` | Requirements, business analysis |
| `devops` | Infrastructure, CI/CD |
| `ux_expert` | UX/UI design |
| `aios_master` | System orchestrator |

### 2.3 Data Model (Key Tables)

```
organizations ──┬── workspaces
                ├── initiatives ──┬── stories ──── story_phases ──── story_subtasks
                │                 ├── squads ──── squad_members ──── agents
                │                 ├── agent_outputs ──┬── code_artifacts
                │                 │                   ├── artifact_reviews
                │                 │                   ├── adrs
                │                 │                   ├── content_documents
                │                 │                   └── validation_runs
                │                 ├── agent_messages
                │                 └── initiative_jobs
                ├── agent_memory
                ├── org_knowledge_base
                ├── git_connections
                ├── supabase_connections
                ├── stage_sla_configs
                ├── org_usage_limits
                └── audit_logs
```

### 2.4 Client Architecture

```
App.tsx
├── AuthProvider (auth state)
├── OrgProvider (multi-tenant org/workspace state)
├── PipelineProvider (background pipeline execution, events, notifications)
├── OnboardingProvider
└── Routes
    ├── Dashboard (KPIs, strategic overview)
    ├── Initiatives (CRUD + InitiativeDetail with full pipeline UI)
    ├── Kanban (drag-and-drop board)
    ├── Agents (CRUD, memory panel)
    ├── Stories (list, subtask drill-down)
    ├── CodeExplorer (file tree with code preview)
    ├── Artifacts (review actions, AI analysis)
    ├── Workspace (diff, git, replay, validation, policies)
    ├── Observability (costs dashboard)
    ├── Connections (GitHub, Supabase external)
    ├── Billing (usage limits)
    └── AuditLogs
```

---

## 3. Identified Problems

### 3.1 🔴 Critical: Monolithic Pipeline Function (2985 lines)

`run-initiative-pipeline/index.ts` is a **single 2985-line edge function** containing ALL pipeline logic. This causes:
- **Timeout risk:** Complex stages (execution, validation) frequently hit Deno edge function limits
- **No modularity:** Cannot test, debug, or deploy stages independently
- **Memory pressure:** All stage code loaded even when running a single stage
- **Maintenance nightmare:** Any change risks breaking unrelated stages

**Impact:** Pipeline failures, lost progress, inability to scale.

### 3.2 🔴 Critical: No Real Code Validation

The "validation" stage is **purely AI-based text analysis**. There is:
- ❌ No actual TypeScript compilation check
- ❌ No `npm install` or dependency resolution
- ❌ No lint (`eslint`, `tsc --noEmit`)
- ❌ No build verification (`vite build`)
- ❌ No test execution
- ❌ No runtime sandbox

**Impact:** Generated code that "looks good" to AI but fails to compile or run. The Build Health Report only checks file presence, not actual buildability.

### 3.3 🔴 Critical: Context Window Exhaustion

Each subtask gets only ~6KB of previously generated files as context. For projects with 20+ files:
- Later files have no knowledge of early files' actual content
- Import paths reference files the AI has never "seen"
- Component props/interfaces don't match between files
- State management is inconsistent across components

**Impact:** Generated apps have broken imports, mismatched types, and inconsistent behavior.

### 3.4 🟡 Major: No Dependency Graph Between Files

Files are generated in story order, not dependency order. A component file might be generated before the hook it imports, or a page before the component it uses. There is:
- No topological sorting of file generation order
- No import/export analysis
- No awareness of which files depend on which

**Impact:** Circular dependencies, missing exports, import resolution failures.

### 3.5 🟡 Major: Stateless Agent Memory

Agent memory (`agent_memory` table) exists but is:
- Only injected as flat text (15 entries, no relevance ranking)
- Not updated DURING execution (only reads historical data)
- No semantic search — just chronological fetch
- No memory of what THIS initiative's agents have done so far

**Impact:** Agents make contradictory decisions within the same project.

### 3.6 🟡 Major: AI Output Non-Determinism

AI output is stripped of markdown fences (`/^```[\w]*\n?/`) but:
- No AST validation for TypeScript/JSON files
- No schema validation for SQL files
- JSON mode only used for structured responses, not for code
- AI frequently returns explanatory text mixed with code

**Impact:** Files with commentary instead of pure code, invalid JSON configs.

### 3.7 🟡 Major: Single-File Commit Strategy

The publish stage commits files one-by-one via GitHub Contents API. This:
- Creates N separate commits instead of one atomic commit
- Doesn't use Git tree API for atomic multi-file operations
- Can leave repo in broken state if publish fails midway
- Doesn't support `.gitignore` or binary files

**Impact:** Messy git history, partially published projects.

### 3.8 🟡 Major: Duplicated AI Client Logic

Every edge function independently implements:
- AI provider selection (OpenAI vs Lovable Gateway)
- Retry logic with backoff
- Token counting and cost estimation
- Error handling

The shared `_shared/ai-client.ts` exists but is NOT used by the main pipeline function.

**Impact:** Inconsistent behavior, harder maintenance, duplicated bugs.

### 3.9 🟠 Minor: No Rollback for Generated Code

When a "reject" action resets subtasks to pending:
- Old outputs are nullified (`output: null`)
- Previous generated code is lost
- No version history of generated files
- Cannot diff between iterations

**Impact:** Lost work on reject, no learning from previous attempts.

### 3.10 🟠 Minor: Frontend Component Size

Several components exceed maintainable sizes:
- `InitiativeDetail.tsx`: 708 lines (UI + logic + dialogs)
- `PipelineContext.tsx`: 203 lines (growing)
- Multiple pages mix data fetching with presentation

---

## 4. Improved Architecture Proposal

### 4.1 Pipeline Decomposition

**Split the monolithic function into independent edge functions per stage:**

```
supabase/functions/
├── pipeline-discovery/index.ts      (~200 lines)
├── pipeline-squad/index.ts          (~200 lines)
├── pipeline-planning/index.ts       (~300 lines)
├── pipeline-execution/index.ts      (~500 lines)
├── pipeline-validation/index.ts     (~400 lines)
├── pipeline-publish/index.ts        (~400 lines)
├── pipeline-approve/index.ts        (~100 lines)
├── pipeline-reject/index.ts         (~150 lines)
├── pipeline-fast-modify/index.ts    (~200 lines)
├── pipeline-full-review/index.ts    (~300 lines)
├── _shared/
│   ├── ai-client.ts                 (unified AI calls)
│   ├── pipeline-helpers.ts          (log, job, updateInit)
│   ├── code-sanitizers.ts           (package.json, deterministic files)
│   ├── agent-context.ts             (memory, knowledge base injection)
│   └── rate-limit.ts
```

**Orchestrator pattern:** A thin `pipeline-orchestrator/index.ts` routes to the correct stage function.

### 4.2 Project Knowledge Graph

Introduce a structured representation of the generated project:

```sql
CREATE TABLE project_graph_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL, -- 'file', 'component', 'hook', 'type', 'function', 'route', 'table'
  name TEXT NOT NULL,
  file_path TEXT,
  metadata JSONB, -- exports, props, dependencies
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE project_graph_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id UUID REFERENCES project_graph_nodes(id) ON DELETE CASCADE,
  target_node_id UUID REFERENCES project_graph_nodes(id) ON DELETE CASCADE,
  edge_type TEXT NOT NULL, -- 'imports', 'uses_component', 'implements', 'extends', 'routes_to'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Usage:**
- Planning stage creates the graph from architecture + stories
- Execution stage uses topological sort to determine generation order
- Each generated file updates the graph with actual exports/imports
- Context injection uses graph traversal (give agent ALL files that current file depends on)

### 4.3 Structured Artifact Contracts

Define explicit contracts between stages:

```typescript
// Stage outputs are typed, validated, and stored as structured JSON
interface DiscoveryArtifact {
  refined_idea: string;
  business_model: string;
  mvp_scope: string;
  complexity: 'low' | 'medium' | 'high' | 'critical';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  suggested_stack: string;
  requires_backend: boolean;
  entities: Entity[];
  user_flows: UserFlow[];
}

interface PlanningArtifact {
  prd: string;
  architecture: ArchitectureSpec;
  file_tree: FileNode[];
  dependency_graph: DependencyEdge[];
  stories: StorySpec[];
}

interface ExecutionArtifact {
  files: GeneratedFile[];
  project_graph: ProjectGraph;
  agent_decisions: Decision[];
}
```

### 4.4 Runtime Sandbox Validation

Replace AI-only validation with actual code verification:

```
1. Virtual filesystem: Assemble all generated files
2. npm install (or simulate with package resolution)
3. tsc --noEmit (TypeScript compilation check)
4. eslint --quiet (basic lint)
5. vite build --mode production (build verification)
6. Report errors back to Dev agent for fixing
```

**Implementation:** Use a sandboxed environment (e.g., WebContainers API, or a dedicated build-check edge function that runs in a container).

### 4.5 Smart Context Window Management

Instead of truncating files at 6KB:

```
1. Build dependency graph for current file
2. Include FULL content of direct dependencies (imports)
3. Include TYPE SIGNATURES ONLY of indirect dependencies
4. Include file tree with descriptions for all other files
5. Prioritize most recently generated files
```

**Token budget allocation:**
- 40% → Direct dependency files (full content)
- 20% → Indirect dependencies (types/interfaces only)
- 15% → Architecture + PRD context
- 15% → Agent memory + knowledge base
- 10% → Project file tree

### 4.6 Atomic Git Operations

Replace file-by-file commits with Git Tree API:

```typescript
// 1. Create blobs for all files
const blobs = await Promise.all(files.map(f => createBlob(f.content)));

// 2. Create a single tree with all files
const tree = await createTree(blobs, baseTreeSha);

// 3. Create one commit
const commit = await createCommit("feat: initial project generation", tree.sha, baseSha);

// 4. Update branch reference
await updateRef(branch, commit.sha);
```

**Result:** One atomic commit, clean git history, no partial states.

### 4.7 Execution Feedback Loop

Add a fix loop between validation and execution:

```
Execution → Validation
    ↓ (if failures)
Fix Agent receives:
  - Exact error messages (tsc errors, build errors)
  - File content that caused the error
  - Related file contents
    ↓
Fix Agent produces corrected files
    ↓
Re-validation
    ↓ (max 3 iterations)
Human escalation or publish
```

---

## 5. Agent Responsibilities (Improved Model)

| Agent | Input | Output | Contract |
|-------|-------|--------|----------|
| **Product Analyst** | Raw idea, reference URL | `DiscoveryArtifact` (typed JSON) | Must include entities, user flows, and backend requirements |
| **Architect** | Discovery artifact | `ArchitectureSpec` with file tree + dependency graph | Must produce valid dependency DAG |
| **PM** | Architecture + Discovery | Ordered stories with file-level subtasks | Each subtask = 1 file, topologically sorted |
| **Dev** | Architect spec + dependency context + full imports | Complete, compilable source file | Must match declared exports |
| **QA** | Generated code + spec | Structured review (pass/fail with line-level issues) | Must verify imports resolve |
| **DevOps** | Full project | Build + deploy configs | Must pass `vite build` |
| **Reviewer** | Full project | Fix patches for compilation errors | Must preserve existing functionality |

---

## 6. Pipeline Stages (Improved Flow)

```
┌─────────────────────────────────────────────────────────────────────┐
│  IDEA INPUT                                                         │
│  User provides: title, description, reference URL                   │
└────────────────────────┬────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  1. PRODUCT ANALYSIS (Discovery)                                    │
│  - Scrape reference URL                                             │
│  - Market analysis, feasibility, MVP scope                          │
│  - Identify entities and user flows                                 │
│  - Determine if backend is needed                                   │
│  OUTPUT: DiscoveryArtifact (typed JSON)                             │
│  GATE: Human approval                                               │
└────────────────────────┬────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. ARCHITECTURE DESIGN                                             │
│  - Generate PRD from discovery                                      │
│  - Design system architecture                                       │
│  - Define complete file tree with dependency graph                   │
│  - Define data model (SQL + RLS)                                    │
│  - Topological sort of file generation order                        │
│  OUTPUT: ArchitectureSpec + DependencyGraph                         │
│  GATE: Human approval                                               │
└────────────────────────┬────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. TASK GRAPH CREATION (Squad + Stories)                            │
│  - Form squad based on project needs                                │
│  - Generate stories with file-level subtasks                        │
│  - Order subtasks by dependency graph                               │
│  - Assign agents to stories by expertise                            │
│  OUTPUT: Ordered task queue                                         │
│  GATE: Human approval                                               │
└────────────────────────┬────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. AGENT EXECUTION                                                 │
│  - Process files in dependency order                                │
│  - Chain-of-Agents per file: Architect → Dev → QA                   │
│  - Smart context: full dependency files + type signatures           │
│  - Update project graph after each file                             │
│  - Record agent messages for traceability                           │
│  OUTPUT: Generated source files + updated project graph             │
└────────────────────────┬────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. RUNTIME VALIDATION                                              │
│  - Assemble virtual filesystem                                      │
│  - Run: npm install check, tsc --noEmit, vite build                 │
│  - AI review for quality, security, patterns                        │
│  - Architect cross-review for consistency                           │
│  OUTPUT: Validation report (pass/fail with errors)                  │
└─────────────┬───────────────────────────┬───────────────────────────┘
              │ PASS                      │ FAIL
              ▼                           ▼
┌─────────────────────┐    ┌──────────────────────────────────────────┐
│  6. GIT PUBLISH     │    │  FIX LOOP                                │
│  - Atomic commit    │    │  - Feed exact errors to Dev agent        │
│  - Build health     │    │  - Re-generate affected files            │
│  - Push to GitHub   │    │  - Re-validate (max 3 iterations)        │
│  OUTPUT: Repo URL   │    │  - Escalate to human if still failing    │
└─────────────────────┘    └──────────────────────────────────────────┘
```

---

## 7. Validation and Testing Strategy

### Tier 1: AI Review (Current — Keep)
- Quality scoring (0-100) across 5 criteria
- Auto-approve (≥70), auto-rework (50-69), auto-reject (<50)
- Architect cross-review for code files

### Tier 2: Static Analysis (New — High Priority)
- TypeScript compilation (`tsc --noEmit`)
- Import resolution verification
- JSON/SQL syntax validation
- Package.json dependency resolution

### Tier 3: Build Verification (New — High Priority)
- `vite build` in sandboxed environment
- Verify all imports resolve
- Check for missing assets/fonts

### Tier 4: Auto-Generated Tests (New — Medium Priority)
- QA agent generates basic test cases alongside review
- Smoke tests: each page renders without errors
- Integration tests: key user flows work

### Tier 5: Visual Regression (Future)
- Screenshot comparison for generated UIs
- Accessibility audit (axe-core)

---

## 8. Future Improvements (Prioritized)

### P0 — Critical (Blocks Quality)
1. **Split monolithic pipeline function** into per-stage edge functions
2. **Implement dependency-aware file generation order** (topological sort)
3. **Smart context window** — full dependency content instead of truncated snippets
4. **Atomic Git commits** via Tree API
5. **Unified AI client** — all functions use `_shared/ai-client.ts`

### P1 — High (Significant Quality Improvement)
6. **TypeScript compilation check** before publish (even if basic)
7. **Build health check** that actually runs `vite build`
8. **Structured artifact contracts** between stages (typed interfaces)
9. **Project knowledge graph** for cross-file consistency
10. **Agent memory update DURING execution** (not just reads)

### P2 — Medium (Better UX & Reliability)
11. **Templates** — pre-configured initiative templates (SaaS, landing page, dashboard)
12. **Incremental re-execution** — only re-generate files affected by reject
13. **Diff-based rework** — show what changed between iterations
14. **File version history** — keep previous generated content
15. **Keyboard shortcuts** and improved navigation

### P3 — Nice to Have
16. **i18n** (pt-BR / en-US)
17. **CSV/PDF export** for observability reports
18. **Webhook for PR merge** → auto-update initiative status
19. **Approval chains** with multiple reviewers
20. **Visual component preview** for generated UI files

---

## 9. Key Metrics to Track

| Metric | Current | Target |
|--------|---------|--------|
| Pipeline success rate (idea → published) | ~40% (estimated) | >80% |
| Generated project builds successfully | Unknown (no build check) | >90% |
| Avg time per initiative (idea → publish) | ~15-30 min | <20 min |
| Files with broken imports | Unknown | <5% |
| Agent context window utilization | ~30% (truncated) | >80% (smart) |
| Cost per initiative | $0.05-0.30 | <$0.20 |

---

## 10. Migration Path

### Phase 1: Foundation (1-2 weeks)
- Extract shared helpers from monolithic function
- Unify AI client usage across all functions
- Add structured typing to stage outputs

### Phase 2: Split & Strengthen (2-3 weeks)
- Split pipeline into per-stage functions
- Implement dependency graph in planning
- Add TypeScript compilation check

### Phase 3: Smart Execution (2-3 weeks)
- Implement smart context window management
- Add project graph tracking during execution
- Atomic Git operations

### Phase 4: Runtime Validation (2-4 weeks)
- Sandboxed build verification
- Error-driven fix loop
- Auto-generated smoke tests

### Phase 5: Polish (ongoing)
- Templates, i18n, keyboard shortcuts
- Visual component preview
- Advanced governance (approval chains)
