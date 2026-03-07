/**
 * Agent Memory Retriever — Sprint 24
 * Fetches relevant memory for the current agent context.
 * Deterministic ranking, deduplication, bounded payloads.
 * SAFETY: Read-only. Non-blocking. Degrades gracefully.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AgentMemoryContext {
  agent_type: string;
  stage_key?: string;
  model_provider?: string;
  model_name?: string;
  error_signature?: string;
  context_signature?: string;
  recent_retry_count?: number;
}

export interface RetrievedMemoryProfile {
  id: string;
  agent_type: string;
  stage_key: string | null;
  memory_scope: string;
  memory_summary: string;
  confidence: number | null;
  support_count: number;
  status: string;
}

export interface RetrievedMemoryRecord {
  id: string;
  agent_type: string;
  stage_key: string | null;
  memory_type: string;
  context_signature: string;
  memory_payload: Record<string, unknown>;
  relevance_score: number | null;
}

export interface AgentMemoryBundle {
  profiles: RetrievedMemoryProfile[];
  records: RetrievedMemoryRecord[];
  total_records: number;
  retrieval_score: number;
}

const MAX_PROFILES = 5;
const MAX_RECORDS = 15;
const EMPTY_BUNDLE: AgentMemoryBundle = { profiles: [], records: [], total_records: 0, retrieval_score: 0 };

export async function retrieveAgentMemory(
  sc: SupabaseClient,
  organizationId: string,
  ctx: AgentMemoryContext,
): Promise<AgentMemoryBundle> {
  try {
    const [profiles, records] = await Promise.all([
      fetchProfiles(sc, organizationId, ctx),
      fetchRecords(sc, organizationId, ctx),
    ]);

    const dedupedRecords = deduplicateRecords(records);
    const rankedRecords = rankRecords(dedupedRecords, ctx);
    const bounded = rankedRecords.slice(0, MAX_RECORDS);

    const retrieval_score = computeRetrievalScore(profiles.length, bounded.length);

    return {
      profiles: profiles.slice(0, MAX_PROFILES),
      records: bounded,
      total_records: records.length,
      retrieval_score,
    };
  } catch (e) {
    console.warn("Agent memory retrieval failed (non-blocking):", e);
    return EMPTY_BUNDLE;
  }
}

async function fetchProfiles(
  sc: SupabaseClient, orgId: string, ctx: AgentMemoryContext,
): Promise<RetrievedMemoryProfile[]> {
  let q = sc.from("agent_memory_profiles")
    .select("id, agent_type, stage_key, memory_scope, memory_summary, confidence, support_count, status")
    .eq("organization_id", orgId)
    .eq("agent_type", ctx.agent_type)
    .eq("status", "active")
    .order("confidence", { ascending: false })
    .limit(10);

  if (ctx.stage_key) {
    q = q.or(`stage_key.eq.${ctx.stage_key},stage_key.is.null`);
  }

  const { data } = await q;
  return (data || []) as RetrievedMemoryProfile[];
}

async function fetchRecords(
  sc: SupabaseClient, orgId: string, ctx: AgentMemoryContext,
): Promise<RetrievedMemoryRecord[]> {
  let q = sc.from("agent_memory_records")
    .select("id, agent_type, stage_key, memory_type, context_signature, memory_payload, relevance_score")
    .eq("organization_id", orgId)
    .eq("agent_type", ctx.agent_type)
    .order("relevance_score", { ascending: false })
    .limit(30);

  if (ctx.stage_key) {
    q = q.or(`stage_key.eq.${ctx.stage_key},stage_key.is.null`);
  }

  const { data } = await q;
  return (data || []) as RetrievedMemoryRecord[];
}

function deduplicateRecords(records: RetrievedMemoryRecord[]): RetrievedMemoryRecord[] {
  const seen = new Set<string>();
  return records.filter((r) => {
    const key = `${r.agent_type}:${r.memory_type}:${r.context_signature}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rankRecords(records: RetrievedMemoryRecord[], ctx: AgentMemoryContext): RetrievedMemoryRecord[] {
  return records.sort((a, b) => {
    const scoreA = computeRecordRank(a, ctx);
    const scoreB = computeRecordRank(b, ctx);
    return scoreB - scoreA;
  });
}

function computeRecordRank(record: RetrievedMemoryRecord, ctx: AgentMemoryContext): number {
  let score = record.relevance_score ?? 0.5;
  if (record.stage_key === ctx.stage_key) score += 0.2;
  if (ctx.context_signature && record.context_signature === ctx.context_signature) score += 0.3;
  return score;
}

function computeRetrievalScore(profileCount: number, recordCount: number): number {
  const p = Math.min(1, profileCount / 3);
  const r = Math.min(1, Math.log(recordCount + 1) / Math.log(16));
  return Math.round((p * 0.4 + r * 0.6) * 1000) / 1000;
}
