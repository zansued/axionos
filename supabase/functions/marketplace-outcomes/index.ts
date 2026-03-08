import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { action, organization_id, ...params } = await req.json();
    if (!organization_id) return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: corsHeaders });

    let result: unknown = null;

    switch (action) {
      case "overview": {
        const [postures, signals, decisions] = await Promise.all([
          supabase.from("capability_outcome_postures").select("id, standing, risk_posture, rollback_readiness, health_score").eq("organization_id", organization_id),
          supabase.from("capability_marketplace_signals").select("id, severity").eq("organization_id", organization_id),
          supabase.from("capability_marketplace_decisions").select("id, decision_type").eq("organization_id", organization_id),
        ]);
        const p = postures.data || [];
        const s = signals.data || [];
        result = {
          total_postures: p.length,
          high_confidence: p.filter((x: any) => x.standing === "high_confidence").length,
          visible: p.filter((x: any) => x.standing === "visible").length,
          restricted: p.filter((x: any) => x.standing === "restricted").length,
          downgraded: p.filter((x: any) => x.standing === "downgraded").length,
          suspended: p.filter((x: any) => x.standing === "suspended").length,
          high_risk: p.filter((x: any) => x.risk_posture === "high" || x.risk_posture === "critical").length,
          rollback_not_ready: p.filter((x: any) => x.rollback_readiness === "not_ready").length,
          critical_signals: s.filter((x: any) => x.severity === "critical").length,
          total_decisions: (decisions.data || []).length,
        };
        break;
      }

      case "list_marketplace_outcomes": {
        const { data } = await supabase.from("capability_outcome_postures")
          .select("*, capability_packages(id, package_name, category)")
          .eq("organization_id", organization_id).order("updated_at", { ascending: false }).limit(100);
        result = data || [];
        break;
      }

      case "marketplace_capability_detail": {
        const { posture_id } = params;
        const { data: posture } = await supabase.from("capability_outcome_postures")
          .select("*, capability_packages(id, package_name, category, lifecycle_status)").eq("id", posture_id).single();
        if (!posture) { result = { error: "Not found" }; break; }
        const { data: signals } = await supabase.from("capability_marketplace_signals")
          .select("*").eq("capability_package_id", posture.capability_package_id).eq("organization_id", organization_id)
          .order("created_at", { ascending: false }).limit(20);
        const { data: reviews } = await supabase.from("capability_marketplace_reviews")
          .select("*").eq("posture_id", posture_id).order("created_at", { ascending: false }).limit(10);
        const { data: decisions } = await supabase.from("capability_marketplace_decisions")
          .select("*").eq("capability_package_id", posture.capability_package_id).eq("organization_id", organization_id)
          .order("created_at", { ascending: false }).limit(10);
        result = { posture, signals: signals || [], reviews: reviews || [], decisions: decisions || [] };
        break;
      }

      case "review_marketplace_standing": {
        const { posture_id, review_action: ra, review_notes } = params;
        const { data: review, error: revErr } = await supabase.from("capability_marketplace_reviews").insert({
          organization_id, posture_id, reviewer_id: user.id, review_action: ra, review_notes: review_notes || "",
        }).select().single();
        if (revErr) throw revErr;

        const standingMap: Record<string, string> = {
          keep_visible: "visible", mark_high_confidence: "high_confidence",
          downgrade: "downgraded", restrict: "restricted", suspend: "suspended",
        };
        const newStanding = standingMap[ra] || "visible";
        const { data: posture } = await supabase.from("capability_outcome_postures").select("standing, capability_package_id").eq("id", posture_id).single();

        await supabase.from("capability_outcome_postures").update({ standing: newStanding }).eq("id", posture_id);
        await supabase.from("capability_marketplace_decisions").insert({
          organization_id, capability_package_id: posture?.capability_package_id,
          decision_type: ra, decided_by: user.id, decision_reason: review_notes || "",
          previous_standing: posture?.standing || "visible", new_standing: newStanding,
        });
        result = review;
        break;
      }

      case "explain_marketplace_posture": {
        const { posture_id } = params;
        const { data: posture } = await supabase.from("capability_outcome_postures")
          .select("*, capability_packages(id, package_name, category)").eq("id", posture_id).single();
        if (!posture) { result = { error: "Not found" }; break; }
        const { data: signals } = await supabase.from("capability_marketplace_signals")
          .select("signal_type, severity").eq("capability_package_id", posture.capability_package_id)
          .eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(5);
        const critSignals = (signals || []).filter((s: any) => s.severity === "critical" || s.severity === "high");
        result = {
          posture,
          explanation: {
            name: (posture as any).capability_packages?.package_name || "Unknown",
            standing: posture.standing,
            health: posture.health_score, reliability: posture.reliability_score,
            compatibility: posture.compatibility_confidence, rollback: posture.rollback_readiness,
            risk: posture.risk_posture,
            why: posture.standing === "suspended" ? "Manually suspended by operator" :
              posture.standing === "restricted" ? "Restricted due to governance review" :
              critSignals.length > 0 ? `${critSignals.length} high/critical signal(s) observed` :
              posture.risk_posture === "critical" ? "Critical risk posture" : "Standard governance applies",
            recent_signals: signals || [],
          },
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ data: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
