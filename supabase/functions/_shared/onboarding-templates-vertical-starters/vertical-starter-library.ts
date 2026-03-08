// Sprint 69 — Vertical Starter Library
// Manages domain-specific starter packs and starter metadata.

export interface VerticalStarterDefinition {
  verticalName: string;
  starterType: string;
  category: string;
  icon: string;
  description: string;
  includedTemplates: string[];
  defaultStack: Record<string, string>;
  verticalFitScore: number;
  assumptionVisibilityScore: number;
}

const BUILT_IN_VERTICALS: VerticalStarterDefinition[] = [
  {
    verticalName: "SaaS Startup",
    starterType: "domain",
    category: "B2B",
    icon: "🏢",
    description: "Complete SaaS starter: auth, multi-tenancy, billing, dashboard. Best for B2B subscription products.",
    includedTemplates: ["SaaS Multi-tenant", "Dashboard Analytics"],
    defaultStack: { frontend: "React + TypeScript + Tailwind", backend: "Supabase", payments: "Stripe" },
    verticalFitScore: 0.9,
    assumptionVisibilityScore: 0.85,
  },
  {
    verticalName: "Internal Tool",
    starterType: "domain",
    category: "Operations",
    icon: "🔧",
    description: "Internal admin panel, data management, team workflows. Best for operational tools.",
    includedTemplates: ["Dashboard Analytics", "CRM"],
    defaultStack: { frontend: "React + TypeScript + Tailwind", backend: "Supabase", auth: "Email/Password" },
    verticalFitScore: 0.85,
    assumptionVisibilityScore: 0.9,
  },
  {
    verticalName: "Marketplace",
    starterType: "domain",
    category: "Platform",
    icon: "🏪",
    description: "Two-sided marketplace with listings, search, transactions, and reviews.",
    includedTemplates: ["E-commerce", "Dashboard Analytics"],
    defaultStack: { frontend: "React + TypeScript + Tailwind", backend: "Supabase", payments: "Stripe Connect" },
    verticalFitScore: 0.8,
    assumptionVisibilityScore: 0.8,
  },
  {
    verticalName: "AI Workflow",
    starterType: "domain",
    category: "AI/ML",
    icon: "🤖",
    description: "AI-powered workflow tool: prompt management, model integration, output processing.",
    includedTemplates: ["API REST", "Dashboard Analytics"],
    defaultStack: { frontend: "React + TypeScript + Tailwind", backend: "Supabase Edge Functions", ai: "Lovable AI" },
    verticalFitScore: 0.85,
    assumptionVisibilityScore: 0.8,
  },
  {
    verticalName: "Content Platform",
    starterType: "domain",
    category: "Content",
    icon: "📝",
    description: "Content management, publishing, community features. Blogs, docs, knowledge bases.",
    includedTemplates: ["Landing Page", "Dashboard Analytics"],
    defaultStack: { frontend: "React + TypeScript + Tailwind", backend: "Supabase", cms: "Markdown + Storage" },
    verticalFitScore: 0.8,
    assumptionVisibilityScore: 0.85,
  },
  {
    verticalName: "Marketing Site",
    starterType: "domain",
    category: "Marketing",
    icon: "🚀",
    description: "High-conversion landing pages, lead capture, A/B testing foundations.",
    includedTemplates: ["Landing Page"],
    defaultStack: { frontend: "React + TypeScript + Tailwind + Framer Motion", seo: "Full SEO meta" },
    verticalFitScore: 0.9,
    assumptionVisibilityScore: 0.9,
  },
];

export function getBuiltInVerticals(): VerticalStarterDefinition[] {
  return BUILT_IN_VERTICALS;
}

export function recommendVertical(ideaText: string): VerticalStarterDefinition | null {
  if (!ideaText || ideaText.length < 5) return null;
  const lower = ideaText.toLowerCase();
  const keywords: Record<string, string[]> = {
    "SaaS Startup": ["saas", "subscription", "b2b", "multi-tenant", "plano"],
    "Internal Tool": ["internal", "admin", "backoffice", "operacional", "ferramenta interna"],
    "Marketplace": ["marketplace", "dois lados", "two-sided", "compra e venda", "listings"],
    "AI Workflow": ["ai", "inteligência artificial", "llm", "gpt", "prompt", "machine learning", "ml"],
    "Content Platform": ["blog", "conteúdo", "content", "cms", "knowledge base", "docs"],
    "Marketing Site": ["landing", "marketing", "conversão", "lead", "campanha"],
  };
  let best: VerticalStarterDefinition | null = null;
  let bestScore = 0;
  for (const v of BUILT_IN_VERTICALS) {
    const kws = keywords[v.verticalName] || [];
    const hits = kws.filter((k) => lower.includes(k)).length;
    const score = kws.length > 0 ? hits / kws.length : 0;
    if (score > bestScore) { bestScore = score; best = v; }
  }
  return bestScore > 0.15 ? best : null;
}
