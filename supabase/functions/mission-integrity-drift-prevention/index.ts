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
    if (!_member) return new Response(JSON.stringify({ error: "Not a member" }), { status: 403, headers: corsHeaders });

    let result: unknown;

    switch (action) {
      case "overview": {
        const [{ data: constitutions }, { data: subjects }, { data: evaluations }, { data: driftEvents }, { data: recommendations }, { data: snapshots }] = await Promise.all([
          supabase.from("mission_constitutions").select("*").eq("organization_id", organization_id).limit(100),
          supabase.from("mission_integrity_subjects").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("mission_alignment_evaluations").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("mission_drift_events").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("mission_correction_recommendations").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("mission_integrity_snapshots").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(10),
        ]);

        const allEvals = evaluations || [];
        const allDrifts = driftEvents || [];
        const unresolvedDrift = allDrifts.filter((d: any) => !d.resolved_at).length;
        const avgAlignment = allEvals.length > 0 ? allEvals.reduce((s: number, e: any) => s + Number(e.alignment_score), 0) / allEvals.length : 0;
        const avgErosion = allEvals.length > 0 ? allEvals.reduce((s: number, e: any) => s + Number(e.erosion_score), 0) / allEvals.length : 0;

        result = {
          total_constitutions: (constitutions || []).length,
          total_subjects: (subjects || []).length,
          total_evaluations: allEvals.length,
          total_drift_events: allDrifts.length,
          unresolved_drift: unresolvedDrift,
          total_recommendations: (recommendations || []).length,
          active_recommendations: (recommendations || []).filter((r: any) => r.active).length,
          avg_alignment_score: Math.round(avgAlignment * 10000) / 10000,
          avg_erosion_score: Math.round(avgErosion * 10000) / 10000,
          latest_snapshot: (snapshots || [])[0] || null,
          governance_mode: "advisory_first",
        };
        break;
      }

      case "constitutions": {
        const { data } = await supabase.from("mission_constitutions").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = { constitutions: data || [] };
        break;
      }

      case "subjects": {
        const { data } = await supabase.from("mission_integrity_subjects").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200);
        result = { subjects: data || [] };
        break;
      }

      case "evaluate": {
        const { data } = await supabase.from("mission_alignment_evaluations").select("*, mission_constitutions(constitution_name), mission_integrity_subjects(title, domain, subject_type)").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200);
        result = { evaluations: data || [] };
        break;
      }

      case "drift_events": {
        const { data } = await supabase.from("mission_drift_events").select("*, mission_integrity_subjects(title, domain)").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200);
        result = { drift_events: data || [] };
        break;
      }

      case "recommendations": {
        const { data } = await supabase.from("mission_correction_recommendations").select("*, mission_integrity_subjects(title, domain)").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200);
        result = { recommendations: data || [] };
        break;
      }

      case "snapshots": {
        const { data } = await supabase.from("mission_integrity_snapshots").select("*, mission_constitutions(constitution_name)").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50);
        result = { snapshots: data || [] };
        break;
      }

      case "explain": {
        result = {
          explanation: "Mission Integrity & Drift Prevention continuously evaluates whether the institution's decisions, evolution, and outputs remain aligned with its core mission, identity, and normative direction. All remediation is advisory-first.",
          drift_types: ["operational", "strategic", "identity", "normative", "incentive"],
          posture_levels: ["mission_aligned", "healthy_adaptation", "mild_drift", "significant_drift", "active_erosion", "normative_compromise"],
          core_principles: ["advisory-first", "no-silent-erosion", "mission-before-performance", "drift-is-measurable", "adaptation-is-not-erosion"],
          safety_constraints: ["Advisory-first", "No autonomous mission rewrite", "Human review for corrections", "Tenant isolation via RLS"],
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
