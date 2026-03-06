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
}

export const PRODUCT_TYPES = [
  { value: "saas", label: "SaaS Product", icon: "☁️", desc: "Subscription-based software service" },
  { value: "mvp", label: "MVP Prototype", icon: "🚀", desc: "Minimum viable product to validate an idea" },
  { value: "dashboard", label: "Internal Dashboard", icon: "📊", desc: "Analytics and management interface" },
  { value: "crud", label: "CRUD Application", icon: "📋", desc: "Data management with create, read, update, delete" },
  { value: "landing", label: "Landing + Auth", icon: "🔐", desc: "Marketing page with user authentication" },
  { value: "custom", label: "Custom Product", icon: "⚙️", desc: "Define your own product type" },
] as const;

export const INTEGRATION_OPTIONS = [
  { value: "auth", label: "Authentication", icon: "🔐" },
  { value: "database", label: "Database", icon: "🗄️" },
  { value: "payments", label: "Payments", icon: "💳" },
  { value: "email", label: "Email Notifications", icon: "📧" },
  { value: "analytics", label: "Analytics", icon: "📈" },
  { value: "external_api", label: "External APIs", icon: "🔌" },
] as const;

export const GENERATION_DEPTHS = [
  {
    value: "discovery" as const,
    label: "Product Discovery Only",
    desc: "Market analysis, opportunity mapping, validation",
    stages: "5 stages",
    badge: "Fast",
  },
  {
    value: "prd_architecture" as const,
    label: "PRD + Architecture",
    desc: "Full product spec and technical architecture",
    stages: "12 stages",
    badge: "Recommended",
  },
  {
    value: "prd_arch_stories" as const,
    label: "PRD + Architecture + Stories",
    desc: "Includes user stories and subtask breakdown",
    stages: "16 stages",
    badge: null,
  },
  {
    value: "full_pipeline" as const,
    label: "Full Pipeline",
    desc: "Generate code, validate, build, and deploy",
    stages: "32 stages",
    badge: "Complete",
  },
] as const;

export const WIZARD_STEPS = [
  { key: "idea", label: "Idea", number: 1 },
  { key: "type", label: "Product Type", number: 2 },
  { key: "features", label: "Features", number: 3 },
  { key: "integrations", label: "Integrations", number: 4 },
  { key: "depth", label: "Generation", number: 5 },
  { key: "tech", label: "Tech Prefs", number: 6 },
  { key: "deploy", label: "Deploy", number: 7 },
  { key: "summary", label: "Summary", number: 8 },
] as const;
