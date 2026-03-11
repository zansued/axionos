/**
 * Canon Applicability Ranker — Sprint 141
 * Ranks retrieved canon entries by relevance and applicability to the task.
 */

export interface RankableEntry {
  id: string;
  title: string;
  practice_type: string;
  stack_scope: string;
  topic: string;
  confidence_score: number;
  anti_pattern_flag: boolean;
  applicability_scope: string;
}

export interface RankingContext {
  target_stack?: string;
  target_topic?: string;
  target_practice_types?: string[];
  prefer_high_confidence?: boolean;
}

export interface RankedEntry {
  entry_id: string;
  title: string;
  relevance_score: number;
  applicability_score: number;
  ranking_reasons: string[];
}

export function rankEntries(entries: RankableEntry[], context: RankingContext): RankedEntry[] {
  return entries.map(entry => {
    let relevance = 0.5;
    let applicability = 0.5;
    const reasons: string[] = [];

    // Stack match
    if (context.target_stack && entry.stack_scope === context.target_stack) {
      relevance += 0.2;
      reasons.push("stack_match");
    } else if (entry.stack_scope === "general") {
      relevance += 0.05;
      reasons.push("general_scope");
    }

    // Topic match
    if (context.target_topic && entry.topic === context.target_topic) {
      relevance += 0.2;
      reasons.push("topic_match");
    }

    // Practice type match
    if (context.target_practice_types?.includes(entry.practice_type)) {
      applicability += 0.2;
      reasons.push("practice_type_match");
    }

    // Confidence bonus
    if (context.prefer_high_confidence !== false) {
      applicability += (entry.confidence_score / 100) * 0.2;
    }

    // Anti-pattern handling
    if (entry.anti_pattern_flag) {
      applicability += 0.1; // Anti-patterns are valuable in validation contexts
      reasons.push("anti_pattern_awareness");
    }

    relevance = Math.min(1, Math.max(0, relevance));
    applicability = Math.min(1, Math.max(0, applicability));

    return {
      entry_id: entry.id,
      title: entry.title,
      relevance_score: Math.round(relevance * 100) / 100,
      applicability_score: Math.round(applicability * 100) / 100,
      ranking_reasons: reasons,
    };
  }).sort((a, b) => (b.relevance_score + b.applicability_score) - (a.relevance_score + a.applicability_score));
}
