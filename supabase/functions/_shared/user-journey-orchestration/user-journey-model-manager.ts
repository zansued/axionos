// User Journey Model Manager
// Manages the canonical visible journey model from idea to deployed software.

export interface JourneyStageDefinition {
  stage_key: string;
  stage_label: string;
  stage_description: string;
  order: number;
  approval_required: boolean;
  artifacts_expected: string[];
  internal_stages_mapped: string[];
}

export interface JourneyModel {
  id?: string;
  organization_id: string;
  journey_model_name: string;
  journey_model_version: string;
  stage_definitions: JourneyStageDefinition[];
  transition_rules: Record<string, string[]>;
  approval_gate_definitions: Array<{ stage_key: string; gate_type: string; required_actor: string }>;
  artifact_visibility_rules: Record<string, string[]>;
  status: string;
}

export const DEFAULT_JOURNEY_STAGES: JourneyStageDefinition[] = [
  {
    stage_key: 'idea',
    stage_label: 'Idea',
    stage_description: 'Capture and structure your product idea',
    order: 1,
    approval_required: false,
    artifacts_expected: ['initiative_brief'],
    internal_stages_mapped: ['draft'],
  },
  {
    stage_key: 'discovery',
    stage_label: 'Discovery',
    stage_description: 'Validate the opportunity with market intelligence',
    order: 2,
    approval_required: true,
    artifacts_expected: ['opportunity_score', 'market_signals', 'product_validation', 'revenue_strategy', 'prd'],
    internal_stages_mapped: ['opportunity_discovered', 'market_signals_analyzing', 'market_signals_analyzed', 'product_validating', 'product_validated', 'revenue_strategizing', 'revenue_strategized', 'discovered'],
  },
  {
    stage_key: 'architecture',
    stage_label: 'Architecture',
    stage_description: 'Generate and validate the technical plan',
    order: 3,
    approval_required: true,
    artifacts_expected: ['architecture_content', 'schema_sql', 'dependency_graph', 'module_graph'],
    internal_stages_mapped: ['architecture_ready', 'architecting', 'architecture_simulated', 'preventive_validated', 'bootstrap_planned', 'foundation_scaffolded', 'module_graph_simulated', 'dependencies_analyzed'],
  },
  {
    stage_key: 'engineering',
    stage_label: 'Engineering',
    stage_description: 'Build the software: schema, models, logic, API, UI',
    order: 4,
    approval_required: false,
    artifacts_expected: ['db_schema', 'domain_models', 'business_logic', 'api_endpoints', 'ui_components', 'planning_dag'],
    internal_stages_mapped: ['bootstrapping_schema', 'provisioning_db', 'analyzing_domain', 'generating_data_model', 'synthesizing_logic', 'generating_api', 'generating_ui', 'squad_ready', 'planning_ready', 'executing'],
  },
  {
    stage_key: 'validation',
    stage_label: 'Validation',
    stage_description: 'Validate, repair, and ensure build quality',
    order: 5,
    approval_required: false,
    artifacts_expected: ['validation_report', 'build_status'],
    internal_stages_mapped: ['validating', 'ready_to_publish'],
  },
  {
    stage_key: 'deploy',
    stage_label: 'Deploy',
    stage_description: 'Publish and deploy the software',
    order: 6,
    approval_required: false,
    artifacts_expected: ['repo_url', 'deploy_url'],
    internal_stages_mapped: ['published', 'deploying', 'deployed'],
  },
  {
    stage_key: 'delivered',
    stage_label: 'Delivered',
    stage_description: 'Software is live and accessible',
    order: 7,
    approval_required: false,
    artifacts_expected: ['deploy_url', 'health_status'],
    internal_stages_mapped: ['deployed', 'completed'],
  },
];

export const DEFAULT_TRANSITION_RULES: Record<string, string[]> = {
  idea: ['discovery'],
  discovery: ['architecture'],
  architecture: ['engineering'],
  engineering: ['validation'],
  validation: ['deploy'],
  deploy: ['delivered'],
};

export function getDefaultJourneyModel(organizationId: string): JourneyModel {
  return {
    organization_id: organizationId,
    journey_model_name: 'default_idea_to_deploy',
    journey_model_version: 'v1',
    stage_definitions: DEFAULT_JOURNEY_STAGES,
    transition_rules: DEFAULT_TRANSITION_RULES,
    approval_gate_definitions: [
      { stage_key: 'discovery', gate_type: 'stage_completion', required_actor: 'user' },
      { stage_key: 'architecture', gate_type: 'stage_completion', required_actor: 'user' },
    ],
    artifact_visibility_rules: {
      idea: ['initiative_brief'],
      discovery: ['opportunity_score', 'market_signals', 'prd'],
      architecture: ['architecture_content', 'dependency_graph'],
      engineering: ['domain_models', 'api_endpoints', 'ui_components'],
      validation: ['validation_report', 'build_status'],
      deploy: ['repo_url', 'deploy_url'],
      delivered: ['deploy_url', 'health_status'],
    },
    status: 'active',
  };
}

export function mapInternalStageToVisible(internalStage: string): string {
  for (const stage of DEFAULT_JOURNEY_STAGES) {
    if (stage.internal_stages_mapped.includes(internalStage)) {
      return stage.stage_key;
    }
  }
  return 'idea';
}

export function getStageOrder(stageKey: string): number {
  const stage = DEFAULT_JOURNEY_STAGES.find(s => s.stage_key === stageKey);
  return stage?.order ?? 0;
}

export function calculateJourneyProgress(currentVisibleStage: string): number {
  const order = getStageOrder(currentVisibleStage);
  const total = DEFAULT_JOURNEY_STAGES.length;
  return total > 0 ? Math.round((order / total) * 100) : 0;
}
