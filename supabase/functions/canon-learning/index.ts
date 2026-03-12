import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth hardening — Sprint 196
    const authResult = await authenticateWithRateLimit(req, "canon-learning");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient: sc } = authResult;

    const body = await req.json();
    const { action, organizationId: payloadOrgId } = body;

    const { orgId: organizationId, error: orgError } = await resolveAndValidateOrg(sc, user.id, payloadOrgId);
    if (orgError || !organizationId) {
      return new Response(JSON.stringify({ error: orgError || "Organization access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await logSecurityAudit(sc, {
      organization_id: organizationId, actor_id: user.id,
      function_name: "canon-learning", action: action || "unknown",
    });

    let result: any = null;

    switch (action) {
      // ─── List learning candidates ───
      case "list_candidates": {
        const { data } = await sc.from("canon_learning_candidates").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(200);
        result = { candidates: data || [] };
        break;
      }

      // ─── List signals ───
      case "list_signals": {
        const { data } = await sc.from("canon_learning_signals").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(300);
        result = { signals: data || [] };
        break;
      }

      // ─── List failure patterns ───
      case "list_failure_patterns": {
        const { data } = await sc.from("canon_failure_patterns").select("*").eq("organization_id", organizationId).order("occurrence_count", { ascending: false }).limit(100);
        result = { patterns: data || [] };
        break;
      }

      // ─── List refactor patterns ───
      case "list_refactor_patterns": {
        const { data } = await sc.from("canon_refactor_patterns").select("*").eq("organization_id", organizationId).order("occurrence_count", { ascending: false }).limit(100);
        result = { patterns: data || [] };
        break;
      }

      // ─── List success patterns ───
      case "list_success_patterns": {
        const { data } = await sc.from("canon_success_patterns").select("*").eq("organization_id", organizationId).order("occurrence_count", { ascending: false }).limit(100);
        result = { patterns: data || [] };
        break;
      }

      // ─── List validation patterns ───
      case "list_validation_patterns": {
        const { data } = await sc.from("canon_validation_patterns").select("*").eq("organization_id", organizationId).order("occurrence_count", { ascending: false }).limit(100);
        result = { patterns: data || [] };
        break;
      }

      // ─── List candidate reviews ───
      case "list_reviews": {
        const { data } = await sc.from("canon_candidate_reviews").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100);
        result = { reviews: data || [] };
        break;
      }

      // ─── Ingest signal ───
      case "ingest_signal": {
        const { signal } = body;
        if (!signal) { result = { error: "signal required" }; break; }
        const row = {
          organization_id: organizationId,
          signal_type: signal.signal_type || "repair_outcome",
          signal_source: signal.signal_source || "system",
          initiative_id: signal.initiative_id || null,
          stage_name: signal.stage_name || "",
          error_signature: signal.error_signature || null,
          strategy_used: signal.strategy_used || null,
          outcome: signal.outcome || "",
          outcome_success: signal.outcome_success ?? false,
          confidence: signal.confidence ?? 0,
          metadata: signal.metadata || {},
        };
        const { data, error } = await sc.from("canon_learning_signals").insert(row).select().single();
        if (error) throw error;
        result = { signal: data };
        break;
      }

      // ─── Create learning candidate ───
      case "create_candidate": {
        const { candidate } = body;
        if (!candidate) { result = { error: "candidate required" }; break; }
        const row = {
          organization_id: organizationId,
          title: candidate.title || "",
          summary: candidate.summary || "",
          source_type: candidate.source_type || "repair_loop",
          source_refs: candidate.source_refs || [],
          proposed_practice_type: candidate.proposed_practice_type || "best_practice",
          proposed_domain: candidate.proposed_domain || "general",
          proposed_stack_scope: candidate.proposed_stack_scope || "general",
          signal_count: candidate.signal_count || 1,
          confidence_score: candidate.confidence_score || 0,
          noise_suppressed: candidate.noise_suppressed || false,
          suppression_reason: candidate.suppression_reason || null,
        };
        const { data, error } = await sc.from("canon_learning_candidates").insert(row).select().single();
        if (error) throw error;
        result = { candidate: data };
        break;
      }

      // ─── Submit candidate review ───
      case "submit_review": {
        const { candidateId, reviewer, verdict, notes, confidence_assessment, strengths, weaknesses } = body;
        if (!candidateId) { result = { error: "candidateId required" }; break; }
        const { data, error } = await sc.from("canon_candidate_reviews").insert({
          organization_id: organizationId,
          candidate_id: candidateId,
          reviewer: reviewer || "system",
          verdict: verdict || "pending",
          confidence_assessment: confidence_assessment || 0,
          review_notes: notes || "",
          strengths: strengths || [],
          weaknesses: weaknesses || [],
        }).select().single();
        if (error) throw error;
        // Update candidate review_status
        if (verdict === "approved" || verdict === "rejected") {
          await sc.from("canon_learning_candidates").update({ review_status: verdict, reviewed_by: reviewer || "system", review_notes: notes || "" }).eq("id", candidateId);
        }
        result = { review: data };
        break;
      }

      // ─── Register failure pattern ───
      case "register_failure_pattern": {
        const { pattern } = body;
        if (!pattern) { result = { error: "pattern required" }; break; }
        const { data, error } = await sc.from("canon_failure_patterns").insert({
          organization_id: organizationId,
          pattern_signature: pattern.pattern_signature || "",
          pattern_description: pattern.pattern_description || "",
          occurrence_count: pattern.occurrence_count || 1,
          affected_stages: pattern.affected_stages || [],
          severity: pattern.severity || "medium",
        }).select().single();
        if (error) throw error;
        result = { pattern: data };
        break;
      }

      // ─── Record lineage ───
      case "record_lineage": {
        const { candidateId, lineage_type, source_ref, source_table, contribution_weight } = body;
        if (!candidateId) { result = { error: "candidateId required" }; break; }
        const { data, error } = await sc.from("canon_candidate_lineage").insert({
          organization_id: organizationId,
          candidate_id: candidateId,
          lineage_type: lineage_type || "signal_cluster",
          source_ref: source_ref || "",
          source_table: source_table || "",
          contribution_weight: contribution_weight || 1,
        }).select().single();
        if (error) throw error;
        result = { lineage: data };
        break;
      }

      default:
        result = { error: `Unknown action: ${action}` };
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("Canon learning error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
