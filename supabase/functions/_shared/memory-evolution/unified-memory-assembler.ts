/**
 * Unified Memory Context Assembler — Sprint 2 (Memory Evolution)
 *
 * Assembles bounded memory context from ALL memory layers:
 *   - Agent Memory (profiles + records)
 *   - Engineering Memory (structured retrieval)
 *   - Organism Memory (organizational knowledge)
 *   - Institutional Memory (constitutional/governance)
 *
 * Produces a single UnifiedMemoryBundle for injection into agent reasoning,
 * routing decisions, or governance analysis.
 *
 * SAFETY: Read-only. Non-blocking. Bounded payloads. Deduplication enforced.
 * Never merges across organizations. Never mutates source memory.
 */

import { SupabaseClient } from "npm:@supabase/supabase-js@2";

// ─── Types ───────────────────────────────────────────────────────────

export type MemoryLayerSource =
  | "agent_memory"
  | "engineering_memory"
  | "organism_memory"
  | "institutional_memory";

export type MemoryTier = "ephemeral" | "operational" | "historical" | "archived";

export interface UnifiedMemoryEntry {
  id: string;
  source_layer: MemoryLayerSource;
  memory_type: string;
  tier: MemoryTier;
  content_summary: string;
  relevance_score: number;
  confidence_score: number;
  freshness_score: number;
  composite_score: number;
  context_signature: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface UnifiedMemoryBundle {
  entries: UnifiedMemoryEntry[];
  layer_counts: Record<MemoryLayerSource, number>;
  total_before_dedup: number;
  total_after_dedup: number;
  assembly_time_ms: number;
  bounded: boolean;
  health: MemoryHealthSnapshot;
}

export interface MemoryHealthSnapshot {
  total_entries: number;
  avg_freshness: number;
  avg_relevance: number;
  stale_ratio: number;
  redundancy_ratio: number;
  tier_distribution: Record<MemoryTier, number>;
}

export interface UnifiedRetrievalRequest {
  organization_id: string;
  context_type?: string;
  context_signature?: string;
  agent_type?: string;
  stage_key?: string;
  memory_types?: string[];
  tiers?: MemoryTier[];
  min_relevance?: number;
  max_entries?: number;
  layers?: MemoryLayerSource[];
}

// ─── Constants ───────────────────────────────────────────────────────

const DEFAULT_MAX_ENTRIES = 30;
const MAX_ENTRIES_HARD_LIMIT = 100;
const STALE_DAYS = 30;
const SUMMARY_MAX_CHARS = 300;

// ─── Weights for composite scoring ──────────────────────────────────

const WEIGHT_RELEVANCE = 0.35;
const WEIGHT_CONFIDENCE = 0.25;
const WEIGHT_FRESHNESS = 0.25;
const WEIGHT_ACCESS = 0.15;

// ─── Core Assembler ─────────────────────────────────────────────────

export async function assembleUnifiedMemory(
  sc: SupabaseClient,
  req: UnifiedRetrievalRequest,
): Promise<UnifiedMemoryBundle> {
  const start = Date.now();
  const maxEntries = Math.min(req.max_entries || DEFAULT_MAX_ENTRIES, MAX_ENTRIES_HARD_LIMIT);
  const layers = req.layers || ["agent_memory", "engineering_memory", "organism_memory"];

  // Fetch from all requested layers in parallel
  const fetchers: Promise<UnifiedMemoryEntry[]>[] = [];
  if (layers.includes("agent_memory")) {
    fetchers.push(fetchAgentMemoryEntries(sc, req));
  }
  if (layers.includes("engineering_memory")) {
    fetchers.push(fetchEngineeringMemoryEntries(sc, req));
  }
  if (layers.includes("organism_memory")) {
    fetchers.push(fetchOrganismMemoryEntries(sc, req));
  }
  if (layers.includes("institutional_memory")) {
    fetchers.push(fetchInstitutionalMemoryEntries(sc, req));
  }

  const layerResults = await Promise.allSettled(fetchers);

  // Collect all entries, ignoring failed layers (graceful degradation)
  let allEntries: UnifiedMemoryEntry[] = [];
  for (const result of layerResults) {
    if (result.status === "fulfilled") {
      allEntries.push(...result.value);
    } else {
      console.warn("Memory layer fetch failed (non-blocking):", result.reason);
    }
  }

  const totalBeforeDedup = allEntries.length;

  // Deduplicate by context_signature
  allEntries = deduplicateEntries(allEntries);

  // Filter by tier if requested
  if (req.tiers && req.tiers.length > 0) {
    allEntries = allEntries.filter((e) => req.tiers!.includes(e.tier));
  }

  // Filter by min relevance
  if (req.min_relevance !== undefined) {
    allEntries = allEntries.filter((e) => e.composite_score >= req.min_relevance!);
  }

  // Sort by composite score descending
  allEntries.sort((a, b) => b.composite_score - a.composite_score);

  // Bound
  const bounded = allEntries.slice(0, maxEntries);

  // Layer counts
  const layer_counts: Record<MemoryLayerSource, number> = {
    agent_memory: 0,
    engineering_memory: 0,
    organism_memory: 0,
    institutional_memory: 0,
  };
  for (const e of bounded) {
    layer_counts[e.source_layer]++;
  }

  // Health snapshot
  const health = computeHealthSnapshot(bounded);

  return {
    entries: bounded,
    layer_counts,
    total_before_dedup: totalBeforeDedup,
    total_after_dedup: allEntries.length,
    assembly_time_ms: Date.now() - start,
    bounded: allEntries.length > maxEntries,
    health,
  };
}

// ─── Deduplication ──────────────────────────────────────────────────

function deduplicateEntries(entries: UnifiedMemoryEntry[]): UnifiedMemoryEntry[] {
  const seen = new Map<string, UnifiedMemoryEntry>();
  for (const entry of entries) {
    const key = entry.context_signature;
    if (!key || key === "") {
      // No signature — keep as-is
      seen.set(entry.id, entry);
      continue;
    }
    const existing = seen.get(key);
    if (!existing || entry.composite_score > existing.composite_score) {
      seen.set(key, entry);
    }
  }
  return Array.from(seen.values());
}

// ─── Scoring ────────────────────────────────────────────────────────

export function computeFreshness(createdAt: string, nowMs: number = Date.now()): number {
  const ageMs = nowMs - new Date(createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays <= 1) return 1.0;
  if (ageDays <= 7) return 0.9;
  if (ageDays <= STALE_DAYS) return Math.max(0.2, 1 - ageDays / (STALE_DAYS * 1.5));
  return Math.max(0.05, 0.2 - (ageDays - STALE_DAYS) / 365);
}

export function classifyTier(
  memoryType: string,
  ageDays: number,
  relevance: number,
  accessCount: number,
): MemoryTier {
  // Run/ephemeral types
  if (memoryType === "run" || memoryType === "ephemeral") return "ephemeral";
  // Archived if old with low access
  if (ageDays > 90 && relevance < 0.3 && accessCount < 2) return "archived";
  // Historical if older than 30d
  if (ageDays > STALE_DAYS) return "historical";
  // Otherwise operational
  return "operational";
}

export function computeCompositeScore(
  relevance: number,
  confidence: number,
  freshness: number,
  accessSignal: number,
): number {
  const raw =
    relevance * WEIGHT_RELEVANCE +
    confidence * WEIGHT_CONFIDENCE +
    freshness * WEIGHT_FRESHNESS +
    accessSignal * WEIGHT_ACCESS;
  return Math.round(Math.min(1, Math.max(0, raw)) * 1000) / 1000;
}

function truncateSummary(text: string): string {
  if (text.length <= SUMMARY_MAX_CHARS) return text;
  return text.slice(0, SUMMARY_MAX_CHARS - 3) + "...";
}

// ─── Health Snapshot ────────────────────────────────────────────────

function computeHealthSnapshot(entries: UnifiedMemoryEntry[]): MemoryHealthSnapshot {
  if (entries.length === 0) {
    return {
      total_entries: 0,
      avg_freshness: 0,
      avg_relevance: 0,
      stale_ratio: 0,
      redundancy_ratio: 0,
      tier_distribution: { ephemeral: 0, operational: 0, historical: 0, archived: 0 },
    };
  }

  const tierDist: Record<MemoryTier, number> = { ephemeral: 0, operational: 0, historical: 0, archived: 0 };
  let totalFreshness = 0;
  let totalRelevance = 0;
  let staleCount = 0;

  for (const e of entries) {
    tierDist[e.tier]++;
    totalFreshness += e.freshness_score;
    totalRelevance += e.relevance_score;
    if (e.freshness_score < 0.15) staleCount++;
  }

  return {
    total_entries: entries.length,
    avg_freshness: Math.round((totalFreshness / entries.length) * 1000) / 1000,
    avg_relevance: Math.round((totalRelevance / entries.length) * 1000) / 1000,
    stale_ratio: Math.round((staleCount / entries.length) * 1000) / 1000,
    redundancy_ratio: 0, // computed at dedup time if needed
    tier_distribution: tierDist,
  };
}

// ─── Layer Fetchers ─────────────────────────────────────────────────

async function fetchAgentMemoryEntries(
  sc: SupabaseClient,
  req: UnifiedRetrievalRequest,
): Promise<UnifiedMemoryEntry[]> {
  try {
    let q = sc
      .from("agent_memory_records")
      .select("id, agent_type, stage_key, memory_type, context_signature, memory_payload, relevance_score, created_at")
      .eq("organization_id", req.organization_id)
      .order("relevance_score", { ascending: false })
      .limit(50);

    if (req.agent_type) q = q.eq("agent_type", req.agent_type);
    if (req.stage_key) q = q.or(`stage_key.eq.${req.stage_key},stage_key.is.null`);

    const { data } = await q;
    const now = Date.now();

    return (data || []).map((r: any) => {
      const relevance = r.relevance_score ?? 0.5;
      const freshness = computeFreshness(r.created_at, now);
      const ageDays = (now - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24);
      const payload = r.memory_payload || {};
      const summary = typeof payload === "string"
        ? payload
        : (payload.summary || payload.description || JSON.stringify(payload).slice(0, 200));

      return {
        id: r.id,
        source_layer: "agent_memory" as MemoryLayerSource,
        memory_type: r.memory_type,
        tier: classifyTier(r.memory_type, ageDays, relevance, 0),
        content_summary: truncateSummary(String(summary)),
        relevance_score: relevance,
        confidence_score: relevance, // agent records use relevance as proxy
        freshness_score: freshness,
        composite_score: computeCompositeScore(relevance, relevance, freshness, 0),
        context_signature: r.context_signature || "",
        created_at: r.created_at,
        metadata: { agent_type: r.agent_type, stage_key: r.stage_key },
      };
    });
  } catch (e) {
    console.warn("Agent memory fetch failed:", e);
    return [];
  }
}

async function fetchEngineeringMemoryEntries(
  sc: SupabaseClient,
  req: UnifiedRetrievalRequest,
): Promise<UnifiedMemoryEntry[]> {
  try {
    let q = sc
      .from("engineering_memory_entries")
      .select("id, memory_type, memory_subtype, title, summary, confidence_score, relevance_score, tags, created_at, times_retrieved, related_stage, related_component")
      .eq("organization_id", req.organization_id)
      .order("relevance_score", { ascending: false })
      .limit(50);

    if (req.memory_types && req.memory_types.length > 0) {
      q = q.in("memory_type", req.memory_types);
    }
    if (req.stage_key) q = q.eq("related_stage", req.stage_key);

    const { data } = await q;
    const now = Date.now();

    return (data || []).map((r: any) => {
      const relevance = r.relevance_score ?? 0.5;
      const confidence = r.confidence_score ?? 0.5;
      const freshness = computeFreshness(r.created_at, now);
      const ageDays = (now - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24);
      const accessSignal = Math.min(1, (r.times_retrieved || 0) / 10);

      return {
        id: r.id,
        source_layer: "engineering_memory" as MemoryLayerSource,
        memory_type: r.memory_type,
        tier: classifyTier(r.memory_type, ageDays, relevance, r.times_retrieved || 0),
        content_summary: truncateSummary(r.summary || r.title || ""),
        relevance_score: relevance,
        confidence_score: confidence,
        freshness_score: freshness,
        composite_score: computeCompositeScore(relevance, confidence, freshness, accessSignal),
        context_signature: `eng:${r.memory_type}:${r.related_component || ""}:${r.related_stage || ""}`,
        created_at: r.created_at,
        metadata: {
          memory_subtype: r.memory_subtype,
          related_stage: r.related_stage,
          related_component: r.related_component,
          tags: r.tags,
          times_retrieved: r.times_retrieved,
        },
      };
    });
  } catch (e) {
    console.warn("Engineering memory fetch failed:", e);
    return [];
  }
}

async function fetchOrganismMemoryEntries(
  sc: SupabaseClient,
  req: UnifiedRetrievalRequest,
): Promise<UnifiedMemoryEntry[]> {
  try {
    let q = sc
      .from("organism_memory")
      .select("memory_id, memory_type, memory_scope, memory_signature, memory_payload, confidence_score, created_at")
      .eq("organization_id", req.organization_id)
      .order("confidence_score", { ascending: false })
      .limit(50);

    if (req.memory_types && req.memory_types.length > 0) {
      q = q.in("memory_type", req.memory_types);
    }

    const { data } = await q;
    const now = Date.now();

    return (data || []).map((r: any) => {
      const confidence = r.confidence_score ?? 0.5;
      const freshness = computeFreshness(r.created_at, now);
      const ageDays = (now - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24);
      const payload = r.memory_payload || {};
      const summary = typeof payload === "string"
        ? payload
        : (payload.summary || payload.description || JSON.stringify(payload).slice(0, 200));

      return {
        id: r.memory_id,
        source_layer: "organism_memory" as MemoryLayerSource,
        memory_type: r.memory_type,
        tier: classifyTier(r.memory_type, ageDays, confidence, 0),
        content_summary: truncateSummary(String(summary)),
        relevance_score: confidence, // organism uses confidence as proxy
        confidence_score: confidence,
        freshness_score: freshness,
        composite_score: computeCompositeScore(confidence, confidence, freshness, 0),
        context_signature: r.memory_signature || "",
        created_at: r.created_at,
        metadata: { memory_scope: r.memory_scope },
      };
    });
  } catch (e) {
    console.warn("Organism memory fetch failed:", e);
    return [];
  }
}

async function fetchInstitutionalMemoryEntries(
  _sc: SupabaseClient,
  _req: UnifiedRetrievalRequest,
): Promise<UnifiedMemoryEntry[]> {
  // Institutional memory is typically fetched through the constitution resolver
  // and retention governor. For unified retrieval, we expose a stub that
  // can be extended when institutional_memory_assets table is available.
  return [];
}
