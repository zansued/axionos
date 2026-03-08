import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { action, organization_id, campaign_id } = await req.json();
    if (!organization_id) return json({ error: "organization_id required" }, 400);

    const { data: isMember } = await supabase.rpc("is_org_member", { _user_id: user.id, _org_id: organization_id });
    if (!isMember) return json({ error: "Not a member" }, 403);

    switch (action) {
      case "overview": {
        const [campaigns, branches, syncPoints, failures, recoveries] = await Promise.all([
          supabase.from("orchestration_campaigns").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100),
          supabase.from("orchestration_branches").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(500),
          supabase.from("orchestration_sync_points").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200),
          supabase.from("orchestration_failures").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100),
          supabase.from("orchestration_recovery_events").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100),
        ]);

        const cl = campaigns.data || [];
        const bl = branches.data || [];
        const sl = syncPoints.data || [];
        const fl = failures.data || [];
        const rl = recoveries.data || [];

        const active = cl.filter((c: any) => ["active", "completing", "degraded"].includes(c.status));
        const blocked = sl.filter((s: any) => s.status === "waiting");
        const recovered = rl.filter((r: any) => r.recovery_status === "succeeded");

        return json({
          kpis: {
            active_campaigns: active.length,
            degraded_campaigns: cl.filter((c: any) => c.status === "degraded").length,
            recovered_campaigns: cl.filter((c: any) => c.status === "recovered").length,
            blocked_sync_points: blocked.length,
            abort_count: cl.filter((c: any) => c.status === "aborted").length,
            failure_count: fl.length,
            recovery_success_rate: rl.length > 0 ? Math.round((recovered.length / rl.length) * 100) : 0,
          },
          campaigns: cl,
          branches: bl.slice(0, 100),
          sync_points: sl.slice(0, 50),
          failures: fl.slice(0, 30),
          recovery_events: rl.slice(0, 30),
        });
      }

      case "campaign_detail": {
        if (!campaign_id) return json({ error: "campaign_id required" }, 400);
        const [camp, branches, syncs, failures, recoveries] = await Promise.all([
          supabase.from("orchestration_campaigns").select("*").eq("id", campaign_id).single(),
          supabase.from("orchestration_branches").select("*").eq("campaign_id", campaign_id).order("created_at", { ascending: true }).limit(100),
          supabase.from("orchestration_sync_points").select("*").eq("campaign_id", campaign_id).order("created_at", { ascending: true }).limit(50),
          supabase.from("orchestration_failures").select("*").eq("campaign_id", campaign_id).order("created_at", { ascending: false }).limit(30),
          supabase.from("orchestration_recovery_events").select("*").eq("campaign_id", campaign_id).order("created_at", { ascending: false }).limit(20),
        ]);
        return json({
          campaign: camp.data,
          branches: branches.data || [],
          sync_points: syncs.data || [],
          failures: failures.data || [],
          recovery_events: recoveries.data || [],
        });
      }

      case "explain_orchestration_state": {
        if (!campaign_id) return json({ error: "campaign_id required" }, 400);
        const { data: camp } = await supabase.from("orchestration_campaigns").select("*").eq("id", campaign_id).single();
        if (!camp) return json({ error: "Campaign not found" }, 404);

        const [brRes, syncRes, failRes] = await Promise.all([
          supabase.from("orchestration_branches").select("*").eq("campaign_id", campaign_id).limit(100),
          supabase.from("orchestration_sync_points").select("*").eq("campaign_id", campaign_id).limit(50),
          supabase.from("orchestration_failures").select("*").eq("campaign_id", campaign_id).limit(30),
        ]);
        const branches = brRes.data || [];
        const syncs = syncRes.data || [];
        const failures = failRes.data || [];

        const explanations: string[] = [];
        explanations.push(`Campaign "${camp.campaign_label}" is ${camp.status}. Recovery: ${camp.recovery_posture}. Abort: ${camp.abort_posture}.`);
        explanations.push(`Branches: ${camp.branch_completed}/${camp.branch_total} completed, ${camp.branch_failed} failed, ${camp.branch_blocked} blocked.`);

        const waiting = syncs.filter((s: any) => s.status === "waiting");
        if (waiting.length > 0) explanations.push(`${waiting.length} sync point(s) waiting — may be blocking progress.`);

        const critical = failures.filter((f: any) => f.severity === "critical" || f.severity === "high");
        if (critical.length > 0) explanations.push(`⚠️ ${critical.length} high/critical failure(s) detected.`);

        const campaignWide = failures.filter((f: any) => f.impact_scope === "campaign_wide");
        if (campaignWide.length > 0) explanations.push(`🔴 ${campaignWide.length} campaign-wide failure(s) — review immediately.`);

        if (camp.status === "degraded") explanations.push("Campaign is degraded — some branches failed but execution continues.");
        if (camp.status === "paused") explanations.push("Campaign is paused — operator action needed to resume.");

        return json({ campaign: camp, explanations });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    return json({ error: err.message }, 500);
  }
});
