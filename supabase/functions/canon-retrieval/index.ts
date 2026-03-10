import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { retrieveCanonPatterns } from "../_shared/canon-retrieval/canon-retrieval-engine.ts";
import { batchScoreApplicability } from "../_shared/canon-retrieval/canon-applicability-scorer.ts";
import { recordUsageEvent, recordPatternApplication, submitRetrievalFeedback } from "../_shared/canon-retrieval/canon-usage-recorder.ts";
import { buildInjectionBlocks } from "../_shared/canon-retrieval/convention-injector.ts";
import { selectBestTemplate } from "../_shared/canon-retrieval/template-selector.ts";
import { resolveStackGuidance } from "../_shared/canon-retrieval/stack-guidance-resolver.ts";
import { explainRetrieval } from "../_shared/canon-retrieval/retrieval-explainer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, ...params } = await req.json();

    switch (action) {
      case "retrieve_patterns": {
        const result = await retrieveCanonPatterns(supabase, {
          organizationId: params.organization_id,
          taskType: params.task_type,
          stack: params.stack,
          language: params.language,
          framework: params.framework,
          layer: params.layer,
          problemType: params.problem_type,
          artifactType: params.artifact_type,
          maxResults: params.max_results,
          minConfidence: params.min_confidence,
          includeExperimental: params.include_experimental,
        });
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "retrieve_templates": {
        const patterns = await retrieveCanonPatterns(supabase, {
          organizationId: params.organization_id,
          stack: params.stack,
          language: params.language,
          framework: params.framework,
          problemType: params.problem_type,
          maxResults: 20,
        });
        const result = selectBestTemplate(patterns.patterns, {
          artifactType: params.artifact_type || 'code',
          stack: params.stack,
          language: params.language,
          framework: params.framework,
          problemType: params.problem_type,
          qualityRequirement: params.quality_requirement,
        });
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "retrieve_conventions": {
        const patterns = await retrieveCanonPatterns(supabase, {
          organizationId: params.organization_id,
          stack: params.stack,
          language: params.language,
          framework: params.framework,
          maxResults: 15,
        });
        const guidance = resolveStackGuidance(patterns.patterns, {
          primaryLanguage: params.language,
          framework: params.framework,
          runtime: params.runtime,
          database: params.database,
          deploymentTarget: params.deployment_target,
        });
        const injection = buildInjectionBlocks(patterns.patterns, {
          pipelineStage: params.pipeline_stage || 'unknown',
          agentType: params.agent_type || 'unknown',
          maxTokenBudget: params.max_token_budget,
        });
        return new Response(JSON.stringify({ guidance, injection }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "score_applicability": {
        const patterns = await retrieveCanonPatterns(supabase, {
          organizationId: params.organization_id,
          maxResults: 50,
        });
        const scores = batchScoreApplicability(patterns.patterns, {
          stack: params.stack,
          language: params.language,
          framework: params.framework,
          problemType: params.problem_type,
          pipelineStage: params.pipeline_stage,
          artifactType: params.artifact_type,
          qualityRequirement: params.quality_requirement,
        });
        return new Response(JSON.stringify({ scores }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "register_usage": {
        const result = await recordUsageEvent(supabase, {
          organizationId: params.organization_id,
          canonEntryId: params.canon_entry_id,
          usageContext: params.usage_context,
          pipelineStage: params.pipeline_stage,
          initiativeId: params.initiative_id,
          agentType: params.agent_type,
          retrievalScore: params.retrieval_score ?? 0,
          wasApplied: params.was_applied ?? false,
          feedbackSignal: params.feedback_signal,
        });
        return new Response(JSON.stringify({ success: !!result, id: result?.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "submit_feedback": {
        const result = await submitRetrievalFeedback(supabase, {
          organizationId: params.organization_id,
          canonEntryId: params.canon_entry_id,
          usageEventId: params.usage_event_id,
          feedbackType: params.feedback_type,
          feedbackReason: params.feedback_reason,
          reviewerId: params.reviewer_id,
        });
        return new Response(JSON.stringify({ success: !!result, id: result?.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "explain_retrieval": {
        const patternsResult = await retrieveCanonPatterns(supabase, {
          organizationId: params.organization_id,
          stack: params.stack,
          language: params.language,
          framework: params.framework,
          problemType: params.problem_type,
          maxResults: params.max_results ?? 10,
        });
        const scores = batchScoreApplicability(patternsResult.patterns, {
          stack: params.stack,
          language: params.language,
          framework: params.framework,
          problemType: params.problem_type,
          pipelineStage: params.pipeline_stage,
        });
        const explanation = explainRetrieval(
          patternsResult.patterns,
          [],
          scores,
          params.query_description || 'pattern retrieval'
        );
        return new Response(JSON.stringify(explanation), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error) {
    console.error("canon-retrieval error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
