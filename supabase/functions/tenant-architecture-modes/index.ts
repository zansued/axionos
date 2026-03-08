import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );

    const { action, params } = await req.json();

    switch (action) {
      case "overview": {
        const [modes, prefs, outcomes, recs, reviews] = await Promise.all([
          supabase.from("tenant_architecture_modes").select("*").order("created_at", { ascending: false }).limit(50),
          supabase.from("tenant_architecture_preference_profiles").select("*").order("created_at", { ascending: false }).limit(50),
          supabase.from("tenant_architecture_mode_outcomes").select("*").order("created_at", { ascending: false }).limit(50),
          supabase.from("tenant_architecture_recommendations").select("*").order("created_at", { ascending: false }).limit(50),
          supabase.from("tenant_architecture_mode_reviews").select("*").order("created_at", { ascending: false }).limit(50),
        ]);
        return new Response(JSON.stringify({
          modes: modes.data || [], preferences: prefs.data || [],
          outcomes: outcomes.data || [], recommendations: recs.data || [], reviews: reviews.data || [],
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "modes": {
        const { data } = await supabase.from("tenant_architecture_modes").select("*").order("created_at", { ascending: false });
        return new Response(JSON.stringify(data || []), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "preferences": {
        const { data } = await supabase.from("tenant_architecture_preference_profiles").select("*").order("created_at", { ascending: false });
        return new Response(JSON.stringify(data || []), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "outcomes": {
        const { data } = await supabase.from("tenant_architecture_mode_outcomes").select("*").order("created_at", { ascending: false });
        return new Response(JSON.stringify(data || []), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "recommendations": {
        const { data } = await supabase.from("tenant_architecture_recommendations").select("*").order("created_at", { ascending: false });
        return new Response(JSON.stringify(data || []), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "reviews": {
        const { data } = await supabase.from("tenant_architecture_mode_reviews").select("*").order("created_at", { ascending: false });
        return new Response(JSON.stringify(data || []), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "health": {
        const { data: modes } = await supabase.from("tenant_architecture_modes").select("*");
        const allModes = modes || [];
        const active = allModes.filter((m: any) => m.status === "active").length;
        return new Response(JSON.stringify({
          active_mode_count: active, total_mode_count: allModes.length,
          overall_health_score: active <= 5 ? 0.8 : 0.5,
          health_status: active <= 5 ? "healthy" : "watch",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "explain": {
        return new Response(JSON.stringify({
          explanation: "Tenant architecture modes provide bounded specialization per scope without platform fragmentation.",
          safety_notes: [
            "cannot_fork_platform", "cannot_mutate_governance_billing_plans",
            "cannot_override_tenant_isolation", "all_outputs_bounded_review_driven",
          ],
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
