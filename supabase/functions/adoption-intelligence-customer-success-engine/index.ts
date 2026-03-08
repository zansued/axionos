import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { explainAdoptionPosture } from "../_shared/adoption-intelligence-customer-success/adoption-intelligence-explainer.ts";
import { getDefaultAdoptionModel, computeMilestoneCompletionScore } from "../_shared/adoption-intelligence-customer-success/adoption-intelligence-model-manager.ts";
import { computeSuccessSignals } from "../_shared/adoption-intelligence-customer-success/customer-success-signal-engine.ts";
import { detectFrictionClusters } from "../_shared/adoption-intelligence-customer-success/friction-cluster-detector.ts";
import { analyzeTemplateEffectiveness } from "../_shared/adoption-intelligence-customer-success/template-and-starter-effectiveness-analyzer.ts";
import { correlateDeliveryAdoption } from "../_shared/adoption-intelligence-customer-success/delivery-adoption-correlator.ts";
import { computeInterventionPriorities } from "../_shared/adoption-intelligence-customer-success/intervention-priority-engine.ts";
import { getRecentAdoptionOutcomes } from "../_shared/adoption-intelligence-customer-success/adoption-outcome-validator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, organization_id, initiative_id } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, serviceKey);

    if (action === "overview") {
      // Fetch initiatives for org to compute aggregate adoption posture
      const { data: initiatives } = await client
        .from("initiatives")
        .select("id, stage_status, build_status, deploy_url, repo_url")
        .eq("organization_id", organization_id)
        .limit(50);

      const overview = (initiatives ?? []).map((init: any) => {
        const deployed = !!init.deploy_url;
        const stageStatus = init.stage_status ?? "draft";
        const model = getDefaultAdoptionModel();
        const completedMilestones: string[] = [];
        if (stageStatus !== "draft") completedMilestones.push("idea_created");
        if (["discovering", "discovered"].some(s => stageStatus.includes(s) || stageStatus > s)) completedMilestones.push("discovery_started");
        if (deployed) { completedMilestones.push("deploy_succeeded"); completedMilestones.push("engineering_completed"); completedMilestones.push("validation_passed"); }

        const milestoneScore = computeMilestoneCompletionScore(completedMilestones, model.milestones);
        const success = computeSuccessSignals(milestoneScore, deployed, false, 0, 0);

        return {
          initiative_id: init.id,
          stage_status: stageStatus,
          milestone_completion_score: milestoneScore,
          adoption_score: success.adoption_score,
          success_signal_score: success.success_signal_score,
          signal_label: success.signal_label,
        };
      });

      return new Response(JSON.stringify({ overview }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "evaluate_success_signals") {
      const { data: init } = await client.from("initiatives").select("*").eq("id", initiative_id).single();
      if (!init) return new Response(JSON.stringify({ error: "Initiative not found" }), { status: 404, headers: corsHeaders });

      const deployed = !!init.deploy_url;
      const success = computeSuccessSignals(0.5, deployed, false, 0, 0);
      return new Response(JSON.stringify({ success_signals: success }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "detect_friction_clusters") {
      const friction = detectFrictionClusters([], 0, false, 0);
      return new Response(JSON.stringify({ friction }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "evaluate_template_effectiveness") {
      const templates = analyzeTemplateEffectiveness(true, false, 0.5, false, 0.2);
      return new Response(JSON.stringify({ templates }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "recommend_success_actions") {
      const interventions = computeInterventionPriorities(0.3, 0.2, [], false, 0.5);
      return new Response(JSON.stringify({ interventions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "adoption_outcomes") {
      const outcomes = await getRecentAdoptionOutcomes(client, organization_id);
      return new Response(JSON.stringify({ outcomes }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "explain") {
      const { data: init } = await client.from("initiatives").select("*").eq("id", initiative_id).single();
      if (!init) return new Response(JSON.stringify({ error: "Initiative not found" }), { status: 404, headers: corsHeaders });

      const explanation = explainAdoptionPosture(
        init.stage_status ?? "draft",
        [], [], !!init.deploy_url, !!init.deploy_url, !!init.deploy_url,
        false, false, false, false, 0, 0,
      );
      return new Response(JSON.stringify({ explanation }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
