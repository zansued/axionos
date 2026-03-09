// Execution Policy Engine — AxionOS Sprint 27
// Edge function for execution policy intelligence APIs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { classifyExecutionContext } from "../_shared/execution-policy/execution-context-classifier.ts";
import { selectExecutionPolicy } from "../_shared/execution-policy/execution-policy-selector.ts";
import { computeFeedbackAction } from "../_shared/execution-policy/execution-policy-feedback.ts";

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
      // ─── READ ACTIONS ───
      case "execution_policy_overview": {
        const [profiles, outcomes, decisions] = await Promise.all([
          serviceClient.from("execution_policy_profiles").select("*").eq("organization_id", organization_id),
          serviceClient.from("execution_policy_outcomes").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100),
          serviceClient.from("execution_policy_decisions").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50),
        ]);

        const profileData = profiles.data || [];
        const outcomeData = outcomes.data || [];
        const active = profileData.filter((p: any) => p.status === "active").length;
        const draft = profileData.filter((p: any) => p.status === "draft").length;
        const watch = profileData.filter((p: any) => p.status === "watch").length;
        const deprecated = profileData.filter((p: any) => p.status === "deprecated").length;
        const helpful = outcomeData.filter((o: any) => o.outcome_status === "helpful").length;
        const harmful = outcomeData.filter((o: any) => o.outcome_status === "harmful").length;

        result = {
          total_profiles: profileData.length,
          active, draft, watch, deprecated,
          total_outcomes: outcomeData.length,
          helpful_outcomes: helpful,
          harmful_outcomes: harmful,
          recent_decisions: (decisions.data || []).slice(0, 10),
          profiles: profileData,
          recent_outcomes: outcomeData.slice(0, 20),
        };
        break;
      }

      case "execution_policy_profiles": {
        const { status: filterStatus, scope: filterScope } = body;
        let query = serviceClient.from("execution_policy_profiles").select("*").eq("organization_id", organization_id);
        if (filterStatus) query = query.eq("status", filterStatus);
        if (filterScope) query = query.eq("policy_scope", filterScope);
        const { data } = await query.order("created_at", { ascending: false });
        result = data || [];
        break;
      }

      case "execution_policy_decisions": {
        const { data } = await serviceClient.from("execution_policy_decisions")
          .select("*, execution_policy_profiles(policy_name, policy_mode)")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false })
          .limit(100);
        result = data || [];
        break;
      }

      case "execution_policy_outcomes": {
        const { data } = await serviceClient.from("execution_policy_outcomes")
          .select("*, execution_policy_profiles(policy_name, policy_mode)")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false })
          .limit(100);
        result = data || [];
        break;
      }

      case "execution_policy_explain": {
        const { policy_id } = body;
        if (!policy_id) { result = { error: "policy_id required" }; break; }

        const [profileRes, outcomesRes, decisionsRes] = await Promise.all([
          serviceClient.from("execution_policy_profiles").select("*").eq("id", policy_id).single(),
          serviceClient.from("execution_policy_outcomes").select("*").eq("execution_policy_profile_id", policy_id).order("created_at", { ascending: false }).limit(20),
          serviceClient.from("execution_policy_decisions").select("*").eq("execution_policy_profile_id", policy_id).order("created_at", { ascending: false }).limit(20),
        ]);

        const profile = profileRes.data;
        const pOutcomes = outcomesRes.data || [];
        const pDecisions = decisionsRes.data || [];
        const helpful = pOutcomes.filter((o: any) => o.outcome_status === "helpful").length;
        const harmful = pOutcomes.filter((o: any) => o.outcome_status === "harmful").length;

        result = {
          profile,
          outcome_summary: { total: pOutcomes.length, helpful, harmful, neutral: pOutcomes.filter((o: any) => o.outcome_status === "neutral").length },
          recent_outcomes: pOutcomes.slice(0, 10),
          recent_decisions: pDecisions.slice(0, 10),
          explanation: profile ? `Policy "${profile.policy_name}" operates in ${profile.policy_mode} mode with ${profile.policy_scope} scope. Status: ${profile.status}. Confidence: ${profile.confidence_score ?? "N/A"}. Support: ${profile.support_count}. ${helpful} helpful and ${harmful} harmful outcomes recorded.` : "Policy not found",
        };
        break;
      }

      // ─── WRITE ACTIONS ───
      case "classify_execution_context": {
        const classification = classifyExecutionContext(body);
        result = classification;
        break;
      }

      case "activate_execution_policy": {
        const { policy_id } = body;
        if (!policy_id) { result = { error: "policy_id required" }; break; }

        const { data: existing } = await serviceClient.from("execution_policy_profiles").select("*").eq("id", policy_id).single();
        if (!existing || existing.organization_id !== organization_id) {
          result = { error: "Policy not found or cross-org" }; break;
        }

        const { error } = await serviceClient.from("execution_policy_profiles")
          .update({ status: "active" })
          .eq("id", policy_id);

        await serviceClient.from("audit_logs").insert({
          user_id: user.id, action: "execution_policy_activated", category: "learning",
          entity_type: "execution_policy_profiles", entity_id: policy_id,
          message: `Execution policy "${existing.policy_name}" activated`, severity: "info",
          organization_id,
        });

        result = { success: !error, policy_id };
        break;
      }

      case "deprecate_execution_policy": {
        const { policy_id } = body;
        if (!policy_id) { result = { error: "policy_id required" }; break; }

        const { data: existing } = await serviceClient.from("execution_policy_profiles").select("*").eq("id", policy_id).single();
        if (!existing || existing.organization_id !== organization_id) {
          result = { error: "Policy not found or cross-org" }; break;
        }

        const { error } = await serviceClient.from("execution_policy_profiles")
          .update({ status: "deprecated" })
          .eq("id", policy_id);

        await serviceClient.from("audit_logs").insert({
          user_id: user.id, action: "execution_policy_deprecated", category: "learning",
          entity_type: "execution_policy_profiles", entity_id: policy_id,
          message: `Execution policy "${existing.policy_name}" deprecated`, severity: "info",
          organization_id,
        });

        result = { success: !error, policy_id };
        break;
      }

      case "mark_execution_policy_outcome": {
        const { policy_id, outcome_status, outcome_metrics, context_class, applied_mode, pipeline_job_id, evidence_refs } = body;
        if (!policy_id || !outcome_status || !context_class) {
          result = { error: "policy_id, outcome_status, context_class required" }; break;
        }

        const { error } = await serviceClient.from("execution_policy_outcomes").insert({
          organization_id,
          execution_policy_profile_id: policy_id,
          pipeline_job_id: pipeline_job_id || null,
          applied_mode: applied_mode || "none",
          context_class,
          outcome_status,
          outcome_metrics: outcome_metrics || null,
          evidence_refs: evidence_refs || null,
        });

        // Run feedback loop
        if (!error) {
          const { data: allOutcomes } = await serviceClient.from("execution_policy_outcomes")
            .select("*").eq("execution_policy_profile_id", policy_id);
          const { data: policyData } = await serviceClient.from("execution_policy_profiles")
            .select("*").eq("id", policy_id).single();

          if (policyData && allOutcomes) {
            const feedback = computeFeedbackAction(
              { id: policyData.id, status: policyData.status, confidence_score: policyData.confidence_score, support_count: policyData.support_count, policy_scope: policyData.policy_scope },
              allOutcomes.map((o: any) => ({ execution_policy_profile_id: o.execution_policy_profile_id, outcome_status: o.outcome_status, outcome_metrics: o.outcome_metrics })),
            );

            if (feedback.recommended_status !== policyData.status || feedback.confidence_adjustment !== 0) {
              await serviceClient.from("execution_policy_profiles").update({
                status: feedback.recommended_status,
                confidence_score: Math.max(0, Math.min(1, (policyData.confidence_score ?? 0.5) + feedback.confidence_adjustment)),
                support_count: policyData.support_count + feedback.support_adjustment,
              }).eq("id", policy_id);

              await serviceClient.from("audit_logs").insert({
                user_id: user.id, action: "execution_policy_feedback_applied", category: "learning",
                entity_type: "execution_policy_profiles", entity_id: policy_id,
                message: `Policy feedback: ${feedback.reason_codes.join(", ")}`, severity: "info",
                organization_id, metadata: feedback,
              });
            }
          }
        }

        result = { success: !error };
        break;
      }

      default:
        result = { error: `Unknown action: ${action}` };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Execution Policy Engine error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
