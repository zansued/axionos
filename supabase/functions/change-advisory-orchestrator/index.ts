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
      const [signals, agendas, reviews] = await Promise.all([
        sc.from("change_advisory_signals").select("id, status").eq("organization_id", organization_id),
        sc.from("architecture_change_agendas").select("id, status, agenda_health_score").eq("organization_id", organization_id),
        sc.from("architecture_change_agenda_reviews").select("id, review_status").eq("organization_id", organization_id),
      ]);
      return json({
        total_signals: signals.data?.length || 0,
        active_signals: signals.data?.filter((s: any) => s.status === "active").length || 0,
        total_agendas: agendas.data?.length || 0,
        accepted_agendas: agendas.data?.filter((a: any) => a.status === "accepted").length || 0,
        avg_health: agendas.data?.length ? Math.round((agendas.data.reduce((s: number, a: any) => s + (a.agenda_health_score || 0), 0) / agendas.data.length) * 100) / 100 : 0,
        total_reviews: reviews.data?.length || 0,
      });
    }

    if (action === "signals") {
      const { data, error } = await sc.from("change_advisory_signals").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return json(data);
    }

    if (action === "agendas") {
      const { data, error } = await sc.from("architecture_change_agendas").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (action === "reviews") {
      const { data, error } = await sc.from("architecture_change_agenda_reviews").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (action === "health") {
      const { data: agendas } = await sc.from("architecture_change_agendas").select("*").eq("organization_id", organization_id).eq("status", "accepted").order("created_at", { ascending: false }).limit(1);
      const latest = agendas?.[0];
      if (!latest) return json({ message: "No accepted agenda found", health_score: null });
      return json({ agenda_id: latest.id, health_score: latest.agenda_health_score, status: latest.status });
    }

    if (action === "recompute") {
      const { data: signals } = await sc.from("change_advisory_signals").select("*").eq("organization_id", organization_id).eq("status", "active");
      return json({ recomputed_signals: (signals || []).length, message: "Change advisory recomputation triggered" });
    }

    if (action === "review_agenda") {
      const { agenda_id, status } = params;
      if (!agenda_id || !status) throw new Error("agenda_id and status required");
      const { error } = await sc.from("architecture_change_agendas").update({ status }).eq("id", agenda_id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "explain") {
      const { agenda_id } = params;
      if (!agenda_id) throw new Error("agenda_id required");
      const { data: agenda } = await sc.from("architecture_change_agendas").select("*").eq("id", agenda_id).single();
      if (!agenda) throw new Error("Agenda not found");
      return json({
        agenda,
        safety: ["Cannot mutate topology directly", "Cannot alter governance/billing", "All outputs advisory-first", "Cannot auto-execute changes"],
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
