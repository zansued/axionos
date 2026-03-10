/**
 * Runtime Preference Extractor
 * Extracts behavioral preference patterns from runtime events.
 */

export interface PreferencePattern {
  pattern_key: string;
  pattern_type: string;
  observation_count: number;
  confidence: number;
  preference_vector: Record<string, number>;
}

export function extractPreferences(events: any[]): PreferencePattern[] {
  if (events.length === 0) return [];

  const groups: Record<string, any[]> = {};
  for (const e of events) {
    const key = e.event_type || 'unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }

  return Object.entries(groups).map(([key, items]) => ({
    pattern_key: key,
    pattern_type: classifyPatternType(key),
    observation_count: items.length,
    confidence: Math.min(items.length / 20, 1),
    preference_vector: buildVector(items),
  }));
}

function classifyPatternType(key: string): string {
  if (key.includes('rollback') || key.includes('revert')) return 'rollback_behavior';
  if (key.includes('deploy') || key.includes('release')) return 'deployment_behavior';
  if (key.includes('incident') || key.includes('error')) return 'incident_response';
  if (key.includes('approval') || key.includes('review')) return 'governance_behavior';
  return 'behavioral';
}

function buildVector(items: any[]): Record<string, number> {
  const vector: Record<string, number> = { frequency: items.length };
  const severities = items.filter(i => i.severity).map(i => severityToNum(i.severity));
  if (severities.length > 0) {
    vector.avg_severity = Math.round((severities.reduce((a, b) => a + b, 0) / severities.length) * 100) / 100;
  }
  return vector;
}

function severityToNum(s: string): number {
  switch (s) {
    case 'critical': return 1.0;
    case 'high': return 0.75;
    case 'medium': return 0.5;
    case 'low': return 0.25;
    default: return 0.5;
  }
}
