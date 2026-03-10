import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { computeDoctrineProfile, computeDivergence } from '../_shared/tenant-doctrine/tenant-doctrine-profiler.ts';
import { detectDivergence } from '../_shared/tenant-doctrine/doctrine-divergence-detector.ts';
import { applyAdjustments } from '../_shared/tenant-doctrine/operating-profile-adjuster.ts';
import { explainDoctrine } from '../_shared/tenant-doctrine/tenant-doctrine-explainer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Server configuration error' }, 500);

  const sb = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { action, params } = await req.json();
    switch (action) {
      case 'compute_profile': return await handleComputeProfile(sb, params);
      case 'compare_declared_vs_observed': return await handleCompare(sb, params);
      case 'adjust_operating_posture': return await handleAdjust(sb, params);
      case 'list_doctrine_conflicts': return await handleListConflicts(sb, params);
      case 'review_profile': return await handleReview(sb, params);
      case 'explain_profile': return await handleExplain(sb, params);
      default: return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    return json({ error: error.message || 'Internal error' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function handleComputeProfile(sb: any, params: any) {
  const { organization_id } = params;
  const { data: signals } = await sb.from('tenant_doctrine_signals')
    .select('*').eq('organization_id', organization_id).order('created_at', { ascending: false }).limit(200);

  const profile = computeDoctrineProfile(signals || []);

  // Upsert profile
  const { data: existing } = await sb.from('tenant_operating_profiles')
    .select('id').eq('organization_id', organization_id).eq('profile_status', 'active').limit(1);

  if (existing && existing.length > 0) {
    const { error } = await sb.from('tenant_operating_profiles')
      .update({ ...profile, observed_profile: profile, updated_at: new Date().toISOString() })
      .eq('id', existing[0].id);
    if (error) return json({ error: error.message }, 500);
    return json({ success: true, profile_id: existing[0].id, profile });
  } else {
    const { data, error } = await sb.from('tenant_operating_profiles')
      .insert({ organization_id, ...profile, observed_profile: profile, profile_status: 'active' })
      .select('id').single();
    if (error) return json({ error: error.message }, 500);
    return json({ success: true, profile_id: data.id, profile });
  }
}

async function handleCompare(sb: any, params: any) {
  const { organization_id, profile_id } = params;
  let query = sb.from('tenant_operating_profiles').select('*').eq('organization_id', organization_id);
  if (profile_id) query = query.eq('id', profile_id);
  else query = query.eq('profile_status', 'active');
  const { data } = await query.limit(1).single();
  if (!data) return json({ error: 'No profile found' }, 404);

  const declared = typeof data.declared_profile === 'object' ? data.declared_profile : {};
  const observed = typeof data.observed_profile === 'object' ? data.observed_profile : {};
  const result = detectDivergence(declared, observed);

  // Update divergence score
  await sb.from('tenant_operating_profiles')
    .update({ divergence_score: result.divergence_score, updated_at: new Date().toISOString() })
    .eq('id', data.id);

  // Record conflicts
  for (const c of result.conflicts.filter(c => c.severity === 'high')) {
    await sb.from('doctrine_conflict_cases').insert({
      organization_id, profile_id: data.id, conflict_type: 'declared_vs_observed',
      dimension_a: c.dimension, severity: c.severity, description: c.description,
    });
  }

  return json({ profile_id: data.id, ...result });
}

async function handleAdjust(sb: any, params: any) {
  const { organization_id, adjustments } = params;
  const { data: profile } = await sb.from('tenant_operating_profiles')
    .select('*').eq('organization_id', organization_id).eq('profile_status', 'active').limit(1).single();
  if (!profile) return json({ error: 'No active profile' }, 404);

  const currentScores: Record<string, number> = {
    risk_tolerance: Number(profile.risk_tolerance_score),
    validation_strictness: Number(profile.validation_strictness_score),
    rollback_preference: Number(profile.rollback_preference_score),
    rollout_cadence: Number(profile.rollout_cadence_score),
    incident_escalation: Number(profile.incident_escalation_bias),
    autonomy_tolerance: Number(profile.autonomy_tolerance_score),
  };

  const results = applyAdjustments(currentScores, adjustments || []);
  const applied = results.filter(r => r.applied);

  if (applied.length > 0) {
    const update: any = { updated_at: new Date().toISOString() };
    const dimMap: Record<string, string> = {
      risk_tolerance: 'risk_tolerance_score', validation_strictness: 'validation_strictness_score',
      rollback_preference: 'rollback_preference_score', rollout_cadence: 'rollout_cadence_score',
      incident_escalation: 'incident_escalation_bias', autonomy_tolerance: 'autonomy_tolerance_score',
    };
    for (const r of applied) {
      if (dimMap[r.dimension]) update[dimMap[r.dimension]] = r.new_value;
      await sb.from('doctrine_adjustment_events').insert({
        organization_id, profile_id: profile.id, adjustment_type: 'score_update',
        dimension: r.dimension, previous_value: r.previous_value, new_value: r.new_value,
        delta: r.delta, reason: r.reason,
      });
    }
    await sb.from('tenant_operating_profiles').update(update).eq('id', profile.id);
  }

  return json({ success: true, adjustments_applied: applied.length, results });
}

async function handleListConflicts(sb: any, params: any) {
  const { organization_id } = params;
  const { data } = await sb.from('doctrine_conflict_cases')
    .select('*').eq('organization_id', organization_id).order('created_at', { ascending: false }).limit(50);
  return json({ conflicts: data || [] });
}

async function handleReview(sb: any, params: any) {
  const { organization_id, profile_id, review_status, review_notes, reviewer_id } = params;
  const { data, error } = await sb.from('tenant_doctrine_reviews').insert({
    organization_id, profile_id, review_type: 'manual', reviewer_id: reviewer_id || 'operator',
    review_status: review_status || 'completed', review_notes: review_notes || '',
    completed_at: review_status === 'completed' ? new Date().toISOString() : null,
  }).select('id').single();
  if (error) return json({ error: error.message }, 500);

  if (review_status === 'approved') {
    await sb.from('tenant_operating_profiles')
      .update({ profile_status: 'approved', reviewed_by: reviewer_id || 'operator', approved_at: new Date().toISOString() })
      .eq('id', profile_id);
  }

  return json({ success: true, review_id: data.id });
}

async function handleExplain(sb: any, params: any) {
  const { organization_id, profile_id } = params;
  let query = sb.from('tenant_operating_profiles').select('*').eq('organization_id', organization_id);
  if (profile_id) query = query.eq('id', profile_id);
  else query = query.eq('profile_status', 'active');
  const { data } = await query.limit(1).single();
  if (!data) return json({ error: 'No profile found' }, 404);

  const explanation = explainDoctrine(data);
  return json({ profile: data, explanation });
}
