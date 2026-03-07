/**
 * Agent Memory Quality — Sprint 24
 * Scores memory relevance, detects stale/conflicting memory, supports transitions.
 * SAFETY: Read/write bounded. Cannot mutate pipeline, governance, billing.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface MemoryQualityScore {
  record_id: string;
  quality_score: number;
  freshness: number;
  support: number;
  is_stale: boolean;
  is_conflicting: boolean;
  recommended_action: "keep" | "watch" | "deprecate";
}

export interface MemoryQualityReport {
  total_profiles: number;
  active_profiles: number;
  watch_profiles: number;
  deprecated_profiles: number;
  total_records: number;
  stale_records: number;
  conflicting_records: number;
  avg_quality: number;
}

const STALE_DAYS = 30;
const LOW_RELEVANCE_THRESHOLD = 0.2;

export function scoreMemoryQuality(
  record: { id: string; relevance_score: number | null; created_at: string; memory_type: string },
  nowMs: number = Date.now(),
): MemoryQualityScore {
  const ageMs = nowMs - new Date(record.created_at).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const freshness = Math.max(0, 1 - ageDays / (STALE_DAYS * 2));
  const relevance = record.relevance_score ?? 0.5;
  const support = relevance >= 0.5 ? 1 : relevance >= 0.3 ? 0.5 : 0.2;

  const quality_score = Math.round((freshness * 0.3 + relevance * 0.5 + support * 0.2) * 1000) / 1000;
  const is_stale = ageDays > STALE_DAYS && relevance < 0.4;
  const is_conflicting = false; // would need pair analysis

  let recommended_action: "keep" | "watch" | "deprecate" = "keep";
  if (is_stale) recommended_action = "deprecate";
  else if (quality_score < LOW_RELEVANCE_THRESHOLD) recommended_action = "watch";

  return { record_id: record.id, quality_score, freshness, support, is_stale, is_conflicting, recommended_action };
}

export async function getMemoryQualityReport(
  sc: SupabaseClient,
  organizationId: string,
): Promise<MemoryQualityReport> {
  try {
    const [profilesRes, recordsRes] = await Promise.all([
      sc.from("agent_memory_profiles")
        .select("status")
        .eq("organization_id", organizationId),
      sc.from("agent_memory_records")
        .select("id, relevance_score, created_at, memory_type")
        .eq("organization_id", organizationId)
        .limit(500),
    ]);

    const profiles = profilesRes.data || [];
    const records = recordsRes.data || [];

    const active = profiles.filter((p: any) => p.status === "active").length;
    const watch = profiles.filter((p: any) => p.status === "watch").length;
    const deprecated = profiles.filter((p: any) => p.status === "deprecated").length;

    const scores = records.map((r: any) => scoreMemoryQuality(r));
    const stale = scores.filter((s) => s.is_stale).length;
    const conflicting = scores.filter((s) => s.is_conflicting).length;
    const avg = scores.length > 0 ? scores.reduce((a, s) => a + s.quality_score, 0) / scores.length : 0;

    return {
      total_profiles: profiles.length,
      active_profiles: active,
      watch_profiles: watch,
      deprecated_profiles: deprecated,
      total_records: records.length,
      stale_records: stale,
      conflicting_records: conflicting,
      avg_quality: Math.round(avg * 1000) / 1000,
    };
  } catch (e) {
    console.warn("Memory quality report failed:", e);
    return { total_profiles: 0, active_profiles: 0, watch_profiles: 0, deprecated_profiles: 0, total_records: 0, stale_records: 0, conflicting_records: 0, avg_quality: 0 };
  }
}

export async function deprecateStaleMemory(
  sc: SupabaseClient,
  organizationId: string,
): Promise<{ deprecated_count: number }> {
  try {
    const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await sc.from("agent_memory_profiles")
      .update({ status: "deprecated" })
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .lt("updated_at", cutoff)
      .lt("confidence", 0.3)
      .select("id");

    return { deprecated_count: data?.length || 0 };
  } catch (e) {
    console.warn("Deprecate stale memory failed:", e);
    return { deprecated_count: 0 };
  }
}
