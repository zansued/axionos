import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sc = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const { action, organization_id, ...params } = body;

    if (!organization_id) throw new Error("organization_id required");

    // Overview
    if (action === "overview") {
      const [pilots, outcomes, rollbacks, reviews] = await Promise.all([
        sc.from("architecture_rollout_pilots").select("id, status").eq("organization_id", organization_id),
        sc.from("architecture_rollout_pilot_outcomes").select("id, outcome_status").eq("organization_id", organization_id),
        sc.from("architecture_rollout_pilot_rollbacks").select("id").eq("organization_id", organization_id),
        sc.from("architecture_rollout_pilot_reviews").select("id, review_status").eq("organization_id", organization_id),
      ]);
      return new Response(JSON.stringify({
        total_pilots: pilots.data?.length || 0,
        active_pilots: pilots.data?.filter((p: any) => p.status === "active").length || 0,
        total_outcomes: outcomes.data?.length || 0,
        total_rollbacks: rollbacks.data?.length || 0,
        total_reviews: reviews.data?.length || 0,
        by_status: (pilots.data || []).reduce((acc: any, p: any) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {}),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // List pilots
    if (action === "pilots") {
      const { data, error } = await sc.from("architecture_rollout_pilots").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // List outcomes
    if (action === "outcomes") {
      const { data, error } = await sc.from("architecture_rollout_pilot_outcomes").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // List rollbacks
    if (action === "rollbacks") {
      const { data, error } = await sc.from("architecture_rollout_pilot_rollbacks").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // List reviews
    if (action === "reviews") {
      const { data, error } = await sc.from("architecture_rollout_pilot_reviews").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Explain
    if (action === "explain") {
      const { pilot_id } = params;
      if (!pilot_id) throw new Error("pilot_id required");
      const { data: pilot } = await sc.from("architecture_rollout_pilots").select("*").eq("id", pilot_id).single();
      if (!pilot) throw new Error("Pilot not found");
      const { data: plan } = await sc.from("architecture_change_plans").select("*").eq("id", pilot.plan_id).single();
      return new Response(JSON.stringify({
        pilot,
        plan: plan || {},
        explanation: {
          what: `Pilot '${pilot.pilot_name}' testing plan '${plan?.plan_name || "unknown"}'`,
          scope: pilot.pilot_scope,
          mode: pilot.pilot_mode,
          baseline: pilot.baseline_ref,
          rollback_triggers: pilot.rollback_triggers,
          stop_conditions: pilot.stop_conditions,
          safety: [
            "Cannot trigger broad rollout",
            "Cannot mutate governance/billing/enforcement",
            "Requires rollback triggers",
            "Requires baseline comparability",
          ],
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Recompute — create pilot candidates from rollout-ready plans
    if (action === "recompute") {
      const { data: plans } = await sc.from("architecture_change_plans").select("*").eq("organization_id", organization_id).eq("status", "ready_for_rollout");
      if (!plans || plans.length === 0) {
        return new Response(JSON.stringify({ pilots_created: 0, message: "No rollout-ready plans" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let created = 0;
      for (const plan of plans) {
        const existing = await sc.from("architecture_rollout_pilots").select("id").eq("plan_id", plan.id).eq("organization_id", organization_id);
        if (existing.data && existing.data.length > 0) continue;

        await sc.from("architecture_rollout_pilots").insert({
          organization_id,
          plan_id: plan.id,
          pilot_name: `Pilot: ${plan.plan_name}`,
          pilot_scope: plan.target_scope,
          target_entities: plan.blast_radius || {},
          pilot_constraints: plan.validation_requirements || {},
          pilot_mode: "shadow",
          baseline_ref: { plan_id: plan.id, created_at: new Date().toISOString() },
          rollback_triggers: [{ type: "harm_score_threshold", value: 0.3 }, { type: "rollback_signal_count", value: 3 }],
          stop_conditions: [{ type: "max_duration_hours", value: 72 }, { type: "critical_risk_flag", value: true }],
          status: "draft",
        });
        created++;
      }

      return new Response(JSON.stringify({ pilots_created: created }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Approve
    if (action === "approve_pilot") {
      const { pilot_id, review_notes } = params;
      if (!pilot_id) throw new Error("pilot_id required");
      await sc.from("architecture_rollout_pilots").update({ status: "approved" }).eq("id", pilot_id);
      await sc.from("architecture_rollout_pilot_reviews").insert({
        organization_id, pilot_id, review_status: "approved", review_notes: review_notes || null,
      });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Activate
    if (action === "activate_pilot") {
      const { pilot_id } = params;
      if (!pilot_id) throw new Error("pilot_id required");
      const { data: pilot } = await sc.from("architecture_rollout_pilots").select("status").eq("id", pilot_id).single();
      if (!pilot || pilot.status !== "approved") throw new Error("Pilot must be approved to activate");
      await sc.from("architecture_rollout_pilots").update({ status: "active" }).eq("id", pilot_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pause
    if (action === "pause_pilot") {
      const { pilot_id, review_notes } = params;
      if (!pilot_id) throw new Error("pilot_id required");
      await sc.from("architecture_rollout_pilots").update({ status: "paused" }).eq("id", pilot_id);
      await sc.from("architecture_rollout_pilot_reviews").insert({
        organization_id, pilot_id, review_status: "paused", review_notes: review_notes || null,
      });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Rollback
    if (action === "rollback_pilot") {
      const { pilot_id, rollback_reason, rollback_mode } = params;
      if (!pilot_id) throw new Error("pilot_id required");
      const { data: pilot } = await sc.from("architecture_rollout_pilots").select("*").eq("id", pilot_id).single();
      if (!pilot || !["active", "paused"].includes(pilot.status)) throw new Error("Pilot must be active or paused to rollback");
      await sc.from("architecture_rollout_pilots").update({ status: "rolled_back" }).eq("id", pilot_id);
      await sc.from("architecture_rollout_pilot_rollbacks").insert({
        organization_id, pilot_id,
        restored_state: { baseline_ref: pilot.baseline_ref, restored_at: new Date().toISOString() },
        rollback_reason: rollback_reason || { reason: "Manual rollback" },
        rollback_mode: rollback_mode || "manual",
      });
      await sc.from("architecture_rollout_pilot_reviews").insert({
        organization_id, pilot_id, review_status: "rolled_back", review_notes: "Pilot rolled back",
      });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Reject
    if (action === "reject_pilot") {
      const { pilot_id, review_notes, review_reason_codes } = params;
      if (!pilot_id) throw new Error("pilot_id required");
      await sc.from("architecture_rollout_pilots").update({ status: "rejected" }).eq("id", pilot_id);
      await sc.from("architecture_rollout_pilot_reviews").insert({
        organization_id, pilot_id, review_status: "rejected", review_notes, review_reason_codes,
      });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Archive
    if (action === "archive_pilot") {
      const { pilot_id } = params;
      if (!pilot_id) throw new Error("pilot_id required");
      await sc.from("architecture_rollout_pilots").update({ status: "archived" }).eq("id", pilot_id);
      await sc.from("architecture_rollout_pilot_reviews").insert({
        organization_id, pilot_id, review_status: "archived",
      });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
