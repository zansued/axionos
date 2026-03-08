// Sprint 69 — Initiative Template Library
// Manages reusable templates for common initiative types.

export interface InitiativeTemplateDefinition {
  templateName: string;
  templateType: string;
  category: string;
  icon: string;
  description: string;
  ideaScaffold: string;
  discoveryHints: Record<string, string>;
  defaultAssumptions: string[];
  fitScore: number;
  starterConfidence: number;
}

const BUILT_IN_TEMPLATES: InitiativeTemplateDefinition[] = [
  {
    templateName: "SaaS Multi-tenant",
    templateType: "web_app",
    category: "Web App",
    icon: "🏢",
    description: "Full SaaS application with auth, multi-tenancy, billing, and admin dashboard.",
    ideaScaffold: "Multi-tenant SaaS platform with authentication, organization management, subscription plans, admin dashboard and REST API.",
    discoveryHints: { targetUser: "B2B companies needing a scalable cloud solution", suggestedStack: "React + TypeScript + Supabase + Stripe + Tailwind CSS", complexity: "high", riskLevel: "medium", mvpScope: "Auth, onboarding, main CRUD, basic dashboard, free/pro plan" },
    defaultAssumptions: ["Multi-tenant isolation required", "Stripe for payments", "Role-based access control"],
    fitScore: 0.9,
    starterConfidence: 0.85,
  },
  {
    templateName: "API REST",
    templateType: "backend",
    category: "Backend",
    icon: "🔌",
    description: "RESTful API with JWT auth, full CRUD, validation, rate limiting and OpenAPI docs.",
    ideaScaffold: "Robust REST API with CRUD endpoints, JWT authentication, role-based authorization, rate limiting, schema validation, standardized error handling and OpenAPI/Swagger documentation.",
    discoveryHints: { targetUser: "Developers and teams needing a scalable backend", suggestedStack: "Supabase Edge Functions + PostgreSQL + Zod + OpenAPI", complexity: "medium", riskLevel: "low", mvpScope: "Auth, 3-5 CRUD endpoints, validation, error handling, basic docs" },
    defaultAssumptions: ["JWT-based auth", "PostgreSQL storage", "OpenAPI documentation"],
    fitScore: 0.85,
    starterConfidence: 0.8,
  },
  {
    templateName: "Landing Page",
    templateType: "marketing",
    category: "Marketing",
    icon: "🚀",
    description: "High-conversion landing page with hero, features, pricing, testimonials, FAQ and CTA.",
    ideaScaffold: "Modern responsive landing page with hero CTA, value proposition, features grid, pricing plans, testimonials/social proof, FAQ accordion, footer with links and contact/newsletter form.",
    discoveryHints: { targetUser: "Startups and companies validating and converting visitors", suggestedStack: "React + TypeScript + Tailwind CSS + Framer Motion + SEO optimized", complexity: "low", riskLevel: "low", mvpScope: "Hero, features, pricing, CTA, responsive, basic SEO" },
    defaultAssumptions: ["Static site", "No backend required for MVP", "SEO-focused"],
    fitScore: 0.9,
    starterConfidence: 0.9,
  },
  {
    templateName: "E-commerce",
    templateType: "web_app",
    category: "Web App",
    icon: "🛒",
    description: "Online store with catalog, cart, checkout, payments and admin panel.",
    ideaScaffold: "Full e-commerce with product catalog (categories, filters, search), persistent shopping cart, multi-step checkout, payment gateway integration, order management and admin panel.",
    discoveryHints: { targetUser: "Merchants and brands selling products online", suggestedStack: "React + TypeScript + Supabase + Stripe + Tailwind CSS", complexity: "high", riskLevel: "medium", mvpScope: "Catalog, cart, simple checkout, order panel" },
    defaultAssumptions: ["Product catalog with categories", "Stripe checkout", "Order management"],
    fitScore: 0.85,
    starterConfidence: 0.8,
  },
  {
    templateName: "Dashboard Analytics",
    templateType: "web_app",
    category: "Web App",
    icon: "📊",
    description: "Interactive dashboard with KPIs, charts, filters, export and real-time data.",
    ideaScaffold: "Analytics dashboard with KPI cards, interactive charts (line, bar, pie, area), period/category filters, sortable/paginated tables, CSV/PDF export and real-time updates via websockets.",
    discoveryHints: { targetUser: "Managers and analysts monitoring business metrics", suggestedStack: "React + TypeScript + Recharts + Supabase Realtime + Tailwind CSS", complexity: "medium", riskLevel: "low", mvpScope: "4-6 KPIs, 3 chart types, period filter, main table" },
    defaultAssumptions: ["Recharts for visualization", "Supabase Realtime for live data", "CSV export"],
    fitScore: 0.85,
    starterConfidence: 0.85,
  },
  {
    templateName: "CRM",
    templateType: "web_app",
    category: "Web App",
    icon: "👥",
    description: "Customer relationship management: sales pipeline, contacts, activities and reports.",
    ideaScaffold: "CRM with contact and company management, drag-and-drop sales pipeline (Kanban), activity and note logging, follow-up scheduling, sales dashboard with metrics and performance reports.",
    discoveryHints: { targetUser: "Sales and support teams at SMBs", suggestedStack: "React + TypeScript + Supabase + DnD Kit + Recharts + Tailwind CSS", complexity: "high", riskLevel: "medium", mvpScope: "Contacts CRUD, Kanban pipeline, activities, basic dashboard" },
    defaultAssumptions: ["Kanban-style pipeline", "Contact management", "Activity tracking"],
    fitScore: 0.8,
    starterConfidence: 0.75,
  },
];

export function getBuiltInTemplates(): InitiativeTemplateDefinition[] {
  return BUILT_IN_TEMPLATES;
}

export function findBestTemplate(ideaText: string): InitiativeTemplateDefinition | null {
  if (!ideaText || ideaText.length < 5) return null;
  const lower = ideaText.toLowerCase();
  const keywords: Record<string, string[]> = {
    "SaaS Multi-tenant": ["saas", "multi-tenant", "subscription", "b2b", "plataforma"],
    "API REST": ["api", "rest", "backend", "endpoint", "microservice"],
    "Landing Page": ["landing", "page", "marketing", "conversão", "conversion"],
    "E-commerce": ["ecommerce", "e-commerce", "loja", "store", "shop", "cart", "checkout"],
    "Dashboard Analytics": ["dashboard", "analytics", "kpi", "chart", "metric", "report"],
    "CRM": ["crm", "customer", "pipeline", "sales", "vendas", "contato"],
  };
  let best: InitiativeTemplateDefinition | null = null;
  let bestScore = 0;
  for (const tmpl of BUILT_IN_TEMPLATES) {
    const kws = keywords[tmpl.templateName] || [];
    const hits = kws.filter((k) => lower.includes(k)).length;
    const score = kws.length > 0 ? hits / kws.length : 0;
    if (score > bestScore) { bestScore = score; best = tmpl; }
  }
  return bestScore > 0.2 ? best : null;
}

export function evaluateTemplateFit(template: InitiativeTemplateDefinition, ideaText: string): number {
  const match = findBestTemplate(ideaText);
  if (!match || match.templateName !== template.templateName) return 0.2;
  return template.fitScore;
}
