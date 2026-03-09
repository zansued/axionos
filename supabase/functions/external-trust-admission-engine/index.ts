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
    const { action, organization_id } = body;

    if (!organization_id) return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: corsHeaders });

    const { data: _member } = await supabase.from("organization_members").select("role").eq("organization_id", organization_id).eq("user_id", user.id).single();
    if (!_member) return new Response(JSON.stringify({ error: "Not a member of this organization" }), { status: 403, headers: corsHeaders });

    let result: unknown;

    switch (action) {
      case "overview": {
        const [{ data: actors }, { data: tiers }, { data: cases }, { data: reviews }, { data: requirements }, { data: outcomes }] = await Promise.all([
          supabase.from("external_actor_registry").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("external_trust_tiers").select("*").eq("organization_id", organization_id).limit(50),
          supabase.from("external_admission_cases").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("external_admission_reviews").select("*").eq("organization_id", organization_id).limit(100),
          supabase.from("external_admission_requirements").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("external_trust_outcomes").select("*").eq("organization_id", organization_id).limit(100),
        ]);

        const allCases = cases || [];
        const allRequirements = requirements || [];

        result = {
          total_actors: (actors || []).length,
          tiers_defined: (tiers || []).length,
          total_cases: allCases.length,
          pending_reviews: (reviews || []).filter((r: any) => r.review_status === "pending").length,
          total_requirements: allRequirements.length,
          unmet_requirements: allRequirements.filter((r: any) => !r.is_met).length,
          critical_unmet: allRequirements.filter((r: any) => !r.is_met && r.severity === "critical").length,
          outcome_count: (outcomes || []).length,
          ecosystem_activation_status: "frozen",
          governance_mode: "advisory_first",
          cases_by_decision: allCases.reduce((acc: Record<string, number>, c: any) => { acc[c.decision_status] = (acc[c.decision_status] || 0) + 1; return acc; }, {}),
          actors_by_type: (actors || []).reduce((acc: Record<string, number>, a: any) => { acc[a.external_actor_type] = (acc[a.external_actor_type] || 0) + 1; return acc; }, {}),
        };
        break;
      }

      case "register_actors": {
        const { data: actors } = await supabase.from("external_actor_registry").select("*").eq("organization_id", organization_id);
        result = { registered_actors: (actors || []).length, actors: actors || [] };
        break;
      }

      case "classify_trust": {
        const { data: actors } = await supabase.from("external_actor_registry").select("*, external_trust_tiers(tier_key, tier_name)").eq("organization_id", organization_id);
        const distribution = (actors || []).reduce((acc: Record<string, number>, a: any) => {
          const tier = a.external_trust_tiers?.tier_key || "unclassified";
          acc[tier] = (acc[tier] || 0) + 1;
          return acc;
        }, {});
        result = { trust_distribution: distribution, actors: actors || [] };
        break;
      }

      case "build_admission_cases": {
        const { data: cases } = await supabase.from("external_admission_cases").select("*, external_actor_registry(external_actor_name, external_actor_type)").eq("organization_id", organization_id);
        result = { total_cases: (cases || []).length, cases: cases || [] };
        break;
      }

      case "evaluate_requirements": {
        const { data: reqs } = await supabase.from("external_admission_requirements").select("*, external_admission_cases(actor_id)").eq("organization_id", organization_id);
        const met = (reqs || []).filter((r: any) => r.is_met).length;
        const unmet = (reqs || []).filter((r: any) => !r.is_met).length;
        result = { total: (reqs || []).length, met, unmet, requirements: reqs || [] };
        break;
      }

      case "review_queue": {
        const { data: cases } = await supabase.from("external_admission_cases").select("*, external_actor_registry(external_actor_name, external_actor_type)").eq("organization_id", organization_id).in("review_status", ["pending", "under_review"]).order("admission_readiness_score", { ascending: false });
        result = { review_queue: cases || [] };
        break;
      }

      case "trust_outcomes": {
        const { data: outcomes } = await supabase.from("external_trust_outcomes").select("*, external_actor_registry(external_actor_name)").eq("organization_id", organization_id);
        result = { outcomes: outcomes || [] };
        break;
      }

      case "explain": {
        result = {
          explanation: "External Trust & Admission is advisory-first. No live external participation is activated in Sprint 58. All trust tiers, admission cases, and recommendations require human review.",
          trust_tiers: ["never_admit", "unknown", "restricted_candidate", "provisional", "sandbox_eligible", "controlled_future_candidate"],
          admission_review_states: ["pending", "under_review", "restricted", "delayed", "rejected", "sandbox_eligible_future", "controlled_future_candidate", "archived"],
          safety_constraints: [
            "No marketplace activation",
            "No live external capability access",
            "No autonomous partner enablement",
            "No autonomous trust establishment",
            "All outputs are advisory-first",
            "Human review required for all admission decisions",
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
