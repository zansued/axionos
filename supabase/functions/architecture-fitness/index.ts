import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const { action, organization_id, ...params } = body;
    if (!organization_id) throw new Error("organization_id required");

    const json = (d: unknown) => new Response(JSON.stringify(d), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (action === "overview") {
      const [dims, evals, recs, reviews] = await Promise.all([
        sc.from("architecture_fitness_dimensions").select("id, status").eq("organization_id", organization_id),
        sc.from("architecture_fitness_evaluations").select("id, degradation_status").eq("organization_id", organization_id),
        sc.from("architecture_fitness_recommendations").select("id, status").eq("organization_id", organization_id),
        sc.from("architecture_fitness_reviews").select("id, review_status").eq("organization_id", organization_id),
      ]);
      return json({
        total_dimensions: dims.data?.length || 0,
        active_dimensions: dims.data?.filter((d: any) => d.status === "active").length || 0,
        total_evaluations: evals.data?.length || 0,
        critical_evaluations: evals.data?.filter((e: any) => e.degradation_status === "critical").length || 0,
        degrading_evaluations: evals.data?.filter((e: any) => e.degradation_status === "degrading").length || 0,
        open_recommendations: recs.data?.filter((r: any) => r.status === "open").length || 0,
        total_reviews: reviews.data?.length || 0,
      });
    }

    if (action === "dimensions") {
      const { data, error } = await sc.from("architecture_fitness_dimensions").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (action === "evaluations") {
      const { data, error } = await sc.from("architecture_fitness_evaluations").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return json(data);
    }

    if (action === "recommendations") {
      const { data, error } = await sc.from("architecture_fitness_recommendations").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (action === "reviews") {
      const { data, error } = await sc.from("architecture_fitness_reviews").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (action === "recompute") {
      const { data: dims } = await sc.from("architecture_fitness_dimensions").select("*").eq("organization_id", organization_id).eq("status", "active");
      return json({ recomputed_dimensions: (dims || []).length, message: "Fitness recomputation triggered" });
    }

    if (action === "review_recommendation") {
      const { recommendation_id, status } = params;
      if (!recommendation_id || !status) throw new Error("recommendation_id and status required");
      const { error } = await sc.from("architecture_fitness_recommendations").update({ status }).eq("id", recommendation_id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "health") {
      const { data: evals } = await sc.from("architecture_fitness_evaluations").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200);
      const critical = (evals || []).filter((e: any) => e.degradation_status === "critical").length;
      const degrading = (evals || []).filter((e: any) => e.degradation_status === "degrading").length;
      const healthy = (evals || []).filter((e: any) => e.degradation_status === "healthy").length;
      const total = (evals || []).length;
      return json({ total_evaluations: total, critical, degrading, healthy, health_ratio: total > 0 ? Math.round((healthy / total) * 100) : 100 });
    }

    if (action === "explain") {
      const { dimension_id } = params;
      if (!dimension_id) throw new Error("dimension_id required");
      const { data: dim } = await sc.from("architecture_fitness_dimensions").select("*").eq("id", dimension_id).single();
      if (!dim) throw new Error("Dimension not found");
      const { data: evals } = await sc.from("architecture_fitness_evaluations").select("*").eq("dimension_id", dimension_id).order("created_at", { ascending: false }).limit(10);
      return json({
        dimension: dim,
        recent_evaluations: evals || [],
        safety: ["Cannot mutate topology directly", "Cannot alter governance/billing", "All outputs advisory-first"],
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
