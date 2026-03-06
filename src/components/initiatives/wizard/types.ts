export interface InitiativeBrief {
  name: string;
  description: string;
  problem_statement: string;
  target_audience: string;
  product_type: string;
  core_features: string[];
  integrations: string[];
  generation_depth: "discovery" | "prd_architecture" | "prd_arch_stories" | "full_pipeline";
  technical_preferences: {
    frontend?: string;
    backend?: string;
    database?: string;
    ui_framework?: string;
  };
  deployment_target: string;
  // AI-generated fields
  market_opportunity?: string;
  competitor_insights?: string;
  reasoning?: string;
  // Initiative Brief contract (pipeline input)
  _initiative_brief?: {
    name: string;
    description: string;
    problem: string;
    target_users: string[];
    product_type: string;
    core_features: string[];
    integrations?: string[];
    tech_preferences?: Record<string, string | undefined>;
    deployment_target: string;
    complexity_estimate: string;
    generation_depth: string;
    expected_outputs: string[];
  };
  _blueprint?: unknown;
  _simulation_report?: unknown;
}

export interface AIBlueprint {
  project_name: string;
  short_description: string;
  problem_statement: string;
  target_audience: string;
  market_opportunity: string;
  competitor_insights: string;
  suggested_features: string[];
  suggested_integrations: string[];
  product_type: string;
  estimated_complexity: string;
  recommended_depth: string;
  reasoning: string;
}

export const GENERATION_INTENTS = [
  { value: "discovery" as const, label: "Just validate the idea", description: "Quick market & feasibility check", icon: "🔍" },
  { value: "prd_architecture" as const, label: "Plan & architect it", description: "Full PRD + technical architecture", icon: "📐" },
  { value: "prd_arch_stories" as const, label: "Plan with task breakdown", description: "PRD + architecture + dev stories", icon: "📋" },
  { value: "full_pipeline" as const, label: "Build it for me", description: "End-to-end: plan, code, validate & deploy", icon: "🚀", badge: "Recommended" },
] as const;

export const INTEGRATION_OPTIONS = [
  { value: "auth", label: "Authentication", icon: "🔐" },
  { value: "database", label: "Database", icon: "🗄️" },
  { value: "payments", label: "Payments", icon: "💳" },
  { value: "email", label: "Email Notifications", icon: "📧" },
  { value: "analytics", label: "Analytics", icon: "📈" },
  { value: "external_api", label: "External APIs", icon: "🔌" },
] as const;
