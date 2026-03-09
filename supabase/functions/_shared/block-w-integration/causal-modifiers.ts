/**
 * Block W — Causal Cross-Sprint Modifiers
 * 
 * Bounded, explainable, inspectable influence rules between Sprints 107–110.
 * Each modifier has: source sprint, signal, target score, magnitude, rationale.
 * Modifiers are additive adjustments, never replacing base heuristic logic.
 * 
 * Max modifier per signal: ±0.15 (bounded to prevent runaway coupling).
 * Max total cross-sprint modifier per score: ±0.25 (stacking cap).
 */

import type { HorizonSignals, TradeoffSignals, MissionSignals, SimulationSignals } from "./cross-sprint-signals.ts";

// ─── Core Types ───

export interface CausalModifier {
  source_sprint: string;        // e.g. "Sprint 107"
  source_signal: string;        // e.g. "short_biased posture"
  target_score: string;         // e.g. "compromise_risk_score"
  modifier_value: number;       // bounded ±0.15
  rationale: string;            // human-readable explanation
}

export interface ModifierBundle {
  modifiers: CausalModifier[];
  total_adjustment: number;     // capped at ±0.25
  summary: string;
}

// ─── Bounds ───

const MAX_SINGLE_MODIFIER = 0.15;
const MAX_TOTAL_MODIFIER = 0.25;

function clampModifier(v: number): number {
  return Math.max(-MAX_SINGLE_MODIFIER, Math.min(MAX_SINGLE_MODIFIER, v));
}

function clampTotal(v: number): number {
  return Math.max(-MAX_TOTAL_MODIFIER, Math.min(MAX_TOTAL_MODIFIER, v));
}

function bundleModifiers(modifiers: CausalModifier[], targetScore: string): ModifierBundle {
  const relevant = modifiers.filter(m => m.target_score === targetScore);
  const raw = relevant.reduce((sum, m) => sum + m.modifier_value, 0);
  const total = clampTotal(raw);
  const parts = relevant.map(m => `${m.source_signal}: ${m.modifier_value > 0 ? "+" : ""}${(m.modifier_value * 100).toFixed(1)}%`);
  return {
    modifiers: relevant,
    total_adjustment: total,
    summary: relevant.length > 0
      ? `Cross-sprint adjustment: ${(total * 100).toFixed(1)}% from ${parts.join("; ")}`
      : "No cross-sprint modifiers applied.",
  };
}

// ─── A. Sprint 107 → Sprint 108 (Horizon → Tradeoff) ───

export function computeHorizonToTradeoffModifiers(signals: HorizonSignals): CausalModifier[] {
  const mods: CausalModifier[] = [];

  if (signals.has_short_term_bias) {
    mods.push({
      source_sprint: "Sprint 107",
      source_signal: "short_biased posture detected",
      target_score: "compromise_risk_score",
      modifier_value: clampModifier(0.08),
      rationale: "Short-term bias increases risk that speed/cost gains mask continuity/mission sacrifice.",
    });
    mods.push({
      source_sprint: "Sprint 107",
      source_signal: "short_biased posture detected",
      target_score: "hidden_sacrifice_sensitivity",
      modifier_value: clampModifier(0.10),
      rationale: "Short-term optimization makes hidden sacrifices more likely.",
    });
  }

  if (signals.has_mission_erosion) {
    mods.push({
      source_sprint: "Sprint 107",
      source_signal: "mission_eroding posture",
      target_score: "compromise_risk_score",
      modifier_value: clampModifier(0.12),
      rationale: "Active mission erosion in horizons increases institutional compromise risk.",
    });
    mods.push({
      source_sprint: "Sprint 107",
      source_signal: "mission_eroding posture",
      target_score: "reversibility_penalty",
      modifier_value: clampModifier(-0.10),
      rationale: "Long-term erosion already present reduces confidence in reversibility.",
    });
  }

  if (signals.has_long_term_undersupport) {
    mods.push({
      source_sprint: "Sprint 107",
      source_signal: "long_term undersupported",
      target_score: "compromise_risk_score",
      modifier_value: clampModifier(0.06),
      rationale: "Long-term under-support suggests structural fragility amplifying tradeoff risk.",
    });
  }

  if (signals.composite_tension > 0.4) {
    mods.push({
      source_sprint: "Sprint 107",
      source_signal: `high composite tension (${(signals.composite_tension * 100).toFixed(0)}%)`,
      target_score: "compromise_risk_score",
      modifier_value: clampModifier(0.05),
      rationale: "Elevated temporal tension amplifies tradeoff compromise risk.",
    });
  }

  // Check deferred risk domains
  if (signals.deferred_risk_domains.length >= 3) {
    mods.push({
      source_sprint: "Sprint 107",
      source_signal: `${signals.deferred_risk_domains.length} domains with elevated deferred risk`,
      target_score: "compromise_risk_score",
      modifier_value: clampModifier(0.07),
      rationale: "Multiple domains deferring risk amplifies overall institutional compromise exposure.",
    });
  }

  return mods;
}

