// Engineering Advisory Signal Aggregator — Sprint 35
// Aggregates signals from all active intelligence layers.

export interface AdvisorySignal {
  source_layer: string;
  signal_type: string;
  affected_scope: string;
  confidence: number;
  evidence_refs: Record<string, unknown>;
  impact_category: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface LayerSignals {
  platform_intelligence?: { bottlenecks: number; insights: number; health_index: number };
  platform_calibration?: { proposals: number; harmful_outcomes: number; frozen_params: number };
  strategy_evolution?: { active_experiments: number; rollbacks: number; promotions: number };
  strategy_portfolio?: { conflicts: number; degrading_members: number; exposure_imbalance: number };
  execution_governance?: { policy_churn: number; low_performers: number };
  predictive_error?: { high_risk_assessments: number; false_positive_rate: number };
  cross_stage_learning?: { active_policies: number; spillover_count: number };
  tenant_tuning?: { drift_signals: number; divergent_tenants: number };
  platform_stabilization?: { critical_signals: number; open_actions: number; oscillation_count: number };
  operational?: { retry_rate: number; repair_burden: number };
}

export function aggregateAdvisorySignals(layers: LayerSignals): AdvisorySignal[] {
  const signals: AdvisorySignal[] = [];

  if (layers.platform_intelligence) {
    const pi = layers.platform_intelligence;
    if (pi.bottlenecks > 0) {
      signals.push({ source_layer: "platform_intelligence", signal_type: "bottleneck_detected", affected_scope: "pipeline", confidence: 0.85, evidence_refs: { bottleneck_count: pi.bottlenecks }, impact_category: "reliability", severity: pi.bottlenecks > 3 ? "high" : "medium" });
    }
    if (pi.health_index < 0.5) {
      signals.push({ source_layer: "platform_intelligence", signal_type: "low_health_index", affected_scope: "platform", confidence: 0.9, evidence_refs: { health_index: pi.health_index }, impact_category: "reliability", severity: pi.health_index < 0.3 ? "critical" : "high" });
    }
  }

  if (layers.platform_calibration) {
    const pc = layers.platform_calibration;
    if (pc.harmful_outcomes > 0) {
      signals.push({ source_layer: "platform_calibration", signal_type: "harmful_calibration_outcomes", affected_scope: "calibration", confidence: 0.8, evidence_refs: { harmful_outcomes: pc.harmful_outcomes }, impact_category: "stability", severity: pc.harmful_outcomes > 2 ? "high" : "medium" });
    }
  }

  if (layers.strategy_portfolio) {
    const sp = layers.strategy_portfolio;
    if (sp.conflicts > 0) {
      signals.push({ source_layer: "strategy_portfolio", signal_type: "portfolio_conflicts", affected_scope: "strategy_portfolio", confidence: 0.85, evidence_refs: { conflicts: sp.conflicts }, impact_category: "efficiency", severity: sp.conflicts > 3 ? "high" : "medium" });
    }
    if (sp.degrading_members > 0) {
      signals.push({ source_layer: "strategy_portfolio", signal_type: "degrading_strategies", affected_scope: "strategy_family", confidence: 0.8, evidence_refs: { degrading: sp.degrading_members }, impact_category: "quality", severity: sp.degrading_members > 2 ? "high" : "medium" });
    }
  }

  if (layers.strategy_evolution) {
    const se = layers.strategy_evolution;
    if (se.rollbacks > se.promotions && se.rollbacks > 0) {
      signals.push({ source_layer: "strategy_evolution", signal_type: "rollback_dominant", affected_scope: "strategy_evolution", confidence: 0.75, evidence_refs: { rollbacks: se.rollbacks, promotions: se.promotions }, impact_category: "stability", severity: "high" });
    }
  }

  if (layers.platform_stabilization) {
    const ps = layers.platform_stabilization;
    if (ps.critical_signals > 0) {
      signals.push({ source_layer: "platform_stabilization", signal_type: "critical_stability_signals", affected_scope: "platform", confidence: 0.9, evidence_refs: { critical: ps.critical_signals }, impact_category: "stability", severity: "critical" });
    }
    if (ps.oscillation_count > 0) {
      signals.push({ source_layer: "platform_stabilization", signal_type: "oscillation_detected", affected_scope: "platform", confidence: 0.85, evidence_refs: { oscillations: ps.oscillation_count }, impact_category: "stability", severity: ps.oscillation_count > 2 ? "high" : "medium" });
    }
  }

  if (layers.cross_stage_learning) {
    const cs = layers.cross_stage_learning;
    if (cs.spillover_count > 0) {
      signals.push({ source_layer: "cross_stage_learning", signal_type: "spillover_effects", affected_scope: "cross_stage", confidence: 0.8, evidence_refs: { spillovers: cs.spillover_count }, impact_category: "quality", severity: cs.spillover_count > 2 ? "high" : "medium" });
    }
  }

  if (layers.tenant_tuning) {
    const tt = layers.tenant_tuning;
    if (tt.drift_signals > 0) {
      signals.push({ source_layer: "tenant_tuning", signal_type: "tenant_drift", affected_scope: "tenant_scope", confidence: 0.75, evidence_refs: { drift_signals: tt.drift_signals }, impact_category: "governance", severity: tt.drift_signals > 3 ? "high" : "medium" });
    }
  }

  if (layers.predictive_error) {
    const pe = layers.predictive_error;
    if (pe.false_positive_rate > 0.3) {
      signals.push({ source_layer: "predictive_error", signal_type: "high_false_positive_rate", affected_scope: "predictive", confidence: 0.7, evidence_refs: { false_positive_rate: pe.false_positive_rate }, impact_category: "efficiency", severity: pe.false_positive_rate > 0.5 ? "high" : "medium" });
    }
  }

  if (layers.execution_governance) {
    const eg = layers.execution_governance;
    if (eg.policy_churn > 0.3) {
      signals.push({ source_layer: "execution_governance", signal_type: "policy_churn", affected_scope: "execution_policies", confidence: 0.8, evidence_refs: { churn: eg.policy_churn }, impact_category: "stability", severity: eg.policy_churn > 0.6 ? "high" : "medium" });
    }
  }

  if (layers.operational) {
    const op = layers.operational;
    if (op.repair_burden > 0.3) {
      signals.push({ source_layer: "operational", signal_type: "high_repair_burden", affected_scope: "pipeline", confidence: 0.85, evidence_refs: { repair_burden: op.repair_burden }, impact_category: "cost", severity: op.repair_burden > 0.5 ? "high" : "medium" });
    }
  }

  return signals;
}
