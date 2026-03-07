// Tenant Policy Engine — AxionOS Sprint 29
// Edge function for tenant/workspace adaptive policy tuning APIs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { computeTenantTuning } from "../_shared/tenant-policy/tenant-policy-tuning-engine.ts";
import { guardOverrides } from "../_shared/tenant-policy/tenant-policy-override-guard.ts";
import { detectTenantDrift } from "../_shared/tenant-policy/tenant-policy-drift-detector.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseKey);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, organization_id } = body;

    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: unknown;

    switch (action) {
      case "tenant_policy_overview": {
        const [prefsRes, outcomesRes, recsRes] = await Promise.all([
          serviceClient.from("tenant_policy_preference_profiles").select("*").eq("organization_id", organization_id),
          serviceClient.from("tenant_policy_outcomes").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200),
          serviceClient.from("tenant_policy_recommendations").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50),
        ]);

        const prefs = prefsRes.data || [];
        const outcomes = outcomesRes.data || [];
        const recs = recsRes.data || [];

        const active = prefs.filter((p: any) => p.status === "active").length;
        const orgScoped = prefs.filter((p: any) => p.preference_scope === "organization").length;
        const wsScoped = prefs.filter((p: any) => p.preference_scope === "workspace").length;
        const helpful = outcomes.filter((o: any) => o.outcome_status === "helpful").length;
        const harmful = outcomes.filter((o: any) => o.outcome_status === "harmful").length;
        const openRecs = recs.filter((r: any) => r.status === "open").length;

        result = {
          total_profiles: prefs.length,
          active_profiles: active,
          org_scoped: orgScoped,
          ws_scoped: wsScoped,
          total_outcomes: outcomes.length,
          helpful_outcomes: helpful,
          harmful_outcomes: harmful,
          open_recommendations: openRecs,
          profiles: prefs,
          recent_outcomes: outcomes.slice(0, 20),
          recommendations: recs.slice(0, 20),
        };
        break;
      }

      case "tenant_policy_preference_profiles": {
        const { status: filterStatus, scope: filterScope } = body;
        let query = serviceClient.from("tenant_policy_preference_profiles").select("*").eq("organization_id", organization_id);
        if (filterStatus) query = query.eq("status", filterStatus);
        if (filterScope) query = query.eq("preference_scope", filterScope);
        const { data } = await query.order("created_at", { ascending: false });
        result = data || [];
        break;
      }

      case "tenant_policy_outcomes": {
        const { workspace_id } = body;
        let query = serviceClient.from("tenant_policy_outcomes").select("*, execution_policy_profiles(policy_name, policy_mode)").eq("organization_id", organization_id);
        if (workspace_id) query = query.eq("workspace_id", workspace_id);
        const { data } = await query.order("created_at", { ascending: false }).limit(100);
        result = data || [];
        break;
      }

      case "tenant_policy_recommendations": {
        const { status: filterStatus } = body;
        let query = serviceClient.from("tenant_policy_recommendations").select("*").eq("organization_id", organization_id);
        if (filterStatus) query = query.eq("status", filterStatus);
        const { data } = await query.order("created_at", { ascending: false });
        result = data || [];
        break;
      }

      case "tenant_policy_explain": {
        const { profile_id } = body;
        if (!profile_id) { result = { error: "profile_id required" }; break; }

        const [profileRes, outcomesRes] = await Promise.all([
          serviceClient.from("tenant_policy_preference_profiles").select("*").eq("id", profile_id).single(),
          serviceClient.from("tenant_policy_outcomes").select("*").eq("tenant_preference_profile_id", profile_id).order("created_at", { ascending: false }).limit(20),
        ]);

        const profile = profileRes.data;
        const outcomes = outcomesRes.data || [];
        const helpful = outcomes.filter((o: any) => o.outcome_status === "helpful").length;
        const harmful = outcomes.filter((o: any) => o.outcome_status === "harmful").length;

        // Run drift detection
        let drift = null;
        if (profile) {
          const globalOutcomes = await serviceClient.from("execution_policy_outcomes").select("outcome_status").eq("organization_id", organization_id);
          const globalData = globalOutcomes.data || [];
          const globalHelpful = globalData.filter((o: any) => o.outcome_status === "helpful").length;
          const globalTotal = globalData.length || 1;

          drift = detectTenantDrift({
            preference: profile,
            outcomes: outcomes.map((o: any) => ({ outcome_status: o.outcome_status, applied_mode: o.applied_mode, created_at: o.created_at })),
            global_helpful_rate: globalHelpful / globalTotal,
            global_harmful_rate: globalData.filter((o: any) => o.outcome_status === "harmful").length / globalTotal,
          });
        }

        result = {
          profile,
          outcome_summary: { total: outcomes.length, helpful, harmful },
          recent_outcomes: outcomes.slice(0, 10),
          drift_analysis: drift,
          explanation: profile
            ? `Tenant preference "${profile.preference_name}" (${profile.preference_scope} scope). Status: ${profile.status}. Preferred modes: ${(profile.preferred_policy_modes as string[]).join(", ")}. ${helpful} helpful, ${harmful} harmful outcomes. Drift: ${drift?.overall_health || "unknown"}.`
            : "Profile not found",
        };
        break;
      }

      case "recompute_tenant_policy_tuning": {
        const { workspace_id, context_class } = body;

        const [prefsRes, outcomesRes, profilesRes] = await Promise.all([
          serviceClient.from("tenant_policy_preference_profiles").select("*").eq("organization_id", organization_id).eq("status", "active"),
          serviceClient.from("tenant_policy_outcomes").select("*").eq("organization_id", organization_id),
          serviceClient.from("execution_policy_profiles").select("*").eq("organization_id", organization_id).eq("status", "active"),
        ]);

        const prefs = prefsRes.data || [];
        const outcomes = outcomesRes.data || [];
        const profiles = profilesRes.data || [];

        // Build outcome summaries
        const outcomeSummaries = new Map<string, { policy_id: string; context_class: string; helpful: number; harmful: number; neutral: number; total: number }>();
        for (const o of outcomes as any[]) {
          const key = `${o.execution_policy_profile_id}_${o.context_class}`;
          if (!outcomeSummaries.has(key)) {
            outcomeSummaries.set(key, { policy_id: o.execution_policy_profile_id, context_class: o.context_class, helpful: 0, harmful: 0, neutral: 0, total: 0 });
          }
          const s = outcomeSummaries.get(key)!;
          s.total++;
          if (o.outcome_status === "helpful") s.helpful++;
          else if (o.outcome_status === "harmful") s.harmful++;
          else s.neutral++;
        }

        const globalRanking = profiles.map((p: any) => ({
          policy_id: p.id,
          policy_mode: p.policy_mode,
          composite_score: (p.confidence_score ?? 0.5) * 0.5 + ((p.default_priority ?? 0) / 10) * 0.5,
        }));

        const tuning = computeTenantTuning({
          organization_id,
          workspace_id,
          context_class: context_class || "general",
          global_policy_ranking: globalRanking,
          tenant_preferences: prefs as any[],
          tenant_outcomes: Array.from(outcomeSummaries.values()),
        });

        // Run drift detection for all active preferences
        const driftResults = [];
        const globalOutcomes = await serviceClient.from("execution_policy_outcomes").select("outcome_status").eq("organization_id", organization_id);
        const globalData = globalOutcomes.data || [];
        const globalHelpful = globalData.filter((o: any) => o.outcome_status === "helpful").length;
        const globalTotal = globalData.length || 1;
        const globalHarmful = globalData.filter((o: any) => o.outcome_status === "harmful").length;

        for (const pref of prefs as any[]) {
          const prefOutcomes = outcomes.filter((o: any) => o.tenant_preference_profile_id === pref.id);
          const drift = detectTenantDrift({
            preference: pref,
            outcomes: (prefOutcomes as any[]).map((o: any) => ({ outcome_status: o.outcome_status, applied_mode: o.applied_mode, created_at: o.created_at })),
            global_helpful_rate: globalHelpful / globalTotal,
            global_harmful_rate: globalHarmful / globalTotal,
          });

          driftResults.push({ profile_id: pref.id, preference_name: pref.preference_name, ...drift });

          // Auto-generate recommendations for critical drift
          if (drift.overall_health === "critical") {
            await serviceClient.from("tenant_policy_recommendations").insert({
              organization_id,
              workspace_id: pref.workspace_id,
              recommendation_type: "rollback_to_default",
              target_profile_ids: [pref.id],
              recommendation_reason: { signals: drift.signals, reason_codes: drift.reason_codes },
              confidence_score: 0.9,
              status: "open",
            });
          }
        }

        await serviceClient.from("audit_logs").insert({
          user_id: user.id, action: "tenant_policy_tuning_computed", category: "learning",
          entity_type: "tenant_policy_preference_profiles",
          message: `Tenant tuning recomputed: ${prefs.length} preferences, ${driftResults.length} drift checks`,
          severity: "info", organization_id,
        });

        result = { tuning, drift_results: driftResults };
        break;
      }

      case "activate_tenant_policy_profile": {
        const { profile_id } = body;
        if (!profile_id) { result = { error: "profile_id required" }; break; }

        const { data: existing } = await serviceClient.from("tenant_policy_preference_profiles").select("*").eq("id", profile_id).single();
        if (!existing || existing.organization_id !== organization_id) {
          result = { error: "Profile not found or cross-org" }; break;
        }

        // Validate override limits
        const guard = guardOverrides(
          Object.entries(existing.override_limits as Record<string, number>).map(([key, val]) => ({ key, requested_delta: val })),
          existing.override_limits as Record<string, unknown>,
        );

        if (guard.blocked_overrides.length > 0) {
          result = { error: "Override limits contain forbidden keys", blocked: guard.blocked_overrides }; break;
        }

        await serviceClient.from("tenant_policy_preference_profiles").update({ status: "active" }).eq("id", profile_id);

        await serviceClient.from("audit_logs").insert({
          user_id: user.id, action: "tenant_policy_profile_activated", category: "learning",
          entity_type: "tenant_policy_preference_profiles", entity_id: profile_id,
          message: `Tenant profile "${existing.preference_name}" activated`, severity: "info", organization_id,
        });

        result = { success: true, profile_id };
        break;
      }

      case "deprecate_tenant_policy_profile": {
        const { profile_id } = body;
        if (!profile_id) { result = { error: "profile_id required" }; break; }

        const { data: existing } = await serviceClient.from("tenant_policy_preference_profiles").select("*").eq("id", profile_id).single();
        if (!existing || existing.organization_id !== organization_id) {
          result = { error: "Profile not found or cross-org" }; break;
        }

        await serviceClient.from("tenant_policy_preference_profiles").update({ status: "deprecated" }).eq("id", profile_id);

        await serviceClient.from("audit_logs").insert({
          user_id: user.id, action: "tenant_policy_profile_deprecated", category: "learning",
          entity_type: "tenant_policy_preference_profiles", entity_id: profile_id,
          message: `Tenant profile "${existing.preference_name}" deprecated`, severity: "info", organization_id,
        });

        result = { success: true, profile_id };
        break;
      }

      case "accept_tenant_policy_recommendation": {
        const { recommendation_id } = body;
        if (!recommendation_id) { result = { error: "recommendation_id required" }; break; }

        const { data: rec } = await serviceClient.from("tenant_policy_recommendations").select("*").eq("id", recommendation_id).single();
        if (!rec || rec.organization_id !== organization_id) {
          result = { error: "Not found or cross-org" }; break;
        }

        await serviceClient.from("tenant_policy_recommendations").update({ status: "accepted" }).eq("id", recommendation_id);

        await serviceClient.from("audit_logs").insert({
          user_id: user.id, action: "tenant_policy_recommendation_reviewed", category: "learning",
          entity_type: "tenant_policy_recommendations", entity_id: recommendation_id,
          message: `Tenant recommendation accepted: ${rec.recommendation_type}`, severity: "info", organization_id,
        });

        result = { success: true };
        break;
      }

      case "reject_tenant_policy_recommendation": {
        const { recommendation_id } = body;
        if (!recommendation_id) { result = { error: "recommendation_id required" }; break; }

        const { data: rec } = await serviceClient.from("tenant_policy_recommendations").select("*").eq("id", recommendation_id).single();
        if (!rec || rec.organization_id !== organization_id) {
          result = { error: "Not found or cross-org" }; break;
        }

        await serviceClient.from("tenant_policy_recommendations").update({ status: "rejected" }).eq("id", recommendation_id);

        await serviceClient.from("audit_logs").insert({
          user_id: user.id, action: "tenant_policy_recommendation_reviewed", category: "learning",
          entity_type: "tenant_policy_recommendations", entity_id: recommendation_id,
          message: `Tenant recommendation rejected: ${rec.recommendation_type}`, severity: "info", organization_id,
        });

        result = { success: true };
        break;
      }

      default:
        result = { error: `Unknown action: ${action}` };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Tenant Policy Engine error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
