import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticate } from "../_shared/auth.ts";
import { DEFAULT_DELIVERY_MODEL, getDeliveryStateLabel } from "../_shared/one-click-delivery-deploy-assurance/delivery-orchestration-model-manager.ts";
import { evaluateDeliveryReadiness } from "../_shared/one-click-delivery-deploy-assurance/delivery-readiness-evaluator.ts";
import { computeDeployAssurance } from "../_shared/one-click-delivery-deploy-assurance/deploy-assurance-engine.ts";
import { computeDeliveryOutputVisibility } from "../_shared/one-click-delivery-deploy-assurance/delivery-output-visibility-engine.ts";
import { computeRecoveryPosture } from "../_shared/one-click-delivery-deploy-assurance/deploy-recovery-orchestrator.ts";
import { evaluateHandoffAssurance } from "../_shared/one-click-delivery-deploy-assurance/handoff-assurance-analyzer.ts";
import { detectDeliveryFriction } from "../_shared/one-click-delivery-deploy-assurance/delivery-friction-detector.ts";
import { getRecentDeliveryOutcomes } from "../_shared/one-click-delivery-deploy-assurance/delivery-assurance-outcome-validator.ts";
import { explainDeliveryPosture } from "../_shared/one-click-delivery-deploy-assurance/one-click-delivery-explainer.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authResult = await authenticate(req);
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient } = authResult;

    const { action, organization_id, initiative_id } = await req.json();
    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    switch (action) {
      case "overview": {
        const { data: initiatives } = await serviceClient
          .from("initiatives")
          .select("id, title, stage_status, build_status, deploy_url, repo_url")
          .eq("organization_id", organization_id)
          .limit(50);

        const overview = (initiatives ?? []).map((init: any) => {
          const readiness = evaluateDeliveryReadiness(init, 0, init.stage_status === "ready_to_publish" || init.stage_status === "published");
          return {
            initiative_id: init.id,
            title: init.title,
            stage_status: init.stage_status,
            readiness_score: readiness.deploy_readiness_score,
            is_ready: readiness.is_ready,
            blocker_count: readiness.blockers.length,
            deploy_url: init.deploy_url,
          };
        });

        return json({ overview });
      }

      case "define_delivery_models": {
        return json({ models: [DEFAULT_DELIVERY_MODEL] });
      }

      case "assess_delivery_readiness": {
        if (!initiative_id) return json({ error: "initiative_id required" });

        const { data: init } = await serviceClient
          .from("initiatives")
          .select("id, stage_status, build_status, deploy_url, repo_url")
          .eq("id", initiative_id)
          .maybeSingle();

        if (!init) return json({ error: "Initiative not found" });

        const readiness = evaluateDeliveryReadiness(init, 0, init.stage_status === "ready_to_publish" || init.stage_status === "published" || init.stage_status === "deployed");
        const recovery = computeRecoveryPosture(init.stage_status ?? "draft", !!init.deploy_url, !!init.repo_url, init.build_status === "failed");
        const assurance = computeDeployAssurance(readiness, !!init.deploy_url, !!init.repo_url, !!init.deploy_url, recovery.rollback_available);

        return json({ readiness, assurance, recovery });
      }

      case "evaluate_output_visibility": {
        if (!initiative_id) return json({ error: "initiative_id required" });

        const { data: init } = await serviceClient
          .from("initiatives")
          .select("id, stage_status, deploy_url, repo_url")
          .eq("id", initiative_id)
          .maybeSingle();

        if (!init) return json({ error: "Initiative not found" });

        return json({ outputs: computeDeliveryOutputVisibility(init) });
      }

      case "evaluate_recovery_posture": {
        if (!initiative_id) return json({ error: "initiative_id required" });

        const { data: init } = await serviceClient
          .from("initiatives")
          .select("id, stage_status, build_status, deploy_url, repo_url")
          .eq("id", initiative_id)
          .maybeSingle();

        if (!init) return json({ error: "Initiative not found" });

        const recovery = computeRecoveryPosture(init.stage_status ?? "draft", !!init.deploy_url, !!init.repo_url, init.build_status === "failed");
        return json({ recovery });
      }

      case "delivery_assurance_outcomes": {
        const outcomes = await getRecentDeliveryOutcomes(serviceClient, organization_id);
        return json({ outcomes });
      }

      case "explain": {
        if (!initiative_id) return json({ error: "initiative_id required" });

        const { data: init } = await serviceClient
          .from("initiatives")
          .select("id, stage_status, build_status, deploy_url, repo_url")
          .eq("id", initiative_id)
          .maybeSingle();

        if (!init) return json({ error: "Initiative not found" });

        const explanation = explainDeliveryPosture(init, 0, init.stage_status === "ready_to_publish" || init.stage_status === "published" || init.stage_status === "deployed");
        return json({ explanation });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
