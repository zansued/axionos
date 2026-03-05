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

---

## 11. Project Brain Architecture

> The Project Brain is a structured knowledge system that gives agents a complete understanding of the software they are generating. It eliminates blind spots that cause duplicated components, inconsistent APIs, broken imports, and contradictory architectural decisions.

### 11.1 Why the Project Brain Exists

Without a centralized knowledge system, agents operate with fragmented context:

| Problem | Root Cause | Impact |
|---------|-----------|--------|
| Duplicated components | Agents don't know what already exists | Bloated codebase, conflicting implementations |
| Inconsistent APIs | No shared contract registry | Frontend calls endpoints that don't match backend |
| Broken imports | No dependency tracking | Runtime errors, build failures |
| Type mismatches | Each agent invents its own types | TypeScript compilation failures |
| Contradictory decisions | No shared memory of "why" | Architecture degrades over iterations |
| Repeated errors | No learning from past mistakes | Same bugs appear across initiatives |

The Project Brain solves all of these by maintaining a **live, queryable representation** of the entire project.

### 11.2 Architecture Overview

The Project Brain consists of four interconnected subsystems:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PROJECT BRAIN                                   │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │  1. PROJECT GRAPH │  │  2. PROJECT      │  │  3. ERROR LEARNING   │  │
│  │                   │  │     MEMORY       │  │     SYSTEM           │  │
│  │  Nodes: files,    │  │                  │  │                      │  │
│  │  components,      │  │  Architectural   │  │  Historical errors,  │  │
│  │  hooks, services, │  │  decisions,      │  │  root causes,        │  │
│  │  APIs, tables,    │  │  patterns,       │  │  fixes applied,      │  │
│  │  types, schemas   │  │  constraints,    │  │  prevention rules    │  │
│  │                   │  │  conventions     │  │                      │  │
│  │  Edges: imports,  │  │                  │  │                      │  │
│  │  depends_on,      │  │                  │  │                      │  │
│  │  uses_component,  │  │                  │  │                      │  │
│  │  calls_api,       │  │                  │  │                      │  │
│  │  stores_in_table  │  │                  │  │                      │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  4. SEMANTIC KNOWLEDGE LAYER                                      │   │
│  │                                                                    │   │
│  │  Vector embeddings of code artifacts, decisions, and descriptions │   │
│  │  Enables queries like: "components related to authentication"     │   │
│  │  Powered by pgvector or external embedding service                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 11.3 Subsystem 1: Project Graph

The Project Graph is a **directed acyclic graph (DAG)** representing every entity in the generated project and their relationships.

#### Node Types

| Node Type | Description | Example |
|-----------|-------------|---------|
| `file` | A source file in the project | `src/components/Header.tsx` |
| `component` | A React component (may be inside a file) | `Header`, `UserAvatar` |
| `hook` | A custom React hook | `useAuth`, `useUsers` |
| `service` | A service/utility module | `api-client.ts`, `auth-service.ts` |
| `api_endpoint` | A backend API endpoint | `POST /api/users`, Edge Function |
| `database_table` | A Supabase/PostgreSQL table | `users`, `orders` |
| `type` | A TypeScript type/interface | `User`, `OrderStatus` |
| `schema` | A database schema or validation schema | Zod schema, SQL DDL |
| `edge_function` | A Supabase Edge Function | `create-order/index.ts` |
| `route` | A frontend route/page | `/dashboard`, `/settings` |
| `context` | A React Context provider | `AuthContext`, `ThemeContext` |

#### Edge Types (Relationships)

| Edge Type | Meaning | Example |
|-----------|---------|---------|
| `imports` | File A imports from File B | `Header.tsx` → `useAuth.ts` |
| `uses_component` | Component A renders Component B | `Dashboard` → `KPICard` |
| `calls_api` | Frontend calls a backend endpoint | `useUsers` → `GET /api/users` |
| `depends_on` | General dependency relationship | `OrderService` → `UserService` |
| `stores_in_table` | API/service writes to a DB table | `create-order` → `orders` table |
| `reads_from_table` | API/service reads from a DB table | `GET /api/users` → `users` table |
| `implements_interface` | Code implements a TypeScript interface | `UserCard` → `UserCardProps` |
| `extends` | Type or component extends another | `AdminUser` → `User` |
| `routes_to` | Route renders a page component | `/dashboard` → `DashboardPage` |
| `provides_context` | Context provider wraps children | `AuthProvider` → `App` |
| `validates_with` | Uses a validation schema | `CreateUserForm` → `userSchema` |

#### Database Schema

