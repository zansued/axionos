import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { action, organization_id, posture_id, segment_id } = await req.json();

    if (!organization_id) return json({ error: "organization_id required" }, 400);

    // Verify membership
    const { data: isMember } = await supabase.rpc("is_org_member", { _user_id: user.id, _org_id: organization_id });
    if (!isMember) return json({ error: "Not a member" }, 403);

    switch (action) {
      case "overview": {
        const [postures, segments, contentions, reviews] = await Promise.all([
          supabase.from("tenant_runtime_postures").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100),
          supabase.from("tenant_runtime_segments").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200),
          supabase.from("tenant_runtime_contention_events").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100),
          supabase.from("tenant_runtime_fairness_reviews").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50),
        ]);

        const postureList = postures.data || [];
        const segmentList = segments.data || [];
        const contentionList = contentions.data || [];
        const reviewList = reviews.data || [];

        return json({
          kpis: {
            active_segments: segmentList.filter((s: any) => s.status === "active").length,
            noisy_neighbor_alerts: contentionList.filter((c: any) => c.noisy_neighbor_detected).length,
            contention_hotspots: contentionList.filter((c: any) => c.severity === "high" || c.severity === "critical").length,
            fairness_violations: reviewList.filter((r: any) => r.violations_found > 0).length,
            high_risk_partitions: segmentList.filter((s: any) => s.risk_level === "high" || s.risk_level === "critical").length,
            pending_reviews: reviewList.filter((r: any) => r.review_status === "pending").length,
          },
          postures: postureList,
          segments: segmentList,
          contention_events: contentionList.slice(0, 20),
          fairness_reviews: reviewList,
        });
      }

      case "list_runtime_segments": {
        const { data } = await supabase.from("tenant_runtime_segments").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200);
        return json({ segments: data || [] });
      }

      case "segment_detail": {
        if (!segment_id) return json({ error: "segment_id required" }, 400);
        const [seg, contentions, reviews] = await Promise.all([
          supabase.from("tenant_runtime_segments").select("*").eq("id", segment_id).single(),
          supabase.from("tenant_runtime_contention_events").select("*").eq("segment_id", segment_id).order("created_at", { ascending: false }).limit(20),
          supabase.from("tenant_runtime_fairness_reviews").select("*").eq("segment_id", segment_id).order("created_at", { ascending: false }).limit(10),
        ]);
        return json({ segment: seg.data, contention_events: contentions.data || [], fairness_reviews: reviews.data || [] });
      }

      case "explain_runtime_isolation": {
        if (!posture_id) return json({ error: "posture_id required" }, 400);
        const { data: posture } = await supabase.from("tenant_runtime_postures").select("*").eq("id", posture_id).single();
        if (!posture) return json({ error: "Posture not found" }, 404);

        const { data: segs } = await supabase.from("tenant_runtime_segments").select("*").eq("posture_id", posture_id).limit(50);
        const segments = segs || [];

        const explanations: string[] = [];
        explanations.push(`Isolation posture: ${posture.isolation_posture}. Fairness: ${posture.fairness_posture}. Contention: ${posture.contention_posture}.`);
        if (posture.contention_posture === "critical" || posture.contention_posture === "high") {
          explanations.push("⚠️ Elevated contention detected — review workload distribution.");
        }
        const highRisk = segments.filter((s: any) => s.risk_level === "high" || s.risk_level === "critical");
        if (highRisk.length > 0) {
          explanations.push(`${highRisk.length} high-risk segment(s) detected — consider partitioning or throttling.`);
        }
        if (posture.fairness_posture === "throttled" || posture.fairness_posture === "degraded") {
          explanations.push("Fairness posture indicates throttling or degradation — review resource constraints.");
        }
        explanations.push(`Blast radius scope: ${posture.blast_radius_scope}. Active workloads: ${posture.active_workload_count}.`);

        return json({ posture, segments, explanations });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    return json({ error: err.message }, 500);
  }
});
