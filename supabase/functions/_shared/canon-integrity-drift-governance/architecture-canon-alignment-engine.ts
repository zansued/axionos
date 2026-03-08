/**
 * Architecture Canon Alignment Engine — Sprint 64
 * Evaluates alignment between active architecture and canonical direction.
 */

export interface ArchAlignmentInput {
  canonical_layer_count: number;
  active_layer_count: number;
  undocumented_layers: number;
  deprecated_but_active: number;
}

export interface ArchAlignmentResult {
  architecture_canon_alignment_score: number;
  rationale: string[];
}

export function evaluateArchAlignment(input: ArchAlignmentInput): ArchAlignmentResult {
  const rationale: string[] = [];
  const documented = input.canonical_layer_count > 0 ? input.active_layer_count / input.canonical_layer_count : 0;
  let score = Math.min(1, documented);

  if (input.undocumented_layers > 0) { score -= input.undocumented_layers * 0.05; rationale.push(`${input.undocumented_layers}_undocumented`); }
  if (input.deprecated_but_active > 0) { score -= input.deprecated_but_active * 0.1; rationale.push(`${input.deprecated_but_active}_deprecated_active`); }

  return {
    architecture_canon_alignment_score: Math.round(Math.max(0, Math.min(1, score)) * 10000) / 10000,
    rationale,
  };
}
