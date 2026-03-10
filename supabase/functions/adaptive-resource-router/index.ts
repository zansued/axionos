import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, organization_id, ...params } = body;

    if (!organization_id)
      return json({ error: "organization_id required" }, corsHeaders, 400);

    switch (action) {
      case "compute_routing_profile":
        return json(await computeRoutingProfile(supabase, organization_id, params), corsHeaders);
      case "apply_routing_adjustments":
        return json(await applyRoutingAdjustments(supabase, organization_id, params), corsHeaders);
      case "routing_metrics":
        return json(await routingMetrics(supabase, organization_id), corsHeaders);
      default:
        return json({ error: `Unknown action: ${action}` }, corsHeaders, 400);
    }
  } catch (e) {
    return json({ error: e.message }, corsHeaders, 500);
  }
});

function json(data: any, headers: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

// ── Routing profile computation ──

interface RoutingDecision {
  domain_id: string;
  posture_state: string;
  attention_level: string;
  validation_depth: string;
  repair_priority: string;
  publish_threshold_modifier: number;
  adjustments: string[];
}

const VALIDATION_DEPTH_MAP: Record<string, Record<string, string>> = {
  recovery:    { high: "maximum", medium: "deep", low: "standard" },
  constrained: { high: "maximum", medium: "deep", low: "standard" },
  stabilizing: { high: "deep", medium: "standard", low: "relaxed" },
  exploratory: { high: "standard", medium: "relaxed", low: "minimal" },
  accelerated: { high: "standard", medium: "relaxed", low: "minimal" },
  observation_heavy: { high: "deep", medium: "standard", low: "standard" },
};

const REPAIR_PRIORITY_MAP: Record<string, Record<string, string>> = {
  recovery:    { high: "critical", medium: "high", low: "normal" },
  constrained: { high: "high", medium: "high", low: "normal" },
  stabilizing: { high: "high", medium: "normal", low: "low" },
  exploratory: { high: "normal", medium: "low", low: "low" },
  accelerated: { high: "normal", medium: "low", low: "low" },
  observation_heavy: { high: "high", medium: "normal", low: "normal" },
};

const PUBLISH_MODIFIER_MAP: Record<string, Record<string, number>> = {
  recovery:    { high: 0.3, medium: 0.2, low: 0.1 },
  constrained: { high: 0.25, medium: 0.15, low: 0.05 },
  stabilizing: { high: 0.1, medium: 0.05, low: 0 },
  exploratory: { high: 0, medium: -0.05, low: -0.1 },
  accelerated: { high: -0.1, medium: -0.15, low: -0.2 },
  observation_heavy: { high: 0.15, medium: 0.1, low: 0.05 },
};

function classifyAttention(score: number): string {
  if (score >= 0.7) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

function computeDecision(
  domain_id: string,
  posture: string,
  attentionScore: number
): RoutingDecision {
  const attention_level = classifyAttention(attentionScore);
  const validationMap = VALIDATION_DEPTH_MAP[posture] || VALIDATION_DEPTH_MAP.stabilizing;
  const repairMap = REPAIR_PRIORITY_MAP[posture] || REPAIR_PRIORITY_MAP.stabilizing;
  const publishMap = PUBLISH_MODIFIER_MAP[posture] || PUBLISH_MODIFIER_MAP.stabilizing;

  const validation_depth = validationMap[attention_level] || "standard";
  const repair_priority = repairMap[attention_level] || "normal";
  const publish_threshold_modifier = publishMap[attention_level] ?? 0;

  const adjustments: string[] = [];
  if (validation_depth === "maximum" || validation_depth === "deep")
    adjustments.push("Increased validation depth for unstable domain");
  if (publish_threshold_modifier < 0)
    adjustments.push("Accelerated publish cycle for high-confidence domain");
  if (repair_priority === "critical" || repair_priority === "high")
    adjustments.push("Prioritized repair in regression cluster");
  if (attention_level === "high")
    adjustments.push("Enhanced monitoring in compounding zone");

  return {
    domain_id,
    posture_state: posture,
    attention_level,
    validation_depth,
    repair_priority,
    publish_threshold_modifier,
    adjustments,
  };
}

// ── Actions ──

async function computeRoutingProfile(supabase: any, orgId: string, _params: any) {
  // Get current posture
  const { data: postures } = await supabase
    .from("operational_posture_state")
    .select("current_posture")
    .eq("organization_id", orgId)
    .order("activated_at", { ascending: false })
    .limit(1);

  const currentPosture = postures?.[0]?.current_posture || "stabilizing";

  // Get attention domains
  const { data: attentionDomains } = await supabase
    .from("attention_allocation_map")
    .select("domain_id, attention_score")
    .eq("organization_id", orgId)
    .order("attention_score", { ascending: false });

  const domains = attentionDomains || [];
  if (domains.length === 0) {
    // Create a default profile
    const decision = computeDecision("global", currentPosture, 0.5);
    await upsertProfile(supabase, orgId, decision);
    return { profiles: [decision], posture: currentPosture };
  }

  const profiles: RoutingDecision[] = [];
  for (const d of domains) {
    const decision = computeDecision(d.domain_id, currentPosture, Number(d.attention_score));
    await upsertProfile(supabase, orgId, decision);
    profiles.push(decision);
  }

  return { profiles, posture: currentPosture, computed: profiles.length };
}

async function upsertProfile(supabase: any, orgId: string, decision: RoutingDecision) {
  const { data: existing } = await supabase
    .from("adaptive_routing_profiles")
    .select("profile_id")
    .eq("organization_id", orgId)
    .eq("domain_id", decision.domain_id)
    .maybeSingle();

  const row = {
    posture_state: decision.posture_state,
    attention_level: decision.attention_level,
    validation_depth: decision.validation_depth,
    repair_priority: decision.repair_priority,
    publish_threshold_modifier: decision.publish_threshold_modifier,
    adjustments_applied: decision.adjustments,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supabase
      .from("adaptive_routing_profiles")
      .update(row)
      .eq("profile_id", existing.profile_id);
  } else {
    await supabase.from("adaptive_routing_profiles").insert({
      organization_id: orgId,
      domain_id: decision.domain_id,
      ...row,
    });
  }
}

async function applyRoutingAdjustments(supabase: any, orgId: string, params: any) {
  // Re-compute profiles based on latest signals
  return computeRoutingProfile(supabase, orgId, params);
}

async function routingMetrics(supabase: any, orgId: string) {
  const { data } = await supabase
    .from("adaptive_routing_profiles")
    .select("*")
    .eq("organization_id", orgId)
    .order("updated_at", { ascending: false });

  const profiles = data || [];
  const total = profiles.length;

  const depthDist: Record<string, number> = {};
  const priorityDist: Record<string, number> = {};
  const attentionDist: Record<string, number> = {};

  for (const p of profiles) {
    depthDist[p.validation_depth] = (depthDist[p.validation_depth] || 0) + 1;
    priorityDist[p.repair_priority] = (priorityDist[p.repair_priority] || 0) + 1;
    attentionDist[p.attention_level] = (attentionDist[p.attention_level] || 0) + 1;
  }

  const avgModifier = total > 0
    ? Math.round(profiles.reduce((s: number, p: any) => s + Number(p.publish_threshold_modifier), 0) / total * 1000) / 1000
    : 0;

  return {
    total_profiles: total,
    validation_depth_distribution: depthDist,
    repair_priority_distribution: priorityDist,
    attention_level_distribution: attentionDist,
    average_publish_modifier: avgModifier,
    profiles,
  };
}
