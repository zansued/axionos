import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { aggregateVariantMetrics, compareVariants } from "../_shared/learning/prompt-variant-metrics.ts";
import { evaluatePromotionCandidate, evaluateRollback, DEFAULT_PROMOTION_CONFIG } from "../_shared/learning/prompt-promotion-rules.ts";

/**
 * Prompt Optimization Engine — Sprint 21
 *
 * APIs:
 *   action: "overview" | "variants_by_stage" | "experiment_performance"
 *         | "promotion_candidates" | "create_variant" | "toggle_variant"
 *         | "promote_variant" | "aggregate_metrics"
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return json({ error: "No authorization" }, 401);
    }

    const sc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { action, organization_id } = body;

    if (!organization_id) return json({ error: "organization_id required" }, 400);

    switch (action) {
      case "overview":
        return await handleOverview(sc, organization_id);
      case "variants_by_stage":
        return await handleVariantsByStage(sc, organization_id, body.stage_key);
      case "experiment_performance":
        return await handleExperimentPerformance(sc, organization_id, body.time_window_days || 30);
      case "promotion_candidates":
        return await handlePromotionCandidates(sc, organization_id, body.time_window_days || 30);
      case "create_variant":
        return await handleCreateVariant(sc, organization_id, body);
      case "toggle_variant":
        return await handleToggleVariant(sc, organization_id, body.variant_id, body.is_enabled);
      case "promote_variant":
        return await handlePromoteVariant(sc, organization_id, body);
      case "aggregate_metrics":
        return await handleAggregateMetrics(sc, organization_id, body.time_window_days || 30);
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e: any) {
    console.error("Prompt optimization engine error:", e);
    return json({ error: e.message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleOverview(sc: any, orgId: string) {
  const [variantsRes, metricsRes, promotionsRes, execsRes] = await Promise.all([
    sc.from("prompt_variants").select("id, stage_key, variant_name, status, is_enabled").eq("organization_id", orgId),
    sc.from("prompt_variant_metrics").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(100),
    sc.from("prompt_variant_promotions").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(20),
    sc.from("prompt_variant_executions").select("id, stage_key, success, created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(100),
  ]);

  const variants = variantsRes.data || [];
  const totalVariants = variants.length;
  const activeExperiments = variants.filter((v: any) => v.status === "active_experiment" && v.is_enabled).length;
  const activeControls = variants.filter((v: any) => v.status === "active_control").length;
  const stages = [...new Set(variants.map((v: any) => v.stage_key))];

  return json({
    total_variants: totalVariants,
    active_experiments: activeExperiments,
    active_controls: activeControls,
    stages_with_variants: stages.length,
    stages,
    recent_promotions: (promotionsRes.data || []).slice(0, 5),
    recent_executions_count: (execsRes.data || []).length,
    recent_metrics: (metricsRes.data || []).slice(0, 10),
  });
}

async function handleVariantsByStage(sc: any, orgId: string, stageKey?: string) {
  let query = sc.from("prompt_variants").select("*").eq("organization_id", orgId);
  if (stageKey) query = query.eq("stage_key", stageKey);
  const { data, error } = await query.order("stage_key").order("status");
  if (error) return json({ error: error.message }, 500);
  return json({ variants: data || [] });
}

async function handleExperimentPerformance(sc: any, orgId: string, windowDays: number) {
  const since = new Date(Date.now() - windowDays * 86400000).toISOString();

  // Get active experiments
  const { data: experiments } = await sc
    .from("prompt_variants")
    .select("id, stage_key, variant_name, status, base_prompt_signature")
    .eq("organization_id", orgId)
    .in("status", ["active_experiment", "active_control"])
    .eq("is_enabled", true);

  if (!experiments || experiments.length === 0) {
    return json({ experiments: [], comparisons: [] });
  }

  const variantIds = experiments.map((e: any) => e.id);
  const { data: executions } = await sc
    .from("prompt_variant_executions")
    .select("*")
    .eq("organization_id", orgId)
    .in("prompt_variant_id", variantIds.slice(0, 200))
    .gte("created_at", since)
    .limit(1000);

  // Group executions by variant
  const byVariant = new Map<string, any[]>();
  for (const exec of executions || []) {
    const arr = byVariant.get(exec.prompt_variant_id) || [];
    arr.push(exec);
    byVariant.set(exec.prompt_variant_id, arr);
  }

  // Aggregate metrics per variant
  const metricsMap = new Map<string, any>();
  for (const [vid, execs] of byVariant) {
    metricsMap.set(vid, aggregateVariantMetrics(vid, execs));
  }

  // Compare experiments vs controls by stage
  const comparisons: any[] = [];
  const stageGroups = new Map<string, any[]>();
  for (const exp of experiments) {
    const arr = stageGroups.get(exp.stage_key) || [];
    arr.push(exp);
    stageGroups.set(exp.stage_key, arr);
  }

  for (const [stage, variants] of stageGroups) {
    const control = variants.find((v: any) => v.status === "active_control");
    const exps = variants.filter((v: any) => v.status === "active_experiment");

    if (control && exps.length > 0) {
      const controlMetrics = metricsMap.get(control.id) || aggregateVariantMetrics(control.id, []);
      for (const exp of exps) {
        const expMetrics = metricsMap.get(exp.id) || aggregateVariantMetrics(exp.id, []);
        comparisons.push({
          stage,
          control: { ...control, metrics: controlMetrics },
          experiment: { ...exp, metrics: expMetrics },
          comparison: compareVariants(controlMetrics, expMetrics),
        });
      }
    }
  }

  return json({
    experiments: experiments.map((e: any) => ({
      ...e,
      metrics: metricsMap.get(e.id) || null,
    })),
    comparisons,
  });
}

async function handlePromotionCandidates(sc: any, orgId: string, windowDays: number) {
  const since = new Date(Date.now() - windowDays * 86400000).toISOString();

  const { data: experiments } = await sc
    .from("prompt_variants")
    .select("id, stage_key, variant_name, base_prompt_signature")
    .eq("organization_id", orgId)
    .eq("status", "active_experiment")
    .eq("is_enabled", true);

  if (!experiments || experiments.length === 0) {
    return json({ candidates: [], rollbacks: [] });
  }

  // Get controls for same stages
  const stages = [...new Set(experiments.map((e: any) => e.stage_key))];
  const { data: controls } = await sc
    .from("prompt_variants")
    .select("id, stage_key, variant_name")
    .eq("organization_id", orgId)
    .eq("status", "active_control")
    .in("stage_key", stages);

  const allIds = [
    ...experiments.map((e: any) => e.id),
    ...(controls || []).map((c: any) => c.id),
  ];

  const { data: executions } = await sc
    .from("prompt_variant_executions")
    .select("*")
    .eq("organization_id", orgId)
    .in("prompt_variant_id", allIds.slice(0, 300))
    .gte("created_at", since)
    .limit(1000);

  const byVariant = new Map<string, any[]>();
  for (const exec of executions || []) {
    const arr = byVariant.get(exec.prompt_variant_id) || [];
    arr.push(exec);
    byVariant.set(exec.prompt_variant_id, arr);
  }

  const candidates: any[] = [];
  const rollbacks: any[] = [];

  for (const exp of experiments) {
    const expMetrics = aggregateVariantMetrics(exp.id, byVariant.get(exp.id) || []);
    const control = (controls || []).find((c: any) => c.stage_key === exp.stage_key);
    let controlMetrics = null;
    let comparison = null;

    if (control) {
      controlMetrics = aggregateVariantMetrics(control.id, byVariant.get(control.id) || []);
      comparison = compareVariants(controlMetrics, expMetrics);
    }

    candidates.push(
      evaluatePromotionCandidate(expMetrics, controlMetrics, comparison, exp.stage_key),
    );

    const rb = evaluateRollback(expMetrics, exp.stage_key);
    if (rb) rollbacks.push(rb);
  }

  return json({ candidates, rollbacks });
}

async function handleCreateVariant(sc: any, orgId: string, body: any) {
  const { stage_key, variant_name, prompt_template, base_prompt_signature, status, agent_type, model_provider, model_name, variables_schema } = body;

  if (!stage_key || !variant_name || !prompt_template || !base_prompt_signature) {
    return json({ error: "stage_key, variant_name, prompt_template, and base_prompt_signature are required" }, 400);
  }

  const { data, error } = await sc.from("prompt_variants").insert({
    organization_id: orgId,
    stage_key,
    variant_name,
    prompt_template,
    base_prompt_signature,
    status: status || "draft",
    agent_type: agent_type || null,
    model_provider: model_provider || null,
    model_name: model_name || null,
    variables_schema: variables_schema || null,
  }).select().single();

  if (error) return json({ error: error.message }, 500);

  // Audit
  await sc.from("audit_logs").insert({
    user_id: "00000000-0000-0000-0000-000000000000",
    action: "PROMPT_VARIANT_CREATED",
    category: "learning",
    entity_type: "prompt_variants",
    entity_id: data.id,
    message: `Prompt variant "${variant_name}" created for stage ${stage_key}`,
    severity: "info",
    organization_id: orgId,
    metadata: { stage_key, variant_name, status: status || "draft" },
  });

  return json({ variant: data });
}

async function handleToggleVariant(sc: any, orgId: string, variantId: string, isEnabled: boolean) {
  if (!variantId) return json({ error: "variant_id required" }, 400);

  const { error } = await sc
    .from("prompt_variants")
    .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
    .eq("id", variantId)
    .eq("organization_id", orgId);

  if (error) return json({ error: error.message }, 500);

  await sc.from("audit_logs").insert({
    user_id: "00000000-0000-0000-0000-000000000000",
    action: isEnabled ? "PROMPT_VARIANT_ENABLED" : "PROMPT_VARIANT_DISABLED",
    category: "learning",
    entity_type: "prompt_variants",
    entity_id: variantId,
    message: `Prompt variant ${isEnabled ? "enabled" : "disabled"}`,
    severity: "info",
    organization_id: orgId,
  });

  return json({ success: true });
}

async function handlePromoteVariant(sc: any, orgId: string, body: any) {
  const { variant_id, stage_key, reason } = body;
  if (!variant_id || !stage_key) return json({ error: "variant_id and stage_key required" }, 400);

  // Find current control for this stage
  const { data: currentControl } = await sc
    .from("prompt_variants")
    .select("id")
    .eq("organization_id", orgId)
    .eq("stage_key", stage_key)
    .eq("status", "active_control")
    .maybeSingle();

  // Retire old control
  if (currentControl) {
    await sc.from("prompt_variants")
      .update({ status: "retired", updated_at: new Date().toISOString() })
      .eq("id", currentControl.id);
  }

  // Promote new variant
  await sc.from("prompt_variants")
    .update({ status: "active_control", updated_at: new Date().toISOString() })
    .eq("id", variant_id);

  // Record promotion
  const { data: promotion, error } = await sc.from("prompt_variant_promotions").insert({
    organization_id: orgId,
    stage_key,
    previous_control_variant_id: currentControl?.id || null,
    promoted_variant_id: variant_id,
    promotion_reason: reason || { manual: true },
    promotion_mode: "manual",
  }).select().single();

  if (error) return json({ error: error.message }, 500);

  await sc.from("audit_logs").insert({
    user_id: "00000000-0000-0000-0000-000000000000",
    action: "PROMPT_VARIANT_PROMOTED",
    category: "learning",
    entity_type: "prompt_variant_promotions",
    entity_id: promotion.id,
    message: `Prompt variant promoted to control for stage ${stage_key}`,
    severity: "warning",
    organization_id: orgId,
    metadata: { stage_key, variant_id, previous_control_id: currentControl?.id },
  });

  return json({ promotion });
}

async function handleAggregateMetrics(sc: any, orgId: string, windowDays: number) {
  const since = new Date(Date.now() - windowDays * 86400000).toISOString();
  const now = new Date().toISOString();

  const { data: variants } = await sc
    .from("prompt_variants")
    .select("id, stage_key")
    .eq("organization_id", orgId)
    .in("status", ["active_control", "active_experiment"]);

  if (!variants || variants.length === 0) return json({ metrics_created: 0 });

  const variantIds = variants.map((v: any) => v.id);
  const { data: executions } = await sc
    .from("prompt_variant_executions")
    .select("*")
    .eq("organization_id", orgId)
    .in("prompt_variant_id", variantIds.slice(0, 300))
    .gte("created_at", since)
    .limit(1000);

  const byVariant = new Map<string, any[]>();
  for (const exec of executions || []) {
    const arr = byVariant.get(exec.prompt_variant_id) || [];
    arr.push(exec);
    byVariant.set(exec.prompt_variant_id, arr);
  }

  let created = 0;
  for (const v of variants) {
    const metrics = aggregateVariantMetrics(v.id, byVariant.get(v.id) || []);

    // Delete old metrics for this period
    await sc.from("prompt_variant_metrics")
      .delete()
      .eq("organization_id", orgId)
      .eq("prompt_variant_id", v.id)
      .gte("period_start", since);

    const { error } = await sc.from("prompt_variant_metrics").insert({
      organization_id: orgId,
      prompt_variant_id: v.id,
      period_start: since,
      period_end: now,
      executions: metrics.executions,
      success_rate: metrics.success_rate,
      repair_rate: metrics.repair_rate,
      avg_cost_usd: metrics.avg_cost_usd,
      avg_duration_ms: metrics.avg_duration_ms,
      avg_quality_score: metrics.avg_quality_score,
      promotion_score: metrics.promotion_score,
      confidence_level: metrics.confidence_level,
    });

    if (!error) created++;
  }

  return json({ metrics_created: created });
}
