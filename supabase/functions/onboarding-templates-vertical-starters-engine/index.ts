// Sprint 69 — Onboarding, Templates & Vertical Starters Engine
// Edge function providing overview, template management, vertical starters, recommendations, and onboarding outcomes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getDefaultOnboardingFlow, evaluateOnboardingClarity, buildOnboardingFlowsOverview } from "../_shared/onboarding-templates-vertical-starters/onboarding-flow-manager.ts";
import { getBuiltInTemplates, findBestTemplate } from "../_shared/onboarding-templates-vertical-starters/initiative-template-library.ts";
import { getBuiltInVerticals, recommendVertical } from "../_shared/onboarding-templates-vertical-starters/vertical-starter-library.ts";
import { rankTemplates } from "../_shared/onboarding-templates-vertical-starters/template-fit-analyzer.ts";
import { recommendVerticalStarter } from "../_shared/onboarding-templates-vertical-starters/vertical-starter-recommender.ts";
import { buildInitializationPlan } from "../_shared/onboarding-templates-vertical-starters/template-initialization-engine.ts";
import { detectOnboardingFriction } from "../_shared/onboarding-templates-vertical-starters/onboarding-friction-detector.ts";
import { validateOnboardingOutcome } from "../_shared/onboarding-templates-vertical-starters/onboarding-outcome-validator.ts";
import { explainTemplateChoice, explainVerticalRecommendation, explainOnboardingPosture } from "../_shared/onboarding-templates-vertical-starters/onboarding-explainer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, params } = await req.json();

    switch (action) {
      case "overview": {
        const defaultFlow = getDefaultOnboardingFlow();
        const templates = getBuiltInTemplates();
        const verticals = getBuiltInVerticals();
        return new Response(JSON.stringify({
          onboarding: buildOnboardingFlowsOverview([defaultFlow]),
          templates: { total: templates.length, categories: [...new Set(templates.map(t => t.category))] },
          verticals: { total: verticals.length, categories: [...new Set(verticals.map(v => v.category))] },
          metrics: {
            onboarding_clarity_score: defaultFlow.clarityScore,
            template_coverage: templates.length,
            vertical_coverage: verticals.length,
          },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "recommend_template": {
        const templates = getBuiltInTemplates();
        const ranked = rankTemplates(templates, params?.ideaText || "");
        return new Response(JSON.stringify({
          recommendations: ranked.slice(0, 3),
          bestFit: ranked[0] || null,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "recommend_vertical_starter": {
        const rec = recommendVerticalStarter(params?.ideaText || "");
        return new Response(JSON.stringify({ recommendation: rec }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "initialize_initiative": {
        const templates = getBuiltInTemplates();
        const verticals = getBuiltInVerticals();
        const bestTemplate = params?.templateName ? templates.find(t => t.templateName === params.templateName) : findBestTemplate(params?.ideaText || "");
        const bestVertical = params?.verticalName ? verticals.find(v => v.verticalName === params.verticalName) : recommendVertical(params?.ideaText || "");
        const plan = buildInitializationPlan({ template: bestTemplate, vertical: bestVertical, rawIdea: params?.ideaText || "" });
        return new Response(JSON.stringify({ initializationPlan: plan }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "detect_friction": {
        const analysis = detectOnboardingFriction(params || { totalSteps: 4, currentStep: 0, timeOnCurrentStepMs: 0, backtrackCount: 0, emptySubmissions: 0, sessionDurationMs: 0 });
        return new Response(JSON.stringify({ frictionAnalysis: analysis }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "onboarding_outcomes": {
        const validation = validateOnboardingOutcome(params || { sessionCompleted: false, initiativeCreated: false, templateUsed: null, verticalUsed: null, timeToFirstInitiativeMs: 0, frictionSignalCount: 0 });
        return new Response(JSON.stringify({ outcomeValidation: validation }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "explain": {
        const explanations = [];
        if (params?.templateName) {
          explanations.push(explainTemplateChoice({ templateName: params.templateName, fitScore: params?.fitScore || 0, assumptions: params?.assumptions || [], matchedKeywords: params?.matchedKeywords || [] }));
        }
        if (params?.verticalName) {
          explanations.push(explainVerticalRecommendation({ verticalName: params.verticalName, fitScore: params?.fitScore || 0, includedTemplates: params?.includedTemplates || [], assumptionVisibilityScore: params?.assumptionVisibilityScore || 0 }));
        }
        explanations.push(explainOnboardingPosture({ frictionScore: params?.frictionScore || 0, abandonmentRisk: params?.abandonmentRisk || 0, completionRate: params?.completionRate || 0 }));
        return new Response(JSON.stringify({ explanations }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
