import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";
import { computeRiskScore, computeRiskBand } from "../_shared/predictive/predictive-risk-engine.ts";
import { evaluateCheckpoint, resolveCheckpointType } from "../_shared/predictive/predictive-checkpoint-runner.ts";
import { classifyActions } from "../_shared/predictive/preventive-action-engine.ts";
import { classifyOutcome, computeQualityMetrics } from "../_shared/predictive/predictive-outcome-tracker.ts";

/**
 * predictive-error-runtime — Sprint 25
 *
 * POST { action, organization_id, ...params }
 *
 * Actions:
 *   predictive_error_overview     — Risk assessment summary
 *   predictive_risk_assessments   — List assessments
 *   predictive_runtime_checkpoints — List checkpoints
 *   predictive_preventive_actions — List actions
 *   predictive_prediction_quality — Quality metrics
 *   predictive_explain            — Explain a specific assessment
 *   run_predictive_assessment     — Score risk for context
 *   apply_preventive_action       — Mark action as applied
 *   mark_prediction_outcome       — Record actual outcome
 */

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await authenticate(req);
    if (auth instanceof Response) return auth;
    const { serviceClient: sc } = auth as AuthContext;

    const body = await req.json();
    const { action, organization_id } = body;

    if (!organization_id) return errorResponse("organization_id required", 400);

    // ─── OVERVIEW ───
    if (action === "predictive_error_overview") {
      const [assessmentsRes, actionsRes] = await Promise.all([
        sc.from("predictive_risk_assessments").select("risk_band").eq("organization_id", organization_id),
        sc.from("predictive_preventive_actions").select("applied, outcome_status").eq("organization_id", organization_id),
      ]);
      const assessments = assessmentsRes.data || [];
      const actions = actionsRes.data || [];
      const byBand: Record<string, number> = {};
      for (const a of assessments) { byBand[a.risk_band] = (byBand[a.risk_band] || 0) + 1; }
      return jsonResponse({
        total_assessments: assessments.length,
        by_risk_band: byBand,
        total_actions: actions.length,
        applied_actions: actions.filter((a: any) => a.applied).length,
        helpful_actions: actions.filter((a: any) => a.outcome_status === "helpful").length,
      });
    }

    // ─── LIST ASSESSMENTS ───
    if (action === "predictive_risk_assessments") {
      let q = sc.from("predictive_risk_assessments").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50);
      if (body.stage_key) q = q.eq("stage_key", body.stage_key);
      if (body.risk_band) q = q.eq("risk_band", body.risk_band);
      const { data } = await q;
      return jsonResponse({ assessments: data || [] });
    }

    // ─── LIST CHECKPOINTS ───
    if (action === "predictive_runtime_checkpoints") {
      const { data } = await sc.from("predictive_runtime_checkpoints").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50);
      return jsonResponse({ checkpoints: data || [] });
    }

    // ─── LIST ACTIONS ───
    if (action === "predictive_preventive_actions") {
      const { data } = await sc.from("predictive_preventive_actions").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50);
      return jsonResponse({ actions: data || [] });
    }

    // ─── PREDICTION QUALITY ───
    if (action === "predictive_prediction_quality") {
      const { data } = await sc.from("predictive_preventive_actions").select("outcome_status, applied").eq("organization_id", organization_id).limit(500);
      const outcomes = (data || []).map((d: any) => {
        if (d.outcome_status === "helpful") return "accurate";
        if (d.outcome_status === "harmful") return "harmful_friction";
        if (d.outcome_status === "neutral") return "helpful_inconclusive";
        return "accurate";
      });
      return jsonResponse(computeQualityMetrics(outcomes));
    }

    // ─── EXPLAIN ───
    if (action === "predictive_explain") {
      if (!body.assessment_id) return errorResponse("assessment_id required", 400);
      const { data } = await sc.from("predictive_risk_assessments").select("*").eq("id", body.assessment_id).single();
      if (!data) return errorResponse("Assessment not found", 404);
      const { data: actions } = await sc.from("predictive_preventive_actions").select("*").eq("risk_assessment_id", body.assessment_id);
      return jsonResponse({ assessment: data, actions: actions || [] });
    }

    // ─── RUN ASSESSMENT ───
    if (action === "run_predictive_assessment") {
      if (!body.stage_key) return errorResponse("stage_key required", 400);

      // Fetch patterns
      const { data: patterns } = await sc.from("error_patterns")
        .select("id, error_category, error_signature, frequency, success_rate, severity")
        .eq("organization_id", organization_id)
        .order("frequency", { ascending: false })
        .limit(20);

      const patternMatches = (patterns || []).map((p: any) => ({
        pattern_id: p.id, error_category: p.error_category, error_signature: p.error_signature,
        frequency: p.frequency, success_rate: p.success_rate, severity: p.severity, similarity: 0.7,
      }));

      const assessment = computeRiskScore(
        { stage_key: body.stage_key, agent_type: body.agent_type, model_provider: body.model_provider, model_name: body.model_name, context_signature: body.context_signature || "" },
        patternMatches,
        body.retry_count || 0,
        null,
      );

      const { data: saved } = await sc.from("predictive_risk_assessments").insert({
        organization_id,
        initiative_id: body.initiative_id || null,
        pipeline_job_id: body.pipeline_job_id || null,
        stage_key: body.stage_key,
        agent_type: body.agent_type || null,
        model_provider: body.model_provider || null,
        model_name: body.model_name || null,
        context_signature: body.context_signature || "",
        risk_score: assessment.risk_score,
        risk_band: assessment.risk_band,
        confidence_score: assessment.confidence_score,
        predicted_failure_types: assessment.predicted_failure_types,
        explanation_codes: assessment.explanation_codes,
        evidence_refs: assessment.evidence_refs,
        recommended_actions: assessment.recommended_actions,
        applied_action_mode: "none",
      }).select("id").single();

      // Create checkpoint
      if (saved && body.pipeline_job_id) {
        const cpType = resolveCheckpointType(body.stage_key, body.retry_count || 0);
        const cpResult = evaluateCheckpoint({
          stage_key: body.stage_key, checkpoint_type: cpType,
          risk_score: assessment.risk_score, risk_band: assessment.risk_band,
          confidence_score: assessment.confidence_score, has_blocking_actions: assessment.recommended_actions.length > 0,
        });
        await sc.from("predictive_runtime_checkpoints").insert({
          organization_id, pipeline_job_id: body.pipeline_job_id,
          stage_key: body.stage_key, checkpoint_type: cpType,
          risk_assessment_id: saved.id, checkpoint_decision: cpResult.decision,
        });
      }

      // Create preventive actions
      if (saved && assessment.recommended_actions.length > 0) {
        const classified = classifyActions(assessment.recommended_actions, assessment.risk_band);
        for (const ca of classified) {
          await sc.from("predictive_preventive_actions").insert({
            organization_id, risk_assessment_id: saved.id,
            stage_key: body.stage_key, action_type: ca.action_type,
            action_mode: ca.action_mode, applied: false, outcome_status: "pending",
          });
        }
      }

      return jsonResponse({ assessment_id: saved?.id, ...assessment });
    }

    // ─── APPLY ACTION ───
    if (action === "apply_preventive_action") {
      if (!body.action_id) return errorResponse("action_id required", 400);
      await sc.from("predictive_preventive_actions").update({ applied: true }).eq("id", body.action_id).eq("organization_id", organization_id);
      return jsonResponse({ applied: true });
    }

    // ─── MARK OUTCOME ───
    if (action === "mark_prediction_outcome") {
      if (!body.action_id || !body.outcome_status) return errorResponse("action_id and outcome_status required", 400);
      await sc.from("predictive_preventive_actions").update({ outcome_status: body.outcome_status }).eq("id", body.action_id).eq("organization_id", organization_id);
      return jsonResponse({ updated: true });
    }

    return errorResponse("Invalid action", 400);
  } catch (e) {
    console.error("predictive-error-runtime error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
