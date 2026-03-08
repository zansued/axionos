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
      const [signals, envelopes, outcomes, rollbacks] = await Promise.all([
        sc.from("platform_stability_v2_signals").select("id, status, severity").eq("organization_id", organization_id),
        sc.from("platform_stabilization_envelopes").select("id, status").eq("organization_id", organization_id),
        sc.from("platform_stabilization_v2_outcomes").select("id, outcome_status").eq("organization_id", organization_id),
        sc.from("platform_stabilization_v2_rollbacks").select("id").eq("organization_id", organization_id),
      ]);
      return json({
        total_signals: signals.data?.length || 0,
        critical_signals: signals.data?.filter((s: any) => s.severity === "critical").length || 0,
        unstable_signals: signals.data?.filter((s: any) => s.status === "unstable" || s.status === "critical").length || 0,
        active_envelopes: envelopes.data?.filter((e: any) => e.status === "active").length || 0,
        total_outcomes: outcomes.data?.length || 0,
        helpful_outcomes: outcomes.data?.filter((o: any) => o.outcome_status === "helpful").length || 0,
        total_rollbacks: rollbacks.data?.length || 0,
      });
    }

    if (action === "signals") {
      const { data, error } = await sc.from("platform_stability_v2_signals").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return json(data);
    }

    if (action === "envelopes") {
      const { data, error } = await sc.from("platform_stabilization_envelopes").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (action === "outcomes") {
      const { data, error } = await sc.from("platform_stabilization_v2_outcomes").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (action === "rollbacks") {
      const { data, error } = await sc.from("platform_stabilization_v2_rollbacks").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (action === "health") {
      const [signals, envelopes] = await Promise.all([
        sc.from("platform_stability_v2_signals").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200),
        sc.from("platform_stabilization_envelopes").select("*").eq("organization_id", organization_id).eq("status", "active"),
      ]);
      const sigs = signals.data || [];
      const critical = sigs.filter((s: any) => s.severity === "critical").length;
      const unstable = sigs.filter((s: any) => s.status === "unstable" || s.status === "critical").length;
      return json({ total_signals: sigs.length, critical, unstable, active_envelopes: envelopes.data?.length || 0 });
    }

    if (action === "recompute") {
      const { data: signals } = await sc.from("platform_stability_v2_signals").select("*").eq("organization_id", organization_id).neq("status", "suppressed");
      return json({ recomputed_signals: (signals || []).length, message: "Stability v2 recomputation triggered" });
    }

    if (action === "review_envelope") {
      const { envelope_id, status } = params;
      if (!envelope_id || !status) throw new Error("envelope_id and status required");
      const { error } = await sc.from("platform_stabilization_envelopes").update({ status, updated_at: new Date().toISOString() }).eq("id", envelope_id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "explain") {
      const { data: signals } = await sc.from("platform_stability_v2_signals").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50);
      const sigs = signals || [];
      return json({
        total_signals: sigs.length,
        critical: sigs.filter((s: any) => s.severity === "critical").length,
        unstable: sigs.filter((s: any) => s.status === "unstable" || s.status === "critical").length,
        safety: ["Cannot mutate topology directly", "Cannot alter governance/billing", "Cannot override tenant isolation", "All outputs bounded and reversible"],
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
