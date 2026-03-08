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
        const [signals, clusters] = await Promise.all([
          supabase.from("post_deploy_feedback_signals").select("id, signal_type, severity, assimilation_status, reliability_relevance").eq("organization_id", organization_id),
          supabase.from("post_deploy_feedback_clusters").select("id, severity, signal_count").eq("organization_id", organization_id),
        ]);
        const s = signals.data || [];
        const c = clusters.data || [];
        result = {
          total_signals: s.length,
          critical: s.filter((x: any) => x.severity === "critical").length,
          high: s.filter((x: any) => x.severity === "high").length,
          pending: s.filter((x: any) => x.assimilation_status === "pending").length,
          reviewed: s.filter((x: any) => x.assimilation_status === "reviewed").length,
          clusters: c.length,
          critical_clusters: c.filter((x: any) => x.severity === "critical" || x.severity === "high").length,
        };
        break;
      }

      case "list_feedback_signals": {
        const { data } = await supabase.from("post_deploy_feedback_signals")
          .select("*, initiatives(id, title)")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false }).limit(100);
        result = data || [];
        break;
      }

      case "feedback_signal_detail": {
        const { signal_id } = params;
        const { data: signal } = await supabase.from("post_deploy_feedback_signals")
          .select("*, initiatives(id, title)").eq("id", signal_id).single();
        if (!signal) { result = { error: "Not found" }; break; }
        const [links, reviews] = await Promise.all([
          supabase.from("post_deploy_feedback_links").select("*").eq("signal_id", signal_id).order("created_at", { ascending: false }),
          supabase.from("post_deploy_feedback_reviews").select("*").eq("signal_id", signal_id).order("created_at", { ascending: false }).limit(10),
        ]);
        result = { signal, links: links.data || [], reviews: reviews.data || [] };
        break;
      }

      case "explain_feedback_signal": {
        const { signal_id } = params;
        const { data: signal } = await supabase.from("post_deploy_feedback_signals")
          .select("*, initiatives(id, title)").eq("id", signal_id).single();
        if (!signal) { result = { error: "Not found" }; break; }
        const { data: links } = await supabase.from("post_deploy_feedback_links")
          .select("link_target_type, link_context, relevance_score").eq("signal_id", signal_id).limit(10);
        result = {
          signal,
          explanation: {
            type: signal.signal_type,
            severity: signal.severity,
            impact: signal.impact_area,
            reliability: signal.reliability_relevance,
            adoption: signal.adoption_relevance,
            linked_contexts: links || [],
            why: signal.severity === "critical"
              ? "Critical post-deploy signal requiring immediate operator attention."
              : signal.reliability_relevance > 0.7
              ? "High reliability relevance — may indicate systemic delivery quality concern."
              : signal.adoption_relevance > 0.7
              ? "High adoption relevance — may affect user experience or adoption posture."
              : "Standard post-deploy feedback captured for learning assimilation.",
          },
        };
        break;
      }

      case "review_feedback_signal": {
        const { signal_id, review_action: ra, review_notes } = params;
        const { data: signal } = await supabase.from("post_deploy_feedback_signals")
          .select("assimilation_status").eq("id", signal_id).single();
        if (!signal) { result = { error: "Not found" }; break; }

        const statusMap: Record<string, string> = {
          reviewed: "reviewed", classify: "classified", link: "linked",
          dismiss: "dismissed", escalate: "pending", cluster: "clustered",
        };
        const newStatus = statusMap[ra] || "reviewed";

        const { data: review, error: revErr } = await supabase.from("post_deploy_feedback_reviews").insert({
          organization_id, signal_id, reviewer_id: user.id,
          review_action: ra, review_notes: review_notes || "",
          previous_status: signal.assimilation_status, new_status: newStatus,
        }).select().single();
        if (revErr) throw revErr;

        await supabase.from("post_deploy_feedback_signals").update({
          assimilation_status: newStatus, updated_at: new Date().toISOString(),
        }).eq("id", signal_id);
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
