/**
 * External Trust Tier Classifier — Sprint 58
 * Assigns trust tiers based on evidence, auditability, identity confidence, and policy alignment.
 */

export interface TrustTierInput {
  identity_confidence_score: number;
  evidence_completeness_score: number;
  auditability_score: number;
  policy_alignment_score: number;
  risk_score: number;
}

export interface TrustTierResult {
  recommended_tier: string;
  trust_tier_confidence_score: number;
  tier_rationale: string[];
}

const TIERS = [
  { key: 'never_admit', maxScore: 0.15 },
  { key: 'unknown', maxScore: 0.3 },
  { key: 'restricted_candidate', maxScore: 0.45 },
  { key: 'provisional', maxScore: 0.6 },
  { key: 'sandbox_eligible', maxScore: 0.75 },
  { key: 'controlled_future_candidate', maxScore: 1.0 },
] as const;

export function classifyTrustTier(input: TrustTierInput): TrustTierResult {
  const rationale: string[] = [];

  // Composite score with penalties
  let baseScore =
    input.identity_confidence_score * 0.25 +
    input.evidence_completeness_score * 0.2 +
    input.auditability_score * 0.2 +
    input.policy_alignment_score * 0.2 +
    (1 - input.risk_score) * 0.15;

  // Hard penalties
  if (input.identity_confidence_score < 0.2) {
    baseScore *= 0.3;
    rationale.push('very_weak_identity');
  }
  if (input.auditability_score < 0.3) {
    baseScore *= 0.5;
    rationale.push('insufficient_auditability');
  }
  if (input.evidence_completeness_score < 0.2) {
    baseScore *= 0.5;
    rationale.push('insufficient_evidence');
  }
  if (input.risk_score > 0.8) {
    baseScore *= 0.4;
    rationale.push('very_high_risk');
  }

  const score = Math.max(0, Math.min(1, baseScore));

  let tier = 'unknown';
  for (const t of TIERS) {
    if (score <= t.maxScore) {
      tier = t.key;
      break;
    }
  }

  rationale.push(`composite_score_${(score * 100).toFixed(0)}`);

  return {
    recommended_tier: tier,
    trust_tier_confidence_score: Math.round(score * 10000) / 10000,
    tier_rationale: rationale,
  };
}
