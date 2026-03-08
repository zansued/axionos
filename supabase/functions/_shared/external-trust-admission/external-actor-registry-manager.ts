/**
 * External Actor Registry Manager — Sprint 58
 * Manages bounded external actor records and classification metadata.
 */

export interface ExternalActorInput {
  external_actor_name: string;
  external_actor_type: string;
  external_actor_scope: string;
  identity_confidence_score: number;
  evidence_links: unknown[];
  assumptions: unknown[];
}

export interface ClassifiedActor {
  external_actor_name: string;
  external_actor_type: string;
  external_actor_scope: string;
  identity_confidence_score: number;
  restriction_level: string;
  classification_rationale: string[];
}

const ACTOR_TYPES = ['platform', 'partner', 'vendor', 'integration', 'unknown'] as const;

export function classifyActorRecord(input: ExternalActorInput): ClassifiedActor {
  const rationale: string[] = [];

  if (!ACTOR_TYPES.includes(input.external_actor_type as any)) {
    rationale.push('unknown_actor_type');
  }

  let restrictionLevel = 'restricted';

  if (input.identity_confidence_score < 0.2) {
    restrictionLevel = 'never_admit';
    rationale.push('very_low_identity_confidence');
  } else if (input.identity_confidence_score < 0.4) {
    restrictionLevel = 'restricted';
    rationale.push('low_identity_confidence');
  } else if (input.identity_confidence_score < 0.6) {
    restrictionLevel = 'restricted_candidate';
    rationale.push('moderate_identity_confidence');
  } else if (input.identity_confidence_score < 0.8) {
    restrictionLevel = 'provisional';
    rationale.push('good_identity_confidence');
  } else {
    restrictionLevel = 'sandbox_eligible';
    rationale.push('high_identity_confidence');
  }

  if (input.evidence_links.length === 0) {
    restrictionLevel = 'restricted';
    rationale.push('no_evidence_provided');
  }

  return {
    external_actor_name: input.external_actor_name,
    external_actor_type: input.external_actor_type,
    external_actor_scope: input.external_actor_scope,
    identity_confidence_score: input.identity_confidence_score,
    restriction_level: restrictionLevel,
    classification_rationale: rationale,
  };
}
