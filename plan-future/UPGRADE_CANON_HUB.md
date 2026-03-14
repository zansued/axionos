# Plan: Upgrade Canon Intelligence Hub & Pattern Library

## Objective
Transform the Canon Intelligence Hub from a static list into a living, visual Knowledge Mesh (using tldraw) and upgrade the Pattern Library into an "Agentic Portfolio" that proactively maps organizational capabilities.

## Key Files & Context
- `src/components/canon-intelligence/`: Main UI components for knowledge management.
- `src/lib/canon/`: Type definitions and pipeline logic.
- `supabase/functions/canon-*`: Backend logic for pattern ingestion and review.
- `antigravity-agent-vault/skills/`: Reference for new skills to be integrated.

## Proposed Changes

### 1. Immersive Knowledge Graph (Visual Hub)
- **New Component:** `src/components/canon-intelligence/CanonGraphCanvas.tsx`
  - Integration with `tldraw` to render a 2D spatial map of knowledge.
  - Nodes: `CanonEntry` (sized by usage/confidence).
  - Edges: `supersessions` (history flow) and `dependencies` (architectural links).
  - Dynamic Coloring: Mapping domains to Axion brand colors (Governance, Intelligence, etc.).

### 2. Agentic Pattern Extraction Upgrade
- **Supabase Function Update:** `deep-repo-absorber-engine`
  - Implement semantic linking: Use embeddings to compare new patterns with existing Canon entries during ingestion.
  - Auto-tagging: Assign architectural tags based on folder structures and dependencies found in the repository.

### 3. Knowledge Portfolio Surface
- **New Page/View:** `src/components/knowledge-portfolio/SovereignCapabilities.tsx`
  - A dashboard showing "What we can build now" based on approved Canon patterns.
  - Feature: "Implementation Recipes" (Copy-pasteable code generated from Canon knowledge).

## Implementation Steps

### Phase 1: Dependency & Foundation
1. Install `tldraw` and `@tldraw/state` via npm.
2. Create `src/hooks/useCanonGraphData.ts` to transform flat Canon records into a graph structure (Nodes/Edges).

### Phase 2: The Visual Canvas
1. Implement `CanonGraphCanvas.tsx` as a replacement for the current static `CanonGraphTab.tsx`.
2. Add interactive side-drawers for detail viewing of specific patterns.

### Phase 3: Pattern Library Enhancement
1. Update `CanonIngestionPanel.tsx` to include a "Visual Ingestion" progress mode.
2. Refactor `useCanonPipeline` to include semantic search across the pattern library.

## Verification & Testing
- **Visual Check:** Ensure the tldraw canvas renders correctly with at least 5-10 nodes and proper coloring.
- **Data Flow Check:** Verify that clicking "Absorb Repo" updates the visual graph in near real-time.
- **Logic Check:** Confirm that supersessions are visually represented as arrows connecting old to new versions.
