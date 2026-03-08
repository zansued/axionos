/**
 * Ecosystem Capability Inventory Builder — Sprint 56
 * Builds and maintains the internal capability inventory for future exposure analysis.
 */

export interface CapabilityInput {
  capability_name: string;
  capability_domain: string;
  capability_type: string;
  internal_criticality_score: number;
  dependency_sensitivity_score: number;
  auditability_score: number;
  evidence_links?: Record<string, unknown>[];
}

export interface CapabilityInventoryResult {
  capabilities: CapabilityInventoryItem[];
  total_count: number;
  candidate_count: number;
  restricted_count: number;
  internal_only_count: number;
  never_expose_count: number;
}

export interface CapabilityInventoryItem {
  capability_name: string;
  capability_domain: string;
  capability_type: string;
  internal_criticality_score: number;
  dependency_sensitivity_score: number;
  auditability_score: number;
  preliminary_exposure_classification: string;
  classification_rationale: string[];
}

export function buildCapabilityInventory(inputs: CapabilityInput[]): CapabilityInventoryResult {
  if (!inputs.length) {
    return { capabilities: [], total_count: 0, candidate_count: 0, restricted_count: 0, internal_only_count: 0, never_expose_count: 0 };
  }

  const items: CapabilityInventoryItem[] = inputs.map(input => {
    const { classification, rationale } = classifyCapability(input);
    return {
      capability_name: input.capability_name,
      capability_domain: input.capability_domain,
      capability_type: input.capability_type,
      internal_criticality_score: input.internal_criticality_score,
      dependency_sensitivity_score: input.dependency_sensitivity_score,
      auditability_score: input.auditability_score,
      preliminary_exposure_classification: classification,
      classification_rationale: rationale,
    };
  });

  return {
    capabilities: items,
    total_count: items.length,
    candidate_count: items.filter(i => i.preliminary_exposure_classification === 'candidate').length,
    restricted_count: items.filter(i => i.preliminary_exposure_classification === 'restricted').length,
    internal_only_count: items.filter(i => i.preliminary_exposure_classification === 'internal_only').length,
    never_expose_count: items.filter(i => i.preliminary_exposure_classification === 'never_expose').length,
  };
}

function classifyCapability(input: CapabilityInput): { classification: string; rationale: string[] } {
  const rationale: string[] = [];

  if (input.internal_criticality_score > 0.9) {
    rationale.push('extremely_high_criticality');
    return { classification: 'never_expose', rationale };
  }

  if (input.dependency_sensitivity_score > 0.85) {
    rationale.push('high_dependency_sensitivity');
    return { classification: 'internal_only', rationale };
  }

  if (input.auditability_score < 0.4) {
    rationale.push('insufficient_auditability');
    return { classification: 'restricted', rationale };
  }

  if (input.internal_criticality_score > 0.7) {
    rationale.push('elevated_criticality_requires_restriction');
    return { classification: 'restricted', rationale };
  }

  rationale.push('meets_candidate_thresholds');
  return { classification: 'candidate', rationale };
}
