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
        const [{ data: models }, { data: assessments }, { data: gaps }, { data: reviews }, { data: certs }, { data: outcomes }] = await Promise.all([
          supabase.from("operating_completion_models").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("operating_completion_assessments").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("operating_completion_gaps").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("operating_completion_reviews").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("operating_baseline_certifications").select("*").eq("organization_id", organization_id).limit(100),
          supabase.from("operating_completion_outcomes").select("*").eq("organization_id", organization_id).limit(100),
        ]);

        const allAssessments = assessments || [];
        const avgCompletion = allAssessments.length > 0 ? allAssessments.reduce((s: number, a: any) => s + Number(a.completion_score || 0), 0) / allAssessments.length : 0;
        const avgRoundEnough = allAssessments.length > 0 ? allAssessments.reduce((s: number, a: any) => s + Number(a.round_enough_score || 0), 0) / allAssessments.length : 0;

        result = {
          total_models: (models || []).length,
          total_assessments: allAssessments.length,
          avg_completion_score: Math.round(avgCompletion * 10000) / 10000,
          avg_round_enough_score: Math.round(avgRoundEnough * 10000) / 10000,
          total_gaps: (gaps || []).length,
          high_severity_gaps: (gaps || []).filter((g: any) => g.severity === 'high' || g.severity === 'critical').length,
          intentional_gaps: (gaps || []).filter((g: any) => g.is_intentional).length,
          total_reviews: (reviews || []).length,
          pending_reviews: (reviews || []).filter((r: any) => r.review_status === 'pending').length,
          total_certifications: (certs || []).length,
          certified_baselines: (certs || []).filter((c: any) => c.certification_status === 'certified').length,
          total_outcomes: (outcomes || []).length,
          completion_mode: "advisory_first",
        };
        break;
      }

      case "define_completion_models": {
        const { data: models } = await supabase.from("operating_completion_models").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = { models: models || [] };
        break;
      }

      case "assess_completion": {
        const { data: assessments } = await supabase.from("operating_completion_assessments").select("*, operating_completion_models(completion_model_name)").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = { assessments: assessments || [] };
        break;
      }

      case "detect_gaps": {
        const { data: gaps } = await supabase.from("operating_completion_gaps").select("*, operating_completion_assessments(completion_domain, completion_scope_type)").eq("organization_id", organization_id).order("residual_risk_score", { ascending: false }).limit(100);
        result = { gaps: gaps || [] };
        break;
      }

      case "certify_baseline_candidates": {
        const { data: certs } = await supabase.from("operating_baseline_certifications").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = { certifications: certs || [] };
        break;
      }

      case "aggregate_completion": {
        const { data: assessments } = await supabase.from("operating_completion_assessments").select("*").eq("organization_id", organization_id).limit(200);
        const all = assessments || [];
        const domains = ['governance', 'assurance', 'canon_integrity', 'ecosystem', 'pipeline'];
        const domainScores = domains.map(d => {
          const matching = all.filter((a: any) => a.completion_domain === d);
          const avg = matching.length > 0 ? matching.reduce((s: number, a: any) => s + Number(a.completion_score || 0), 0) / matching.length : 0;
          return { domain: d, score: Math.round(avg * 10000) / 10000, count: matching.length };
        });
        result = { domain_scores: domainScores, total_assessments: all.length };
        break;
      }

      case "completion_outcomes": {
        const { data: outcomes } = await supabase.from("operating_completion_outcomes").select("*, operating_completion_reviews(review_status, recommendation_status), operating_baseline_certifications(certification_status)").eq("organization_id", organization_id).limit(100);
        result = { outcomes: outcomes || [] };
        break;
      }

      case "explain": {
        result = {
          explanation: "Operating Completion verifies whether the platform has reached its first coherent, stable, institutionally governed baseline. 'Round enough' means governable, auditable, and stable for mature operation — not finished forever.",
          completion_domains: ["governance", "assurance", "canon_integrity", "ecosystem", "pipeline", "architecture", "product"],
          safety_constraints: ["Advisory-first", "No autonomous canon closure", "No autonomous roadmap closure", "Mandatory human review", "Tenant isolation via RLS", "Completion = mature baseline, not permanent finality"],
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
