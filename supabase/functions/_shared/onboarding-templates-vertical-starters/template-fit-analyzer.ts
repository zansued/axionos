// Sprint 69 — Template Fit Analyzer
// Scores how well a template matches a given idea/intake.

import { InitiativeTemplateDefinition, findBestTemplate } from "./initiative-template-library.ts";

export interface TemplateFitResult {
  templateName: string;
  fitScore: number;
  matchedKeywords: string[];
  assumptionsIntroduced: string[];
  isGoodFit: boolean;
  isBadFit: boolean;
  reasoning: string;
}

export function analyzeTemplateFit(
  template: InitiativeTemplateDefinition,
  ideaText: string
): TemplateFitResult {
  const lower = ideaText.toLowerCase();
  const keywords: Record<string, string[]> = {
    "SaaS Multi-tenant": ["saas", "multi-tenant", "subscription", "b2b"],
    "API REST": ["api", "rest", "backend", "endpoint"],
    "Landing Page": ["landing", "page", "marketing", "conversion"],
    "E-commerce": ["ecommerce", "e-commerce", "store", "shop", "cart"],
    "Dashboard Analytics": ["dashboard", "analytics", "kpi", "chart"],
    "CRM": ["crm", "customer", "pipeline", "sales"],
  };
  const kws = keywords[template.templateName] || [];
  const matched = kws.filter((k) => lower.includes(k));
  const fitScore = kws.length > 0 ? matched.length / kws.length : 0.1;
  const isGoodFit = fitScore >= 0.4;
  const isBadFit = fitScore < 0.15;

  return {
    templateName: template.templateName,
    fitScore: Math.min(1, fitScore * template.fitScore * 1.2),
    matchedKeywords: matched,
    assumptionsIntroduced: template.defaultAssumptions,
    isGoodFit,
    isBadFit,
    reasoning: isGoodFit
      ? `Template "${template.templateName}" matches well based on keywords: ${matched.join(", ")}.`
      : isBadFit
      ? `Template "${template.templateName}" is a poor fit — no significant keyword overlap.`
      : `Template "${template.templateName}" has partial fit. Review assumptions before proceeding.`,
  };
}

export function rankTemplates(
  templates: InitiativeTemplateDefinition[],
  ideaText: string
): TemplateFitResult[] {
  return templates
    .map((t) => analyzeTemplateFit(t, ideaText))
    .sort((a, b) => b.fitScore - a.fitScore);
}
