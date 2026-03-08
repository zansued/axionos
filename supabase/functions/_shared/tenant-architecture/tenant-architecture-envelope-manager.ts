/**
 * Tenant Architecture Envelope Manager — Sprint 47
 * Applies bounded architecture-mode controls per scope.
 */

export interface ArchitectureEnvelope {
  mode_key: string;
  controls: EnvelopeControl[];
  scope_ref: Record<string, unknown>;
}

export interface EnvelopeControl {
  control_type: string;
  control_value: unknown;
  rationale: string;
}

export type ControlType =
  | "stricter_observability"
  | "conservative_rollout_profile"
  | "higher_validation_depth"
  | "tighter_migration_concurrency"
  | "increased_retrieval_readiness"
  | "slower_strategy_promotion"
  | "higher_fitness_requirement"
  | "stronger_stabilization_defaults";

const CONTROL_DEFINITIONS: Record<string, { default_value: unknown; description: string }> = {
  stricter_observability: { default_value: true, description: "Require higher observability coverage" },
  conservative_rollout_profile: { default_value: "conservative", description: "Default to conservative rollout profiles" },
  higher_validation_depth: { default_value: "elevated", description: "Require elevated validation depth" },
  tighter_migration_concurrency: { default_value: 1, description: "Limit concurrent migrations" },
  increased_retrieval_readiness: { default_value: 0.8, description: "Higher retrieval domain readiness threshold" },
  slower_strategy_promotion: { default_value: 0.5, description: "Reduce strategy promotion velocity" },
  higher_fitness_requirement: { default_value: 0.7, description: "Require higher architecture fitness before changes" },
  stronger_stabilization_defaults: { default_value: true, description: "Apply stronger stabilization defaults" },
};

export function buildEnvelope(
  mode_key: string,
  allowed_envelope: Record<string, unknown>,
  scope_ref: Record<string, unknown>,
): ArchitectureEnvelope {
  const controls: EnvelopeControl[] = [];

  for (const [key, def] of Object.entries(CONTROL_DEFINITIONS)) {
    const overridden = allowed_envelope[key];
    if (overridden !== undefined) {
      controls.push({ control_type: key, control_value: overridden, rationale: `mode_${mode_key}_override` });
    }
  }

  return { mode_key, controls, scope_ref };
}

export function getControlValue(envelope: ArchitectureEnvelope, controlType: string): unknown | undefined {
  const ctrl = envelope.controls.find((c) => c.control_type === controlType);
  return ctrl?.control_value;
}

export function mergeEnvelopes(base: ArchitectureEnvelope, override: ArchitectureEnvelope): ArchitectureEnvelope {
  const merged = new Map<string, EnvelopeControl>();
  for (const c of base.controls) merged.set(c.control_type, c);
  for (const c of override.controls) merged.set(c.control_type, c);
  return { mode_key: override.mode_key, controls: Array.from(merged.values()), scope_ref: override.scope_ref };
}