// ─── B. Sprint 108 → Sprint 109 (Tradeoff → Mission) ───

export function computeTradeoffToMissionModifiers(signals: TradeoffSignals): CausalModifier[] {
  const mods: CausalModifier[] = [];

  if (signals.has_hidden_sacrifice) {
    mods.push({
      source_sprint: "Sprint 108",
      source_signal: "hidden sacrifice detected",
      target_score: "drift_risk_score",
      modifier_value: clampModifier(0.10),
      rationale: "Hidden tradeoff sacrifices increase drift risk — erosion occurs without visibility.",
    });
    mods.push({
      source_sprint: "Sprint 108",
      source_signal: "hidden sacrifice detected",
      target_score: "erosion_score",
      modifier_value: clampModifier(0.08),
      rationale: "Hidden sacrifices contribute to undetected normative erosion.",
    });
  }

  if (signals.has_unacceptable_compromise) {
    mods.push({
      source_sprint: "Sprint 108",
      source_signal: "unacceptable compromise active",
      target_score: "drift_risk_score",
      modifier_value: clampModifier(0.12),
      rationale: "Unacceptable institutional compromise directly threatens mission alignment.",
    });
    mods.push({
      source_sprint: "Sprint 108",
      source_signal: "unacceptable compromise active",
      target_score: "erosion_score",
      modifier_value: clampModifier(0.15),
      rationale: "Unacceptable compromise causes direct erosion of protected institutional values.",
    });
  }

  if (signals.has_irreversible_sacrifice) {
    mods.push({
      source_sprint: "Sprint 108",
      source_signal: "irreversible sacrifice present",
      target_score: "erosion_score",
      modifier_value: clampModifier(0.10),
      rationale: "Irreversible sacrifices permanently erode institutional capacity.",
    });
  }

  if (signals.mission_dimension_sacrificed) {
    mods.push({
      source_sprint: "Sprint 108",
      source_signal: "mission/sovereignty/legitimacy dimension sacrificed",
      target_score: "drift_risk_score",
      modifier_value: clampModifier(0.08),
      rationale: "Sacrificing mission-critical dimensions directly increases drift pressure.",
    });
  }

  if (signals.avg_compromise_risk > 0.5) {
    mods.push({
      source_sprint: "Sprint 108",
      source_signal: `elevated avg compromise risk (${(signals.avg_compromise_risk * 100).toFixed(0)}%)`,
      target_score: "drift_risk_score",
      modifier_value: clampModifier(0.05),
      rationale: "Sustained elevated compromise risk across tradeoffs increases drift pressure.",
    });
  }

  return mods;
}

// ─── C. Sprint 109 → Sprint 110 (Mission → Simulation) ───

export function computeMissionToSimulationModifiers(signals: MissionSignals): CausalModifier[] {
  const mods: CausalModifier[] = [];

  if (signals.has_active_erosion) {
    mods.push({
      source_sprint: "Sprint 109",
      source_signal: "active erosion detected",
      target_score: "identity_preservation_score",
      modifier_value: clampModifier(-0.12),
      rationale: "Active mission erosion weakens identity preservation under simulation stress.",
    });
    mods.push({
      source_sprint: "Sprint 109",
      source_signal: "active erosion detected",
      target_score: "survivability_score",
      modifier_value: clampModifier(-0.08),
      rationale: "Active erosion reduces institutional resilience, lowering survivability.",
    });
  }

  if (signals.has_recurrent_drift) {
    mods.push({
      source_sprint: "Sprint 109",
      source_signal: "recurrent drift patterns",
      target_score: "continuity_stress_score",
      modifier_value: clampModifier(0.10),
      rationale: "Recurrent drift amplifies continuity stress in simulation scenarios.",
    });
  }

  if (signals.has_commitments_under_stress) {
    mods.push({
      source_sprint: "Sprint 109",
      source_signal: "protected commitments under stress",
      target_score: "identity_preservation_score",
      modifier_value: clampModifier(-0.10),
      rationale: "Commitments already under stress weaken identity preservation capacity.",
    });
  }

  if (signals.avg_erosion > 0.3) {
    mods.push({
      source_sprint: "Sprint 109",
      source_signal: `elevated avg erosion (${(signals.avg_erosion * 100).toFixed(0)}%)`,
      target_score: "survivability_score",
      modifier_value: clampModifier(-0.06),
      rationale: "Elevated baseline erosion reduces institutional survivability under disruption.",
    });
  }

  if (signals.mission_health < 0.4) {
    mods.push({
      source_sprint: "Sprint 109",
      source_signal: `low mission health (${(signals.mission_health * 100).toFixed(0)}%)`,
      target_score: "survivability_score",
      modifier_value: clampModifier(-0.10),
      rationale: "Low mission health makes the institution fragile to external shocks.",
    });
  }

  return mods;
}

