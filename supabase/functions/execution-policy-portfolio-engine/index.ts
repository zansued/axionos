// Execution Policy Portfolio Engine — Sprint 28
// Edge function for portfolio optimization APIs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { evaluatePortfolio, evaluatePolicyForContext } from "../_shared/execution-policy/execution-policy-portfolio-evaluator.ts";
import { rankAllPolicies } from "../_shared/execution-policy/execution-policy-ranking-engine.ts";
import { detectAllConflicts } from "../_shared/execution-policy/execution-policy-conflict-resolver.ts";
import { recommendLifecycleStatus, validateTransition, buildTransition } from "../_shared/execution-policy/execution-policy-lifecycle-manager.ts";

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

    const { data: _member } = await serviceClient.from("organization_members").select("role").eq("organization_id", organization_id).eq("user_id", user.id).single();
    if (!_member) {
      return new Response(JSON.stringify({ error: "Not a member of this organization" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: unknown;

    switch (action) {
      case "execution_policy_portfolio_overview": {
        const [entriesRes, profilesRes, outcomesRes, recsRes] = await Promise.all([
          serviceClient.from("execution_policy_portfolio_entries").select("*, execution_policy_profiles(policy_name, policy_mode, policy_scope, status)").eq("organization_id", organization_id),
          serviceClient.from("execution_policy_profiles").select("*").eq("organization_id", organization_id),
          serviceClient.from("execution_policy_outcomes").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200),
          serviceClient.from("execution_policy_portfolio_recommendations").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50),
        ]);

        const entries = entriesRes.data || [];
        const profiles = profilesRes.data || [];
        const outcomes = outcomesRes.data || [];
        const recommendations = recsRes.data || [];

        const active = entries.filter((e: any) => e.lifecycle_status === "active").length;
        const watch = entries.filter((e: any) => e.lifecycle_status === "watch").length;
        const limited = entries.filter((e: any) => e.lifecycle_status === "limited").length;
        const deprecated = entries.filter((e: any) => e.lifecycle_status === "deprecated").length;
        const candidate = entries.filter((e: any) => e.lifecycle_status === "candidate").length;
        const openRecs = recommendations.filter((r: any) => r.status === "open").length;

        result = {
          total_entries: entries.length,
          active, watch, limited, deprecated, candidate,
          total_recommendations: recommendations.length,
          open_recommendations: openRecs,
          entries,
          profiles,
          recent_outcomes: outcomes.slice(0, 20),
          recommendations: recommendations.slice(0, 20),
        };
        break;
      }

      case "execution_policy_portfolio_entries": {
        const { lifecycle_status } = body;
        let query = serviceClient.from("execution_policy_portfolio_entries")
          .select("*, execution_policy_profiles(policy_name, policy_mode, policy_scope, status)")
          .eq("organization_id", organization_id);
        if (lifecycle_status) query = query.eq("lifecycle_status", lifecycle_status);
        const { data } = await query.order("portfolio_rank", { ascending: true, nullsFirst: false });
        result = data || [];
        break;
      }

      case "execution_policy_rankings": {
        const [outcomesRes, profilesRes, entriesRes] = await Promise.all([
          serviceClient.from("execution_policy_outcomes").select("*").eq("organization_id", organization_id),
          serviceClient.from("execution_policy_profiles").select("*").eq("organization_id", organization_id),
          serviceClient.from("execution_policy_portfolio_entries").select("*").eq("organization_id", organization_id),
        ]);

        const outcomes = outcomesRes.data || [];
        const profiles = profilesRes.data || [];
        const policyIds = profiles.map((p: any) => p.id);
        const policyScopes: Record<string, string> = {};
        profiles.forEach((p: any) => { policyScopes[p.id] = p.policy_scope; });

        const evaluations = evaluatePortfolio(policyIds, outcomes);
        const rankings = rankAllPolicies(evaluations, policyScopes);

        result = { evaluations, rankings };
        break;
      }

      case "execution_policy_conflicts": {
        const [profilesRes, outcomesRes, entriesRes] = await Promise.all([
          serviceClient.from("execution_policy_profiles").select("*").eq("organization_id", organization_id),
          serviceClient.from("execution_policy_outcomes").select("*").eq("organization_id", organization_id),
          serviceClient.from("execution_policy_portfolio_entries").select("*").eq("organization_id", organization_id),
        ]);

        const profiles = profilesRes.data || [];
        const outcomes = outcomesRes.data || [];
        const entries = entriesRes.data || [];

        const policyIds = profiles.map((p: any) => p.id);
        const policyScopes: Record<string, string> = {};
        profiles.forEach((p: any) => { policyScopes[p.id] = p.policy_scope; });

        const evaluations = evaluatePortfolio(policyIds, outcomes);
        const evalSummaries = evaluations.map((ev) => ({
          policy_id: ev.policy_id,
          context_class: ev.context_class,
          usefulness_score: ev.scores.usefulness_score,
          risk_score: ev.scores.risk_score,
          cost_efficiency_score: ev.scores.cost_efficiency_score,
          quality_gain_score: ev.scores.quality_gain_score,
          speed_gain_score: ev.scores.speed_gain_score,
          portfolio_rank: ev.scores.portfolio_rank,
          scope: policyScopes[ev.policy_id] || "global",
        }));

        const conflicts = detectAllConflicts(evalSummaries, profiles);
        result = conflicts;
        break;
      }

      case "execution_policy_portfolio_recommendations": {
        const { status: filterStatus } = body;
        let query = serviceClient.from("execution_policy_portfolio_recommendations")
          .select("*").eq("organization_id", organization_id);
        if (filterStatus) query = query.eq("status", filterStatus);
        const { data } = await query.order("created_at", { ascending: false });
        result = data || [];
        break;
      }

      case "execution_policy_portfolio_explain": {
        const { policy_id } = body;
        if (!policy_id) { result = { error: "policy_id required" }; break; }

        const [profileRes, entryRes, outcomesRes] = await Promise.all([
          serviceClient.from("execution_policy_profiles").select("*").eq("id", policy_id).single(),
          serviceClient.from("execution_policy_portfolio_entries").select("*").eq("execution_policy_profile_id", policy_id).single(),
          serviceClient.from("execution_policy_outcomes").select("*").eq("execution_policy_profile_id", policy_id).order("created_at", { ascending: false }).limit(20),
        ]);

        const profile = profileRes.data;
        const entry = entryRes.data;
        const outcomes = outcomesRes.data || [];
        const helpful = outcomes.filter((o: any) => o.outcome_status === "helpful").length;
        const harmful = outcomes.filter((o: any) => o.outcome_status === "harmful").length;

        result = {
          profile,
          portfolio_entry: entry,
          outcome_summary: { total: outcomes.length, helpful, harmful },
          recent_outcomes: outcomes.slice(0, 10),
          explanation: profile
            ? `Policy "${profile.policy_name}" (${profile.policy_mode}) — Scope: ${profile.policy_scope}. Portfolio status: ${entry?.lifecycle_status || "not in portfolio"}. Rank: ${entry?.portfolio_rank?.toFixed(3) ?? "N/A"}. ${helpful} helpful, ${harmful} harmful outcomes.`
            : "Policy not found",
        };
        break;
      }

      case "recompute_execution_policy_portfolio": {
        const [profilesRes, outcomesRes] = await Promise.all([
          serviceClient.from("execution_policy_profiles").select("*").eq("organization_id", organization_id),
          serviceClient.from("execution_policy_outcomes").select("*").eq("organization_id", organization_id),
        ]);

        const profiles = profilesRes.data || [];
        const outcomes = outcomesRes.data || [];
        const policyIds = profiles.map((p: any) => p.id);
        const policyScopes: Record<string, string> = {};
        profiles.forEach((p: any) => { policyScopes[p.id] = p.policy_scope; });

        const evaluations = evaluatePortfolio(policyIds, outcomes);
        const rankings = rankAllPolicies(evaluations, policyScopes);

        // Upsert portfolio entries
        for (const ev of evaluations) {
          const ranking = rankings.find((r) => r.policy_id === ev.policy_id && r.context_class === ev.context_class);
          const profile = profiles.find((p: any) => p.id === ev.policy_id);
          const isBalancedDefault = profile?.policy_mode === "balanced_default";

          const lifecycle = recommendLifecycleStatus(
            "candidate",
            ev.helpful_rate,
            ev.harmful_rate,
            ev.sample_size,
            ev.scores.stability_score,
            isBalancedDefault,
          );

          // Check existing entry
          const { data: existing } = await serviceClient.from("execution_policy_portfolio_entries")
            .select("id, lifecycle_status")
            .eq("execution_policy_profile_id", ev.policy_id)
            .eq("organization_id", organization_id)
            .maybeSingle();

          if (existing) {
            await serviceClient.from("execution_policy_portfolio_entries").update({
              portfolio_rank: ranking?.composite_score ?? ev.scores.portfolio_rank,
              usefulness_score: ev.scores.usefulness_score,
              risk_score: ev.scores.risk_score,
              cost_efficiency_score: ev.scores.cost_efficiency_score,
              quality_gain_score: ev.scores.quality_gain_score,
              speed_gain_score: ev.scores.speed_gain_score,
              stability_score: ev.scores.stability_score,
              context_classes: JSON.stringify([ev.context_class]),
              updated_at: new Date().toISOString(),
            }).eq("id", existing.id);
          } else {
            await serviceClient.from("execution_policy_portfolio_entries").insert({
              organization_id,
              execution_policy_profile_id: ev.policy_id,
              portfolio_group: "default",
              context_classes: [ev.context_class],
              portfolio_rank: ranking?.composite_score ?? ev.scores.portfolio_rank,
              usefulness_score: ev.scores.usefulness_score,
              risk_score: ev.scores.risk_score,
              cost_efficiency_score: ev.scores.cost_efficiency_score,
              quality_gain_score: ev.scores.quality_gain_score,
              speed_gain_score: ev.scores.speed_gain_score,
              stability_score: ev.scores.stability_score,
              lifecycle_status: lifecycle.recommended,
            });
          }
        }

        // Generate recommendations from conflicts
        const evalSummaries = evaluations.map((ev) => ({
          policy_id: ev.policy_id,
          context_class: ev.context_class,
          usefulness_score: ev.scores.usefulness_score,
          risk_score: ev.scores.risk_score,
          cost_efficiency_score: ev.scores.cost_efficiency_score,
          quality_gain_score: ev.scores.quality_gain_score,
          speed_gain_score: ev.scores.speed_gain_score,
          portfolio_rank: ev.scores.portfolio_rank,
          scope: policyScopes[ev.policy_id] || "global",
        }));
        const conflicts = detectAllConflicts(evalSummaries, profiles);

        for (const conflict of conflicts) {
          if (conflict.severity === "high" || conflict.severity === "medium") {
            const recType = conflict.conflict_type === "contradictory_modes" ? "limit"
              : conflict.conflict_type === "broad_overshadowing_narrow" ? "reprioritize"
              : "limit";

            await serviceClient.from("execution_policy_portfolio_recommendations").insert({
              organization_id,
              recommendation_type: recType,
              target_policy_ids: conflict.policy_ids,
              context_scope: { context_class: conflict.context_class },
              recommendation_reason: { conflict_type: conflict.conflict_type, description: conflict.description, recommended_action: conflict.recommended_action },
              confidence_score: conflict.severity === "high" ? 0.9 : 0.7,
              status: "open",
            });
          }
        }

        await serviceClient.from("audit_logs").insert({
          user_id: user.id, action: "execution_policy_portfolio_recomputed", category: "learning",
          entity_type: "execution_policy_portfolio_entries", message: `Portfolio recomputed with ${evaluations.length} evaluations and ${conflicts.length} conflicts`,
          severity: "info", organization_id,
        });

        result = { success: true, evaluations_count: evaluations.length, conflicts_count: conflicts.length };
        break;
      }

      case "accept_portfolio_recommendation": {
        const { recommendation_id } = body;
        if (!recommendation_id) { result = { error: "recommendation_id required" }; break; }

        const { data: rec } = await serviceClient.from("execution_policy_portfolio_recommendations")
          .select("*").eq("id", recommendation_id).single();

        if (!rec || rec.organization_id !== organization_id) {
          result = { error: "Recommendation not found or cross-org" }; break;
        }

        await serviceClient.from("execution_policy_portfolio_recommendations")
          .update({ status: "accepted" }).eq("id", recommendation_id);

        await serviceClient.from("audit_logs").insert({
          user_id: user.id, action: "execution_policy_portfolio_recommendation_reviewed", category: "learning",
          entity_type: "execution_policy_portfolio_recommendations", entity_id: recommendation_id,
          message: `Portfolio recommendation accepted: ${rec.recommendation_type}`,
          severity: "info", organization_id, metadata: { status: "accepted" },
        });

        result = { success: true };
        break;
      }

      case "reject_portfolio_recommendation": {
        const { recommendation_id } = body;
        if (!recommendation_id) { result = { error: "recommendation_id required" }; break; }

        const { data: rec } = await serviceClient.from("execution_policy_portfolio_recommendations")
          .select("*").eq("id", recommendation_id).single();

        if (!rec || rec.organization_id !== organization_id) {
          result = { error: "Recommendation not found or cross-org" }; break;
        }

        await serviceClient.from("execution_policy_portfolio_recommendations")
          .update({ status: "rejected" }).eq("id", recommendation_id);

        await serviceClient.from("audit_logs").insert({
          user_id: user.id, action: "execution_policy_portfolio_recommendation_reviewed", category: "learning",
          entity_type: "execution_policy_portfolio_recommendations", entity_id: recommendation_id,
          message: `Portfolio recommendation rejected: ${rec.recommendation_type}`,
          severity: "info", organization_id, metadata: { status: "rejected" },
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
    console.error("Execution Policy Portfolio Engine error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
