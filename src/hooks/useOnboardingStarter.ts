// Sprint 69 — useOnboardingStarter hook
// Provides template & vertical starter data for the onboarding UI.

import { useState, useMemo, useCallback } from "react";
import { INITIATIVE_TEMPLATES, InitiativeTemplate } from "@/components/initiatives/initiative-templates";

export interface VerticalStarter {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  includedTemplates: string[];
  defaultStack: Record<string, string>;
}

const VERTICAL_STARTERS: VerticalStarter[] = [
  { id: "saas-startup", name: "SaaS Startup", icon: "🏢", category: "B2B", description: "Complete SaaS starter: auth, multi-tenancy, billing, dashboard.", includedTemplates: ["saas", "dashboard"], defaultStack: { frontend: "React + TypeScript + Tailwind", backend: "Supabase", payments: "Stripe" } },
  { id: "internal-tool", name: "Internal Tool", icon: "🔧", category: "Operations", description: "Internal admin panel, data management, team workflows.", includedTemplates: ["dashboard", "crm"], defaultStack: { frontend: "React + TypeScript + Tailwind", backend: "Supabase" } },
  { id: "marketplace", name: "Marketplace", icon: "🏪", category: "Platform", description: "Two-sided marketplace with listings, search, transactions.", includedTemplates: ["ecommerce", "dashboard"], defaultStack: { frontend: "React + TypeScript + Tailwind", backend: "Supabase", payments: "Stripe Connect" } },
  { id: "ai-workflow", name: "AI Workflow", icon: "🤖", category: "AI/ML", description: "AI-powered workflow tool with prompt management and model integration.", includedTemplates: ["api-rest", "dashboard"], defaultStack: { frontend: "React + TypeScript + Tailwind", backend: "Supabase Edge Functions", ai: "Lovable AI" } },
  { id: "content-platform", name: "Content Platform", icon: "📝", category: "Content", description: "Content management, publishing, and community features.", includedTemplates: ["landing-page", "dashboard"], defaultStack: { frontend: "React + TypeScript + Tailwind", backend: "Supabase" } },
  { id: "marketing-site", name: "Marketing Site", icon: "🚀", category: "Marketing", description: "High-conversion landing pages and lead capture.", includedTemplates: ["landing-page"], defaultStack: { frontend: "React + TypeScript + Tailwind + Framer Motion", seo: "Full SEO meta" } },
];

export function useOnboardingStarter() {
  const [selectedTemplate, setSelectedTemplate] = useState<InitiativeTemplate | null>(null);
  const [selectedVertical, setSelectedVertical] = useState<VerticalStarter | null>(null);
  const [ideaText, setIdeaText] = useState("");

  const templates = INITIATIVE_TEMPLATES;
  const verticals = VERTICAL_STARTERS;

  const recommendedTemplate = useMemo(() => {
    if (!ideaText || ideaText.length < 10) return null;
    const lower = ideaText.toLowerCase();
    const keywords: Record<string, string[]> = {
      saas: ["saas", "multi-tenant", "subscription", "b2b"],
      "api-rest": ["api", "rest", "backend", "endpoint"],
      "landing-page": ["landing", "page", "marketing"],
      ecommerce: ["ecommerce", "e-commerce", "store", "shop", "cart"],
      dashboard: ["dashboard", "analytics", "kpi", "chart"],
      crm: ["crm", "customer", "pipeline", "sales"],
    };
    let best: InitiativeTemplate | null = null;
    let bestScore = 0;
    for (const t of templates) {
      const kws = keywords[t.id] || [];
      const score = kws.filter(k => lower.includes(k)).length / (kws.length || 1);
      if (score > bestScore) { bestScore = score; best = t; }
    }
    return bestScore > 0.2 ? best : null;
  }, [ideaText, templates]);

  const recommendedVertical = useMemo(() => {
    if (!ideaText || ideaText.length < 10) return null;
    const lower = ideaText.toLowerCase();
    const keywords: Record<string, string[]> = {
      "saas-startup": ["saas", "subscription", "b2b"],
      "internal-tool": ["internal", "admin", "backoffice"],
      marketplace: ["marketplace", "two-sided", "listings"],
      "ai-workflow": ["ai", "llm", "gpt", "prompt"],
      "content-platform": ["blog", "content", "cms"],
      "marketing-site": ["landing", "marketing", "lead"],
    };
    let best: VerticalStarter | null = null;
    let bestScore = 0;
    for (const v of verticals) {
      const kws = keywords[v.id] || [];
      const score = kws.filter(k => lower.includes(k)).length / (kws.length || 1);
      if (score > bestScore) { bestScore = score; best = v; }
    }
    return bestScore > 0.15 ? best : null;
  }, [ideaText, verticals]);

  const clearSelections = useCallback(() => {
    setSelectedTemplate(null);
    setSelectedVertical(null);
    setIdeaText("");
  }, []);

  return {
    templates,
    verticals,
    selectedTemplate,
    setSelectedTemplate,
    selectedVertical,
    setSelectedVertical,
    ideaText,
    setIdeaText,
    recommendedTemplate,
    recommendedVertical,
    clearSelections,
  };
}
