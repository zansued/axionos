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
        const [{ data: models }, { data: assessments }, { data: drifts }, { data: reviews }, { data: signals }, { data: outcomes }] = await Promise.all([
          supabase.from("canon_integrity_models").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("canon_integrity_assessments").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("canon_drift_events").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("canon_integrity_reviews").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("canon_conformance_signals").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("canon_integrity_outcomes").select("*").eq("organization_id", organization_id).limit(100),
        ]);

        const allAssessments = assessments || [];
        const byDomain = allAssessments.reduce((acc: Record<string, number>, a: any) => { acc[a.integrity_domain] = (acc[a.integrity_domain] || 0) + 1; return acc; }, {});
        const highDrift = (drifts || []).filter((d: any) => d.severity === 'high' || d.severity === 'critical').length;

        result = {
          total_models: (models || []).length,
          total_assessments: allAssessments.length,
          assessments_by_domain: byDomain,
          total_drift_events: (drifts || []).length,
          high_severity_drifts: highDrift,
          total_reviews: (reviews || []).length,
          pending_reviews: (reviews || []).filter((r: any) => r.review_status === 'pending').length,
          total_signals: (signals || []).length,
          total_outcomes: (outcomes || []).length,
          integrity_mode: "advisory_first",
        };
        break;
      }

      case "define_integrity_models": {
        const { data: models } = await supabase.from("canon_integrity_models").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = { models: models || [] };
        break;
      }

      case "assess_conformance": {
        const { data: assessments } = await supabase.from("canon_integrity_assessments").select("*, canon_integrity_models(canonical_source_name)").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = { assessments: assessments || [] };
        break;
      }

      case "detect_drift": {
        const { data: drifts } = await supabase.from("canon_drift_events").select("*, canon_integrity_assessments(integrity_domain)").eq("organization_id", organization_id).order("drift_score", { ascending: false }).limit(100);
        result = { drifts: drifts || [] };
        break;
      }

      case "aggregate_conformance": {
        const { data: signals } = await supabase.from("canon_conformance_signals").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = { signals: signals || [] };
        break;
      }

      case "recommend_alignment_actions": {
        const { data: reviews } = await supabase.from("canon_integrity_reviews").select("*, canon_integrity_assessments(integrity_domain)").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = { reviews: reviews || [] };
        break;
      }

      case "integrity_outcomes": {
        const { data: outcomes } = await supabase.from("canon_integrity_outcomes").select("*, canon_integrity_reviews(review_status, recommendation_status)").eq("organization_id", organization_id).limit(100);
        result = { outcomes: outcomes || [] };
        break;
      }

      case "explain": {
        result = {
          explanation: "Canon Integrity & Drift Governance verifies platform faithfulness to its canonical architecture, documentation, and governance principles. All remediation is advisory-first.",
          integrity_domains: ["documentation", "architecture", "governance", "pipeline", "ecosystem", "principles"],
          core_principles: ["advisory-first", "governance-before-autonomy", "rollback-everywhere", "bounded-adaptation", "tenant-isolation"],
          safety_constraints: ["Advisory-first", "No autonomous canon rewrite", "Mandatory human review", "Tenant isolation via RLS"],
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
