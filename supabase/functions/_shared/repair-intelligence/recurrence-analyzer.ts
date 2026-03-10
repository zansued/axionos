/**
 * recurrence-analyzer.ts
 * Analyzes failure recurrence patterns and trends.
 */

export interface RecurrenceAnalysis {
  failureMemoryId: string;
  signature: string;
  totalOccurrences: number;
  recurrenceScore: number;
  trend: 'increasing' | 'stable' | 'decreasing' | 'unknown';
  firstSeen: string;
  lastSeen: string;
  averageIntervalDays: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export async function analyzeRecurrence(
  supabase: any,
  organizationId: string,
  failureMemoryId: string
): Promise<RecurrenceAnalysis | null> {
  const { data: entry } = await supabase
    .from('failure_memory_entries')
    .select('signature, recurrence_score, created_at')
    .eq('id', failureMemoryId)
    .single();

  if (!entry) return null;

  const { data: snapshots } = await supabase
    .from('failure_context_snapshots')
    .select('created_at')
    .eq('failure_memory_id', failureMemoryId)
    .order('created_at', { ascending: true });

  const occurrences = snapshots?.length || 1;
  const dates = (snapshots || []).map((s: any) => new Date(s.created_at).getTime());

  let avgInterval = 0;
  let trend: RecurrenceAnalysis['trend'] = 'unknown';

  if (dates.length >= 2) {
    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      intervals.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
    }
    avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Trend: compare first half intervals to second half
    if (intervals.length >= 4) {
      const mid = Math.floor(intervals.length / 2);
      const firstHalf = intervals.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
      const secondHalf = intervals.slice(mid).reduce((a, b) => a + b, 0) / (intervals.length - mid);
      if (secondHalf < firstHalf * 0.7) trend = 'increasing';
      else if (secondHalf > firstHalf * 1.3) trend = 'decreasing';
      else trend = 'stable';
    }
  }

  const recurrence = entry.recurrence_score || 0;
  const riskLevel = recurrence >= 0.8 ? 'critical' :
    recurrence >= 0.6 ? 'high' :
    recurrence >= 0.3 ? 'medium' : 'low';

  return {
    failureMemoryId,
    signature: entry.signature,
    totalOccurrences: occurrences,
    recurrenceScore: recurrence,
    trend,
    firstSeen: dates.length > 0 ? new Date(dates[0]).toISOString() : entry.created_at,
    lastSeen: dates.length > 0 ? new Date(dates[dates.length - 1]).toISOString() : entry.created_at,
    averageIntervalDays: Math.round(avgInterval * 10) / 10,
    riskLevel,
  };
}
