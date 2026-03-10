import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { registerFailure } from "../_shared/repair-intelligence/failure-memory-archiver.ts";
import { normalizeFailureSignature, registerSignature } from "../_shared/repair-intelligence/failure-signature-normalizer.ts";
import { registerRepairAttempt, extractMitigationPattern } from "../_shared/repair-intelligence/repair-pattern-extractor.ts";
import { detectFalseFixes, recordFalseFix } from "../_shared/repair-intelligence/false-fix-detector.ts";
import { computeConfidenceForEntry } from "../_shared/repair-intelligence/mitigation-confidence-scorer.ts";
import { analyzeRecurrence } from "../_shared/repair-intelligence/recurrence-analyzer.ts";
import { retrieveRepairGuidance } from "../_shared/repair-intelligence/repair-guidance-retriever.ts";
import { explainFailurePattern } from "../_shared/repair-intelligence/failure-memory-explainer.ts";

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
      case "register_failure": {
        const result = await registerFailure(supabase, {
          organizationId: params.organization_id,
          signature: params.signature,
          failureType: params.failure_type || 'unknown',
          stackScope: params.stack_scope || 'general',
          triggerConditions: params.trigger_conditions || {},
          affectedLayers: params.affected_layers || [],
          symptomSummary: params.symptom_summary || '',
          rootCauseHypothesis: params.root_cause_hypothesis,
          pipelineStage: params.pipeline_stage,
          initiativeId: params.initiative_id,
          agentType: params.agent_type,
          errorPayload: params.error_payload,
        });
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "normalize_signature": {
        const result = normalizeFailureSignature(params.raw_error || '');
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "register_repair_attempt": {
        const result = await registerRepairAttempt(supabase, params.organization_id, {
          failureMemoryId: params.failure_memory_id,
          repairStrategy: params.repair_strategy,
          repairPayload: params.repair_payload || {},
          attemptNumber: params.attempt_number || 1,
          outcome: params.outcome || 'pending',
          durationMs: params.duration_ms,
          costEstimate: params.cost_estimate,
          agentType: params.agent_type,
          pipelineStage: params.pipeline_stage,
          notes: params.notes,
        });
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "link_repair_outcome": {
        const { data, error } = await supabase.from('repair_outcome_links').insert({
          organization_id: params.organization_id,
          repair_attempt_id: params.repair_attempt_id,
          outcome_type: params.outcome_type || 'unknown',
          verification_method: params.verification_method,
          regression_detected: params.regression_detected || false,
          regression_description: params.regression_description,
          confidence_score: params.confidence_score || 0,
          evidence_refs: params.evidence_refs || [],
        }).select('id').single();
        return new Response(JSON.stringify({ id: data?.id, error: error?.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "retrieve_repair_guidance": {
        const result = await retrieveRepairGuidance(supabase, params.organization_id, params.signature);
        return new Response(JSON.stringify(result || { message: 'No guidance found for this signature' }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "detect_false_fix": {
        const signals = await detectFalseFixes(supabase, params.organization_id, params.failure_memory_id);
        for (const signal of signals) {
          await recordFalseFix(supabase, params.organization_id, signal);
        }
        return new Response(JSON.stringify({ detected: signals.length, signals }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "score_failure_memory": {
        const confidence = await computeConfidenceForEntry(supabase, params.organization_id, params.failure_memory_id);
        // Update entry confidence
        await supabase.from('failure_memory_entries')
          .update({ confidence_score: confidence.overallConfidence, updated_at: new Date().toISOString() })
          .eq('id', params.failure_memory_id);
        return new Response(JSON.stringify(confidence), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "explain_failure_pattern": {
        const { data: entry } = await supabase
          .from('failure_memory_entries')
          .select('*')
          .eq('id', params.failure_memory_id)
          .single();
        if (!entry) return new Response(JSON.stringify({ error: 'Entry not found' }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        
        const { data: falseFixes } = await supabase.from('false_fix_records').select('id').eq('failure_memory_id', params.failure_memory_id);
        
        const explanation = explainFailurePattern({
          signature: entry.signature,
          failureType: entry.failure_type,
          symptomSummary: entry.symptom_summary,
          rootCauseHypothesis: entry.root_cause_hypothesis,
          provenCauses: entry.proven_causes || [],
          successfulRepairs: entry.successful_repairs || [],
          failedRepairs: entry.failed_repairs || [],
          confidenceScore: entry.confidence_score,
          recurrenceScore: entry.recurrence_score,
          falsFixCount: falseFixes?.length || 0,
        });
        return new Response(JSON.stringify(explanation), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error) {
    console.error("repair-intelligence-archive error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
