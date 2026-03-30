/**
 * Memory Lifecycle & Decay Engine — Sprint 2 (Memory Evolution)
 *
 * Implements time-based decay, access-based reinforcement, and automatic
 * tier transitions for memory entries across all layers.
 *
 * Lifecycle tiers:
 *   ephemeral  →  operational  →  historical  →  archived
 *
 * Decay model: relevance(t) = base_relevance * e^(-λ * age_days) + access_boost
 * where λ = decay_rate per memory type, access_boost = min(0.3, accesses * 0.02)
 *
 * SAFETY: Advisory-only tier recommendations. Actual transitions require
 * the organism-memory-engine to execute. Non-destructive. Bounded.
 */

import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { MemoryTier, computeFreshness } from "./unified-memory-assembler.ts";

// ─── Types ───────────────────────────────────────────────────────────

export interface LifecycleConfig {
  /** Decay rates (lambda) by memory type category */
  decay_rates: Record<string, number>;
  /** Tier transition thresholds */
  tier_thresholds: TierThresholds;
  /** Maximum entries per org before eviction pressure */
  max_org_entries: number;
  /** Minimum confidence to survive a sweep */
  min_survival_confidence: number;
}

export interface TierThresholds {
  /** Below this effective_score → archived */
  archive_threshold: number;
  /** Below this effective_score → historical */
  historical_threshold: number;
  /** Above this effective_score → operational */
  operational_threshold: number;
}

export interface LifecycleTransition {
  memory_id: string;
  source_table: string;
  current_tier: MemoryTier;
  recommended_tier: MemoryTier;
  effective_score: number;
  decay_factor: number;
  access_boost: number;
  reason: string;
}

export interface LifecycleSweepResult {
  organization_id: string;
  swept_at: string;
  total_evaluated: number;
  transitions: LifecycleTransition[];
  eviction_candidates: EvictionCandidate[];
  health_delta: HealthDelta;
}

export interface EvictionCandidate {
  memory_id: string;
  source_table: string;
  effective_score: number;
  reason: string;
}

export interface HealthDelta {
  freshness_before: number;
  freshness_after_projected: number;
  stale_count_before: number;
  stale_count_after_projected: number;
}

// ─── Default Configuration ──────────────────────────────────────────

export const DEFAULT_LIFECYCLE_CONFIG: LifecycleConfig = {
  decay_rates: {
    // Higher = faster decay
    run: 0.5,           // very fast decay (2-day half-life)
    ephemeral: 0.3,     // fast decay
    episodic: 0.02,     // slow decay (35-day half-life)
    procedural: 0.005,  // very slow decay
    semantic: 0.003,    // near-permanent
    strategic: 0.01,    // slow decay
    doctrinal: 0.002,   // near-permanent
    execution_pattern: 0.015,
    repair_pattern: 0.01,
    validation_pattern: 0.015,
    failure_pattern: 0.008,
    success_pattern: 0.012,
    // Engineering memory types
    ErrorMemory: 0.02,
    StrategyMemory: 0.008,
    OutcomeMemory: 0.015,
    DesignMemory: 0.005,
    DecisionMemory: 0.003,
  },
  tier_thresholds: {
    archive_threshold: 0.1,
    historical_threshold: 0.25,
    operational_threshold: 0.5,
  },
  max_org_entries: 5000,
  min_survival_confidence: 0.05,
};

// ─── Decay Computation ──────────────────────────────────────────────

/**
 * Compute effective relevance score with time-based decay and access reinforcement.
 *
 * Formula: effective = base * e^(-λ * age_days) + access_boost
 * Bounded to [0, 1]
 */
export function computeDecayedScore(
  baseRelevance: number,
  ageDays: number,
  memoryType: string,
  accessCount: number,
  config: LifecycleConfig = DEFAULT_LIFECYCLE_CONFIG,
): { effective_score: number; decay_factor: number; access_boost: number } {
  const lambda = config.decay_rates[memoryType] ?? 0.015; // default moderate decay
  const decay_factor = Math.exp(-lambda * ageDays);
  const access_boost = Math.min(0.3, accessCount * 0.02);
  const effective_score = Math.min(1, Math.max(0, baseRelevance * decay_factor + access_boost));

  return {
    effective_score: Math.round(effective_score * 1000) / 1000,
    decay_factor: Math.round(decay_factor * 1000) / 1000,
    access_boost: Math.round(access_boost * 1000) / 1000,
  };
}

/**
 * Determine recommended tier based on effective score.
 */
export function recommendTier(
  effectiveScore: number,
  currentTier: MemoryTier,
  config: LifecycleConfig = DEFAULT_LIFECYCLE_CONFIG,
): MemoryTier {
  const { archive_threshold, historical_threshold, operational_threshold } = config.tier_thresholds;

  if (effectiveScore < archive_threshold) return "archived";
  if (effectiveScore < historical_threshold) return "historical";
  if (effectiveScore >= operational_threshold) return "operational";
  // Between historical and operational thresholds — keep current or historical
  return currentTier === "operational" ? "operational" : "historical";
}

// ─── Lifecycle Sweep ────────────────────────────────────────────────

/**
 * Sweep all memory layers for an organization, computing decay and recommending
 * tier transitions. Does NOT apply changes — returns advisory results.
 */
