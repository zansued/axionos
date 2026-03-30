/**
 * Memory Consolidation Engine — Sprint 2 (Memory Evolution)
 *
 * Detects redundant memories across layers, identifies overlapping entries,
 * and produces consolidation recommendations.
 *
 * Consolidation modes:
 *   - dedup:  Remove exact duplicates (same context_signature)
 *   - merge:  Combine overlapping entries into a single higher-quality record
 *   - prune:  Remove low-value entries below threshold
 *
 * SAFETY: Advisory-first. Consolidation recommendations are surfaced;
 * actual merges require explicit execution. Non-destructive analysis.
 */

import { UnifiedMemoryEntry, MemoryLayerSource } from "./unified-memory-assembler.ts";

// ─── Types ───────────────────────────────────────────────────────────

export interface ConsolidationCandidate {
  /** IDs of entries that overlap */
  entry_ids: string[];
  /** Source layers involved */
  layers: MemoryLayerSource[];
  /** Type of consolidation recommended */
  consolidation_type: "dedup" | "merge" | "prune";
  /** Similarity score between entries (0-1) */
  similarity_score: number;
  /** The entry to keep (highest composite score) */
  survivor_id: string;
  /** Why consolidation is recommended */
  reason: string;
  /** Estimated quality gain from consolidation */
  quality_gain: number;
}

export interface ConsolidationReport {
  total_analyzed: number;
  duplicate_groups: number;
  merge_candidates: number;
  prune_candidates: number;
  candidates: ConsolidationCandidate[];
  estimated_reduction: number;
  estimated_quality_improvement: number;
}

// ─── Core Analysis ──────────────────────────────────────────────────

/**
 * Analyze a set of unified memory entries for consolidation opportunities.
 */
export function analyzeConsolidation(entries: UnifiedMemoryEntry[]): ConsolidationReport {
  const candidates: ConsolidationCandidate[] = [];

  // 1. Detect exact duplicates by context_signature
  const bySignature = groupBySignature(entries);
  for (const [sig, group] of bySignature) {
    if (group.length < 2) continue;
    
    // Sort by composite score descending
    const sorted = [...group].sort((a, b) => b.composite_score - a.composite_score);
    const survivor = sorted[0];

    candidates.push({
      entry_ids: group.map((e) => e.id),
      layers: [...new Set(group.map((e) => e.source_layer))],
      consolidation_type: "dedup",
      similarity_score: 1.0,
      survivor_id: survivor.id,
      reason: `Exact duplicate context_signature: "${sig.slice(0, 60)}..."`,
      quality_gain: (group.length - 1) * 0.01,
    });
  }

  // 2. Detect near-duplicates by content similarity (Jaccard on tokens)
  const nonDupEntries = entries.filter((e) => {
    const sig = e.context_signature;
    const group = bySignature.get(sig);
    // Only keep survivor from dup groups, plus unique entries
    if (!group || group.length < 2) return true;
    return group[0].id === e.id || [...group].sort((a, b) => b.composite_score - a.composite_score)[0].id === e.id;
  });

  const mergePairs = findMergeCandidates(nonDupEntries);
  candidates.push(...mergePairs);

  // 3. Detect prune candidates (low quality across the board)
  const pruneThreshold = 0.15;
  const pruneEntries = entries.filter((e) => e.composite_score < pruneThreshold);
  for (const e of pruneEntries) {
    candidates.push({
      entry_ids: [e.id],
      layers: [e.source_layer],
      consolidation_type: "prune",
      similarity_score: 0,
      survivor_id: "",
      reason: `Composite score ${e.composite_score} below prune threshold ${pruneThreshold}`,
      quality_gain: 0.005,
    });
  }

  const duplicateGroups = candidates.filter((c) => c.consolidation_type === "dedup").length;
  const mergeCount = candidates.filter((c) => c.consolidation_type === "merge").length;
  const pruneCount = candidates.filter((c) => c.consolidation_type === "prune").length;

  // Estimated reduction: all non-survivors from dedup + prune candidates
  const dedupReduction = candidates
    .filter((c) => c.consolidation_type === "dedup")
    .reduce((sum, c) => sum + c.entry_ids.length - 1, 0);
  const estimatedReduction = dedupReduction + pruneCount;

  const totalQualityGain = candidates.reduce((sum, c) => sum + c.quality_gain, 0);

  return {
    total_analyzed: entries.length,
    duplicate_groups: duplicateGroups,
    merge_candidates: mergeCount,
    prune_candidates: pruneCount,
    candidates,
    estimated_reduction: estimatedReduction,
    estimated_quality_improvement: Math.round(totalQualityGain * 1000) / 1000,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function groupBySignature(entries: UnifiedMemoryEntry[]): Map<string, UnifiedMemoryEntry[]> {
  const groups = new Map<string, UnifiedMemoryEntry[]>();
  for (const e of entries) {
    if (!e.context_signature || e.context_signature === "") continue;
    const group = groups.get(e.context_signature) || [];
    group.push(e);
    groups.set(e.context_signature, group);
  }
  return groups;
}

/**
 * Simple Jaccard-based content similarity for merge detection.
 * Only compares entries of the same memory_type across different layers.
 */
function findMergeCandidates(entries: UnifiedMemoryEntry[]): ConsolidationCandidate[] {
  const candidates: ConsolidationCandidate[] = [];
  const SIMILARITY_THRESHOLD = 0.6;

  // Group by memory_type to reduce comparison space
  const byType = new Map<string, UnifiedMemoryEntry[]>();
  for (const e of entries) {
    const group = byType.get(e.memory_type) || [];
    group.push(e);
    byType.set(e.memory_type, group);
  }

  for (const [, group] of byType) {
    if (group.length < 2) continue;
    // Only compare across different layers (same-layer dedup already handled)
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (group[i].source_layer === group[j].source_layer) continue;

        const similarity = jaccardSimilarity(
          tokenize(group[i].content_summary),
          tokenize(group[j].content_summary),
        );

        if (similarity >= SIMILARITY_THRESHOLD) {
          const survivor = group[i].composite_score >= group[j].composite_score ? group[i] : group[j];
          candidates.push({
            entry_ids: [group[i].id, group[j].id],
            layers: [group[i].source_layer, group[j].source_layer],
            consolidation_type: "merge",
            similarity_score: Math.round(similarity * 1000) / 1000,
            survivor_id: survivor.id,
            reason: `Cross-layer content similarity ${(similarity * 100).toFixed(0)}% between ${group[i].source_layer} and ${group[j].source_layer}`,
            quality_gain: 0.02,
          });
        }
      }
    }
  }

  return candidates;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
