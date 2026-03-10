import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, errorResponse, handleCors } from "../_shared/cors.ts";
import { authenticate } from "../_shared/auth.ts";
import { classifyMutation } from "../_shared/reflexive-governance/architectural-mutation-classifier.ts";
import { estimateBlastRadius } from "../_shared/reflexive-governance/mutation-blast-radius-estimator.ts";
import { analyzeCoupling } from "../_shared/reflexive-governance/mutation-coupling-analyzer.ts";
import { evaluateMutationReversibility } from "../_shared/reflexive-governance/mutation-reversibility-engine.ts";
import { evaluateMutationLegitimacy } from "../_shared/reflexive-governance/mutation-legitimacy-evaluator.ts";
import { checkForbiddenFamilies } from "../_shared/reflexive-governance/forbidden-mutation-family-guard.ts";
import { scoreDriftRisk } from "../_shared/reflexive-governance/mutation-drift-risk-scorer.ts";
import { explainMutationCase } from "../_shared/reflexive-governance/mutation-control-explainer.ts";
import { buildLineageEvent, MUTATION_LINEAGE_EVENTS } from "../_shared/reflexive-governance/mutation-lineage-writer.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await authenticate(req);
    if (auth instanceof Response) return auth;
    const { user, serviceClient } = auth;

    const { action, organizationId, ...params } = await req.json();
    if (!organizationId) return errorResponse("organizationId required", 400);

    const { data: membership } = await serviceClient
      .from("organization_members").select("role")
      .eq("organization_id", organizationId).eq("user_id", user.id).single();
    if (!membership) return errorResponse("Not a member of this organization", 403);

    const actor = user.email || user.id;

    switch (action) {
      case "list_cases": {
        const { data, error } = await serviceClient
          .from("architectural_mutation_cases").select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false }).limit(100);
        if (error) throw error;
        return jsonResponse({ cases: data });
      }

      case "get_case": {
        const { caseId } = params;
        if (!caseId) return errorResponse("caseId required", 400);
        const [caseRes, risksRes, depsRes, revRes, decisionsRes, lineageRes] = await Promise.all([
          serviceClient.from("architectural_mutation_cases").select("*").eq("id", caseId).eq("organization_id", organizationId).single(),
          serviceClient.from("architectural_mutation_risk_factors").select("*").eq("mutation_case_id", caseId),
          serviceClient.from("architectural_mutation_dependency_maps").select("*").eq("mutation_case_id", caseId),
          serviceClient.from("architectural_mutation_reversibility_checks").select("*").eq("mutation_case_id", caseId),
          serviceClient.from("architectural_mutation_decisions").select("*").eq("mutation_case_id", caseId),
          serviceClient.from("architectural_mutation_lineage").select("*").eq("mutation_case_id", caseId).order("created_at", { ascending: true }),
        ]);
        if (caseRes.error) throw caseRes.error;
        return jsonResponse({
          mutation_case: caseRes.data,
          risk_factors: risksRes.data || [],
          dependency_map: depsRes.data || [],
          reversibility_checks: revRes.data || [],
          decisions: decisionsRes.data || [],
          lineage: lineageRes.data || [],
        });
      }

      case "create_mutation_case": {
        const classification = classifyMutation({
          affected_layers: params.affected_layers || [],
          changes_topology: params.changes_topology || false,
          changes_governance: params.changes_governance || false,
          changes_contracts: params.changes_contracts || false,
          changes_boundaries: params.changes_boundaries || false,
          estimated_components_affected: params.estimated_components_affected || 0,
          estimated_tables_changed: params.estimated_tables_changed || 0,
        });

        const forbidden = checkForbiddenFamilies({
          affected_components: params.affected_components || [],
          affected_tables: params.affected_tables || [],
          mutation_description: params.description || "",
          changes_topology: params.changes_topology || false,
          changes_governance: params.changes_governance || false,
          changes_billing: params.changes_billing || false,
          changes_contracts: params.changes_contracts || false,
          changes_safety: params.changes_safety || false,
        });

        const initialStatus = forbidden.blocked ? "blocked" : "pending_analysis";

        const { data, error } = await serviceClient.from("architectural_mutation_cases").insert({
          organization_id: organizationId,
          evolution_proposal_id: params.evolution_proposal_id || null,
          mutation_type: classification.mutation_type,
          title: params.title || "",
          description: params.description || "",
          affected_layers: params.affected_layers || [],
          dependency_footprint: params.dependency_footprint || [],
          forbidden_family_flag: forbidden.blocked,
          forbidden_families_detected: forbidden.detected_families,
          topology_change_flag: params.changes_topology || false,
          approval_status: initialStatus,
          execution_block_reason: forbidden.blocked ? forbidden.recommendation : null,
          proposed_by: actor,
        }).select().single();
        if (error) throw error;

        // Record lineage
        await serviceClient.from("architectural_mutation_lineage").insert(
          buildLineageEvent(organizationId, data.id, MUTATION_LINEAGE_EVENTS.CASE_CREATED, actor,
            `Mutation case created. Type: ${classification.mutation_type}. ${forbidden.blocked ? "BLOCKED by forbidden family guard." : ""}`,
            { classification, forbidden })
        );

        return jsonResponse({ mutation_case: data, classification, forbidden });
      }

      case "analyze_blast_radius": {
        const { caseId } = params;
        if (!caseId) return errorResponse("caseId required", 400);
        const result = estimateBlastRadius({
          affected_layers: params.affected_layers || [],
          affected_modules: params.affected_modules || [],
          affected_stages: params.affected_stages || [],
          affected_tables: params.affected_tables || [],
          affected_edge_functions: params.affected_edge_functions || [],
          affects_tenant_isolation: params.affects_tenant_isolation || false,
          affects_review_surfaces: params.affects_review_surfaces || false,
          affects_runtime_flows: params.affects_runtime_flows || false,
        });
        await serviceClient.from("architectural_mutation_cases").update({
          blast_radius_score: result.score, updated_at: new Date().toISOString(),
        }).eq("id", caseId);
        await serviceClient.from("architectural_mutation_lineage").insert(
          buildLineageEvent(organizationId, caseId, MUTATION_LINEAGE_EVENTS.BLAST_RADIUS_ANALYZED, actor,
            `Blast radius: ${result.score}/100 (${result.level})`, { result })
        );
        return jsonResponse({ blast_radius: result });
      }

      case "analyze_coupling": {
        const { caseId } = params;
        if (!caseId) return errorResponse("caseId required", 400);
        const result = analyzeCoupling({
          new_dependencies: params.new_dependencies || [],
          existing_dependency_count: params.existing_dependency_count || 0,
          cross_layer_dependencies: params.cross_layer_dependencies || 0,
          circular_risk_pairs: params.circular_risk_pairs || [],
          shared_state_components: params.shared_state_components || [],
        });
        await serviceClient.from("architectural_mutation_cases").update({
          coupling_expansion_score: result.expansion_score, updated_at: new Date().toISOString(),
        }).eq("id", caseId);
        await serviceClient.from("architectural_mutation_lineage").insert(
          buildLineageEvent(organizationId, caseId, MUTATION_LINEAGE_EVENTS.COUPLING_ANALYZED, actor,
            `Coupling: ${result.expansion_score}/100 (${result.level})`, { result })
        );
        return jsonResponse({ coupling: result });
      }

      case "evaluate_reversibility": {
        const { caseId } = params;
        if (!caseId) return errorResponse("caseId required", 400);
        const result = evaluateMutationReversibility({
          changes_schema: params.changes_schema || false,
          changes_enums: params.changes_enums || false,
          changes_rls: params.changes_rls || false,
          changes_topology: params.changes_topology || false,
          changes_governance: params.changes_governance || false,
          changes_contracts: params.changes_contracts || false,
          data_migration_required: params.data_migration_required || false,
          affected_live_data_volume: params.affected_live_data_volume || "none",
          has_explicit_rollback_plan: params.has_explicit_rollback_plan || false,
          rollback_plan_tested: params.rollback_plan_tested || false,
          estimated_rollback_time_minutes: params.estimated_rollback_time_minutes || 0,
          rollback_data_loss_risk: params.rollback_data_loss_risk || false,
        });
        await serviceClient.from("architectural_mutation_cases").update({
          rollback_viability_score: result.viability_score, updated_at: new Date().toISOString(),
        }).eq("id", caseId);
        // Store checks
        for (const check of result.checks) {
          await serviceClient.from("architectural_mutation_reversibility_checks").insert({
            organization_id: organizationId,
            mutation_case_id: caseId,
            check_type: check.check,
            check_description: check.reason,
            passed: check.passed,
            barrier_reason: check.passed ? null : check.reason,
          });
        }
        await serviceClient.from("architectural_mutation_lineage").insert(
          buildLineageEvent(organizationId, caseId, MUTATION_LINEAGE_EVENTS.REVERSIBILITY_EVALUATED, actor,
            `Reversibility: ${result.viability_score}/100 (${result.posture})`, { result })
        );
        return jsonResponse({ reversibility: result });
      }

      case "score_legitimacy": {
        const { caseId } = params;
        if (!caseId) return errorResponse("caseId required", 400);
        const { data: mc } = await serviceClient.from("architectural_mutation_cases").select("*").eq("id", caseId).single();
        if (!mc) return errorResponse("Case not found", 404);

        const driftResult = scoreDriftRisk({
          mutation_type: mc.mutation_type,
          blast_radius_score: Number(mc.blast_radius_score),
          coupling_expansion_score: Number(mc.coupling_expansion_score),
          affected_layers: mc.affected_layers || [],
          introduces_new_pattern: params.introduces_new_pattern || false,
          deviates_from_canon: params.deviates_from_canon || false,
          has_precedent_in_system: params.has_precedent_in_system || false,
          complexity_delta: params.complexity_delta || 0,
        });

        const legResult = evaluateMutationLegitimacy({
          mutation_type: mc.mutation_type,
          blast_radius_score: Number(mc.blast_radius_score),
          coupling_expansion_score: Number(mc.coupling_expansion_score),
          rollback_viability_score: Number(mc.rollback_viability_score),
          drift_risk_score: driftResult.score,
          forbidden_family_flag: mc.forbidden_family_flag,
          topology_change_flag: mc.topology_change_flag,
          has_evolution_proposal: !!mc.evolution_proposal_id,
          evolution_proposal_approved: params.evolution_proposal_approved || false,
          evidence_count: params.evidence_count || 0,
          mission_alignment_score: params.mission_alignment_score || 0,
        });

        await serviceClient.from("architectural_mutation_cases").update({
          legitimacy_score: legResult.score,
          drift_risk_score: driftResult.score,
          approval_status: mc.forbidden_family_flag ? "blocked" : "analyzed",
          updated_at: new Date().toISOString(),
        }).eq("id", caseId);

        await serviceClient.from("architectural_mutation_lineage").insert(
          buildLineageEvent(organizationId, caseId, MUTATION_LINEAGE_EVENTS.LEGITIMACY_SCORED, actor,
            `Legitimacy: ${legResult.score}/100 (${legResult.level}). Drift: ${driftResult.score}/100 (${driftResult.level}).`,
            { legitimacy: legResult, drift: driftResult })
        );

        return jsonResponse({ legitimacy: legResult, drift_risk: driftResult });
      }

      case "transition_status": {
        const { caseId, target_status, notes } = params;
        if (!caseId || !target_status) return errorResponse("caseId and target_status required", 400);

        const VALID: Record<string, string[]> = {
          pending_analysis: ["analyzed", "blocked", "archived"],
          analyzed: ["under_review", "blocked", "archived"],
          under_review: ["approved", "rejected", "blocked", "archived"],
          approved: ["archived"],
          rejected: ["archived"],
          blocked: ["under_review", "archived"],
          archived: [],
        };

        const { data: mc } = await serviceClient.from("architectural_mutation_cases").select("approval_status").eq("id", caseId).single();
        if (!mc) return errorResponse("Case not found", 404);

        const allowed = VALID[mc.approval_status] || [];
        if (!allowed.includes(target_status)) return errorResponse(`Transition from '${mc.approval_status}' to '${target_status}' not allowed`, 400);

        const updateFields: any = { approval_status: target_status, updated_at: new Date().toISOString() };
        if (target_status === "approved") updateFields.approved_by = actor;
        if (target_status === "under_review" || target_status === "rejected") updateFields.reviewed_by = actor;
        if (notes) updateFields.operator_decision = notes;

        await serviceClient.from("architectural_mutation_cases").update(updateFields).eq("id", caseId);

        if (target_status === "approved" || target_status === "rejected") {
          await serviceClient.from("architectural_mutation_decisions").insert({
            organization_id: organizationId, mutation_case_id: caseId,
            decision: target_status, decision_rationale: notes || null, decided_by: actor,
            risk_accepted: target_status === "approved",
          });
        }

        await serviceClient.from("architectural_mutation_lineage").insert(
          buildLineageEvent(organizationId, caseId,
            target_status === "approved" ? MUTATION_LINEAGE_EVENTS.APPROVED
              : target_status === "rejected" ? MUTATION_LINEAGE_EVENTS.REJECTED
              : target_status === "blocked" ? MUTATION_LINEAGE_EVENTS.BLOCKED
              : MUTATION_LINEAGE_EVENTS.STATUS_TRANSITIONED,
            actor, `Status → ${target_status}. ${notes || ""}`, { target_status })
        );

        return jsonResponse({ status: target_status });
      }

      case "explain_case": {
        const { caseId } = params;
        if (!caseId) return errorResponse("caseId required", 400);
        const { data: mc } = await serviceClient.from("architectural_mutation_cases").select("*").eq("id", caseId).single();
        if (!mc) return errorResponse("Case not found", 404);

        const explanation = explainMutationCase({
          mutation_type: mc.mutation_type,
          title: mc.title,
          approval_status: mc.approval_status,
          blast_radius_score: Number(mc.blast_radius_score),
          blast_radius_level: Number(mc.blast_radius_score) >= 75 ? "critical" : Number(mc.blast_radius_score) >= 50 ? "wide" : Number(mc.blast_radius_score) >= 25 ? "moderate" : "contained",
          coupling_expansion_score: Number(mc.coupling_expansion_score),
          coupling_level: Number(mc.coupling_expansion_score) >= 70 ? "dangerous" : Number(mc.coupling_expansion_score) >= 45 ? "concerning" : "moderate",
          rollback_viability_score: Number(mc.rollback_viability_score),
          rollback_posture: Number(mc.rollback_viability_score) >= 70 ? "realistic" : Number(mc.rollback_viability_score) >= 45 ? "partial" : "theatrical",
          legitimacy_score: Number(mc.legitimacy_score),
          legitimacy_level: Number(mc.legitimacy_score) >= 70 ? "legitimate" : Number(mc.legitimacy_score) >= 45 ? "conditional" : "suspect",
          drift_risk_score: Number(mc.drift_risk_score),
          drift_risk_level: Number(mc.drift_risk_score) >= 60 ? "high" : Number(mc.drift_risk_score) >= 40 ? "moderate" : "low",
          forbidden_family_flag: mc.forbidden_family_flag,
          forbidden_families: mc.forbidden_families_detected || [],
          topology_change_flag: mc.topology_change_flag,
          warnings: [],
        });

        await serviceClient.from("architectural_mutation_lineage").insert(
          buildLineageEvent(organizationId, caseId, MUTATION_LINEAGE_EVENTS.EXPLAINED, actor,
            `Explanation generated: ${explanation.governance_verdict}`, { explanation })
        );

        return jsonResponse({ explanation });
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (err) {
    console.error("architectural-mutation-control error:", err);
    return errorResponse(err.message || "Internal error", 500);
  }
});
