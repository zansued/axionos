import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { action, params } = await req.json();

    switch (action) {
      case 'overview':
        return await handleOverview(supabase, params);
      case 'ingest_case':
        return await handleIngestCase(supabase, params);
      case 'retrieve_similar':
        return await handleRetrieveSimilar(supabase, params);
      case 'extract_patterns':
        return await handleExtractPatterns(supabase, params);
      case 'preserve_locality_signals':
        return await handlePreserveLocalitySignals(supabase, params);
      case 'feedback':
        return await handleFeedback(supabase, params);
      case 'explain':
        return await handleExplain(supabase, params);
      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    return jsonResponse({ error: error.message || 'Internal error' }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleOverview(supabase: any, params: any) {
  const { organization_id } = params;

  const [entriesRes, patternsRes, feedbackRes, retrievalsRes] = await Promise.all([
    supabase.from('convergence_memory_entries').select('id, memory_type, memory_quality_score, evidence_density_score, reuse_confidence_score, convergence_domain, created_at').eq('organization_id', organization_id).order('created_at', { ascending: false }).limit(200),
    supabase.from('convergence_memory_patterns').select('id, pattern_type, pattern_strength, confidence_score, occurrence_count, status').eq('organization_id', organization_id).eq('status', 'active').order('pattern_strength', { ascending: false }).limit(50),
    supabase.from('convergence_memory_feedback').select('id, usefulness_status').eq('organization_id', organization_id).limit(200),
    supabase.from('convergence_memory_retrievals').select('id').eq('organization_id', organization_id).limit(1),
  ]);

  const entries = entriesRes.data || [];
  const patterns = patternsRes.data || [];
  const feedback = feedbackRes.data || [];

  const totalEntries = entries.length;
  const avgQuality = totalEntries > 0 ? entries.reduce((s: number, e: any) => s + Number(e.memory_quality_score), 0) / totalEntries : 0;
  const avgEvidence = totalEntries > 0 ? entries.reduce((s: number, e: any) => s + Number(e.evidence_density_score), 0) / totalEntries : 0;
  const helpfulFeedback = feedback.filter((f: any) => f.usefulness_status === 'helpful').length;
  const usefulnessRate = feedback.length > 0 ? helpfulFeedback / feedback.length : 0;

  const domainCounts = new Map<string, number>();
  entries.forEach((e: any) => domainCounts.set(e.convergence_domain, (domainCounts.get(e.convergence_domain) || 0) + 1));

  const typeCounts = new Map<string, number>();
  entries.forEach((e: any) => typeCounts.set(e.memory_type, (typeCounts.get(e.memory_type) || 0) + 1));

  return jsonResponse({
    overview: {
      total_entries: totalEntries,
      avg_quality_score: Math.round(avgQuality * 100) / 100,
      avg_evidence_density: Math.round(avgEvidence * 100) / 100,
      total_patterns: patterns.length,
      total_feedback: feedback.length,
      usefulness_rate: Math.round(usefulnessRate * 100) / 100,
      total_retrievals: retrievalsRes.data?.length || 0,
      domains: Object.fromEntries(domainCounts),
      memory_types: Object.fromEntries(typeCounts),
      top_patterns: patterns.slice(0, 5),
    },
  });
}

async function handleIngestCase(supabase: any, params: any) {
  const { organization_id, entry, evidence_records } = params;

  const { data: inserted, error } = await supabase
    .from('convergence_memory_entries')
    .insert({ ...entry, organization_id })
    .select('id')
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);

  if (evidence_records && evidence_records.length > 0) {
    const evidenceWithEntryId = evidence_records.map((e: any) => ({
      ...e,
      organization_id,
      memory_entry_id: inserted.id,
    }));
    await supabase.from('convergence_memory_evidence').insert(evidenceWithEntryId);
  }

  return jsonResponse({ success: true, entry_id: inserted.id });
}

async function handleRetrieveSimilar(supabase: any, params: any) {
  const { organization_id, convergence_domain, action_type, specialization_type, limit: queryLimit } = params;

  let query = supabase
    .from('convergence_memory_entries')
    .select('*')
    .eq('organization_id', organization_id)
    .order('memory_quality_score', { ascending: false })
    .limit(queryLimit || 20);

  if (convergence_domain) query = query.eq('convergence_domain', convergence_domain);
  if (action_type) query = query.eq('action_type', action_type);
  if (specialization_type) query = query.eq('specialization_type', specialization_type);

  const { data, error } = await query;
  if (error) return jsonResponse({ error: error.message }, 500);

  // Log retrieval
  await supabase.from('convergence_memory_retrievals').insert({
    organization_id,
    query_context: { convergence_domain, action_type, specialization_type },
    matched_entry_ids: (data || []).map((e: any) => e.id),
    relevance_scores: (data || []).map((e: any) => e.memory_quality_score),
    retrieval_purpose: 'advisory',
    requester_ref: {},
  });

  return jsonResponse({ results: data || [], count: (data || []).length });
}

async function handleExtractPatterns(supabase: any, params: any) {
  const { organization_id } = params;

  const { data: patterns } = await supabase
    .from('convergence_memory_patterns')
    .select('*')
    .eq('organization_id', organization_id)
    .eq('status', 'active')
    .order('pattern_strength', { ascending: false })
    .limit(50);

  return jsonResponse({ patterns: patterns || [] });
}

async function handlePreserveLocalitySignals(supabase: any, params: any) {
  const { organization_id } = params;

  const { data: entries } = await supabase
    .from('convergence_memory_entries')
    .select('*')
    .eq('organization_id', organization_id)
    .in('memory_type', ['retention_justified', 'promotion_failure', 'preservation_heuristic'])
    .order('memory_quality_score', { ascending: false })
    .limit(50);

  return jsonResponse({
    preservation_signals: (entries || []).map((e: any) => ({
      entry_id: e.id,
      convergence_domain: e.convergence_domain,
      specialization_type: e.specialization_type,
      preservation_strength: e.memory_quality_score,
      rationale: e.rationale,
      evidence_density: e.evidence_density_score,
    })),
    count: (entries || []).length,
  });
}

async function handleFeedback(supabase: any, params: any) {
  const { organization_id, retrieval_id, memory_entry_id, usefulness_status, feedback_notes, reviewer_ref } = params;

  const { error } = await supabase.from('convergence_memory_feedback').insert({
    organization_id,
    retrieval_id: retrieval_id || null,
    memory_entry_id: memory_entry_id || null,
    usefulness_status,
    feedback_notes: feedback_notes || '',
    reviewer_ref: reviewer_ref || {},
  });

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ success: true });
}