// ─── D. Sprint 110 → Sprint 107/108/109 (Simulation → Feedback) ───

export function computeSimulationToHorizonModifiers(signals: SimulationSignals): CausalModifier[] {
  const mods: CausalModifier[] = [];
  const badStates = ["collapsed", "fragmented", "degraded"];

  if (badStates.includes(signals.worst_future_state)) {
    mods.push({
      source_sprint: "Sprint 110",
      source_signal: `worst future state: ${signals.worst_future_state}`,
      target_score: "deferred_risk_awareness",
      modifier_value: clampModifier(0.12),
      rationale: `Simulation projects ${signals.worst_future_state} future — deferred risk is materializing.`,
    });
  }

  if (signals.avg_survivability < 0.4) {
    mods.push({
      source_sprint: "Sprint 110",
      source_signal: `low avg survivability (${(signals.avg_survivability * 100).toFixed(0)}%)`,
      target_score: "long_term_fragility",
      modifier_value: clampModifier(0.10),
      rationale: "Low survivability scores indicate structural long-term fragility.",
    });
  }

  if (signals.has_fragile_subjects) {
    mods.push({
      source_sprint: "Sprint 110",
      source_signal: "fragile subjects detected in simulation",
      target_score: "deferred_risk_awareness",
      modifier_value: clampModifier(0.08),
      rationale: "Fragile simulation subjects highlight deferred risk that needs horizon attention.",
    });
  }

  return mods;
}

export function computeSimulationToTradeoffModifiers(signals: SimulationSignals): CausalModifier[] {
  const mods: CausalModifier[] = [];
  const badStates = ["collapsed", "fragmented", "degraded"];

  if (badStates.includes(signals.worst_future_state)) {
    mods.push({
      source_sprint: "Sprint 110",
      source_signal: `worst future state: ${signals.worst_future_state}`,
      target_score: "compromise_risk_score",
      modifier_value: clampModifier(0.08),
      rationale: `Simulation fragility (${signals.worst_future_state}) increases sensitivity to institutional compromise.`,
    });
  }

  if (signals.avg_identity_preservation < 0.4) {
    mods.push({
      source_sprint: "Sprint 110",
      source_signal: `low identity preservation (${(signals.avg_identity_preservation * 100).toFixed(0)}%)`,
      target_score: "compromise_risk_score",
      modifier_value: clampModifier(0.06),
      rationale: "Low identity preservation makes mission/sovereignty sacrifices more dangerous.",
    });
  }

  return mods;
}

export function computeSimulationToMissionModifiers(signals: SimulationSignals): CausalModifier[] {
  const mods: CausalModifier[] = [];

  if (signals.avg_identity_preservation < 0.4) {
    mods.push({
      source_sprint: "Sprint 110",
      source_signal: `low identity preservation (${(signals.avg_identity_preservation * 100).toFixed(0)}%)`,
      target_score: "erosion_warning",
      modifier_value: clampModifier(0.10),
      rationale: "Simulation shows identity at risk — mission erosion warnings should be elevated.",
    });
  }

  if (signals.recurring_stress_types.length >= 2) {
    mods.push({
      source_sprint: "Sprint 110",
      source_signal: `${signals.recurring_stress_types.length} recurring stress types`,
      target_score: "drift_risk_score",
      modifier_value: clampModifier(0.06),
      rationale: "Recurring simulation stress patterns increase real-world drift risk.",
    });
  }

  return mods;
}

// ─── Aggregation Utilities ───

export function aggregateModifiers(modifiers: CausalModifier[], targetScore: string): ModifierBundle {
  return bundleModifiers(modifiers, targetScore);
}

export function applyModifier(baseValue: number, bundle: ModifierBundle): number {
  return Math.max(0, Math.min(1, baseValue + bundle.total_adjustment));
}

export function formatModifierExplanation(modifiers: CausalModifier[]): string {
  if (modifiers.length === 0) return "No cross-sprint influences applied.";
  const lines = modifiers.map(m =>
    `• [${m.source_sprint}] ${m.source_signal} → ${m.target_score}: ${m.modifier_value > 0 ? "+" : ""}${(m.modifier_value * 100).toFixed(1)}% — ${m.rationale}`
  );
  return `Cross-sprint causal influences:\n${lines.join("\n")}`;
}
