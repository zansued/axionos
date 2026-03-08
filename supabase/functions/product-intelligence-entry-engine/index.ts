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
      case 'ingest_signals': return await handleIngestSignals(supabase, params);
      case 'analyze_friction': return await handleAnalyzeFriction(supabase, params);
      case 'detect_opportunities': return await handleDetectOpportunities(supabase, params);
      case 'correlate_architecture': return await handleCorrelateArchitecture(supabase, params);
      case 'correlate_profiles': return await handleCorrelateProfiles(supabase, params);
      case 'prioritize': return await handlePrioritize(supabase, params);
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
  const [signalsRes, profilesRes, oppsRes, frictionsRes, outcomesRes] = await Promise.all([
    sb.from('product_signal_events').select('id, signal_type, signal_source, product_area, friction_score, adoption_score, retention_signal_score, value_signal_score, signal_quality_score, noise_penalty_score, confidence_score').eq('organization_id', organization_id).order('created_at', { ascending: false }).limit(200),
    sb.from('product_intelligence_profiles').select('id, product_area, avg_friction_score, avg_adoption_score, avg_retention_score, avg_value_score, signal_quality_posture, architecture_alignment_score, operating_profile_alignment_score, tenant_divergence_signal_score').eq('organization_id', organization_id).limit(50),
    sb.from('product_opportunity_candidates').select('id, opportunity_type, product_area, opportunity_score, confidence_score, priority_score, status').eq('organization_id', organization_id).order('priority_score', { ascending: false }).limit(50),
    sb.from('product_friction_clusters').select('id, cluster_name, product_area, friction_type, severity_score, recurrence_count, trend_direction, status').eq('organization_id', organization_id).order('severity_score', { ascending: false }).limit(30),
    sb.from('product_intelligence_outcomes').select('id, outcome_status, product_effectiveness_score').eq('organization_id', organization_id).limit(50),
  ]);

  const signals = signalsRes.data || [];
  const opps = oppsRes.data || [];
  const frictions = frictionsRes.data || [];
  const outcomes = outcomesRes.data || [];

  const avgQuality = signals.length > 0 ? signals.reduce((s: number, x: any) => s + Number(x.signal_quality_score), 0) / signals.length : 0;
  const avgFriction = signals.length > 0 ? signals.reduce((s: number, x: any) => s + Number(x.friction_score), 0) / signals.length : 0;
  const avgEffectiveness = outcomes.length > 0 ? outcomes.reduce((s: number, x: any) => s + Number(x.product_effectiveness_score), 0) / outcomes.length : 0;
  const topOpps = opps.filter((o: any) => o.status !== 'archived').slice(0, 5);
  const activeFrictions = frictions.filter((f: any) => f.status === 'active');

  return json({
    overview: {
      total_signals: signals.length,
      total_opportunities: opps.length,
      total_friction_clusters: frictions.length,
      active_friction_clusters: activeFrictions.length,
      total_outcomes: outcomes.length,
      avg_signal_quality: Math.round(avgQuality * 100) / 100,
      avg_friction: Math.round(avgFriction * 100) / 100,
      avg_effectiveness: Math.round(avgEffectiveness * 100) / 100,
      top_opportunities: topOpps,
      top_frictions: activeFrictions.slice(0, 5),
    },
  });
}

async function handleIngestSignals(sb: any, params: any) {
  const { organization_id, signals } = params;
  if (!signals || !Array.isArray(signals)) return json({ error: 'signals array required' }, 400);
  const records = signals.map((s: any) => ({ ...s, organization_id }));
  const { data, error } = await sb.from('product_signal_events').insert(records).select('id');
  if (error) return json({ error: error.message }, 500);
  return json({ success: true, ingested: (data || []).length });
}

async function handleAnalyzeFriction(sb: any, params: any) {
  const { organization_id } = params;
  const { data } = await sb.from('product_friction_clusters').select('*').eq('organization_id', organization_id).eq('status', 'active').order('severity_score', { ascending: false }).limit(20);
  return json({ friction_clusters: data || [] });
}

async function handleDetectOpportunities(sb: any, params: any) {
  const { organization_id } = params;
  const { data } = await sb.from('product_opportunity_candidates').select('*').eq('organization_id', organization_id).not('status', 'eq', 'archived').order('priority_score', { ascending: false }).limit(20);
  return json({ opportunities: data || [] });
}

async function handleCorrelateArchitecture(sb: any, params: any) {
  const { organization_id } = params;
  const [oppsRes, profilesRes] = await Promise.all([
    sb.from('product_opportunity_candidates').select('id, product_area, architecture_alignment_score, linked_architecture_mode_id').eq('organization_id', organization_id).not('status', 'eq', 'archived').limit(20),
    sb.from('product_intelligence_profiles').select('product_area, architecture_alignment_score').eq('organization_id', organization_id).limit(20),
  ]);
  return json({
    opportunity_correlations: oppsRes.data || [],
    profile_correlations: profilesRes.data || [],
  });
}

async function handleCorrelateProfiles(sb: any, params: any) {
  const { organization_id } = params;
  const [oppsRes, profilesRes] = await Promise.all([
    sb.from('product_opportunity_candidates').select('id, product_area, profile_alignment_score, linked_operating_profile_id, linked_policy_pack_id').eq('organization_id', organization_id).not('status', 'eq', 'archived').limit(20),
    sb.from('product_intelligence_profiles').select('product_area, operating_profile_alignment_score').eq('organization_id', organization_id).limit(20),
  ]);
  return json({
    opportunity_profile_correlations: oppsRes.data || [],
    intelligence_profile_correlations: profilesRes.data || [],
  });
}

async function handlePrioritize(sb: any, params: any) {
  const { organization_id } = params;
  const { data } = await sb.from('product_opportunity_candidates').select('*').eq('organization_id', organization_id).not('status', 'eq', 'archived').order('priority_score', { ascending: false }).limit(20);
  return json({ prioritized: data || [] });
}

async function handleOutcomes(sb: any, params: any) {
  const { organization_id } = params;
  const { data } = await sb.from('product_intelligence_outcomes').select('*').eq('organization_id', organization_id).order('created_at', { ascending: false }).limit(30);
  return json({ outcomes: data || [] });
}

async function handleExplain(sb: any, params: any) {
  const { organization_id, entity_type, entity_id } = params;
  let entity;
  if (entity_type === 'opportunity') {
    const { data } = await sb.from('product_opportunity_candidates').select('*').eq('id', entity_id).eq('organization_id', organization_id).single();
    entity = data;
  } else if (entity_type === 'friction') {
    const { data } = await sb.from('product_friction_clusters').select('*').eq('id', entity_id).eq('organization_id', organization_id).single();
    entity = data;
  } else if (entity_type === 'signal') {
    const { data } = await sb.from('product_signal_events').select('*').eq('id', entity_id).eq('organization_id', organization_id).single();
    entity = data;
  }
  if (!entity) return json({ error: 'Entity not found' }, 404);
  return json({ entity, type: entity_type });
}
