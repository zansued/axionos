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
        const [records, factors] = await Promise.all([
          supabase.from("delivery_outcome_records").select("id, outcome_type, analysis_status, confidence_score").eq("organization_id", organization_id),
          supabase.from("delivery_outcome_factors").select("id, factor_direction, factor_type, confidence_score").eq("organization_id", organization_id),
        ]);
        const r = records.data || [];
        const f = factors.data || [];
        result = {
          total_outcomes: r.length,
          analyzed: r.filter((x: any) => x.analysis_status === "analyzed").length,
          reviewed: r.filter((x: any) => x.analysis_status === "reviewed").length,
          low_confidence: r.filter((x: any) => x.analysis_status === "low_confidence" || x.confidence_score < 0.4).length,
          pending: r.filter((x: any) => x.analysis_status === "pending").length,
          positive_factors: f.filter((x: any) => x.factor_direction === "positive").length,
          negative_factors: f.filter((x: any) => x.factor_direction === "negative").length,
          rollback_outcomes: r.filter((x: any) => x.outcome_type === "rollback").length,
        };
        break;
      }

      case "list_outcome_records": {
        const { data } = await supabase.from("delivery_outcome_records")
          .select("*, initiatives(id, title)")
          .eq("organization_id", organization_id)
          .order("updated_at", { ascending: false }).limit(100);
        result = data || [];
        break;
      }

      case "outcome_detail": {
        const { outcome_id } = params;
        const { data: record } = await supabase.from("delivery_outcome_records")
          .select("*, initiatives(id, title)").eq("id", outcome_id).single();
        if (!record) { result = { error: "Not found" }; break; }
        const [factors, links, reviews] = await Promise.all([
          supabase.from("delivery_outcome_factors").select("*").eq("outcome_id", outcome_id).order("contribution_weight", { ascending: false }),
          supabase.from("delivery_outcome_causality_links").select("*").eq("outcome_id", outcome_id).order("created_at", { ascending: false }),
          supabase.from("delivery_outcome_analysis_reviews").select("*").eq("outcome_id", outcome_id).order("created_at", { ascending: false }).limit(10),
        ]);
        result = { record, factors: factors.data || [], links: links.data || [], reviews: reviews.data || [] };
        break;
      }

      case "explain_causality": {
        const { outcome_id } = params;
        const { data: record } = await supabase.from("delivery_outcome_records")
          .select("*, initiatives(id, title)").eq("id", outcome_id).single();
        if (!record) { result = { error: "Not found" }; break; }
        const { data: factors } = await supabase.from("delivery_outcome_factors")
          .select("factor_type, factor_label, factor_direction, contribution_weight, confidence_score, uncertainty_reason")
          .eq("outcome_id", outcome_id).order("contribution_weight", { ascending: false }).limit(10);
        const { data: links } = await supabase.from("delivery_outcome_causality_links")
          .select("link_type, link_strength, confidence_posture, counterfactors, supporting_signals")
          .eq("outcome_id", outcome_id).limit(10);
        const posFactors = (factors || []).filter((f: any) => f.factor_direction === "positive");
        const negFactors = (factors || []).filter((f: any) => f.factor_direction === "negative");
        const uncertainFactors = (factors || []).filter((f: any) => f.factor_direction === "uncertain" || f.confidence_score < 0.4);
        result = {
          record,
          explanation: {
            outcome_type: record.outcome_type,
            confidence: record.confidence_score,
            uncertainty: record.uncertainty_notes,
            positive_factors: posFactors,
            negative_factors: negFactors,
            uncertain_factors: uncertainFactors,
            causal_links: links || [],
            summary: record.confidence_score >= 0.7
              ? `High-confidence analysis with ${posFactors.length} positive and ${negFactors.length} negative factors identified.`
              : record.confidence_score >= 0.4
              ? `Moderate-confidence analysis. ${uncertainFactors.length} factors remain uncertain.`
              : `Low-confidence analysis — results should be reviewed manually. ${uncertainFactors.length} uncertain factors.`,
          },
        };
        break;
      }

      case "review_outcome_analysis": {
        const { outcome_id, review_action: ra, review_notes } = params;
        const { data: record } = await supabase.from("delivery_outcome_records")
          .select("analysis_status").eq("id", outcome_id).single();
        if (!record) { result = { error: "Not found" }; break; }

        const statusMap: Record<string, string> = {
          reviewed: "reviewed", mark_low_confidence: "low_confidence",
          dismiss: "dismissed", confirm: "reviewed", escalate: "pending",
        };
        const newStatus = statusMap[ra] || "analyzed";

        const { data: review, error: revErr } = await supabase.from("delivery_outcome_analysis_reviews").insert({
          organization_id, outcome_id, reviewer_id: user.id,
          review_action: ra, review_notes: review_notes || "",
          previous_status: record.analysis_status, new_status: newStatus,
        }).select().single();
        if (revErr) throw revErr;

        await supabase.from("delivery_outcome_records").update({ analysis_status: newStatus, updated_at: new Date().toISOString() }).eq("id", outcome_id);
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
