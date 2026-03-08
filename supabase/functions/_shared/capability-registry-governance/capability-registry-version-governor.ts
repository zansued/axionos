/**
 * Capability Registry Version Governor — Sprint 61
 * Governs version status, compatibility, and deprecation posture.
 */

export interface VersionInput {
  version_label: string;
  compatibility_score: number;
  deprecation_pressure_score: number;
  active_dependencies: number;
}

export interface VersionResult {
  version_label: string;
  version_validity_score: number;
  recommended_status: string;
  rationale: string[];
}

export function governVersion(input: VersionInput): VersionResult {
  const rationale: string[] = [];
  let validity = input.compatibility_score * 0.5 + (1 - input.deprecation_pressure_score) * 0.5;

  if (input.deprecation_pressure_score > 0.7) { rationale.push('high_deprecation_pressure'); validity *= 0.5; }
  if (input.compatibility_score < 0.4) { rationale.push('low_compatibility'); validity *= 0.6; }
  if (input.active_dependencies > 10) { rationale.push('high_dependency_count'); }

  let status = 'valid';
  if (validity < 0.3) status = 'deprecated';
  else if (validity < 0.5) status = 'restricted';
  else if (validity < 0.7) status = 'draft';

  return {
    version_label: input.version_label,
    version_validity_score: Math.round(Math.min(1, validity) * 10000) / 10000,
    recommended_status: status,
    rationale,
  };
}