```sql
CREATE TABLE project_brain_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  node_type TEXT NOT NULL,          -- 'file', 'component', 'hook', etc.
  name TEXT NOT NULL,               -- Human-readable name
  file_path TEXT,                   -- Full path (e.g., 'src/components/Header.tsx')
  description TEXT,                 -- What this entity does
  metadata JSONB DEFAULT '{}',      -- Exports, props, interfaces, dependencies
  content_hash TEXT,                -- Hash of last known content (for change detection)
  status TEXT DEFAULT 'planned',    -- 'planned', 'generated', 'validated', 'published'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_brain_nodes_initiative ON project_brain_nodes(initiative_id);
CREATE INDEX idx_brain_nodes_type ON project_brain_nodes(node_type);
CREATE INDEX idx_brain_nodes_file_path ON project_brain_nodes(file_path);

CREATE TABLE project_brain_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES project_brain_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES project_brain_nodes(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,      -- 'imports', 'depends_on', 'calls_api', etc.
  metadata JSONB DEFAULT '{}',      -- Extra context about the relationship
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_node_id, target_node_id, relation_type)
);

CREATE INDEX idx_brain_edges_initiative ON project_brain_edges(initiative_id);
CREATE INDEX idx_brain_edges_source ON project_brain_edges(source_node_id);
CREATE INDEX idx_brain_edges_target ON project_brain_edges(target_node_id);
```

#### Graph Operations

| Operation | When | Purpose |
|-----------|------|---------|
| `getNodesByType(type)` | Execution | "Give me all existing hooks" |
| `getDependencies(nodeId)` | Execution | "What does this file import?" |
| `getDependents(nodeId)` | Validation | "What breaks if I change this file?" |
| `getTopologicalOrder()` | Planning/Execution | "In what order should files be generated?" |
| `findByFilePath(path)` | Execution | "Does this file already exist?" |
| `getNeighborhood(nodeId, depth)` | Context injection | "Give me all related entities for context" |

### 11.4 Subsystem 2: Project Memory (Decisions)

Project Memory stores **architectural decisions and conventions** that guide all agents throughout the project lifecycle.

#### Categories of Decisions

| Category | Examples |
|----------|---------|
| `technology_choice` | "Using Supabase for backend because..." |
| `pattern_adoption` | "All API calls go through a centralized service layer" |
| `convention` | "File naming: kebab-case for files, PascalCase for components" |
| `constraint` | "No client-side state management library — use React Query + Context" |
| `security` | "All RLS policies must include organization_id filtering" |
| `performance` | "Lazy load all routes except Dashboard" |

#### Database Schema

```sql
CREATE TABLE project_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  category TEXT NOT NULL,           -- 'technology_choice', 'pattern_adoption', etc.
  decision TEXT NOT NULL,           -- What was decided
  reason TEXT,                      -- Why it was decided
  impact TEXT,                      -- What this affects
  decided_by TEXT,                  -- Agent name or 'human'
  stage TEXT,                       -- Pipeline stage where this was decided
  supersedes_id UUID REFERENCES project_decisions(id), -- If this replaces a previous decision
  status TEXT DEFAULT 'active',     -- 'active', 'superseded', 'revoked'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_decisions_initiative ON project_decisions(initiative_id);
CREATE INDEX idx_decisions_category ON project_decisions(category);
```

#### How Agents Use Decisions

1. **Before generating code:** Agent queries all active decisions for the initiative
2. **During architecture:** Architect stores fundamental decisions (stack, patterns, conventions)
3. **During execution:** Dev agents check conventions before writing code
4. **On contradiction:** New decision explicitly supersedes old one via `supersedes_id`

### 11.5 Subsystem 3: Error Learning System

The Error Learning System captures **every error encountered during validation** and how it was resolved, creating an institutional memory that prevents recurring mistakes.

#### Database Schema

```sql
CREATE TABLE project_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  file_path TEXT,                   -- File where the error occurred
  error_type TEXT NOT NULL,         -- 'typescript', 'import', 'schema', 'runtime', 'lint', 'build'
  error_message TEXT NOT NULL,      -- The actual error message
  error_context TEXT,               -- Surrounding code or situation
  root_cause TEXT,                  -- AI-determined root cause
  fix_applied TEXT,                 -- What was done to fix it
  fixed_by_agent TEXT,              -- Which agent fixed it
  prevention_rule TEXT,             -- Rule to prevent this in future
  severity TEXT DEFAULT 'error',    -- 'error', 'warning', 'info'
  recurrence_count INT DEFAULT 1,   -- How many times this error pattern appeared
  detected_at TIMESTAMPTZ DEFAULT now(),
  fixed_at TIMESTAMPTZ
);

CREATE INDEX idx_errors_initiative ON project_errors(initiative_id);
CREATE INDEX idx_errors_type ON project_errors(error_type);
CREATE INDEX idx_errors_org ON project_errors(organization_id);
```

