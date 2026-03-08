// Journey Artifact Visibility Engine
// Determines which generated artifacts should be surfaced at each visible stage.

export interface VisibleArtifact {
  artifact_type: string;
  artifact_label: string;
  artifact_summary: string;
  visibility_priority: number;
  surfaced: boolean;
}

const STAGE_ARTIFACT_MAP: Record<string, Array<{ type: string; label: string; priority: number }>> = {
  idea: [
    { type: 'initiative_brief', label: 'Initiative Brief', priority: 1 },
  ],
  discovery: [
    { type: 'opportunity_score', label: 'Opportunity Score', priority: 1 },
    { type: 'market_signals', label: 'Market Signals', priority: 2 },
    { type: 'product_validation', label: 'Product Validation', priority: 3 },
    { type: 'revenue_strategy', label: 'Revenue Strategy', priority: 4 },
    { type: 'prd', label: 'Product Requirements (PRD)', priority: 5 },
  ],
  architecture: [
    { type: 'architecture_content', label: 'Architecture Plan', priority: 1 },
    { type: 'schema_sql', label: 'Database Schema', priority: 2 },
    { type: 'dependency_graph', label: 'Dependency Graph', priority: 3 },
    { type: 'module_graph', label: 'Module Graph', priority: 4 },
  ],
  engineering: [
    { type: 'domain_models', label: 'Domain Models', priority: 1 },
    { type: 'business_logic', label: 'Business Logic', priority: 2 },
    { type: 'api_endpoints', label: 'API Endpoints', priority: 3 },
    { type: 'ui_components', label: 'UI Components', priority: 4 },
    { type: 'planning_dag', label: 'Execution Plan', priority: 5 },
  ],
  validation: [
    { type: 'validation_report', label: 'Validation Report', priority: 1 },
    { type: 'build_status', label: 'Build Status', priority: 2 },
  ],
  deploy: [
    { type: 'repo_url', label: 'Repository', priority: 1 },
    { type: 'deploy_url', label: 'Deploy URL', priority: 2 },
  ],
  delivered: [
    { type: 'deploy_url', label: 'Live Application', priority: 1 },
    { type: 'health_status', label: 'Health Status', priority: 2 },
  ],
};

export function getVisibleArtifactsForStage(stageKey: string): VisibleArtifact[] {
  const defs = STAGE_ARTIFACT_MAP[stageKey] || [];
  return defs.map(d => ({
    artifact_type: d.type,
    artifact_label: d.label,
    artifact_summary: '',
    visibility_priority: d.priority,
    surfaced: true,
  }));
}

export function computeArtifactCoverageScore(stageKey: string, availableArtifactTypes: string[]): number {
  const expected = STAGE_ARTIFACT_MAP[stageKey] || [];
  if (expected.length === 0) return 1;
  const matched = expected.filter(e => availableArtifactTypes.includes(e.type)).length;
  return matched / expected.length;
}

export function getAllExpectedArtifactTypes(stageKey: string): string[] {
  return (STAGE_ARTIFACT_MAP[stageKey] || []).map(d => d.type);
}
