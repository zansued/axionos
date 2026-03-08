/**
 * Convergence Pattern Extractor
 * Detects recurring convergence patterns, anti-patterns, and preservation heuristics.
 */

export interface MemoryEntry {
  id: string;
  memory_type: string;
  convergence_domain: string;
  action_type: string;
  specialization_type: string;
  context_signature: string;
  memory_quality_score: number;
  evidence_density_score: number;
  realized_outcomes: Record<string, unknown>;
}

export interface ExtractedPattern {
  patternType: string;
  patternKey: string;
  patternName: string;
  patternDescription: string;
  supportingEntryIds: string[];
  patternStrength: number;
  confidenceScore: number;
  occurrenceCount: number;
}

export function groupBySignature(entries: MemoryEntry[]): Map<string, MemoryEntry[]> {
  const groups = new Map<string, MemoryEntry[]>();
  for (const entry of entries) {
    const key = entry.context_signature;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }
  return groups;
}

export function extractPatterns(entries: MemoryEntry[]): ExtractedPattern[] {
  const groups = groupBySignature(entries);
  const patterns: ExtractedPattern[] = [];

  for (const [signature, group] of groups) {
    if (group.length < 2) continue;

    const dominantType = getMostCommonValue(group.map(e => e.memory_type));
    const dominantAction = getMostCommonValue(group.map(e => e.action_type));
    const avgQuality = group.reduce((s, e) => s + e.memory_quality_score, 0) / group.length;
    const avgEvidence = group.reduce((s, e) => s + e.evidence_density_score, 0) / group.length;

    const patternType = mapMemoryTypeToPatternType(dominantType);
    const strength = Math.round(Math.min((group.length / 5) * avgQuality, 1) * 100) / 100;

    patterns.push({
      patternType,
      patternKey: `${patternType}::${signature}`,
      patternName: `${capitalizeFirst(patternType)} pattern in ${group[0].convergence_domain}`,
      patternDescription: `Recurring ${dominantAction} pattern across ${group.length} cases with avg quality ${avgQuality.toFixed(2)}`,
      supportingEntryIds: group.map(e => e.id),
      patternStrength: strength,
      confidenceScore: Math.round(avgEvidence * 100) / 100,
      occurrenceCount: group.length,
    });
  }

  return patterns.sort((a, b) => b.patternStrength - a.patternStrength);
}

function getMostCommonValue(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  let max = 0, result = values[0];
  for (const [k, v] of counts) { if (v > max) { max = v; result = k; } }
  return result;
}

function mapMemoryTypeToPatternType(memoryType: string): string {
  const map: Record<string, string> = {
    promotion_success: 'promotion',
    promotion_failure: 'anti_pattern',
    retention_justified: 'retention',
    deprecation_outcome: 'deprecation',
    merge_outcome: 'merge',
    anti_pattern: 'anti_pattern',
    preservation_heuristic: 'preservation',
    convergence_outcome: 'promotion',
  };
  return map[memoryType] || 'promotion';
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}
