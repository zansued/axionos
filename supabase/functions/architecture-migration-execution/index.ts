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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
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
      const [execs, outcomes, rollbacks, reviews, profiles] = await Promise.all([
        sc.from("architecture_migration_executions").select("id, migration_state").eq("organization_id", organization_id),
        sc.from("architecture_migration_outcomes").select("id, outcome_status").eq("organization_id", organization_id),
        sc.from("architecture_migration_rollbacks").select("id").eq("organization_id", organization_id),
        sc.from("architecture_migration_reviews").select("id").eq("organization_id", organization_id),
        sc.from("architecture_migration_governance_profiles").select("id").eq("organization_id", organization_id),
      ]);
      return json({
        total_migrations: execs.data?.length || 0,
        active_migrations: execs.data?.filter((e: any) => ["preparing", "checkpoint_ready", "executing"].includes(e.migration_state)).length || 0,
        total_outcomes: outcomes.data?.length || 0,
        total_rollbacks: rollbacks.data?.length || 0,
        total_reviews: reviews.data?.length || 0,
        total_governance_profiles: profiles.data?.length || 0,
        by_state: (execs.data || []).reduce((acc: any, e: any) => { acc[e.migration_state] = (acc[e.migration_state] || 0) + 1; return acc; }, {}),
      });
    }

    if (action === "executions") {
      const { data, error } = await sc.from("architecture_migration_executions").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (action === "outcomes") {
      const { data, error } = await sc.from("architecture_migration_outcomes").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (action === "rollbacks") {
      const { data, error } = await sc.from("architecture_migration_rollbacks").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (action === "governance_profiles") {
      const { data, error } = await sc.from("architecture_migration_governance_profiles").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (action === "explain") {
      const { migration_id } = params;
      if (!migration_id) throw new Error("migration_id required");
      const { data: mig } = await sc.from("architecture_migration_executions").select("*").eq("id", migration_id).single();
      if (!mig) throw new Error("Migration not found");
      const { data: plan } = await sc.from("architecture_change_plans").select("plan_name").eq("id", mig.plan_id).single();
      const phases = Array.isArray(mig.phase_sequence) ? mig.phase_sequence : [];
      return json({
        migration: mig,
        plan_name: plan?.plan_name || "unknown",
        explanation: {
          what: `Migration '${mig.migration_name}' executing plan '${plan?.plan_name || "unknown"}'`,
          scope: mig.target_scope,
          active_phase: mig.active_phase,
          total_phases: phases.length,
          rollback_blueprint: mig.rollback_blueprint,
          validation_blueprint: mig.validation_blueprint,
          safety: [
            "Cannot expand scope without staged approval",
            "Cannot skip checkpoint validation",
            "Cannot mutate governance/billing/enforcement",
            "All execution review-driven and reversible",
          ],
        },
      });
    }

    if (action === "prepare_migration") {
      const { plan_id, pilot_id, migration_name, target_scope, phase_count } = params;
      if (!plan_id || !migration_name) throw new Error("plan_id and migration_name required");
      const phases = Array.from({ length: phase_count || 3 }, (_, i) => ({
        phase_number: i, phase_name: `Phase ${i + 1}`, scope_slice: {}, status: "pending",
        validation_hooks: ["contract_compliance", "rollback_readiness", "tenant_isolation"],
        rollback_hooks: ["restore_baseline"],
      }));
      const { data, error } = await sc.from("architecture_migration_executions").insert({
        organization_id, plan_id, pilot_id: pilot_id || null,
        migration_name, target_scope: target_scope || "bounded",
        phase_sequence: phases, migration_state: "draft",
        baseline_ref: { created_at: new Date().toISOString() },
        rollback_blueprint: { mode: "ordered_unwind" },
        validation_blueprint: { checkpoints: ["pre_phase", "post_phase"] },
      }).select().single();
      if (error) throw error;
      return json(data);
    }

    if (action === "activate_phase") {
      const { migration_id } = params;
      if (!migration_id) throw new Error("migration_id required");
      const { data: mig } = await sc.from("architecture_migration_executions").select("*").eq("id", migration_id).single();
      if (!mig) throw new Error("Migration not found");
      if (!["approved", "checkpoint_ready"].includes(mig.migration_state)) throw new Error("Must be approved or checkpoint_ready to activate phase");
      await sc.from("architecture_migration_executions").update({ migration_state: "executing" }).eq("id", migration_id);
      await sc.from("architecture_migration_reviews").insert({ organization_id, migration_execution_id: migration_id, review_status: "executing" });
      return json({ success: true });
    }

    if (action === "pause_migration") {
      const { migration_id, review_notes } = params;
      if (!migration_id) throw new Error("migration_id required");
      await sc.from("architecture_migration_executions").update({ migration_state: "paused" }).eq("id", migration_id);
      await sc.from("architecture_migration_reviews").insert({ organization_id, migration_execution_id: migration_id, review_status: "paused", review_notes });
      return json({ success: true });
    }

    if (action === "continue_migration") {
      const { migration_id } = params;
      if (!migration_id) throw new Error("migration_id required");
      const { data: mig } = await sc.from("architecture_migration_executions").select("migration_state").eq("id", migration_id).single();
      if (!mig || mig.migration_state !== "paused") throw new Error("Must be paused to continue");
      await sc.from("architecture_migration_executions").update({ migration_state: "checkpoint_ready" }).eq("id", migration_id);
      return json({ success: true });
    }

    if (action === "rollback_migration") {
      const { migration_id, rollback_scope, rollback_reason, rollback_mode } = params;
      if (!migration_id) throw new Error("migration_id required");
      const { data: mig } = await sc.from("architecture_migration_executions").select("*").eq("id", migration_id).single();
      if (!mig || !["executing", "paused", "checkpoint_ready"].includes(mig.migration_state)) throw new Error("Migration must be executing, paused, or checkpoint_ready to rollback");
      await sc.from("architecture_migration_executions").update({ migration_state: "rolled_back" }).eq("id", migration_id);
      await sc.from("architecture_migration_rollbacks").insert({
        organization_id, migration_execution_id: migration_id,
        rollback_scope: rollback_scope || "full",
        restored_state: { baseline_ref: mig.baseline_ref, restored_at: new Date().toISOString() },
        rollback_reason: rollback_reason || { reason: "Manual rollback" },
        rollback_mode: rollback_mode || "manual",
      });
      await sc.from("architecture_migration_reviews").insert({ organization_id, migration_execution_id: migration_id, review_status: "rolled_back" });
      return json({ success: true });
    }

    if (action === "archive_migration") {
      const { migration_id } = params;
      if (!migration_id) throw new Error("migration_id required");
      await sc.from("architecture_migration_executions").update({ migration_state: "archived" }).eq("id", migration_id);
      await sc.from("architecture_migration_reviews").insert({ organization_id, migration_execution_id: migration_id, review_status: "archived" });
      return json({ success: true });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