async function handleExplain(supabase: any, params: any) {
  const { organization_id, entry_id } = params;

  const { data: entry } = await supabase
    .from('convergence_memory_entries')
    .select('*')
    .eq('id', entry_id)
    .eq('organization_id', organization_id)
    .single();

  if (!entry) return jsonResponse({ error: 'Entry not found' }, 404);

  const { data: evidence } = await supabase
    .from('convergence_memory_evidence')
    .select('*')
    .eq('memory_entry_id', entry_id)
    .eq('organization_id', organization_id);

  const { data: feedback } = await supabase
    .from('convergence_memory_feedback')
    .select('usefulness_status')
    .eq('memory_entry_id', entry_id)
    .eq('organization_id', organization_id);

  const helpfulCount = (feedback || []).filter((f: any) => f.usefulness_status === 'helpful').length;
  const totalFeedback = (feedback || []).length;

  return jsonResponse({
    entry,
    evidence: evidence || [],
    feedback_summary: {
      total: totalFeedback,
      helpful: helpfulCount,
      usefulness_rate: totalFeedback > 0 ? Math.round((helpfulCount / totalFeedback) * 100) / 100 : 0,
    },
    explanation: {
      memory_type_reason: getMemoryTypeReason(entry.memory_type),
      quality_assessment: entry.memory_quality_score >= 0.7 ? 'High quality' : entry.memory_quality_score >= 0.4 ? 'Moderate quality' : 'Low quality',
      evidence_assessment: `${(evidence || []).length} evidence records with density score ${entry.evidence_density_score}`,
      recommended_use: getRecommendedUse(entry.memory_type),
    },
  });
}

function getMemoryTypeReason(type: string): string {
  const reasons: Record<string, string> = {
    convergence_outcome: 'General convergence outcome stored for future reference',
    promotion_success: 'Successful promotion — precedent for similar proposals',
    promotion_failure: 'Failed promotion — warning signal for similar proposals',
    retention_justified: 'Local specialization preserved with justification',
    deprecation_outcome: 'Deprecation/retirement outcome for evidence-based decisions',
    merge_outcome: 'Bounded merge result informing future merge proposals',
    anti_pattern: 'Anti-pattern detected — avoid repeating this path',
    preservation_heuristic: 'Validated preservation heuristic for local variants',
  };
  return reasons[type] || 'Memory stored for advisory use';
}

function getRecommendedUse(type: string): string {
  if (type === 'anti_pattern') return 'Negative signal for similar convergence proposals';
  if (type === 'retention_justified') return 'Supporting evidence for local specialization preservation';
  if (type === 'promotion_success') return 'Supporting evidence for promotion proposals';
  if (type === 'promotion_failure') return 'Caution signal — verify current conditions differ';
  return 'Contextual reference for convergence advisory';
}
