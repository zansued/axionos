// Observability Bootstrap Engine — AxionOS
// Generates realistic bootstrap data for empty observability tabs based on existing real data.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function uuid() { return crypto.randomUUID(); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function randInt(min: number, max: number) { return Math.floor(rand(min, max)); }
function daysAgo(n: number) { return new Date(Date.now() - n * 86400000).toISOString(); }

const STAGES = ["discovery", "architecture", "engineering", "validation", "deployment", "review"];
const ERROR_CATEGORIES = ["typescript_error", "build_error", "test_failure", "lint_error", "dependency_conflict", "runtime_error", "schema_mismatch", "timeout_error"];
const SEVERITIES = ["low", "medium", "high", "critical"];
const REPAIR_STRATEGIES = ["retry", "config_repair", "type_safe_patching", "rollback", "dependency_update", "schema_migration", "prompt_refinement", "code_regeneration"];
const ACTION_TYPES = ["block", "warn", "add_validation", "adjust_generation", "require_dependency"];
const RISK_BANDS = ["low", "medium", "high", "critical"];
const POLICY_MODES = ["cost_optimized", "quality_first", "balanced", "speed_first"];
const RELATIONSHIP_TYPES = ["causal", "correlation", "sequential", "dependency"];

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
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
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
    const { organization_id } = body;
    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify membership
    const { data: member } = await serviceClient
      .from("organization_members").select("role")
      .eq("organization_id", organization_id).eq("user_id", user.id).single();
    if (!member) {
      return new Response(JSON.stringify({ error: "Not a member" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get real context data
    const [outputsRes, initiativesRes, agentsRes] = await Promise.all([
      serviceClient.from("agent_outputs").select("id, type, status, model_used, tokens_used, created_at")
        .eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50),
      serviceClient.from("initiatives").select("id, title").eq("organization_id", organization_id).limit(10),
      serviceClient.from("agents").select("id, name, agent_type").eq("organization_id", organization_id).limit(10),
    ]);

    const outputs = outputsRes.data || [];
    const initiatives = initiativesRes.data || [];
    const agents = agentsRes.data || [];
    const realModels = [...new Set(outputs.map((o: any) => o.model_used).filter(Boolean))];
    const modelProvider = realModels.length > 0 ? "openai" : "deepseek";
    const modelName = realModels[0] || "gpt-5-mini";

    const results: Record<string, number> = {};

    // ─── 1. Error Patterns ───
    const { count: epCount } = await serviceClient.from("error_patterns").select("*", { count: "exact", head: true }).eq("organization_id", organization_id);
    if ((epCount || 0) === 0) {
      const errorPatterns = ERROR_CATEGORIES.map((cat, i) => ({
        organization_id,
        error_category: cat,
        error_signature: `${cat}::${pick(STAGES)}::sig_${i}`,
        normalized_signature: `norm_${cat}_${i}`,
        title: `${cat.replace(/_/g, " ")} pattern detected`,
        description: `Recurring ${cat.replace(/_/g, " ")} observed across pipeline stages`,
        frequency: randInt(3, 25),
        first_seen_at: daysAgo(randInt(7, 30)),
        last_seen_at: daysAgo(randInt(0, 3)),
        affected_stages: [pick(STAGES), pick(STAGES)].filter((v, i, a) => a.indexOf(v) === i),
        affected_file_types: pick([[".ts", ".tsx"], [".ts"], [".json", ".ts"], [".tsx"]]),
        common_causes: [`Incorrect ${cat.split("_")[0]} handling`, "Missing validation"],
        successful_strategies: [pick(REPAIR_STRATEGIES), pick(REPAIR_STRATEGIES)].filter((v, i, a) => a.indexOf(v) === i),
        failed_strategies: [pick(REPAIR_STRATEGIES)],
        success_rate: rand(0.4, 0.95),
        severity: pick(SEVERITIES),
        repairability: pick(["auto", "assisted", "manual"]),
        recommended_prevention: `Add pre-${pick(STAGES)} validation for ${cat.replace(/_/g, " ")}`,
        confidence_score: rand(0.5, 0.95),
      }));

      const { error } = await serviceClient.from("error_patterns").insert(errorPatterns);
      if (!error) results.error_patterns = errorPatterns.length;
    }

    // ─── 2. Active Prevention Rules ───
    const { count: aprCount } = await serviceClient.from("active_prevention_rules").select("*", { count: "exact", head: true }).eq("organization_id", organization_id);
    if ((aprCount || 0) === 0) {
      const rules = Array.from({ length: 6 }, (_, i) => ({
        organization_id,
        rule_type: pick(["pattern_based", "threshold", "heuristic", "learned"]),
        pipeline_stage: pick(STAGES),
        action_type: pick(ACTION_TYPES),
        trigger_conditions: { min_confidence: rand(0.5, 0.8), pattern_match: `sig_${i}` },
        action_config: { severity: pick(SEVERITIES), notify: true },
        description: `Prevention rule for ${pick(ERROR_CATEGORIES).replace(/_/g, " ")} at ${pick(STAGES)} stage`,
        confidence_score: rand(0.6, 0.95),
        enabled: i < 5,
        times_triggered: randInt(0, 20),
        times_prevented: randInt(0, 12),
      }));

      const { error } = await serviceClient.from("active_prevention_rules").insert(rules);
      if (!error) results.active_prevention_rules = rules.length;
    }

    // ─── 3. Prevention Events ───
    const { count: peCount } = await serviceClient.from("prevention_events").select("*", { count: "exact", head: true }).eq("organization_id", organization_id);
    if ((peCount || 0) === 0) {
      // Get rule IDs
      const { data: ruleIds } = await serviceClient.from("active_prevention_rules").select("id").eq("organization_id", organization_id).limit(6);
      if (ruleIds && ruleIds.length > 0) {
        const events = Array.from({ length: 12 }, () => ({
          organization_id,
          rule_id: pick(ruleIds).id,
          initiative_id: initiatives.length > 0 ? pick(initiatives).id : null,
          pipeline_stage: pick(STAGES),
          action_taken: pick(ACTION_TYPES),
          context: { trigger: "bootstrap", model: modelName },
          prevented: Math.random() > 0.3,
          created_at: daysAgo(randInt(0, 14)),
        }));

        const { error } = await serviceClient.from("prevention_events").insert(events);
        if (!error) results.prevention_events = events.length;
      }
    }

    // ─── 4. Predictive Risk Assessments ───
    const { count: praCount } = await serviceClient.from("predictive_risk_assessments").select("*", { count: "exact", head: true }).eq("organization_id", organization_id);
    if ((praCount || 0) === 0) {
      const assessments = Array.from({ length: 10 }, () => {
        const riskScore = rand(0.1, 0.95);
        const band = riskScore > 0.8 ? "critical" : riskScore > 0.6 ? "high" : riskScore > 0.3 ? "medium" : "low";
        return {
          organization_id,
          initiative_id: initiatives.length > 0 ? pick(initiatives).id : null,
          stage_key: pick(STAGES),
          agent_type: agents.length > 0 ? pick(agents).agent_type : "coder",
          model_provider: modelProvider,
          model_name: modelName,
          context_signature: `ctx_${pick(STAGES)}_${randInt(1, 100)}`,
          risk_score: riskScore,
          risk_band: band,
          confidence_score: rand(0.5, 0.9),
          predicted_failure_types: [pick(ERROR_CATEGORIES), pick(ERROR_CATEGORIES)].filter((v, i, a) => a.indexOf(v) === i),
          explanation_codes: [pick(["high_complexity", "low_coverage", "dependency_risk", "model_uncertainty"])],
          evidence_refs: { source: "bootstrap", outputs_analyzed: outputs.length },
          recommended_actions: [{ type: pick(["add_validation", "reduce_complexity", "increase_retries"]), priority: pick(["low", "medium", "high"]) }],
          created_at: daysAgo(randInt(0, 14)),
        };
      });

      const { error } = await serviceClient.from("predictive_risk_assessments").insert(assessments);
      if (!error) results.predictive_risk_assessments = assessments.length;
    }

    // ─── 5. Predictive Preventive Actions ───
    const { count: ppaCount } = await serviceClient.from("predictive_preventive_actions").select("*", { count: "exact", head: true }).eq("organization_id", organization_id);
    if ((ppaCount || 0) === 0) {
      const { data: riskIds } = await serviceClient.from("predictive_risk_assessments").select("id").eq("organization_id", organization_id).limit(10);
      if (riskIds && riskIds.length > 0) {
        const actions = Array.from({ length: 8 }, () => ({
          organization_id,
          risk_assessment_id: pick(riskIds).id,
          stage_key: pick(STAGES),
          action_type: pick(["add_validation", "adjust_prompt", "increase_retries", "add_fallback"]),
          action_mode: pick(["automatic", "advisory", "manual"]),
          action_payload: { reason: "Predicted risk mitigation", source: "bootstrap" },
          applied: Math.random() > 0.4,
          outcome_status: pick(["helpful", "neutral", "harmful", null]),
          created_at: daysAgo(randInt(0, 10)),
        }));

        const { error } = await serviceClient.from("predictive_preventive_actions").insert(actions);
        if (!error) results.predictive_preventive_actions = actions.length;
      }
    }

    // ─── 6. Repair Policy Profiles ───
    const { count: rppCount } = await serviceClient.from("repair_policy_profiles").select("*", { count: "exact", head: true }).eq("organization_id", organization_id);
    if ((rppCount || 0) === 0) {
      const profiles = STAGES.slice(0, 5).map((stage) => ({
        organization_id,
        stage_key: stage,
        error_signature: `${pick(ERROR_CATEGORIES)}::${stage}`,
        agent_type: agents.length > 0 ? pick(agents).agent_type : "coder",
        model_provider: modelProvider,
        model_name: modelName,
        preferred_strategy: pick(REPAIR_STRATEGIES),
        fallback_strategy: pick(REPAIR_STRATEGIES),
        confidence: rand(0.5, 0.9),
        support_count: randInt(3, 20),
        failure_count: randInt(0, 5),
        avg_retry_count: rand(1, 3),
        avg_repair_cost_usd: rand(0.001, 0.05),
        avg_resolution_time_ms: rand(500, 5000),
        status: pick(["active", "active", "active", "watch"]),
      }));

      const { error } = await serviceClient.from("repair_policy_profiles").insert(profiles);
      if (!error) results.repair_policy_profiles = profiles.length;
    }

    // ─── 7. Repair Policy Decisions ───
    const { count: rpdCount } = await serviceClient.from("repair_policy_decisions").select("*", { count: "exact", head: true }).eq("organization_id", organization_id);
    if ((rpdCount || 0) === 0) {
      const { data: rpIds } = await serviceClient.from("repair_policy_profiles").select("id").eq("organization_id", organization_id).limit(5);
      if (rpIds && rpIds.length > 0) {
        const decisions = Array.from({ length: 10 }, () => ({
          organization_id,
          repair_policy_profile_id: pick(rpIds).id,
          initiative_id: initiatives.length > 0 ? pick(initiatives).id : null,
          stage_key: pick(STAGES),
          error_signature: `${pick(ERROR_CATEGORIES)}::runtime`,
          selected_strategy: pick(REPAIR_STRATEGIES),
          confidence: rand(0.5, 0.9),
          selection_reason: pick(["pattern_match", "effectiveness_history", "fallback", "default"]),
          retry_count: randInt(0, 3),
          cost_usd: rand(0.001, 0.02),
          outcome_status: pick(["resolved", "resolved", "resolved", "failed", "pending", "escalated"]),
          created_at: daysAgo(randInt(0, 14)),
        }));

        const { error } = await serviceClient.from("repair_policy_decisions").insert(decisions);
        if (!error) results.repair_policy_decisions = decisions.length;
      }
    }

    // ─── 8. Repair Policy Adjustments ───
    const { count: rpaCount } = await serviceClient.from("repair_policy_adjustments").select("*", { count: "exact", head: true }).eq("organization_id", organization_id);
    if ((rpaCount || 0) === 0) {
      const { data: rpIds } = await serviceClient.from("repair_policy_profiles").select("id").eq("organization_id", organization_id).limit(5);
      if (rpIds && rpIds.length > 0) {
        const adjustments = Array.from({ length: 4 }, () => ({
          organization_id,
          repair_policy_profile_id: pick(rpIds).id,
          adjustment_type: pick(["confidence_boost", "confidence_decay", "strategy_switch", "status_change"]),
          adjustment_reason: { reason: "Bootstrap-derived adjustment based on outcome patterns" },
          previous_state: { confidence: rand(0.4, 0.7), strategy: pick(REPAIR_STRATEGIES) },
          new_state: { confidence: rand(0.6, 0.9), strategy: pick(REPAIR_STRATEGIES) },
          bounded_delta: { confidence_delta: rand(-0.1, 0.15) },
          created_at: daysAgo(randInt(0, 7)),
        }));

        const { error } = await serviceClient.from("repair_policy_adjustments").insert(adjustments);
        if (!error) results.repair_policy_adjustments = adjustments.length;
      }
    }

    // ─── 9. Cross-Stage Learning Edges ───
    const { count: csleCount } = await serviceClient.from("cross_stage_learning_edges").select("*", { count: "exact", head: true }).eq("organization_id", organization_id);
    if ((csleCount || 0) === 0) {
      const edges: any[] = [];
      for (let i = 0; i < STAGES.length - 1; i++) {
        edges.push({
          organization_id,
          from_stage_key: STAGES[i],
          to_stage_key: STAGES[i + 1],
          relationship_type: pick(RELATIONSHIP_TYPES),
          evidence_refs: { source: "bootstrap", patterns_analyzed: randInt(5, 20) },
          support_count: randInt(5, 30),
          confidence_score: rand(0.5, 0.9),
          impact_score: rand(0.3, 0.8),
          status: "active",
        });
      }
      // Add a couple cross-connections
      edges.push({
        organization_id, from_stage_key: "discovery", to_stage_key: "validation",
        relationship_type: "correlation",
        evidence_refs: { source: "bootstrap" }, support_count: randInt(3, 15),
        confidence_score: rand(0.4, 0.7), impact_score: rand(0.2, 0.6), status: "active",
      });

      const { error } = await serviceClient.from("cross_stage_learning_edges").insert(edges);
      if (!error) results.cross_stage_learning_edges = edges.length;
    }

    // ─── 10. Cross-Stage Policy Profiles ───
    const { count: csppCount } = await serviceClient.from("cross_stage_policy_profiles").select("*", { count: "exact", head: true }).eq("organization_id", organization_id);
    if ((csppCount || 0) === 0) {
      const policies = [
        { policy_type: "quality_gate", affected_stages: ["engineering", "validation"], trigger_signature: "quality_below_threshold", action_mode: "advisory" },
        { policy_type: "cost_control", affected_stages: ["architecture", "engineering"], trigger_signature: "cost_exceeds_budget", action_mode: "automatic" },
        { policy_type: "error_propagation", affected_stages: ["discovery", "architecture", "engineering"], trigger_signature: "cascading_error_pattern", action_mode: "advisory" },
        { policy_type: "performance_decay", affected_stages: ["validation", "deployment"], trigger_signature: "latency_regression", action_mode: "manual" },
      ].map((p) => ({
        organization_id,
        ...p,
        policy_payload: { threshold: rand(0.5, 0.8), source: "bootstrap" },
        confidence_score: rand(0.5, 0.85),
        support_count: randInt(3, 15),
        evidence_refs: { source: "bootstrap" },
        status: pick(["active", "active", "draft", "watch"]),
      }));

      const { error } = await serviceClient.from("cross_stage_policy_profiles").insert(policies);
      if (!error) results.cross_stage_policy_profiles = policies.length;
    }

    // ─── 11. Execution Policy Profiles ───
    const { count: eppCount } = await serviceClient.from("execution_policy_profiles").select("*", { count: "exact", head: true }).eq("organization_id", organization_id);
    if ((eppCount || 0) === 0) {
      const exPolicies = POLICY_MODES.map((mode) => ({
        organization_id,
        policy_name: `${mode.replace(/_/g, " ")} execution`,
        policy_mode: mode,
        policy_scope: pick(["global", "stage", "initiative"]),
        allowed_adjustments: { max_retries: randInt(1, 5), timeout_multiplier: rand(1, 3) },
        default_priority: rand(0.3, 0.9),
        confidence_score: rand(0.5, 0.85),
        support_count: randInt(3, 20),
        status: pick(["active", "active", "draft", "watch"]),
      }));

      const { error } = await serviceClient.from("execution_policy_profiles").insert(exPolicies);
      if (!error) results.execution_policy_profiles = exPolicies.length;
    }

    // Audit log
    await serviceClient.from("audit_logs").insert({
      user_id: user.id, action: "observability_bootstrap", category: "system",
      entity_type: "observability", entity_id: organization_id,
      message: `Bootstrap data generated: ${JSON.stringify(results)}`,
      severity: "info", organization_id,
    });

    return new Response(JSON.stringify({ success: true, generated: results, note: "Bootstrap data derived from existing operational context" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Observability Bootstrap error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
