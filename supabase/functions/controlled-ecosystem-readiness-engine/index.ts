import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: corsHeaders });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    const { action, organization_id, params } = body;

    if (!organization_id) return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: corsHeaders });

    let result: unknown;

    switch (action) {
      case "overview": {
        const [{ data: inventory }, { data: assessments }, { data: prerequisites }, { data: trustModels }, { data: policies }, { data: outcomes }] = await Promise.all([
          supabase.from("ecosystem_capability_inventory").select("*").eq("organization_id", organization_id).limit(100),
          supabase.from("ecosystem_exposure_readiness_assessments").select("*").eq("organization_id", organization_id).limit(100),
          supabase.from("ecosystem_safety_prerequisites").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("ecosystem_trust_model_candidates").select("*").eq("organization_id", organization_id).limit(50),
          supabase.from("ecosystem_exposure_policies").select("*").eq("organization_id", organization_id).limit(50),
          supabase.from("ecosystem_readiness_outcomes").select("*").eq("organization_id", organization_id).limit(100),
        ]);

        const inv = inventory || [];
        const prereqs = prerequisites || [];
        const metPrereqs = prereqs.filter((p: any) => p.is_met);

        result = {
          total_capabilities: inv.length,
          candidate_count: inv.filter((c: any) => c.exposure_candidate_status === "candidate").length,
          restricted_count: inv.filter((c: any) => c.exposure_candidate_status === "restricted").length,
          internal_only_count: inv.filter((c: any) => c.exposure_candidate_status === "internal_only").length,
          never_expose_count: inv.filter((c: any) => c.exposure_candidate_status === "never_expose").length,
          assessment_count: (assessments || []).length,
          prerequisite_total: prereqs.length,
          prerequisite_met: metPrereqs.length,
          prerequisite_unmet: prereqs.length - metPrereqs.length,
          trust_model_count: (trustModels || []).length,
          policy_count: (policies || []).length,
          outcome_count: (outcomes || []).length,
          ecosystem_activation_status: "frozen",
          advisory_mode: "readiness_only",
        };
        break;
      }

      case "build_inventory": {
        const { data: inventory } = await supabase.from("ecosystem_capability_inventory").select("*").eq("organization_id", organization_id);
        result = { capabilities: inventory || [], total: (inventory || []).length };
        break;
      }

      case "classify_capabilities": {
        const { data: inventory } = await supabase.from("ecosystem_capability_inventory").select("*").eq("organization_id", organization_id);
        const classified = (inventory || []).reduce((acc: Record<string, number>, c: any) => {
          acc[c.exposure_candidate_status] = (acc[c.exposure_candidate_status] || 0) + 1;
          return acc;
        }, {});
        result = { classification_distribution: classified, capabilities: inventory || [] };
        break;
      }

      case "assess_readiness": {
        const { data: assessments } = await supabase.from("ecosystem_exposure_readiness_assessments").select("*, ecosystem_capability_inventory(capability_name, capability_domain)").eq("organization_id", organization_id);
        result = { assessments: assessments || [] };
        break;
      }

      case "evaluate_safety_prerequisites": {
        const { data: prereqs } = await supabase.from("ecosystem_safety_prerequisites").select("*, ecosystem_capability_inventory(capability_name)").eq("organization_id", organization_id);
        const all = prereqs || [];
        const unmet = all.filter((p: any) => !p.is_met);
        result = { total: all.length, met: all.length - unmet.length, unmet: unmet.length, unmet_prerequisites: unmet };
        break;
      }

      case "design_trust_models": {
        const { data: models } = await supabase.from("ecosystem_trust_model_candidates").select("*").eq("organization_id", organization_id);
        result = { trust_models: models || [] };
        break;
      }

      case "recommend_readiness_actions": {
        const { data: outcomes } = await supabase.from("ecosystem_readiness_outcomes").select("*, ecosystem_exposure_readiness_assessments(ecosystem_readiness_score, readiness_status)").eq("organization_id", organization_id).eq("recommendation_status", "open");
        result = { recommendations: outcomes || [] };
        break;
      }

      case "outcomes": {
        const { data: outcomes } = await supabase.from("ecosystem_readiness_outcomes").select("*").eq("organization_id", organization_id);
        result = { outcomes: outcomes || [] };
        break;
      }

      case "explain": {
        result = {
          explanation: "Ecosystem readiness assessments are bounded, advisory-first, and governance-driven. No marketplace activation occurs in Sprint 56. All classifications, readiness scores, and recommendations require human review before any operational consequence.",
          metrics_explained: {
            ecosystem_readiness_score: "Weighted composite of safety, policy, trust, auditability, and blast radius readiness",
            safety_prerequisite_score: "Proportion of met prerequisites weighted by severity",
            trust_model_confidence_score: "Governance coverage + isolation + auditability, penalized by gaps",
            externalization_risk_score: "Composite of dependency sensitivity, blast radius, and criticality",
          },
          safety_constraints: [
            "No marketplace activation",
            "No external capability exposure",
            "No autonomous trust establishment",
            "All outputs are advisory-first",
            "Human review required for all consequences",
          ],
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, data: result }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
