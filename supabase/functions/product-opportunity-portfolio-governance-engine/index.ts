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

    // ===== OVERVIEW =====
    if (action === "overview") {
      const [portfolios, items, conflicts, decisions, outcomes] = await Promise.all([
        sc.from("product_opportunity_portfolios").select("id, lifecycle_status").eq("organization_id", organization_id),
        sc.from("product_opportunity_portfolio_items").select("id, governance_state, portfolio_priority_score, confidence_score").eq("organization_id", organization_id),
        sc.from("product_opportunity_conflicts").select("id, status, severity").eq("organization_id", organization_id),
        sc.from("product_opportunity_decisions").select("id, decision_type, decision_status").eq("organization_id", organization_id),
        sc.from("product_opportunity_outcomes").select("id, outcome_status").eq("organization_id", organization_id),
      ]);

      const allItems = items.data || [];
      const allConflicts = conflicts.data || [];

      return json({
        total_portfolios: portfolios.data?.length || 0,
        active_portfolios: portfolios.data?.filter((p: any) => p.lifecycle_status === "active").length || 0,
        total_items: allItems.length,
        promoted: allItems.filter((i: any) => i.governance_state === "promoted").length,
        deferred: allItems.filter((i: any) => i.governance_state === "deferred").length,
        rejected: allItems.filter((i: any) => i.governance_state === "rejected").length,
        monitoring: allItems.filter((i: any) => i.governance_state === "monitor").length,
        candidates: allItems.filter((i: any) => i.governance_state === "candidate").length,
        open_conflicts: allConflicts.filter((c: any) => c.status === "open").length,
        critical_conflicts: allConflicts.filter((c: any) => c.severity === "critical").length,
        pending_decisions: (decisions.data || []).filter((d: any) => d.decision_status === "pending").length,
        total_outcomes: outcomes.data?.length || 0,
        helpful_outcomes: (outcomes.data || []).filter((o: any) => o.outcome_status === "helpful").length,
        avg_priority: allItems.length > 0
          ? Number((allItems.reduce((s: number, i: any) => s + Number(i.portfolio_priority_score || 0), 0) / allItems.length).toFixed(4))
          : 0,
        avg_confidence: allItems.length > 0
          ? Number((allItems.reduce((s: number, i: any) => s + Number(i.confidence_score || 0), 0) / allItems.length).toFixed(4))
          : 0,
      });
    }

    // ===== BUILD PORTFOLIOS =====
    if (action === "build_portfolios") {
      const { data: existing } = await sc.from("product_opportunity_portfolios").select("id").eq("organization_id", organization_id).eq("lifecycle_status", "active");
      return json({ portfolios: existing || [], message: "Portfolio build triggered — use product intelligence outputs to populate items" });
    }

    // ===== RANK OPPORTUNITIES =====
    if (action === "rank_opportunities") {
      const { portfolio_id } = params;
      let q = sc.from("product_opportunity_portfolio_items").select("*").eq("organization_id", organization_id).order("portfolio_priority_score", { ascending: false });
      if (portfolio_id) q = q.eq("portfolio_id", portfolio_id);
      const { data, error } = await q;
      if (error) throw error;
      return json(data);
    }

    // ===== DETECT CONFLICTS =====
    if (action === "detect_conflicts") {
      const { portfolio_id } = params;
      let q = sc.from("product_opportunity_conflicts").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (portfolio_id) q = q.eq("portfolio_id", portfolio_id);
      const { data, error } = await q;
      if (error) throw error;
      return json(data);
    }

    // ===== EVALUATE CAPACITY =====
    if (action === "evaluate_capacity") {
      const { data, error } = await sc.from("product_opportunity_capacity_models").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(1);
      if (error) throw error;
      return json(data?.[0] || { queue_pressure_score: 0, resource_utilization_score: 0, capacity_headroom_score: 1, can_promote: true });
    }

    // ===== RECOMMEND DECISIONS =====
    if (action === "recommend_decisions") {
      const { data, error } = await sc.from("product_opportunity_decisions").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    // ===== REVIEW DECISION =====
    if (action === "review_decision") {
      const { decision_id, status } = params;
      if (!decision_id || !status) throw new Error("decision_id and status required");
      const { error } = await sc.from("product_opportunity_decisions").update({ decision_status: status, updated_at: new Date().toISOString() }).eq("id", decision_id);
      if (error) throw error;
      return json({ success: true });
    }

    // ===== PORTFOLIO OUTCOMES =====
    if (action === "portfolio_outcomes") {
      const { data, error } = await sc.from("product_opportunity_outcomes").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    // ===== PORTFOLIOS LIST =====
    if (action === "portfolios") {
      const { data, error } = await sc.from("product_opportunity_portfolios").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    // ===== EXPLAIN =====
    if (action === "explain") {
      const { portfolio_id } = params;
      if (!portfolio_id) throw new Error("portfolio_id required");
      const [portfolio, items, conflicts, decisions] = await Promise.all([
        sc.from("product_opportunity_portfolios").select("*").eq("id", portfolio_id).single(),
        sc.from("product_opportunity_portfolio_items").select("*").eq("portfolio_id", portfolio_id),
        sc.from("product_opportunity_conflicts").select("*").eq("portfolio_id", portfolio_id),
        sc.from("product_opportunity_decisions").select("*").eq("portfolio_id", portfolio_id),
      ]);
      return json({
        portfolio: portfolio.data,
        items: items.data || [],
        conflicts: conflicts.data || [],
        decisions: decisions.data || [],
        safety_constraints: [
          "Cannot auto-promote opportunities to execution",
          "Cannot auto-allocate implementation capacity",
          "Cannot auto-create initiatives without human review",
          "Cannot mutate architecture, governance, or billing",
          "Marketplace/ecosystem remains frozen",
        ],
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
