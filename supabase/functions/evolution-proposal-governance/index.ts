import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, errorResponse, handleCors } from "../_shared/cors.ts";
import { authenticate } from "../_shared/auth.ts";
import { buildProposal } from "../_shared/reflexive-governance/evolution-proposal-builder.ts";
import { classifyProblem } from "../_shared/reflexive-governance/evolution-problem-classifier.ts";
import { scoreLegitimacy } from "../_shared/reflexive-governance/evolution-legitimacy-scorer.ts";
import { evaluateBoundedness } from "../_shared/reflexive-governance/evolution-boundedness-evaluator.ts";
import { assessReversibility } from "../_shared/reflexive-governance/evolution-reversibility-assessor.ts";
import { analyzeReadiness } from "../_shared/reflexive-governance/evolution-readiness-analyzer.ts";
import { validateProposalTransition, getAvailableTransitions } from "../_shared/reflexive-governance/evolution-review-workflow.ts";
import { evaluateJustification } from "../_shared/reflexive-governance/evolution-justification-engine.ts";
import { explainProposal } from "../_shared/reflexive-governance/evolution-decision-explainer.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await authenticate(req);
    if (auth instanceof Response) return auth;
    const { user, serviceClient } = auth;

    const { action, organizationId, ...params } = await req.json();
    if (!organizationId) return errorResponse("organizationId required", 400);

    // Verify membership
    const { data: membership } = await serviceClient
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .single();
    if (!membership) return errorResponse("Not a member of this organization", 403);

    switch (action) {
      case "list_proposals": {
        const { data, error } = await serviceClient
          .from("evolution_proposals")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        return jsonResponse({ proposals: data });
      }

      case "get_proposal": {
        const { proposalId } = params;
        if (!proposalId) return errorResponse("proposalId required", 400);

        const [proposalRes, evidenceRes, reviewsRes, decisionsRes, readinessRes] = await Promise.all([
          serviceClient.from("evolution_proposals").select("*").eq("id", proposalId).eq("organization_id", organizationId).single(),
          serviceClient.from("evolution_proposal_evidence").select("*").eq("proposal_id", proposalId).eq("organization_id", organizationId),
          serviceClient.from("evolution_proposal_reviews").select("*").eq("proposal_id", proposalId).eq("organization_id", organizationId),
          serviceClient.from("evolution_proposal_decisions").select("*").eq("proposal_id", proposalId).eq("organization_id", organizationId),
          serviceClient.from("evolution_proposal_rollout_readiness").select("*").eq("proposal_id", proposalId).eq("organization_id", organizationId),
        ]);
        if (proposalRes.error) throw proposalRes.error;

        return jsonResponse({
          proposal: proposalRes.data,
          evidence: evidenceRes.data || [],
          reviews: reviewsRes.data || [],
          decisions: decisionsRes.data || [],
          readiness: readinessRes.data || [],
        });
      }

      case "create_proposal": {
        const buildResult = buildProposal({
          organization_id: organizationId,
          proposal_type: params.proposal_type || "operational_fix",
          target_layer: params.target_layer || "execution",
          target_scope: params.target_scope || "",
          problem_statement: params.problem_statement || "",
          triggering_signals: params.triggering_signals || [],
          justification_summary: params.justification_summary || "",
          expected_benefit: params.expected_benefit || "",
          complexity_cost: params.complexity_cost || 0,
          reversibility_posture: params.reversibility_posture || "fully_reversible",
          boundedness_posture: params.boundedness_posture || "strictly_bounded",
          proposed_by: user.email || user.id,
        });

        if (!buildResult.valid) return errorResponse(buildResult.errors.join("; "), 400);

        const { data, error } = await serviceClient
          .from("evolution_proposals")
          .insert(buildResult.proposal)
          .select()
          .single();
        if (error) throw error;

        return jsonResponse({ proposal: data });
      }

      case "evaluate_legitimacy": {
        const { proposalId } = params;
        if (!proposalId) return errorResponse("proposalId required", 400);

        const { data: proposal } = await serviceClient.from("evolution_proposals").select("*").eq("id", proposalId).single();
        if (!proposal) return errorResponse("Proposal not found", 404);

        const { count: evidenceCount } = await serviceClient.from("evolution_proposal_evidence").select("*", { count: "exact", head: true }).eq("proposal_id", proposalId);

        const result = scoreLegitimacy({
          proposal_type: proposal.proposal_type,
          target_layer: proposal.target_layer,
          complexity_cost: Number(proposal.complexity_cost),
          reversibility_posture: proposal.reversibility_posture,
          boundedness_posture: proposal.boundedness_posture,
          kernel_touch_risk: Number(proposal.kernel_touch_risk),
          evidence_count: evidenceCount || 0,
          recurrence_signals: (proposal.triggering_signals as any[])?.length || 0,
          has_precedent: false,
          mission_alignment_score: Number(proposal.mission_alignment_score),
        });

        // Update scores on proposal
        await serviceClient.from("evolution_proposals").update({
          legitimacy_score: result.score,
          updated_at: new Date().toISOString(),
        }).eq("id", proposalId);

        return jsonResponse({ legitimacy: result });
      }

      case "evaluate_readiness": {
        const { proposalId } = params;
        if (!proposalId) return errorResponse("proposalId required", 400);

        const { data: proposal } = await serviceClient.from("evolution_proposals").select("*").eq("id", proposalId).single();
        if (!proposal) return errorResponse("Proposal not found", 404);

        const [evidenceRes, reviewsRes, decisionsRes] = await Promise.all([
          serviceClient.from("evolution_proposal_evidence").select("*", { count: "exact", head: true }).eq("proposal_id", proposalId),
          serviceClient.from("evolution_proposal_reviews").select("*").eq("proposal_id", proposalId),
          serviceClient.from("evolution_proposal_decisions").select("*").eq("proposal_id", proposalId),
        ]);

        const hasApproval = (decisionsRes.data || []).some((d: any) => d.decision === "approved");

        const result = analyzeReadiness({
          legitimacy_score: Number(proposal.legitimacy_score),
          boundedness_score: proposal.boundedness_posture === "strictly_bounded" ? 90 : proposal.boundedness_posture === "loosely_bounded" ? 50 : 20,
          reversibility_score: proposal.reversibility_posture === "fully_reversible" ? 90 : proposal.reversibility_posture === "partially_reversible" ? 50 : 20,
          has_evidence: (evidenceRes.count || 0) > 0,
          has_review: (reviewsRes.data || []).length > 0,
          has_approval: hasApproval,
          has_rollback_plan: proposal.reversibility_posture !== "irreversible",
          kernel_touch_risk: Number(proposal.kernel_touch_risk),
          mission_alignment_score: Number(proposal.mission_alignment_score),
          status: proposal.status,
        });

        // Upsert readiness
        await serviceClient.from("evolution_proposal_rollout_readiness").upsert({
          organization_id: organizationId,
          proposal_id: proposalId,
          readiness_score: result.readiness_score,
          readiness_level: result.readiness_level,
          blockers: JSON.stringify(result.blockers),
          prerequisites_met: result.prerequisites_met,
          rollback_plan_exists: proposal.reversibility_posture !== "irreversible",
          updated_at: new Date().toISOString(),
        }, { onConflict: "proposal_id" }).select();

        return jsonResponse({ readiness: result });
      }

      case "submit_review": {
        const { proposalId, review_status, review_notes, reason_codes } = params;
        if (!proposalId) return errorResponse("proposalId required", 400);

        const { data, error } = await serviceClient.from("evolution_proposal_reviews").insert({
          organization_id: organizationId,
          proposal_id: proposalId,
          reviewer_ref: { user_id: user.id, email: user.email },
          review_status: review_status || "pending",
          review_notes: review_notes || null,
          review_reason_codes: reason_codes || null,
        }).select().single();
        if (error) throw error;

        return jsonResponse({ review: data });
      }

      case "transition_status": {
        const { proposalId, target_status, notes } = params;
        if (!proposalId || !target_status) return errorResponse("proposalId and target_status required", 400);

        const { data: proposal } = await serviceClient.from("evolution_proposals").select("status").eq("id", proposalId).single();
        if (!proposal) return errorResponse("Proposal not found", 404);

        const transition = validateProposalTransition({
          current_status: proposal.status,
          target_status,
          reviewer_id: user.id,
          notes,
        });

        if (!transition.allowed) return errorResponse(transition.rejection_reason || "Transition not allowed", 400);

        const updateFields: any = { status: transition.new_status, updated_at: new Date().toISOString() };
        if (target_status === "approved") updateFields.approved_by = user.email || user.id;
        if (target_status === "under_review" || target_status === "rejected") updateFields.reviewed_by = user.email || user.id;
        if (notes) updateFields.decision_notes = notes;

        const { error } = await serviceClient.from("evolution_proposals").update(updateFields).eq("id", proposalId);
        if (error) throw error;

        // Record decision for approve/reject
        if (target_status === "approved" || target_status === "rejected") {
          await serviceClient.from("evolution_proposal_decisions").insert({
            organization_id: organizationId,
            proposal_id: proposalId,
            decision: target_status,
            decision_rationale: notes || null,
            decided_by: user.email || user.id,
          });
        }

        return jsonResponse({ status: transition.new_status, available_transitions: getAvailableTransitions(transition.new_status) });
      }

      case "explain_proposal": {
        const { proposalId } = params;
        if (!proposalId) return errorResponse("proposalId required", 400);

        const { data: proposal } = await serviceClient.from("evolution_proposals").select("*").eq("id", proposalId).single();
        if (!proposal) return errorResponse("Proposal not found", 404);

        const { count: evidenceCount } = await serviceClient.from("evolution_proposal_evidence").select("*", { count: "exact", head: true }).eq("proposal_id", proposalId);

        const legitimacy = scoreLegitimacy({
          proposal_type: proposal.proposal_type,
          target_layer: proposal.target_layer,
          complexity_cost: Number(proposal.complexity_cost),
          reversibility_posture: proposal.reversibility_posture,
          boundedness_posture: proposal.boundedness_posture,
          kernel_touch_risk: Number(proposal.kernel_touch_risk),
          evidence_count: evidenceCount || 0,
          recurrence_signals: (proposal.triggering_signals as any[])?.length || 0,
          has_precedent: false,
          mission_alignment_score: Number(proposal.mission_alignment_score),
        });

        const explanation = explainProposal({
          proposal_type: proposal.proposal_type,
          target_layer: proposal.target_layer,
          target_scope: proposal.target_scope,
          status: proposal.status,
          legitimacy_score: legitimacy.score,
          legitimacy_classification: legitimacy.classification,
          kernel_touch_risk: Number(proposal.kernel_touch_risk),
          reversibility_posture: proposal.reversibility_posture,
          boundedness_posture: proposal.boundedness_posture,
          mission_alignment_score: Number(proposal.mission_alignment_score),
          evidence_count: evidenceCount || 0,
          warnings: legitimacy.warnings,
          blockers: [],
        });

        return jsonResponse({ explanation, legitimacy });
      }

      case "classify_signals": {
        const { signals } = params;
        if (!signals || !Array.isArray(signals)) return errorResponse("signals array required", 400);
        const result = classifyProblem(signals);
        return jsonResponse({ classification: result });
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (err) {
    console.error("evolution-proposal-governance error:", err);
    return errorResponse(err.message || "Internal error", 500);
  }
});
