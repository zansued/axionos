/**
 * Precedent Matcher
 * Finds similar precedents and measures alignment.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface PrecedentMatch {
  id: string;
  precedent_code: string;
  precedent_summary: string;
  resolution_pattern: string;
  outcome_quality_score: number;
  reusability_score: number;
  alignment_score: number;
}

export async function findPrecedents(
  client: SupabaseClient,
  organizationId: string,
  conflictType: string,
  limit = 5
): Promise<PrecedentMatch[]> {
  const { data, error } = await client
    .from("conflict_precedents")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("conflict_type", conflictType)
    .order("outcome_quality_score", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((p: any) => ({
    id: p.id,
    precedent_code: p.precedent_code,
    precedent_summary: p.precedent_summary,
    resolution_pattern: p.resolution_pattern,
    outcome_quality_score: Number(p.outcome_quality_score),
    reusability_score: Number(p.reusability_score),
    alignment_score: Number((p.outcome_quality_score * 0.6 + p.reusability_score * 0.4).toFixed(3)),
  }));
}