#### Error Learning Flow

```
Validation detects error
      ↓
Error recorded in project_errors
      ↓
Fix Agent resolves it
      ↓
fix_applied and prevention_rule stored
      ↓
Next execution: agents receive relevant prevention_rules in their prompts
      ↓
Organization-wide: common errors aggregated across initiatives
```

#### Cross-Initiative Learning

Errors with `prevention_rule` are promoted to `org_knowledge_base` when they recur across 3+ initiatives, becoming organization-wide guidance.

### 11.6 Subsystem 4: Semantic Knowledge Layer

The Semantic Knowledge Layer enables **natural language queries** against the project structure using vector embeddings.

#### How It Works

1. Each node in the Project Graph gets a text description embedded as a vector
2. Each decision gets embedded
3. Agents can query: "Find all entities related to user authentication"
4. Results come back as ranked nodes, enabling intelligent context injection

#### Implementation Strategy

**Phase 1 (Current):** Keyword-based search using PostgreSQL `tsvector` + `ts_rank`
- No external dependencies
- Good enough for structured queries
- Uses existing `metadata` JSONB fields for full-text search

**Phase 2 (Future):** Vector embeddings using `pgvector`
- Add embedding column to `project_brain_nodes`
- Generate embeddings via AI during node creation
- Enable similarity search: `ORDER BY embedding <=> query_embedding`

#### Metadata Schema for Semantic Search

```jsonb
-- project_brain_nodes.metadata example for a component:
{
  "exports": ["Header", "HeaderProps"],
  "imports": ["react", "@/hooks/useAuth", "@/components/ui/button"],
  "props": {"title": "string", "showUser": "boolean"},
  "domain_tags": ["navigation", "layout", "authentication"],
  "description_vector_id": "uuid-of-embedding"  -- Phase 2
}
```

### 11.7 Pipeline Integration Map

Each pipeline stage interacts with the Project Brain differently:

```
┌─────────────┬──────────────────────┬──────────────────────────────────────┐
│ Stage       │ Reads From           │ Writes To                            │
├─────────────┼──────────────────────┼──────────────────────────────────────┤
│ Discovery   │ org_knowledge_base   │ project_decisions (technology,       │
│             │ project_errors (org) │   constraints, domain entities)      │
│             │                      │ project_brain_nodes (domain entities)│
├─────────────┼──────────────────────┼──────────────────────────────────────┤
│ Architecture│ project_decisions    │ project_brain_nodes (all planned     │
│             │ project_errors       │   files, components, APIs, tables)   │
│             │                      │ project_brain_edges (dependency DAG) │
│             │                      │ project_decisions (patterns, stack)  │
├─────────────┼──────────────────────┼──────────────────────────────────────┤
│ Planning    │ project_brain_nodes  │ Updates node.status → 'planned'      │
│             │ project_brain_edges  │ Links subtasks → brain nodes         │
│             │ project_decisions    │ Topological sort from edges          │
├─────────────┼──────────────────────┼──────────────────────────────────────┤
│ Execution   │ project_brain_nodes  │ Updates node.status → 'generated'    │
│             │ project_brain_edges  │ Updates node.metadata (actual exports │
│             │ project_decisions    │   props, interfaces discovered)      │
│             │ project_errors       │ New edges from actual imports        │
│             │                      │ node.content_hash updated            │
├─────────────┼──────────────────────┼──────────────────────────────────────┤
│ Validation  │ project_brain_nodes  │ project_errors (detected issues)     │
│             │ project_brain_edges  │ Updates node.status → 'validated'    │
│             │ project_errors       │ Validates edge consistency           │
│             │                      │   (all imports resolve to real nodes)│
├─────────────┼──────────────────────┼──────────────────────────────────────┤
│ Publish     │ project_brain_nodes  │ Updates node.status → 'published'    │
│             │ project_decisions    │ Exports final graph as project doc   │
│             │ project_brain_edges  │ Promotes errors → org knowledge base │
└─────────────┴──────────────────────┴──────────────────────────────────────┘
```

### 11.8 Context Injection Strategy

When an agent needs to generate or modify a file, the Project Brain provides **smart context** instead of raw file dumps:

