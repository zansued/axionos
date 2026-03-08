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
      case 'build_benchmarks': return await handleBuildBenchmarks(supabase, params);
      case 'evaluate_signal_quality': return await handleEvaluateSignalQuality(supabase, params);
      case 'correlate_architecture': return await handleCorrelateArchitecture(supabase, params);
      case 'correlate_profiles': return await handleCorrelateProfiles(supabase, params);
      case 'prioritize_operational_recommendations': return await handlePrioritize(supabase, params);
      case 'benchmark_outcomes': return await handleBenchmarkOutcomes(supabase, params);
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
  const [benchRes, recRes, corrArchRes, corrProfRes, outcomesRes, qualityRes] = await Promise.all([
    sb.from('product_operational_benchmarks').select('id, benchmark_scope_type, product_area, adoption_score, retention_score, friction_score, value_score, product_signal_quality_score, benchmark_rank, confidence_score, product_priority_score, signal_noise_penalty_score').eq('organization_id', organization_id).order('product_priority_score', { ascending: false }).limit(50),
    sb.from('product_operational_recommendations').select('id, recommendation_type, product_area, title, priority_score, confidence_score, recommendation_status').eq('organization_id', organization_id).order('priority_score', { ascending: false }).limit(30),
    sb.from('product_architecture_correlations').select('id, product_area, architecture_alignment_score, correlation_strength, confidence_score').eq('organization_id', organization_id).limit(30),
    sb.from('product_profile_correlations').select('id, product_area, profile_alignment_score, correlation_strength, confidence_score').eq('organization_id', organization_id).limit(30),
    sb.from('product_benchmark_outcomes').select('id, outcome_status, usefulness_score, expected_impact, realized_impact, false_positive').eq('organization_id', organization_id).order('created_at', { ascending: false }).limit(30),
    sb.from('product_signal_quality_reviews').select('id, signal_type, quality_score, consistency_score, noise_penalty_score, confidence_score').eq('organization_id', organization_id).order('created_at', { ascending: false }).limit(50),
  ]);

  const benchmarks = benchRes.data || [];
  const recommendations = recRes.data || [];
  const outcomes = outcomesRes.data || [];
  const qualityReviews = qualityRes.data || [];

  const avgQuality = qualityReviews.length > 0 ? qualityReviews.reduce((s: number, q: any) => s + Number(q.quality_score), 0) / qualityReviews.length : 0;
  const avgNoise = qualityReviews.length > 0 ? qualityReviews.reduce((s: number, q: any) => s + Number(q.noise_penalty_score), 0) / qualityReviews.length : 0;
  const avgUsefulness = outcomes.length > 0 ? outcomes.reduce((s: number, o: any) => s + Number(o.usefulness_score), 0) / outcomes.length : 0;
  const falsePositiveRate = outcomes.length > 0 ? outcomes.filter((o: any) => o.false_positive).length / outcomes.length : 0;

  return json({
    overview: {
      total_benchmarks: benchmarks.length,
      total_recommendations: recommendations.length,
      total_arch_correlations: (corrArchRes.data || []).length,
      total_profile_correlations: (corrProfRes.data || []).length,
      total_outcomes: outcomes.length,
      total_quality_reviews: qualityReviews.length,
      avg_signal_quality: Math.round(avgQuality * 100) / 100,
      avg_noise_penalty: Math.round(avgNoise * 100) / 100,
      avg_recommendation_usefulness: Math.round(avgUsefulness * 100) / 100,
      false_positive_rate: Math.round(falsePositiveRate * 100) / 100,
      top_benchmarks: benchmarks.slice(0, 5),
      top_recommendations: recommendations.filter((r: any) => r.recommendation_status !== 'dismissed').slice(0, 5),
    },
  });
}

async function handleBuildBenchmarks(sb: any, params: any) {
  const { organization_id } = params;
  const { data } = await sb.from('product_operational_benchmarks').select('*').eq('organization_id', organization_id).order('product_priority_score', { ascending: false }).limit(50);
  return json({ benchmarks: data || [] });
}

async function handleEvaluateSignalQuality(sb: any, params: any) {
  const { organization_id } = params;
  const { data } = await sb.from('product_signal_quality_reviews').select('*').eq('organization_id', organization_id).order('created_at', { ascending: false }).limit(50);
  return json({ quality_reviews: data || [] });
}

async function handleCorrelateArchitecture(sb: any, params: any) {
  const { organization_id } = params;
  const { data } = await sb.from('product_architecture_correlations').select('*').eq('organization_id', organization_id).order('created_at', { ascending: false }).limit(30);
  return json({ architecture_correlations: data || [] });
}

async function handleCorrelateProfiles(sb: any, params: any) {
  const { organization_id } = params;
  const { data } = await sb.from('product_profile_correlations').select('*').eq('organization_id', organization_id).order('created_at', { ascending: false }).limit(30);
  return json({ profile_correlations: data || [] });
}

async function handlePrioritize(sb: any, params: any) {
  const { organization_id } = params;
  const { data } = await sb.from('product_operational_recommendations').select('*').eq('organization_id', organization_id).not('recommendation_status', 'eq', 'dismissed').order('priority_score', { ascending: false }).limit(30);
  return json({ recommendations: data || [] });
}

async function handleBenchmarkOutcomes(sb: any, params: any) {
  const { organization_id } = params;
  const { data } = await sb.from('product_benchmark_outcomes').select('*').eq('organization_id', organization_id).order('created_at', { ascending: false }).limit(30);
  return json({ outcomes: data || [] });
}

async function handleExplain(sb: any, params: any) {
  const { organization_id, entity_type, entity_id } = params;
  let entity;
  const tableMap: Record<string, string> = {
    benchmark: 'product_operational_benchmarks',
    recommendation: 'product_operational_recommendations',
    correlation: 'product_architecture_correlations',
    profile_correlation: 'product_profile_correlations',
    quality_review: 'product_signal_quality_reviews',
    outcome: 'product_benchmark_outcomes',
  };
  const table = tableMap[entity_type];
  if (!table) return json({ error: `Unknown entity_type: ${entity_type}` }, 400);
  const { data } = await sb.from(table).select('*').eq('id', entity_id).eq('organization_id', organization_id).single();
  entity = data;
  if (!entity) return json({ error: 'Entity not found' }, 404);
  return json({ entity, type: entity_type });
}
