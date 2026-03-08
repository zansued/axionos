// Sprint 69 — Vertical Starter Recommender
// Recommends the most appropriate vertical starter path.

import { VerticalStarterDefinition, getBuiltInVerticals } from "./vertical-starter-library.ts";

export interface VerticalRecommendation {
  verticalName: string;
  fitScore: number;
  category: string;
  reasoning: string;
  includedTemplates: string[];
  assumptionVisibilityScore: number;
}

export function recommendVerticalStarter(ideaText: string): VerticalRecommendation | null {
  if (!ideaText || ideaText.length < 5) return null;
  const lower = ideaText.toLowerCase();
  const verticals = getBuiltInVerticals();
  const keywords: Record<string, string[]> = {
    "SaaS Startup": ["saas", "subscription", "b2b", "multi-tenant"],
    "Internal Tool": ["internal", "admin", "backoffice", "tool"],
    "Marketplace": ["marketplace", "two-sided", "listings"],
    "AI Workflow": ["ai", "llm", "gpt", "prompt", "ml"],
    "Content Platform": ["blog", "content", "cms", "knowledge"],
    "Marketing Site": ["landing", "marketing", "lead"],
  };

  let best: VerticalStarterDefinition | null = null;
  let bestScore = 0;
  let bestMatched: string[] = [];

  for (const v of verticals) {
    const kws = keywords[v.verticalName] || [];
    const matched = kws.filter((k) => lower.includes(k));
    const score = kws.length > 0 ? matched.length / kws.length : 0;
    if (score > bestScore) { bestScore = score; best = v; bestMatched = matched; }
  }

  if (!best || bestScore < 0.15) return null;

  return {
    verticalName: best.verticalName,
    fitScore: Math.min(1, bestScore * best.verticalFitScore * 1.2),
    category: best.category,
    reasoning: `Vertical "${best.verticalName}" recommended based on: ${bestMatched.join(", ")}.`,
    includedTemplates: best.includedTemplates,
    assumptionVisibilityScore: best.assumptionVisibilityScore,
  };
}