```
Agent receives:
├── 1. DIRECT DEPENDENCIES (full content)
│   Files that this file imports from
│   Retrieved via: graph.getDependencies(currentNode)
│   Budget: 40% of context window
│
├── 2. DEPENDENTS (type signatures only)  
│   Files that import from this file
│   Retrieved via: graph.getDependents(currentNode)
│   Budget: 15% of context window
│
├── 3. RELATED ENTITIES (summaries)
│   Components, hooks, APIs in the same domain
│   Retrieved via: semantic search or graph.getNeighborhood()
│   Budget: 15% of context window
│
├── 4. ARCHITECTURAL CONTEXT
│   Active project_decisions for this initiative
│   Architecture document summary
│   Budget: 15% of context window
│
├── 5. ERROR PREVENTION
│   Relevant project_errors with prevention_rules
│   Filtered by file_path pattern or error_type
│   Budget: 10% of context window
│
└── 6. PROJECT MAP
    File tree with one-line descriptions
    Budget: 5% of context window
```

### 11.9 Graph Consistency Checks

During Validation, the Project Brain enables structural verification:

| Check | Query | Action on Failure |
|-------|-------|-------------------|
| **Orphan imports** | Find edges where target node has no content | Flag as error |
| **Circular dependencies** | DFS cycle detection on import edges | Flag as warning |
| **Missing API consumers** | API endpoints with no `calls_api` edges | Flag as warning |
| **Unused exports** | Nodes with exports but no incoming edges | Flag as info |
| **Table without RLS** | DB table nodes missing security metadata | Flag as error |
| **Route without component** | Route nodes with no `routes_to` edge | Flag as error |

### 11.10 Improvements Over Original Proposal

| Original Design | Improvement | Rationale |
|-----------------|-------------|-----------|
| Flat `metadata JSON` | Typed metadata schemas per node_type | Enables structured queries, not just JSON grep |
| No node status | `status` field tracks lifecycle | Agents know what's planned vs. generated vs. validated |
| No content hash | `content_hash` for change detection | Incremental re-validation: only check changed files |
| No `supersedes_id` on decisions | Decision versioning chain | Agents can trace why a decision changed |
| No `prevention_rule` on errors | Actionable prevention rules | Transforms errors into reusable guidance |
| Vector embeddings required from day 1 | Phased: tsvector → pgvector | Avoid premature complexity; tsvector works for MVP |
| No cross-initiative learning | Error promotion to `org_knowledge_base` | Organization gets smarter over time |
| No relationship to subtasks | Brain nodes linkable to subtasks | Traceability: which agent generated which node |
| No organization_id on brain tables | Multi-tenant isolation | RLS enforcement, consistent with existing patterns |

### 11.11 Data Flow Example

**Scenario:** Generating `src/hooks/useOrders.ts` during Execution

```
1. Agent queries Project Brain:
   - GET nodes WHERE file_path = 'src/hooks/useOrders.ts'
   → Found: planned node with metadata.expected_exports = ['useOrders']

2. Agent gets dependencies:
   - GET edges WHERE source = this_node AND type = 'imports'
   → Results: 
     - src/integrations/supabase/client.ts (get full content)
     - src/types/order.ts (get full content)

3. Agent gets related entities:
   - GET nodes WHERE node_type = 'database_table' AND name LIKE '%order%'
   → Results:
     - orders table (columns, RLS policies in metadata)

4. Agent gets decisions:
   - GET decisions WHERE initiative_id = X AND status = 'active'
   → Results:
     - "Use React Query for all data fetching"
     - "All hooks follow useX naming convention"
     - "Error handling via toast notifications"

5. Agent gets error prevention:
   - GET errors WHERE error_type = 'import' AND organization_id = Y
   → Results:
     - "Always import supabase from @/integrations/supabase/client"
     - "Use .from() not .rpc() for simple CRUD"

6. Agent generates code with FULL CONTEXT
   → Output: correct imports, matching types, consistent patterns

7. After generation, brain is updated:
   - Node status → 'generated'
   - metadata.actual_exports = ['useOrders', 'useOrderById']
   - content_hash = sha256(generated_code)
   - New edges created for actual imports discovered
```

### 11.12 Implementation Phases

| Phase | Scope | Priority |
|-------|-------|----------|
| **Phase 1: Schema** | Create tables, RLS policies, indexes | P0 |
| **Phase 2: Architecture Integration** | Architecture stage populates graph from planned files | P0 |
| **Phase 3: Planning Integration** | Planning uses topological sort from graph edges | P0 |
| **Phase 4: Execution Integration** | Agents read from and write to brain during code generation | P0 |
| **Phase 5: Validation Integration** | Graph consistency checks during validation | P1 |
| **Phase 6: Error Learning** | Capture and reuse errors across pipeline runs | P1 |
| **Phase 7: Semantic Search** | tsvector-based search for related entities | P2 |
| **Phase 8: Vector Embeddings** | pgvector for natural language queries | P3 |

---
