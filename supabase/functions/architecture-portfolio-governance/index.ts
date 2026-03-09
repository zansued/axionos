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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action, organization_id, ...params } = body;
    if (!organization_id) throw new Error("organization_id required");

    const { data: _member } = await sc.from("organization_members").select("role").eq("organization_id", organization_id).eq("user_id", user.id).single();
    if (!_member) {
      return new Response(JSON.stringify({ error: "Not a member of this organization" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = (d: unknown) => new Response(JSON.stringify(d), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (action === "overview") {
      const [portfolios, members, recs] = await Promise.all([
        sc.from("architecture_portfolios").select("id, lifecycle_status").eq("organization_id", organization_id),
        sc.from("architecture_portfolio_members").select("id, lifecycle_state").eq("organization_id", organization_id),
        sc.from("architecture_portfolio_recommendations").select("id, status").eq("organization_id", organization_id),
      ]);
      return json({
        total_portfolios: portfolios.data?.length || 0,
        active_portfolios: portfolios.data?.filter((p: any) => p.lifecycle_status === "active").length || 0,
        total_members: members.data?.length || 0,
        active_members: members.data?.filter((m: any) => m.lifecycle_state === "active").length || 0,
        conflicting_members: members.data?.filter((m: any) => m.lifecycle_state === "conflicting").length || 0,
        open_recommendations: recs.data?.filter((r: any) => r.status === "open").length || 0,
      });
    }

    if (action === "portfolios") {
      const { data, error } = await sc.from("architecture_portfolios").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (action === "members") {
      const { portfolio_id } = params;
      let q = sc.from("architecture_portfolio_members").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (portfolio_id) q = q.eq("portfolio_id", portfolio_id);
      const { data, error } = await q;
      if (error) throw error;
      return json(data);
    }

    if (action === "recommendations") {
      const { portfolio_id } = params;
      let q = sc.from("architecture_portfolio_recommendations").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (portfolio_id) q = q.eq("portfolio_id", portfolio_id);
      const { data, error } = await q;
      if (error) throw error;
      return json(data);
    }

    if (action === "recompute") {
      const { data: portfolios } = await sc.from("architecture_portfolios").select("*").eq("organization_id", organization_id).eq("lifecycle_status", "active");
      const results: any[] = [];
      for (const p of portfolios || []) {
        const { data: members } = await sc.from("architecture_portfolio_members").select("*").eq("portfolio_id", p.id);
        const activeCount = (members || []).filter((m: any) => m.lifecycle_state === "active").length;
        const conflictingCount = (members || []).filter((m: any) => m.lifecycle_state === "conflicting").length;
        results.push({ portfolio_id: p.id, total_members: (members || []).length, active: activeCount, conflicting: conflictingCount });
      }
      return json({ recomputed: results });
    }

    if (action === "review_recommendation") {
      const { recommendation_id, status } = params;
      if (!recommendation_id || !status) throw new Error("recommendation_id and status required");
      const { error } = await sc.from("architecture_portfolio_recommendations").update({ status }).eq("id", recommendation_id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "archive_portfolio") {
      const { portfolio_id } = params;
      if (!portfolio_id) throw new Error("portfolio_id required");
      const { error } = await sc.from("architecture_portfolios").update({ lifecycle_status: "archived" }).eq("id", portfolio_id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "explain") {
      const { portfolio_id } = params;
      if (!portfolio_id) throw new Error("portfolio_id required");
      const { data: p } = await sc.from("architecture_portfolios").select("*").eq("id", portfolio_id).single();
      if (!p) throw new Error("Portfolio not found");
      const { data: members } = await sc.from("architecture_portfolio_members").select("*").eq("portfolio_id", portfolio_id);
      return json({
        portfolio: p,
        members: members || [],
        explanation: {
          theme: p.portfolio_theme,
          active: (members || []).filter((m: any) => m.lifecycle_state === "active").length,
          conflicting: (members || []).filter((m: any) => m.lifecycle_state === "conflicting").length,
          safety: [
            "Cannot mutate topology directly",
            "Cannot alter governance/billing/enforcement",
            "Cannot auto-approve migrations",
            "All outputs review-driven and auditable",
          ],
        },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
