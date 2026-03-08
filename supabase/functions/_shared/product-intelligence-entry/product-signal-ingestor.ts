/**
 * Product Signal Ingestor
 * Ingests and normalizes internal/external product signals.
 * Advisory-first: stores signals, never auto-acts on them.
 */

export interface SignalInput {
  organizationId: string;
  workspaceId?: string;
  signalType: string;
  signalSource: string;
  signalScopeType?: string;
  signalScopeId?: string;
  productArea: string;
  rawPayload?: Record<string, unknown>;
  evidenceLinks?: Array<Record<string, unknown>>;
  tags?: string[];
}

export function computeSignalQuality(input: SignalInput): number {
  let quality = 0.3;
  if (input.productArea && input.productArea.length > 0) quality += 0.15;
  if (input.rawPayload && Object.keys(input.rawPayload).length > 2) quality += 0.15;
  if ((input.evidenceLinks || []).length > 0) quality += 0.2;
  if (input.signalSource === 'product_analytics' || input.signalSource === 'telemetry') quality += 0.1;
  if (input.signalScopeId) quality += 0.1;
  return Math.round(Math.min(1, quality) * 100) / 100;
}

export function computeNoisePenalty(input: SignalInput): number {
  let penalty = 0;
  if (!input.productArea || input.productArea.length === 0) penalty += 0.3;
  if (!input.rawPayload || Object.keys(input.rawPayload).length === 0) penalty += 0.2;
  if ((input.evidenceLinks || []).length === 0) penalty += 0.2;
  if (input.signalSource === 'external') penalty += 0.1;
  return Math.round(Math.min(1, penalty) * 100) / 100;
}

export function deriveScores(input: SignalInput): {
  frictionScore: number;
  adoptionScore: number;
  retentionScore: number;
  valueScore: number;
  confidenceScore: number;
} {
  const base = computeSignalQuality(input);
  const typeMap: Record<string, string> = {
    friction: 'friction', onboarding: 'friction', support: 'friction',
    adoption: 'adoption', usage_pattern: 'adoption',
    retention: 'retention', churn_risk: 'retention',
    value: 'value', opportunity: 'value',
  };
  const primary = typeMap[input.signalType] || 'adoption';

  return {
    frictionScore: primary === 'friction' ? Math.round(base * 0.8 * 100) / 100 : 0,
    adoptionScore: primary === 'adoption' ? Math.round(base * 0.8 * 100) / 100 : 0,
    retentionScore: primary === 'retention' ? Math.round(base * 0.8 * 100) / 100 : 0,
    valueScore: primary === 'value' ? Math.round(base * 0.8 * 100) / 100 : 0,
    confidenceScore: Math.round(base * 100) / 100,
  };
}

export function buildSignalRecord(input: SignalInput) {
  const quality = computeSignalQuality(input);
  const noise = computeNoisePenalty(input);
  const scores = deriveScores(input);

  return {
    organization_id: input.organizationId,
    workspace_id: input.workspaceId || null,
    signal_type: input.signalType,
    signal_source: input.signalSource,
    signal_scope_type: input.signalScopeType || 'organization',
    signal_scope_id: input.signalScopeId || '',
    product_area: input.productArea,
    friction_score: scores.frictionScore,
    adoption_score: scores.adoptionScore,
    retention_signal_score: scores.retentionScore,
    value_signal_score: scores.valueScore,
    signal_quality_score: quality,
    noise_penalty_score: noise,
    confidence_score: scores.confidenceScore,
    raw_payload: input.rawPayload || {},
    evidence_links: input.evidenceLinks || [],
    tags: input.tags || [],
  };
}
