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

    let result: unknown;

    switch (action) {
      case "overview": {
        const [{ data: models }, { data: assessments }, { data: variances }, { data: reviews }, { data: signals }, { data: outcomes }] = await Promise.all([
          supabase.from("institutional_outcome_models").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("institutional_outcome_assessments").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("institutional_outcome_variances").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("institutional_assurance_reviews").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("institutional_assurance_signals").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("institutional_outcome_assurance_outcomes").select("*").eq("organization_id", organization_id).limit(100),
        ]);

        const allAssessments = assessments || [];
        const byDomain = allAssessments.reduce((acc: Record<string, number>, a: any) => { acc[a.outcome_domain] = (acc[a.outcome_domain] || 0) + 1; return acc; }, {});
        const highVariance = allAssessments.filter((a: any) => a.outcome_variance_score > 0.4).length;

        result = {
          total_models: (models || []).length,
          total_assessments: allAssessments.length,
          assessments_by_domain: byDomain,
          total_variances: (variances || []).length,
          high_variance_count: highVariance,
          total_reviews: (reviews || []).length,
          pending_reviews: (reviews || []).filter((r: any) => r.review_status === 'pending').length,
          total_signals: (signals || []).length,
          total_outcomes: (outcomes || []).length,
          assurance_mode: "advisory_first",
        };
        break;
      }

      case "define_outcome_models": {
        const { data: models } = await supabase.from("institutional_outcome_models").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = { models: models || [] };
        break;
      }

      case "assess_outcomes": {
        const { data: assessments } = await supabase.from("institutional_outcome_assessments").select("*, institutional_outcome_models(outcome_model_name)").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = { assessments: assessments || [] };
        break;
      }

      case "detect_drift": {
        const { data: variances } = await supabase.from("institutional_outcome_variances").select("*, institutional_outcome_assessments(outcome_domain, outcome_scope_type)").eq("organization_id", organization_id).order("drift_score", { ascending: false }).limit(100);
        result = { variances: variances || [] };
        break;
      }

      case "aggregate_assurance": {
        const { data: signals } = await supabase.from("institutional_assurance_signals").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = { signals: signals || [] };
        break;
      }

      case "recommend_remediation": {
        const { data: reviews } = await supabase.from("institutional_assurance_reviews").select("*, institutional_outcome_assessments(outcome_domain)").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = { reviews: reviews || [] };
        break;
      }

      case "assurance_outcomes": {
        const { data: outcomes } = await supabase.from("institutional_outcome_assurance_outcomes").select("*, institutional_assurance_reviews(review_status, recommendation_status)").eq("organization_id", organization_id).limit(100);
        result = { outcomes: outcomes || [] };
        break;
      }

      case "explain": {
        result = {
          explanation: "Institutional Outcome Assurance verifies whether the platform consistently produces intended outcomes. All remediation is advisory-first.",
          outcome_domains: ["pipeline", "architecture", "product", "governance", "ecosystem", "commercial"],
          safety_constraints: ["Advisory-first", "No autonomous structural remediation", "Mandatory human review", "Tenant isolation via RLS"],
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
