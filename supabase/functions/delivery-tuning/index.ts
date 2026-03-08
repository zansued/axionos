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
        const [recs, postures, signals] = await Promise.all([
          supabase.from("delivery_tuning_recommendations").select("id, status, risk_posture, trade_off_posture, confidence_score").eq("organization_id", organization_id),
          supabase.from("delivery_reliability_postures").select("id, risk_posture, reliability_score, regression_frequency").eq("organization_id", organization_id),
          supabase.from("delivery_tuning_signals").select("id, signal_type, severity").eq("organization_id", organization_id),
        ]);
        const r = recs.data || [];
        const p = postures.data || [];
        const s = signals.data || [];
        result = {
          total_recommendations: r.length,
          open: r.filter((x: any) => x.status === "open").length,
          accepted: r.filter((x: any) => x.status === "accepted" || x.status === "trial").length,
          rejected: r.filter((x: any) => x.status === "rejected").length,
          high_risk_paths: p.filter((x: any) => x.risk_posture === "high" || x.risk_posture === "critical").length,
          regression_hotspots: s.filter((x: any) => x.signal_type === "regression_pattern" && (x.severity === "high" || x.severity === "critical")).length,
          total_postures: p.length,
        };
        break;
      }

      case "list_tuning_recommendations": {
        const { data } = await supabase.from("delivery_tuning_recommendations")
          .select("*, delivery_reliability_postures(id, posture_label, risk_posture)")
          .eq("organization_id", organization_id)
          .order("updated_at", { ascending: false }).limit(100);
        result = data || [];
        break;
      }

      case "tuning_recommendation_detail": {
        const { recommendation_id } = params;
        const { data: rec } = await supabase.from("delivery_tuning_recommendations")
          .select("*, delivery_reliability_postures(id, posture_label, risk_posture, reliability_score, regression_frequency, rollback_frequency, validation_stability, delivery_confidence)")
          .eq("id", recommendation_id).single();
        if (!rec) { result = { error: "Not found" }; break; }
        const [signals, reviews] = await Promise.all([
          supabase.from("delivery_tuning_signals").select("*").eq("posture_id", rec.posture_id).order("created_at", { ascending: false }).limit(20),
          supabase.from("delivery_tuning_reviews").select("*").eq("recommendation_id", recommendation_id).order("created_at", { ascending: false }).limit(10),
        ]);
        result = { recommendation: rec, signals: signals.data || [], reviews: reviews.data || [] };
        break;
      }

      case "explain_tuning": {
        const { recommendation_id } = params;
        const { data: rec } = await supabase.from("delivery_tuning_recommendations")
          .select("*, delivery_reliability_postures(posture_label, risk_posture, reliability_score, regression_frequency)")
          .eq("id", recommendation_id).single();
        if (!rec) { result = { error: "Not found" }; break; }
        const posture = (rec as any).delivery_reliability_postures;
        result = {
          recommendation: rec,
          explanation: {
            target: rec.tuning_target,
            rationale: rec.reliability_rationale,
            benefit: rec.expected_benefit,
            trade_off: rec.trade_off_posture,
            risk: rec.risk_posture,
            confidence: rec.confidence_score,
            uncertainty: rec.uncertainty_notes,
            posture_context: posture ? {
              label: posture.posture_label,
              risk: posture.risk_posture,
              reliability: posture.reliability_score,
              regression_freq: posture.regression_frequency,
            } : null,
            summary: rec.confidence_score >= 0.7
              ? `High-confidence tuning recommendation for "${rec.tuning_target}". Trade-off posture: ${rec.trade_off_posture}.`
              : rec.confidence_score >= 0.4
              ? `Moderate-confidence recommendation. ${rec.uncertainty_notes || "Review recommended."}`
              : `Low-confidence recommendation — manual review strongly advised.`,
          },
        };
        break;
      }

      case "review_tuning": {
        const { recommendation_id, review_action: ra, review_notes } = params;
        const { data: rec } = await supabase.from("delivery_tuning_recommendations")
          .select("status").eq("id", recommendation_id).single();
        if (!rec) { result = { error: "Not found" }; break; }

        const statusMap: Record<string, string> = {
          reviewed: "reviewed", accept: "accepted", accept_for_trial: "trial",
          reject: "rejected", dismiss: "dismissed", rollback: "rolled_back",
        };
        const newStatus = statusMap[ra] || "reviewed";

        const { data: review, error: revErr } = await supabase.from("delivery_tuning_reviews").insert({
          organization_id, recommendation_id, reviewer_id: user.id,
          review_action: ra, review_notes: review_notes || "",
          previous_status: rec.status, new_status: newStatus,
        }).select().single();
        if (revErr) throw revErr;

        await supabase.from("delivery_tuning_recommendations").update({
          status: newStatus, updated_at: new Date().toISOString(),
        }).eq("id", recommendation_id);
        result = review;
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
