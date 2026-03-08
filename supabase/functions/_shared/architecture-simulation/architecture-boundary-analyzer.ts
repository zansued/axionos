/**
 * Architecture Boundary Analyzer — Sprint 38
 * Checks how a proposed change interacts with current architectural boundaries.
 * Pure functions. No DB access.
 */

export interface BoundaryAnalysisInput {
  proposal_type: string;
  target_scope: string;
  target_entities: Record<string, any>;
  proposal_payload: Record<string, any>;
}

export interface BoundaryIssue {
  issue_type: "overlap" | "hidden_dependency" | "isolation_risk" | "cross_layer_ripple" | "boundary_ambiguity";
  severity: "low" | "moderate" | "high";
  description: string;
  affected_components: string[];
}

export interface BoundaryAnalysisResult {
  issues: BoundaryIssue[];
  boundary_health_score: number; // 0-1, 1 = healthy
  overlap_count: number;
  dependency_chain_depth: number;
  isolation_intact: boolean;
}

const SUBSYSTEM_BOUNDARIES = [
  "execution_kernel",
  "control_plane",
  "data_plane",
  "learning_layer",
  "meta_agents",
  "platform_intelligence",
  "calibration_layer",
  "stabilization_layer",
  "strategy_evolution",
  "strategy_portfolio",
  "tenant_policy",
  "engineering_advisor",
  "semantic_retrieval",
  "discovery_architecture",
];

const CROSS_LAYER_PAIRS: Record<string, string[]> = {
  execution_kernel: ["control_plane", "data_plane"],
  control_plane: ["execution_kernel", "data_plane"],
  learning_layer: ["execution_kernel", "data_plane", "meta_agents"],
  platform_intelligence: ["calibration_layer", "stabilization_layer", "engineering_advisor"],
  strategy_evolution: ["strategy_portfolio", "control_plane"],
};

function detectOverlaps(input: BoundaryAnalysisInput): BoundaryIssue[] {
  const issues: BoundaryIssue[] = [];
  const entities = Object.keys(input.target_entities);

  // Check if target entities span multiple subsystems
  const touchedBoundaries = SUBSYSTEM_BOUNDARIES.filter((b) =>
    entities.some((e) => e.includes(b) || input.target_scope.includes(b))
  );

  if (touchedBoundaries.length > 2) {
    issues.push({
      issue_type: "overlap",
      severity: "moderate",
      description: `Proposal spans ${touchedBoundaries.length} subsystem boundaries: ${touchedBoundaries.join(", ")}`,
      affected_components: touchedBoundaries,
    });
  }

  return issues;
}

function detectHiddenDependencies(input: BoundaryAnalysisInput): BoundaryIssue[] {
  const issues: BoundaryIssue[] = [];
  const scope = input.target_scope;

  for (const [system, deps] of Object.entries(CROSS_LAYER_PAIRS)) {
    if (scope.includes(system)) {
      const implicitDeps = deps.filter((d) => !scope.includes(d));
      if (implicitDeps.length > 0) {
        issues.push({
          issue_type: "hidden_dependency",
          severity: "low",
          description: `Changes to ${system} may implicitly affect: ${implicitDeps.join(", ")}`,
          affected_components: [system, ...implicitDeps],
        });
      }
    }
  }

  return issues;
}

function detectIsolationRisks(input: BoundaryAnalysisInput): BoundaryIssue[] {
  const issues: BoundaryIssue[] = [];

  if (input.proposal_type === "tenant_boundary_specialization" || input.target_scope.includes("tenant")) {
    issues.push({
      issue_type: "isolation_risk",
      severity: "high",
      description: "Proposal touches tenant isolation boundaries — requires careful review",
      affected_components: ["tenant_policy", "control_plane"],
    });
  }

  if (input.proposal_payload.shared_state === true) {
    issues.push({
      issue_type: "isolation_risk",
      severity: "moderate",
      description: "Proposal involves shared state which may affect isolation",
      affected_components: ["data_plane"],
    });
  }

  return issues;
}

function detectCrossLayerRipple(input: BoundaryAnalysisInput): BoundaryIssue[] {
  const issues: BoundaryIssue[] = [];
  const entityCount = Object.keys(input.target_entities).length;

  if (entityCount > 5) {
    issues.push({
      issue_type: "cross_layer_ripple",
      severity: "moderate",
      description: `Proposal affects ${entityCount} entities — potential cross-layer ripple effects`,
      affected_components: Object.keys(input.target_entities).slice(0, 5),
    });
  }

  return issues;
}

function detectBoundaryAmbiguity(input: BoundaryAnalysisInput): BoundaryIssue[] {
  const issues: BoundaryIssue[] = [];

  if (!input.target_scope || input.target_scope === "unknown" || input.target_scope === "") {
    issues.push({
      issue_type: "boundary_ambiguity",
      severity: "high",
      description: "Proposal target scope is ambiguous or undefined",
      affected_components: [],
    });
  }

  return issues;
}

export function analyzeArchitectureBoundaries(input: BoundaryAnalysisInput): BoundaryAnalysisResult {
  const allIssues = [
    ...detectOverlaps(input),
    ...detectHiddenDependencies(input),
    ...detectIsolationRisks(input),
    ...detectCrossLayerRipple(input),
    ...detectBoundaryAmbiguity(input),
  ];

  const severityWeights: Record<string, number> = { low: 0.1, moderate: 0.25, high: 0.5 };
  const totalPenalty = allIssues.reduce((s, i) => s + (severityWeights[i.severity] || 0.1), 0);
  const healthScore = Math.max(0, Math.min(1, 1 - totalPenalty));

  const overlapCount = allIssues.filter((i) => i.issue_type === "overlap").length;
  const depChainDepth = allIssues.filter((i) => i.issue_type === "hidden_dependency").length;
  const isolationIntact = !allIssues.some((i) => i.issue_type === "isolation_risk" && i.severity === "high");

  return {
    issues: allIssues,
    boundary_health_score: Number(healthScore.toFixed(3)),
    overlap_count: overlapCount,
    dependency_chain_depth: depChainDepth,
    isolation_intact: isolationIntact,
  };
}
