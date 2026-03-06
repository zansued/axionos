

## Plan: Reorganize AxionOS Documentation Around Implementation Horizons

### Overview

Rewrite four documentation files to replace the current "Phase 1-6" structure with a **NOW / NEXT / LATER / FUTURE** architecture-priority model. Preserve all implemented module references. Remove the "wishlist" tone and establish disciplined sequencing.

### Files to Update

#### 1. `docs/ROADMAP.md`
- Replace Phase 1-6 structure with four implementation horizons
- **NOW — Stabilize the Kernel**: Group all completed + in-progress infrastructure (Pipeline, Brain, Efficiency Layer, Runtime Validation, Build Repair, Observability, Stage/Agent Contracts, UI Restructuring). Emphasize goals: reduce entropy, improve reliability, standardize contracts, reduce cost
- **NEXT — Agent Intelligence Layer**: Learning Agents, Agent Memory, Prompt Optimization (A/B), Error Pattern Recognition, Self-Improving Fix Agents, Architecture Pattern Library
- **LATER — Product Intelligence Layer**: Product Analytics, User Behavior Analyzer, Feature Suggestion, Growth Optimization, Automatic UI Optimization, Product Evolution Engine
- **FUTURE — Market Intelligence Layer**: Opportunity Discovery, Market Signal Analyzer, Product Validation, Revenue Strategy, Venture Intelligence, Startup Portfolio Manager
- Keep System Maturity Levels section (Levels 1-5) with updated descriptions
- Keep System Metrics section
- Rewrite Long-Term Vision to emphasize sequential dependency between horizons

#### 2. `docs/ARCHITECTURE.md`
- Update Section 1 overview: describe AxionOS as what it is *today* (autonomous engineering system), not as a venture studio
- Reorganize Layer structure around horizons:
  - **Core System Kernel (NOW)**: Project Brain, AI Efficiency Layer, DAG Engine, Smart Context, Runtime Validation, Build Repair, Observability. Mark as "implemented / stabilizing"
  - **Agent Intelligence (NEXT)**: New section for learning agents. Mark as "planned"
  - **Product Intelligence (LATER)**: Reframe current Growth & Evolution layer. Mark as "planned — requires stable kernel + learning agents"
  - **Market Intelligence (FUTURE)**: Reframe current Venture Intelligence layer. Mark as "planned — requires product intelligence"
- Keep Pipeline 32-stage model, Edge Function tree, Database Schema sections unchanged
- Update Implementation Status section to reflect NOW/NEXT/LATER/FUTURE instead of Phase numbers

#### 3. `.lovable/plan.md`
- Rewrite as an execution-oriented plan document
- Structure: "What we are doing now" → "What comes next" → "What must wait" → "Why the order matters"
- Keep the architecture diagram, pipeline table, edge function tree, and tech stack sections
- Replace "Implementation Status" with horizon-based status
- Remove any language that presents future plans as current capabilities

#### 4. `README.md`
- Simplify to describe what AxionOS **is today**: autonomous software engineering system with memory, validation, and self-healing
- Show current real capabilities (pipeline, brain, efficiency layer, build repair)
- Brief "What's Next" section mentioning learning agents and product intelligence without over-promising
- Remove or condense the Phase 4-6 details that sound like vaporware
- Keep the workflow example and "For Whom" sections
- Remove the detailed roadmap table (point to ROADMAP.md instead)

### Technical Details

- No code changes — documentation only (4 markdown files)
- All existing module names, file paths, and table references preserved exactly
- Implementation status markers: ✅ Implemented, 🔧 Stabilizing, 📋 Planned
- Each horizon explicitly states its dependency on the previous one
- NOW horizon lists concrete goals: reduce architectural entropy, standardize contracts, simplify UI, reduce LLM cost

### Tone Guidelines
- Technical, strategic, disciplined
- Ambitious but credible
- No buzzword overload
- Implemented features described as facts, not aspirations

