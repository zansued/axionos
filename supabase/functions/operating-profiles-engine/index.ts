import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Server configuration error' }, 500);

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { action, params } = await req.json();
    switch (action) {
      case 'overview': return await handleOverview(supabase, params);
      case 'build_profiles': return await handleBuildProfiles(supabase, params);
      case 'compose_policy_packs': return await handleComposePolicyPacks(supabase, params);
      case 'recommend_profile': return await handleRecommendProfile(supabase, params);
      case 'compare_profiles': return await handleCompareProfiles(supabase, params);
      case 'bind_profile': return await handleBindProfile(supabase, params);
      case 'manage_override': return await handleManageOverride(supabase, params);
      case 'outcomes': return await handleOutcomes(supabase, params);
      case 'explain': return await handleExplain(supabase, params);
      default: return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    return json({ error: error.message || 'Internal error' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function handleOverview(sb: any, params: any) {
  const { organization_id } = params;
  const [profilesRes, packsRes, bindingsRes, overridesRes, outcomesRes] = await Promise.all([
    sb.from('operating_profiles').select('id, profile_name, profile_type, scope_type, adoption_status, tenant_fit_score, stability_bias_score, cost_bias_score, rollback_viability_score, shared_reuse_score, profile_drift_score, created_at').eq('organization_id', organization_id).order('created_at', { ascending: false }).limit(100),
    sb.from('policy_packs').select('id, pack_name, cohesion_score, status').eq('organization_id', organization_id).limit(50),
    sb.from('operating_profile_bindings').select('id, binding_status').eq('organization_id', organization_id).limit(100),
    sb.from('operating_profile_overrides').select('id, override_pressure_score, review_status').eq('organization_id', organization_id).limit(100),
    sb.from('profile_outcomes').select('id, outcome_status, profile_effectiveness_score').eq('organization_id', organization_id).limit(100),
  ]);

  const profiles = profilesRes.data || [];
  const packs = packsRes.data || [];
  const bindings = bindingsRes.data || [];
  const overrides = overridesRes.data || [];
  const outcomes = outcomesRes.data || [];

  const activeProfiles = profiles.filter((p: any) => p.adoption_status === 'active').length;
  const activeBindings = bindings.filter((b: any) => b.binding_status === 'active').length;
  const avgFit = profiles.length > 0 ? profiles.reduce((s: number, p: any) => s + Number(p.tenant_fit_score), 0) / profiles.length : 0;
  const avgEffectiveness = outcomes.length > 0 ? outcomes.reduce((s: number, o: any) => s + Number(o.profile_effectiveness_score), 0) / outcomes.length : 0;
  const highDrift = profiles.filter((p: any) => Number(p.profile_drift_score) >= 0.5).length;

  return json({
    overview: {
      total_profiles: profiles.length,
      active_profiles: activeProfiles,
      total_packs: packs.length,
      active_bindings: activeBindings,
      total_overrides: overrides.length,
      total_outcomes: outcomes.length,
      avg_tenant_fit: Math.round(avgFit * 100) / 100,
      avg_effectiveness: Math.round(avgEffectiveness * 100) / 100,
      high_drift_profiles: highDrift,
    },
  });
}

async function handleBuildProfiles(sb: any, params: any) {
  const { organization_id, profile } = params;
  const { data, error } = await sb.from('operating_profiles').insert({ ...profile, organization_id }).select('id').single();
  if (error) return json({ error: error.message }, 500);
  return json({ success: true, profile_id: data.id });
}

async function handleComposePolicyPacks(sb: any, params: any) {
  const { organization_id, pack } = params;
  const { data, error } = await sb.from('policy_packs').insert({ ...pack, organization_id }).select('id').single();
  if (error) return json({ error: error.message }, 500);
  return json({ success: true, pack_id: data.id });
}

async function handleRecommendProfile(sb: any, params: any) {
  const { organization_id, scope_type, architecture_mode } = params;
  let query = sb.from('operating_profiles').select('*').eq('organization_id', organization_id).in('adoption_status', ['active', 'candidate']).order('tenant_fit_score', { ascending: false }).limit(10);
  if (scope_type) query = query.eq('scope_type', scope_type);
  const { data } = await query;
  const profiles = data || [];
  if (profiles.length === 0) return json({ recommendation: null, message: 'No matching profiles found' });

  // Simple fit ranking
  const ranked = profiles.map((p: any) => ({
    ...p,
    composite: Number(p.tenant_fit_score) * 0.3 + Number(p.stability_bias_score) * 0.2 + Number(p.rollback_viability_score) * 0.2 + Number(p.shared_reuse_score) * 0.15 + (1 - Number(p.profile_drift_score)) * 0.15,
  })).sort((a: any, b: any) => b.composite - a.composite);

  return json({ recommendation: ranked[0], alternatives: ranked.slice(1, 3) });
}

async function handleCompareProfiles(sb: any, params: any) {
  const { organization_id, profile_ids } = params;
  const { data } = await sb.from('operating_profiles').select('*').eq('organization_id', organization_id).in('id', profile_ids);
  if (!data || data.length === 0) return json({ error: 'No profiles found' }, 404);

  const compared = (data as any[]).map(p => ({
    id: p.id,
    name: p.profile_name,
    tenant_fit: Number(p.tenant_fit_score),
    stability: Number(p.stability_bias_score),
    cost: Number(p.cost_bias_score),
    speed: Number(p.speed_bias_score),
    rollback: Number(p.rollback_viability_score),
    governance: Number(p.governance_strictness_score),
    reuse: Number(p.shared_reuse_score),
    drift: Number(p.profile_drift_score),
    composite: Number(p.tenant_fit_score) * 0.25 + Number(p.stability_bias_score) * 0.2 + Number(p.rollback_viability_score) * 0.2 + Number(p.shared_reuse_score) * 0.15 + (1 - Number(p.profile_drift_score)) * 0.1 + (1 - Number(p.cost_bias_score)) * 0.1,
  })).sort((a, b) => b.composite - a.composite);

  return json({ comparison: compared, recommended: compared[0]?.id });
}

async function handleBindProfile(sb: any, params: any) {
  const { organization_id, profile_id, scope_type, scope_id, rollback_plan } = params;
  const { data, error } = await sb.from('operating_profile_bindings').insert({
    organization_id, profile_id, scope_type, scope_id: scope_id || '', binding_status: 'proposed', rollback_plan: rollback_plan || {},
  }).select('id').single();
  if (error) return json({ error: error.message }, 500);
  return json({ success: true, binding_id: data.id });
}

async function handleManageOverride(sb: any, params: any) {
  const { organization_id, profile_id, override_key, override_value, justification, override_scope, scope_id } = params;
  const { data: existing } = await sb.from('operating_profile_overrides').select('id').eq('organization_id', organization_id).eq('profile_id', profile_id);
  const overridePressure = Math.min(((existing?.length || 0) + 1) / 10, 1);

  const { data, error } = await sb.from('operating_profile_overrides').insert({
    organization_id, profile_id, override_key, override_value: override_value || {}, justification: justification || '',
    override_scope: override_scope || 'workspace', scope_id: scope_id || '', override_pressure_score: overridePressure,
  }).select('id').single();
  if (error) return json({ error: error.message }, 500);
  return json({ success: true, override_id: data.id, override_pressure: overridePressure });
}

async function handleOutcomes(sb: any, params: any) {
  const { organization_id } = params;
  const { data } = await sb.from('profile_outcomes').select('*, operating_profiles(profile_name)').eq('organization_id', organization_id).order('created_at', { ascending: false }).limit(50);
  return json({ outcomes: data || [] });
}

async function handleExplain(sb: any, params: any) {
  const { organization_id, profile_id } = params;
  const { data: profile } = await sb.from('operating_profiles').select('*').eq('id', profile_id).eq('organization_id', organization_id).single();
  if (!profile) return json({ error: 'Profile not found' }, 404);

  const [bindingsRes, overridesRes, outcomesRes] = await Promise.all([
    sb.from('operating_profile_bindings').select('*').eq('profile_id', profile_id).eq('organization_id', organization_id),
    sb.from('operating_profile_overrides').select('*').eq('profile_id', profile_id).eq('organization_id', organization_id),
    sb.from('profile_outcomes').select('*').eq('profile_id', profile_id).eq('organization_id', organization_id),
  ]);

  return json({
    profile,
    bindings: bindingsRes.data || [],
    overrides: overridesRes.data || [],
    outcomes: outcomesRes.data || [],
    explanation: {
      fit: Number(profile.tenant_fit_score) >= 0.7 ? 'Strong fit' : Number(profile.tenant_fit_score) >= 0.4 ? 'Moderate fit' : 'Weak fit',
      bias: `Stability: ${profile.stability_bias_score}, Cost: ${profile.cost_bias_score}, Speed: ${profile.speed_bias_score}`,
      governance: Number(profile.governance_strictness_score) >= 0.7 ? 'Strict' : 'Moderate',
      rollback: Number(profile.rollback_viability_score) >= 0.7 ? 'Easy rollback' : 'Review rollback plan',
    },
  });
}
