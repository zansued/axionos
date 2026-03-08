/**
 * Architecture Change Dependency Planner — Sprint 39
 * Maps dependencies, blast radius, cross-layer impact, and sequencing for architecture change plans.
 * Pure functions. No DB access.
 */

export interface DependencyPlannerInput {
  proposal_type: string;
  target_scope: string;
  target_entities: Record<string, any>;
  affected_layers: string[];
  simulation_summary: Record<string, any>;
  plan_payload: Record<string, any>;
}

export interface DependencyNode {
  entity: string;
  layer: string;
  risk_level: "low" | "moderate" | "high" | "critical";
  depends_on: string[];
}

export interface BlastRadiusResult {
  size: "small" | "medium" | "large" | "critical";
  affected_module_count: number;
  affected_layer_count: number;
  cross_layer_dependencies: number;
  high_risk_nodes: string[];
  tenant_impact: boolean;
  observability_impact: boolean;
}

export interface DependencyPlannerResult {
  dependency_graph: DependencyNode[];
  blast_radius: BlastRadiusResult;
  sequencing_hints: string[];
  blocked_dependencies: string[];
  migration_ordering: string[];
}

const LAYER_RISK_WEIGHTS: Record<string, number> = {
  execution: 0.9,
  governance: 1.0,
  control: 0.85,
  data: 0.7,
  memory: 0.5,
  observability: 0.4,
  strategy: 0.8,
  policy: 0.8,
  tenant: 0.95,
  platform: 0.6,
  retrieval: 0.5,
  prevention: 0.6,
  repair: 0.5,
  learning: 0.4,
};

function classifyNodeRisk(entity: string, layer: string): "low" | "moderate" | "high" | "critical" {
  const weight = LAYER_RISK_WEIGHTS[layer] || 0.5;
  const entityLower = entity.toLowerCase();
  if (entityLower.includes("billing") || entityLower.includes("governance") || entityLower.includes("tenant_isolation")) return "critical";
  if (entityLower.includes("pipeline") || entityLower.includes("execution") || entityLower.includes("contract")) return "high";
  if (weight >= 0.8) return "high";
  if (weight >= 0.5) return "moderate";
  return "low";
}

function inferDependencies(entity: string, entities: string[]): string[] {
  const deps: string[] = [];
  const lower = entity.toLowerCase();
  for (const other of entities) {
    if (other === entity) continue;
    const otherLower = other.toLowerCase();
    // Simple heuristic: if entities share prefix or one references the other
    if (lower.includes(otherLower) || otherLower.includes(lower)) {
      deps.push(other);
    }
  }
  return deps;
}

export function planDependencies(input: DependencyPlannerInput): DependencyPlannerResult {
  const entities = Object.keys(input.target_entities);
  const layers = input.affected_layers.length > 0 ? input.affected_layers : ["unknown"];

  // Build dependency graph
  const graph: DependencyNode[] = entities.map((entity) => {
    const layer = layers[0] || "unknown";
    return {
      entity,
      layer,
      risk_level: classifyNodeRisk(entity, layer),
      depends_on: inferDependencies(entity, entities),
    };
  });

  // Add layer nodes
  for (const layer of layers) {
    if (!graph.some((n) => n.entity === `layer:${layer}`)) {
      graph.push({
        entity: `layer:${layer}`,
        layer,
        risk_level: classifyNodeRisk(layer, layer),
        depends_on: [],
      });
    }
  }

  // Blast radius
  const highRiskNodes = graph.filter((n) => n.risk_level === "high" || n.risk_level === "critical").map((n) => n.entity);
  const crossLayerDeps = new Set(graph.flatMap((n) => n.depends_on)).size;
  const tenantImpact = entities.some((e) => e.toLowerCase().includes("tenant")) || layers.includes("tenant");
  const obsImpact = layers.includes("observability") || entities.some((e) => e.toLowerCase().includes("observability"));

  const totalNodes = graph.length;
  let blastSize: "small" | "medium" | "large" | "critical" = "small";
  if (totalNodes > 10 || highRiskNodes.length > 3) blastSize = "critical";
  else if (totalNodes > 6 || highRiskNodes.length > 1) blastSize = "large";
  else if (totalNodes > 3) blastSize = "medium";

  const blastRadius: BlastRadiusResult = {
    size: blastSize,
    affected_module_count: entities.length,
    affected_layer_count: layers.length,
    cross_layer_dependencies: crossLayerDeps,
    high_risk_nodes: highRiskNodes,
    tenant_impact: tenantImpact,
    observability_impact: obsImpact,
  };

  // Sequencing hints
  const hints: string[] = [];
  if (tenantImpact) hints.push("Validate tenant isolation before applying cross-layer changes");
  if (obsImpact) hints.push("Ensure observability coverage before modifying monitored components");
  if (highRiskNodes.length > 0) hints.push(`Review high-risk nodes first: ${highRiskNodes.slice(0, 3).join(", ")}`);
  if (layers.length > 2) hints.push("Stage implementation layer-by-layer to contain blast radius");

  // Blocked dependencies
  const blocked: string[] = [];
  const forbiddenPatterns = ["billing", "governance_rules", "plan_enforcement", "hard_safety"];
  for (const entity of entities) {
    for (const fp of forbiddenPatterns) {
      if (entity.toLowerCase().includes(fp)) {
        blocked.push(`${entity}: touches forbidden domain "${fp}"`);
      }
    }
  }

  // Migration ordering: high-risk last
  const migrationOrdering = [...entities].sort((a, b) => {
    const riskA = classifyNodeRisk(a, layers[0]);
    const riskB = classifyNodeRisk(b, layers[0]);
    const riskOrder = { low: 0, moderate: 1, high: 2, critical: 3 };
    return riskOrder[riskA] - riskOrder[riskB];
  });

  return {
    dependency_graph: graph,
    blast_radius: blastRadius,
    sequencing_hints: hints,
    blocked_dependencies: blocked,
    migration_ordering: migrationOrdering,
  };
}
