/**
 * Convergence Candidate Builder — Sprint 49
 * Builds candidate convergence opportunities across architecture modes, strategies, and local overrides.
 * Pure functions. No DB access.
 */

export interface CandidateInput {
  modes: Array<{
    mode_key: string;
    divergence_score: number;
    specialization_benefit: number;
    fragmentation_risk: number;
    support_count: number;
    status: string;
  }>;
  strategy_variants: Array<{
    variant_key: string;
    family_key: string;
    performance_score: number;
    adoption_ratio: number;
  }>;
}

export interface ConvergenceCandidate {
  candidate_type: "merge" | "retire" | "retain" | "promote";
  convergence_domain: string;
  target_entities: Array<{ key: string; type: string }>;
  merge_safety_score: number;
  retention_justification_score: number;
  deprecation_candidate_score: number;
  convergence_expected_value: number;
  rationale_codes: string[];
}

export function buildConvergenceCandidates(input: CandidateInput): ConvergenceCandidate[] {
  const candidates: ConvergenceCandidate[] = [];

  // Detect mode merge candidates (high divergence, low benefit, similar modes)
  const activeModes = input.modes.filter(m => m.status === "active");
  for (const mode of activeModes) {
    if (mode.fragmentation_risk > 0.6 && mode.specialization_benefit < 0.3) {
      candidates.push({
        candidate_type: "retire",
        convergence_domain: "architecture_mode",
        target_entities: [{ key: mode.mode_key, type: "architecture_mode" }],
        merge_safety_score: 1 - mode.fragmentation_risk,
        retention_justification_score: mode.specialization_benefit,
        deprecation_candidate_score: round(mode.fragmentation_risk * 0.6 + (1 - mode.specialization_benefit) * 0.4),
        convergence_expected_value: round(mode.fragmentation_risk - mode.specialization_benefit),
        rationale_codes: ["high_fragmentation_low_benefit"],
      });
    } else if (mode.specialization_benefit > 0.7 && mode.fragmentation_risk < 0.3) {
      candidates.push({
        candidate_type: "retain",
        convergence_domain: "architecture_mode",
        target_entities: [{ key: mode.mode_key, type: "architecture_mode" }],
        merge_safety_score: 0.9,
        retention_justification_score: mode.specialization_benefit,
        deprecation_candidate_score: 0.1,
        convergence_expected_value: 0,
        rationale_codes: ["healthy_specialization"],
      });
    }
  }

  // Detect similar modes that could merge
  for (let i = 0; i < activeModes.length; i++) {
    for (let j = i + 1; j < activeModes.length; j++) {
      const a = activeModes[i], b = activeModes[j];
      const divergenceDiff = Math.abs(a.divergence_score - b.divergence_score);
      if (divergenceDiff < 0.15 && a.support_count < 3 && b.support_count < 3) {
        candidates.push({
          candidate_type: "merge",
          convergence_domain: "architecture_mode",
          target_entities: [
            { key: a.mode_key, type: "architecture_mode" },
            { key: b.mode_key, type: "architecture_mode" },
          ],
          merge_safety_score: round(1 - Math.max(a.fragmentation_risk, b.fragmentation_risk)),
          retention_justification_score: round((a.specialization_benefit + b.specialization_benefit) / 2),
          deprecation_candidate_score: 0.3,
          convergence_expected_value: round(0.3 - divergenceDiff),
          rationale_codes: ["similar_low_support_modes"],
        });
      }
    }
  }

  // Strategy variant redundancy
  const familyGroups = new Map<string, typeof input.strategy_variants>();
  for (const v of input.strategy_variants) {
    const group = familyGroups.get(v.family_key) || [];
    group.push(v);
    familyGroups.set(v.family_key, group);
  }
  for (const [family, variants] of familyGroups) {
    if (variants.length > 3) {
      const worst = variants.sort((a, b) => a.performance_score - b.performance_score).slice(0, variants.length - 2);
      for (const w of worst) {
        candidates.push({
          candidate_type: "retire",
          convergence_domain: "strategy_variant",
          target_entities: [{ key: w.variant_key, type: "strategy_variant" }],
          merge_safety_score: 0.7,
          retention_justification_score: round(w.performance_score),
          deprecation_candidate_score: round(1 - w.performance_score),
          convergence_expected_value: round((1 - w.performance_score) * 0.5),
          rationale_codes: ["low_performance_variant_in_crowded_family"],
        });
      }
    }
  }

  return candidates;
}

function round(v: number): number { return Math.round(v * 10000) / 10000; }
