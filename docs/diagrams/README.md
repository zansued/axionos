# AxionOS — PlantUML Diagrams

This directory contains PlantUML source files for the AxionOS C4 architecture diagrams.

## Files

| File | Diagram |
|------|---------|
| `c4-context.puml` | C4 Context — actors and external systems |
| `c4-containers.puml` | C4 Containers — internal engines and data flows |
| `c4-component-pipeline-core.puml` | Execution Pipeline Core components |
| `c4-component-operational-intelligence.puml` | Operational Intelligence components |
| `c4-component-learning-engine.puml` | Learning Engine components |
| `c4-component-execution-governance.puml` | Execution Governance components |
| `c4-component-platform-intelligence.puml` | Platform Intelligence components |
| `c4-component-self-calibration.puml` | Self-Calibration components |
| `c4-component-strategy-evolution.puml` | Strategy Evolution components |

## Usage

Use any PlantUML renderer to generate diagrams:

```bash
# CLI
plantuml docs/diagrams/*.puml

# VS Code: install "PlantUML" extension
# IntelliJ: built-in PlantUML support
# Online: https://www.plantuml.com/plantuml/uml
```

## Source of Truth

These diagrams must stay synchronized with:
- `docs/ARCHITECTURE.md` (Mermaid versions for GitHub)
- `docs/ROADMAP.md`
- `docs/PLAN.md`
- `docs/AGENTS.md`
