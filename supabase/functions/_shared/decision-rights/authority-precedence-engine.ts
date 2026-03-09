/**
 * Authority Precedence Engine
 * Applies precedence and conflict rules across multiple authority sources.
 */

export interface PrecedenceEntry {
  id: string;
  authority_level: string;
  precedence_rank: number;
  subject_ref: string;
  decision_rule_text: string;
}

export interface PrecedenceResult {
  winner: PrecedenceEntry | null;
  hasConflict: boolean;
  conflictingEntries: PrecedenceEntry[];
  explanation: string;
}

const AUTHORITY_WEIGHT: Record<string, number> = {
  formal: 100,
  emergency: 90,
  delegated: 70,
  temporary: 50,
  advisory: 20,
  prohibited: 0,
};

export function resolvePrecedence(entries: PrecedenceEntry[]): PrecedenceResult {
  if (entries.length === 0) {
    return { winner: null, hasConflict: false, conflictingEntries: [], explanation: "No authority entries found." };
  }

  const scored = entries.map(e => ({
    ...e,
    score: (AUTHORITY_WEIGHT[e.authority_level] ?? 0) + e.precedence_rank,
  })).sort((a, b) => b.score - a.score);

  const topScore = scored[0].score;
  const tied = scored.filter(s => s.score === topScore);

  if (tied.length > 1) {
    return {
      winner: tied[0],
      hasConflict: true,
      conflictingEntries: tied,
      explanation: `${tied.length} authority sources share equal precedence — contested jurisdiction.`,
    };
  }

  return {
    winner: scored[0],
    hasConflict: false,
    conflictingEntries: [],
    explanation: `Authority resolved: ${scored[0].authority_level} (rank ${scored[0].precedence_rank}).`,
  };
}
