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

export const GENERATION_DEPTHS = [
  { value: "discovery" as const, label: "Product Discovery Only", stages: "5 stages", badge: "Fast" },
  { value: "prd_architecture" as const, label: "PRD + Architecture", stages: "12 stages", badge: "Recommended" },
  { value: "prd_arch_stories" as const, label: "PRD + Architecture + Stories", stages: "16 stages", badge: null },
  { value: "full_pipeline" as const, label: "Full Pipeline", stages: "32 stages", badge: "Complete" },
] as const;

export const INTEGRATION_OPTIONS = [
  { value: "auth", label: "Authentication", icon: "🔐" },
  { value: "database", label: "Database", icon: "🗄️" },
  { value: "payments", label: "Payments", icon: "💳" },
  { value: "email", label: "Email Notifications", icon: "📧" },
  { value: "analytics", label: "Analytics", icon: "📈" },
  { value: "external_api", label: "External APIs", icon: "🔌" },
] as const;
