import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildExternalCandidate } from "../_shared/canon-evolution/external-knowledge-intake.ts";
import { assessSourceReliability } from "../_shared/canon-evolution/source-reliability-assessor.ts";
import { detectCanonConflicts } from "../_shared/canon-evolution/canon-conflict-detector.ts";
import { validateEvolutionTransition } from "../_shared/canon-evolution/canon-evolution-controller.ts";
import { buildTrial } from "../_shared/canon-evolution/canon-trial-manager.ts";
import { evaluatePromotion } from "../_shared/canon-evolution/promotion-decision-engine.ts";
import { explainCanonChange, explainCanonEvolutionProcess } from "../_shared/canon-evolution/external-knowledge-explainer.ts";
import { handleCors, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    // Auth hardening — Sprint 197
    const authResult = await authenticateWithRateLimit(req, "canon-evolution-control");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient: supabase } = authResult;

    const { action, organizationId: payloadOrgId, ...params } = await req.json();

    const { orgId: organizationId, error: orgError } = await resolveAndValidateOrg(supabase, user.id, payloadOrgId);
    if (orgError || !organizationId) return errorResponse(orgError || "Organization access denied", 403, req);

    await logSecurityAudit(supabase, {
      organization_id: organizationId, actor_id: user.id,
      function_name: "canon-evolution-control", action: action || "unknown",
    });

    const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    switch (action) {
      case "register_external_candidate": {
        const built = buildExternalCandidate({ organization_id: organizationId, ...params });
        if (!built.valid) return json({ error: "Validation failed", errors: built.errors }, 400);
        const { data, error } = await supabase.from("external_knowledge_candidates").insert(built.candidate).select().single();
        if (error) throw error;
        await supabase.from("canon_evolution_audit").insert({
          organization_id: organizationId, event_type: "candidate_registered",
          target_type: "external_knowledge_candidate", target_id: data.id,
          actor: params.submitted_by || "", details: { title: data.title },
        });
        return json(data);
      }

      case "review_source": {
        const { data: source } = await supabase.from("external_knowledge_sources").select("*").eq("id", params.sourceId).single();
        if (!source) return json({ error: "Source not found" }, 404);
        const { data: candidates } = await supabase.from("external_knowledge_candidates")
          .select("promotion_status").eq("source_id", params.sourceId);
        const profile = {
          source_type: source.source_type,
          total_candidates: candidates?.length || 0,
          promoted_count: candidates?.filter((c: any) => c.promotion_status === "promoted").length || 0,
          rejected_count: candidates?.filter((c: any) => c.promotion_status === "rejected").length || 0,
          conflict_count: 0,
          age_days: Math.floor((Date.now() - new Date(source.created_at).getTime()) / 86400000),
        };
        const assessment = assessSourceReliability(profile);
        await supabase.from("external_knowledge_sources").update({
          reliability_score: assessment.score, last_evaluated_at: new Date().toISOString(),
          evaluation_notes: assessment.explanation,
        }).eq("id", params.sourceId);
        return json({ source, assessment });
      }

      case "detect_canon_conflict": {
        const { data: candidate } = await supabase.from("external_knowledge_candidates").select("*").eq("id", params.candidateId).single();
        if (!candidate) return json({ error: "Candidate not found" }, 404);
        const { data: entries } = await supabase.from("canon_entries").select("id, stack_scope, canon_type, summary, lifecycle_status")
          .eq("organization_id", organizationId).limit(200);
        const result = detectCanonConflicts({
          candidate_stack_scope: candidate.stack_scope || "",
          candidate_knowledge_type: candidate.knowledge_type,
          candidate_summary: candidate.summary || "",
          existing_entries: entries || [],
        });
        if (result.has_conflicts) {
          await supabase.from("external_knowledge_candidates").update({ conflict_with_existing_canon: true }).eq("id", params.candidateId);
          for (const c of result.conflicts) {
            await supabase.from("canon_external_conflicts").insert({
              organization_id: organizationId, candidate_id: params.candidateId,
              existing_canon_entry_id: c.existing_entry_id, conflict_type: c.conflict_type,
              conflict_description: c.description, severity: c.severity,
            });
          }
        }
        return json(result);
      }

      case "open_evolution_proposal": {
        const { data, error } = await supabase.from("canon_evolution_proposals").insert({
          organization_id: organizationId, candidate_id: params.candidateId || null,
          proposal_type: params.proposal_type || "addition", title: params.title || "",
          justification: params.justification || "", expected_impact: params.expected_impact || "",
          risk_assessment: params.risk_assessment || "", status: "draft",
          proposed_by: params.proposed_by || "",
        }).select().single();
        if (error) throw error;
        await supabase.from("canon_evolution_audit").insert({
          organization_id: organizationId, event_type: "evolution_proposal_opened",
          target_type: "canon_evolution_proposal", target_id: data.id,
          actor: params.proposed_by || "", details: { title: params.title },
        });
        return json(data);
      }

      case "transition_proposal": {
        const { data: current } = await supabase.from("canon_evolution_proposals").select("status").eq("id", params.proposalId).single();
        if (!current) return json({ error: "Proposal not found" }, 404);
        const result = validateEvolutionTransition(current.status as any, params.target_status);
        if (!result.allowed) return json({ error: result.reason }, 400);
        await supabase.from("canon_evolution_proposals").update({
          status: params.target_status, decision_notes: params.notes || "", updated_at: new Date().toISOString(),
        }).eq("id", params.proposalId);
        await supabase.from("canon_evolution_audit").insert({
          organization_id: organizationId, event_type: "proposal_status_changed",
          target_type: "canon_evolution_proposal", target_id: params.proposalId,
          details: { from: current.status, to: params.target_status },
        });
        return json({ success: true, transition: result });
      }

      case "run_trial": {
        const built = buildTrial(params);
        if (!built.valid) return json({ error: "Validation failed", errors: built.errors }, 400);
        const { data, error } = await supabase.from("canon_change_trials").insert({
          organization_id: organizationId, ...built.trial,
        }).select().single();
        if (error) throw error;
        return json(data);
      }

      case "promote_candidate": {
        const { data: reviews } = await supabase.from("external_knowledge_reviews")
          .select("verdict").eq("candidate_id", params.candidateId);
        const { data: conflicts } = await supabase.from("canon_external_conflicts")
          .select("id").eq("candidate_id", params.candidateId);
        const { data: candidate } = await supabase.from("external_knowledge_candidates")
          .select("*").eq("id", params.candidateId).single();
        if (!candidate) return json({ error: "Candidate not found" }, 404);

        const decision = evaluatePromotion({
          candidate_reliability_score: candidate.source_reliability_score,
          novelty_score: candidate.novelty_score,
          conflict_count: conflicts?.length || 0,
          review_verdicts: (reviews || []).map((r: any) => r.verdict),
          trial_outcome: params.trial_outcome,
        });

        const { data: record, error } = await supabase.from("canon_promotion_decisions").insert({
          organization_id: organizationId, proposal_id: params.proposalId || null,
          candidate_id: params.candidateId, decision: decision.recommendation,
          decision_reason: decision.reasons.join("; "), decided_by: params.decided_by || "",
          decided_at: new Date().toISOString(),
        }).select().single();
        if (error) throw error;

        await supabase.from("external_knowledge_candidates").update({
          promotion_status: decision.recommendation === "promote" ? "promoted" : decision.recommendation,
        }).eq("id", params.candidateId);

        return json({ decision, record });
      }

      case "reject_candidate": {
        await supabase.from("external_knowledge_candidates").update({
          promotion_status: "rejected", rejection_reason: params.reason || "",
        }).eq("id", params.candidateId);
        await supabase.from("canon_evolution_audit").insert({
          organization_id: organizationId, event_type: "candidate_rejected",
          target_type: "external_knowledge_candidate", target_id: params.candidateId,
          actor: params.actor || "", details: { reason: params.reason },
        });
        return json({ success: true });
      }

      case "submit_review": {
        const { data, error } = await supabase.from("external_knowledge_reviews").insert({
          organization_id: organizationId, candidate_id: params.candidateId,
          reviewer_id: params.reviewer_id || "", verdict: params.verdict,
          confidence_score: params.confidence_score || 0,
          conflict_detected: params.conflict_detected || false,
          conflict_details: params.conflict_details || "",
          review_notes: params.review_notes || "",
        }).select().single();
        if (error) throw error;
        return json(data);
      }

      case "list_candidates": {
        let query = supabase.from("external_knowledge_candidates").select("*")
          .eq("organization_id", organizationId).order("created_at", { ascending: false });
        if (params.promotion_status) query = query.eq("promotion_status", params.promotion_status);
        if (params.knowledge_type) query = query.eq("knowledge_type", params.knowledge_type);
        const { data, error } = await query.limit(100);
        if (error) throw error;
        return json({ candidates: data });
      }

      case "list_proposals": {
        const { data, error } = await supabase.from("canon_evolution_proposals").select("*")
          .eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100);
        if (error) throw error;
        return json({ proposals: data });
      }

      case "explain_canon_change": {
        if (!params.candidateId) return json(explainCanonEvolutionProcess());
        const { data: candidate } = await supabase.from("external_knowledge_candidates").select("*").eq("id", params.candidateId).single();
        if (!candidate) return json({ error: "Candidate not found" }, 404);
        const { data: conflicts } = await supabase.from("canon_external_conflicts").select("id").eq("candidate_id", params.candidateId);
        const explanation = explainCanonChange({
          change_type: "addition", candidate_title: candidate.title,
          decision: candidate.promotion_status, reasons: [],
          conflict_count: conflicts?.length || 0,
        });
        return json(explanation);
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
