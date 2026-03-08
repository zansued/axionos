import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { mapInternalStageToVisible, calculateJourneyProgress, getDefaultJourneyModel } from "../_shared/user-journey-orchestration/user-journey-model-manager.ts";
import { computeJourneyInstanceState } from "../_shared/user-journey-orchestration/user-journey-instance-orchestrator.ts";
import { evaluateTransition, getBlockedTransitions } from "../_shared/user-journey-orchestration/journey-transition-engine.ts";
import { getApprovalGateForStage, isApprovalRequired } from "../_shared/user-journey-orchestration/journey-approval-gate-manager.ts";
import { getVisibleArtifactsForStage, computeArtifactCoverageScore } from "../_shared/user-journey-orchestration/journey-artifact-visibility-engine.ts";
import { recommendNextStep } from "../_shared/user-journey-orchestration/journey-next-step-recommender.ts";
import { computeDeploymentVisibility } from "../_shared/user-journey-orchestration/deployment-visibility-orchestrator.ts";
import { analyzeFriction, computeOverallFrictionScore } from "../_shared/user-journey-orchestration/journey-friction-analyzer.ts";
import { explainJourney } from "../_shared/user-journey-orchestration/user-journey-explainer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { action, organization_id, initiative_id } = await req.json();

    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let result: any;

    switch (action) {
      case "overview": {
        const { data: instances } = await supabase
          .from("user_journey_instances")
          .select("*")
          .eq("organization_id", organization_id)
          .order("updated_at", { ascending: false })
          .limit(50);

        const { data: outcomes } = await supabase
          .from("user_journey_outcomes")
          .select("*")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false })
          .limit(20);

        const stageDistribution: Record<string, number> = {};
        (instances || []).forEach((i: any) => {
          stageDistribution[i.current_visible_stage] = (stageDistribution[i.current_visible_stage] || 0) + 1;
        });

        const avgProgress = instances && instances.length > 0
          ? instances.reduce((s: number, i: any) => s + Number(i.journey_progress_score || 0), 0) / instances.length
          : 0;

        result = {
          total_instances: instances?.length || 0,
          stage_distribution: stageDistribution,
          average_progress: Math.round(avgProgress * 100) / 100,
          recent_outcomes: outcomes || [],
          instances: instances || [],
        };
        break;
      }

      case "define_journey_models": {
        const model = getDefaultJourneyModel(organization_id);
        const { data, error } = await supabase
          .from("user_journey_models")
          .upsert({
            organization_id,
            journey_model_name: model.journey_model_name,
            journey_model_version: model.journey_model_version,
            stage_definitions: model.stage_definitions,
            transition_rules: model.transition_rules,
            approval_gate_definitions: model.approval_gate_definitions,
            artifact_visibility_rules: model.artifact_visibility_rules,
            status: 'active',
          }, { onConflict: 'id' })
          .select()
          .single();

        result = { model: data, error: error?.message };
        break;
      }

      case "sync_journey_instances": {
        const { data: initiatives } = await supabase
          .from("initiatives")
          .select("id, title, stage_status, deploy_url, repo_url, build_status")
          .eq("organization_id", organization_id);

        const syncedInstances = [];
        for (const init of (initiatives || [])) {
          const { data: outputs } = await supabase
            .from("agent_outputs")
            .select("id")
            .eq("initiative_id", init.id)
            .limit(100);

          const artifactCount = outputs?.length || 0;
          const approvalReq = isApprovalRequired(mapInternalStageToVisible(init.stage_status || 'draft'));
          const state = computeJourneyInstanceState(init, artifactCount, approvalReq ? 1 : 0);

          const { data: existing } = await supabase
            .from("user_journey_instances")
            .select("id")
            .eq("organization_id", organization_id)
            .eq("initiative_id", init.id)
            .maybeSingle();

          if (existing) {
            await supabase.from("user_journey_instances").update({
              current_visible_stage: state.current_visible_stage,
              current_internal_stage: state.current_internal_stage,
              journey_progress_score: state.journey_progress_score,
              clarity_score: state.clarity_score,
              next_action_type: state.next_action_type,
              next_action_label: state.next_action_label,
              approval_required: state.approval_required,
              approval_state: state.approval_state,
              visible_artifact_count: state.visible_artifact_count,
              deployment_visibility_score: state.deployment_visibility_score,
              handoff_readiness_score: state.handoff_readiness_score,
              orchestration_health_score: state.orchestration_health_score,
              journey_friction_score: state.journey_friction_score,
              updated_at: new Date().toISOString(),
            }).eq("id", existing.id);
          } else {
            await supabase.from("user_journey_instances").insert({
              organization_id,
              initiative_id: init.id,
              current_visible_stage: state.current_visible_stage,
              current_internal_stage: state.current_internal_stage,
              journey_progress_score: state.journey_progress_score,
              clarity_score: state.clarity_score,
              next_action_type: state.next_action_type,
              next_action_label: state.next_action_label,
              approval_required: state.approval_required,
              approval_state: state.approval_state,
              visible_artifact_count: state.visible_artifact_count,
              deployment_visibility_score: state.deployment_visibility_score,
              handoff_readiness_score: state.handoff_readiness_score,
              orchestration_health_score: state.orchestration_health_score,
              journey_friction_score: state.journey_friction_score,
            });
          }
          syncedInstances.push(state);
        }

        result = { synced: syncedInstances.length, instances: syncedInstances };
        break;
      }

      case "evaluate_transitions": {
        if (!initiative_id) {
          result = { error: "initiative_id required" };
          break;
        }
        const { data: instance } = await supabase
          .from("user_journey_instances")
          .select("*")
          .eq("initiative_id", initiative_id)
          .eq("organization_id", organization_id)
          .maybeSingle();

        if (!instance) {
          result = { error: "No journey instance found" };
          break;
        }

        const blocked = getBlockedTransitions(instance.current_visible_stage, instance.approval_state, instance.approval_required);
        result = { current_stage: instance.current_visible_stage, blocked_transitions: blocked };
        break;
      }

      case "evaluate_approval_states": {
        const { data: approvals } = await supabase
          .from("user_journey_approval_states")
          .select("*")
          .eq("organization_id", organization_id)
          .eq("approval_status", "pending")
          .order("created_at", { ascending: false });

        result = { pending_approvals: approvals || [] };
        break;
      }

      case "evaluate_artifact_visibility": {
        if (!initiative_id) {
          result = { error: "initiative_id required" };
          break;
        }
        const { data: instance } = await supabase
          .from("user_journey_instances")
          .select("current_visible_stage")
          .eq("initiative_id", initiative_id)
          .eq("organization_id", organization_id)
          .maybeSingle();

        const stage = instance?.current_visible_stage || 'idea';
        const artifacts = getVisibleArtifactsForStage(stage);
        result = { stage, visible_artifacts: artifacts };
        break;
      }

      case "journey_outcomes": {
        const { data: outcomes } = await supabase
          .from("user_journey_outcomes")
          .select("*")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false })
          .limit(30);

        result = { outcomes: outcomes || [] };
        break;
      }

      case "explain": {
        if (!initiative_id) {
          result = { error: "initiative_id required" };
          break;
        }
        const { data: instance } = await supabase
          .from("user_journey_instances")
          .select("*")
          .eq("initiative_id", initiative_id)
          .eq("organization_id", organization_id)
          .maybeSingle();

        if (!instance) {
          result = { error: "No journey instance found" };
          break;
        }

        const { data: init } = await supabase
          .from("initiatives")
          .select("deploy_url, repo_url, build_status, stage_status")
          .eq("id", initiative_id)
          .maybeSingle();

        const deployVis = init ? computeDeploymentVisibility(init) : null;
        const blockedCount = getBlockedTransitions(instance.current_visible_stage, instance.approval_state, instance.approval_required).length;

        const frictionSignals = analyzeFriction(
          instance.current_visible_stage,
          instance.approval_required,
          instance.approval_state,
          instance.visible_artifact_count,
          blockedCount,
          instance.next_action_label,
        );

        const stateForExplain = {
          initiative_id,
          current_visible_stage: instance.current_visible_stage,
          current_internal_stage: instance.current_internal_stage,
          journey_progress_score: Number(instance.journey_progress_score),
          clarity_score: Number(instance.clarity_score),
          next_action_type: instance.next_action_type,
          next_action_label: instance.next_action_label,
          approval_required: instance.approval_required,
          approval_state: instance.approval_state,
          visible_artifact_count: instance.visible_artifact_count,
          deployment_visibility_score: Number(instance.deployment_visibility_score),
          handoff_readiness_score: Number(instance.handoff_readiness_score),
          orchestration_health_score: Number(instance.orchestration_health_score),
          journey_friction_score: Number(instance.journey_friction_score),
        };

        const explanation = explainJourney(stateForExplain, frictionSignals, deployVis);
        result = { explanation, friction_signals: frictionSignals, deployment: deployVis };
        break;
      }

      default:
        result = { error: `Unknown action: ${action}` };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