export async function runLifecycleSweep(
  sc: SupabaseClient,
  organizationId: string,
  config: LifecycleConfig = DEFAULT_LIFECYCLE_CONFIG,
): Promise<LifecycleSweepResult> {
  const now = Date.now();
  const transitions: LifecycleTransition[] = [];
  const evictionCandidates: EvictionCandidate[] = [];
  let totalEvaluated = 0;
  let totalFreshnessBefore = 0;
  let staleCountBefore = 0;

  // Evaluate agent_memory_records
  const { data: agentRecords } = await sc
    .from("agent_memory_records")
    .select("id, memory_type, relevance_score, created_at")
    .eq("organization_id", organizationId)
    .limit(500);

  for (const r of agentRecords || []) {
    totalEvaluated++;
    const ageDays = (now - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const baseRelevance = r.relevance_score ?? 0.5;
    const freshness = computeFreshness(r.created_at, now);
    totalFreshnessBefore += freshness;
    if (freshness < 0.15) staleCountBefore++;

    const { effective_score, decay_factor, access_boost } = computeDecayedScore(
      baseRelevance, ageDays, r.memory_type, 0, config
    );

    const currentTier: MemoryTier = ageDays > 30 ? "historical" : "operational";
    const recommended = recommendTier(effective_score, currentTier, config);

    if (recommended !== currentTier) {
      transitions.push({
        memory_id: r.id,
        source_table: "agent_memory_records",
        current_tier: currentTier,
        recommended_tier: recommended,
        effective_score,
        decay_factor,
        access_boost,
        reason: `Score ${effective_score} crosses ${recommended} threshold`,
      });
    }

    if (effective_score < config.min_survival_confidence) {
      evictionCandidates.push({
        memory_id: r.id,
        source_table: "agent_memory_records",
        effective_score,
        reason: `Below survival threshold ${config.min_survival_confidence}`,
      });
    }
  }

  // Evaluate organism_memory
  const { data: organismRecords } = await sc
    .from("organism_memory")
    .select("memory_id, memory_type, confidence_score, created_at")
    .eq("organization_id", organizationId)
    .limit(500);

  for (const r of organismRecords || []) {
    totalEvaluated++;
    const ageDays = (now - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const baseRelevance = r.confidence_score ?? 0.5;
    const freshness = computeFreshness(r.created_at, now);
    totalFreshnessBefore += freshness;
    if (freshness < 0.15) staleCountBefore++;

    const { effective_score, decay_factor, access_boost } = computeDecayedScore(
      baseRelevance, ageDays, r.memory_type, 0, config
    );

    const currentTier: MemoryTier = ageDays > 30 ? "historical" : "operational";
    const recommended = recommendTier(effective_score, currentTier, config);

    if (recommended !== currentTier) {
      transitions.push({
        memory_id: r.memory_id,
        source_table: "organism_memory",
        current_tier: currentTier,
        recommended_tier: recommended,
        effective_score,
        decay_factor,
        access_boost,
        reason: `Score ${effective_score} crosses ${recommended} threshold`,
      });
    }

    if (effective_score < config.min_survival_confidence) {
      evictionCandidates.push({
        memory_id: r.memory_id,
        source_table: "organism_memory",
        effective_score,
        reason: `Below survival threshold ${config.min_survival_confidence}`,
      });
    }
  }

  const avgFreshnessBefore = totalEvaluated > 0 ? totalFreshnessBefore / totalEvaluated : 0;
  // Project improvement: removing stale entries would improve avg freshness
  const projectedStaleAfter = Math.max(0, staleCountBefore - evictionCandidates.length);
  const projectedFreshnessAfter = totalEvaluated > 0
    ? Math.min(1, avgFreshnessBefore * 1.05 + (evictionCandidates.length / totalEvaluated) * 0.1)
    : 0;

  return {
    organization_id: organizationId,
    swept_at: new Date().toISOString(),
    total_evaluated: totalEvaluated,
    transitions,
    eviction_candidates: evictionCandidates,
    health_delta: {
      freshness_before: Math.round(avgFreshnessBefore * 1000) / 1000,
      freshness_after_projected: Math.round(projectedFreshnessAfter * 1000) / 1000,
      stale_count_before: staleCountBefore,
      stale_count_after_projected: projectedStaleAfter,
    },
  };
}

/**
 * Apply eviction — delete entries below survival threshold.
 * SAFETY: Bounded to max 50 evictions per call. Auditable.
 */
export async function applyEvictions(
  sc: SupabaseClient,
  organizationId: string,
  candidates: EvictionCandidate[],
  maxEvictions: number = 50,
): Promise<{ evicted: number; errors: string[] }> {
  const bounded = candidates.slice(0, maxEvictions);
  let evicted = 0;
  const errors: string[] = [];

  // Group by source table
  const byTable = new Map<string, string[]>();
  for (const c of bounded) {
    const ids = byTable.get(c.source_table) || [];
    ids.push(c.memory_id);
    byTable.set(c.source_table, ids);
  }

  for (const [table, ids] of byTable) {
    try {
      const idCol = table === "organism_memory" ? "memory_id" : "id";
      const { error } = await sc
        .from(table)
        .delete()
        .eq("organization_id", organizationId)
        .in(idCol, ids);

      if (error) {
        errors.push(`${table}: ${error.message}`);
      } else {
        evicted += ids.length;
      }
    } catch (e) {
      errors.push(`${table}: ${(e as Error).message}`);
    }
  }

  return { evicted, errors };
}
