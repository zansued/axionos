/**
 * Block W — Cross-Sprint Integration Signals
 * Enables explicit, inspectable data flow between Sprints 107–110.
 * Each function extracts structured signals from one sprint's data
 * to be consumed as context by another sprint's evaluation logic.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Signal Types ───

export interface HorizonSignals {
  has_short_term_bias: boolean;
  has_long_term_undersupport: boolean;
  has_mission_erosion: boolean;
  has_temporal_conflict: boolean;
  deferred_risk_domains: string[];
  composite_alignment: number;
  composite_tension: number;
  strongest_posture: string;
  signal_summary: string;
}

export interface TradeoffSignals {
  has_hidden_sacrifice: boolean;
  has_unacceptable_compromise: boolean;
  has_irreversible_sacrifice: boolean;
  corrosion_domains: string[];
  avg_compromise_risk: number;
  avg_reversibility: number;
  mission_dimension_sacrificed: boolean;
  signal_summary: string;
}

export interface MissionSignals {
  has_active_erosion: boolean;
  has_recurrent_drift: boolean;
  has_commitments_under_stress: boolean;
  avg_alignment: number;
  avg_erosion: number;
  drift_density: number;
  mission_health: number;
  posture_distribution: Record<string, number>;
  signal_summary: string;
}

export interface SimulationSignals {
  avg_survivability: number;
  avg_identity_preservation: number;
  has_fragile_subjects: boolean;
  recurring_stress_types: string[];
  worst_future_state: string;
  mitigation_leverage_points: string[];
  signal_summary: string;
}

// ─── Signal Extractors ───

/** Sprint 107 → signals for Sprint 108 tradeoff context */
export async function extractHorizonSignals(
  client: SupabaseClient,
  orgId: string,
): Promise<HorizonSignals> {
  const [{ data: evals }, { data: conflicts }] = await Promise.all([
    client.from("horizon_alignment_evaluations").select("alignment_score, tension_score, deferred_risk_score, support_level, evaluation_summary").eq("organization_id", orgId).limit(200),
    client.from("horizon_conflict_events").select("conflict_type, severity, affected_horizons").eq("organization_id", orgId).is("resolved_at", null).limit(50),
  ]);

  const allEvals = evals || [];
  const allConflicts = conflicts || [];

  const avgAlignment = allEvals.length > 0 ? allEvals.reduce((s, e: any) => s + Number(e.alignment_score), 0) / allEvals.length : 0.5;
  const avgTension = allEvals.length > 0 ? allEvals.reduce((s, e: any) => s + Number(e.tension_score), 0) / allEvals.length : 0;

  const lowSupport = allEvals.filter((e: any) => e.support_level === "under_supported" || e.support_level === "neglected");
  const highDeferred = allEvals.filter((e: any) => Number(e.deferred_risk_score) > 0.4);

  const postures = allEvals.map((e: any) => (e.evaluation_summary || "").replace("Posture: ", ""));
  const strongestPosture = postures.length > 0 ? postures[0] : "unknown";

  const summaryParts: string[] = [];
  if (avgAlignment < 0.5) summaryParts.push("Low overall horizon alignment");
  if (avgTension > 0.4) summaryParts.push("High temporal tension");
  if (allConflicts.length > 0) summaryParts.push(`${allConflicts.length} open temporal conflict(s)`);
  if (highDeferred.length > 0) summaryParts.push(`${highDeferred.length} evaluation(s) with elevated deferred risk`);

  return {
    has_short_term_bias: postures.some(p => p === "short_biased"),
    has_long_term_undersupport: lowSupport.length > 0,
    has_mission_erosion: postures.some(p => p === "mission_eroding"),
    has_temporal_conflict: allConflicts.length > 0,
    deferred_risk_domains: highDeferred.map((e: any) => e.evaluation_summary || "unknown"),
    composite_alignment: Math.round(avgAlignment * 1000) / 1000,
    composite_tension: Math.round(avgTension * 1000) / 1000,
    strongest_posture: strongestPosture,
    signal_summary: summaryParts.length > 0 ? summaryParts.join(". ") + "." : "Horizon alignment is balanced with no significant signals.",
  };
}

/** Sprint 108 → signals for Sprint 109 mission drift context */
export async function extractTradeoffSignals(
  client: SupabaseClient,
  orgId: string,
): Promise<TradeoffSignals> {
  const [{ data: evals }, { data: events }] = await Promise.all([
    client.from("tradeoff_evaluations").select("gain_dimensions, sacrifice_dimensions, reversibility_score, compromise_risk_score, legitimacy_tension_score, arbitration_summary").eq("organization_id", orgId).limit(200),
    client.from("tradeoff_arbitration_events").select("arbitration_type, severity, affected_dimensions, event_summary").eq("organization_id", orgId).is("resolved_at", null).limit(50),
  ]);

  const allEvals = evals || [];
  const allEvents = events || [];

  const avgRisk = allEvals.length > 0 ? allEvals.reduce((s, e: any) => s + Number(e.compromise_risk_score || 0), 0) / allEvals.length : 0;
  const avgReversibility = allEvals.length > 0 ? allEvals.reduce((s, e: any) => s + Number(e.reversibility_score || 0), 0) / allEvals.length : 1;

  const corrosionDomains = new Set<string>();
  for (const ev of allEvents) {
    for (const d of ((ev as any).affected_dimensions || [])) {
      corrosionDomains.add(d);
    }
  }

  const missionSacrificed = allEvals.some((e: any) => {
    const sacrifices = Array.isArray(e.sacrifice_dimensions) ? e.sacrifice_dimensions : [];
    return sacrifices.some((s: any) => {
      const name = typeof s === "string" ? s : s?.dimension_name || s?.dimension_code || "";
      return /mission|legitimacy|sovereignty|continuity/i.test(name);
    });
  });

  const summaryParts: string[] = [];
  if (avgRisk > 0.5) summaryParts.push("Elevated average compromise risk");
  if (avgReversibility < 0.4) summaryParts.push("Low average reversibility — many sacrifices are hard to undo");
  if (missionSacrificed) summaryParts.push("Mission/legitimacy/sovereignty dimensions are being sacrificed");
  if (allEvents.length > 0) summaryParts.push(`${allEvents.length} unresolved arbitration event(s)`);

  return {
    has_hidden_sacrifice: allEvals.some((e: any) => (e.arbitration_summary || "").includes("hidden_sacrifice")),
    has_unacceptable_compromise: allEvents.some((e: any) => e.arbitration_type === "unacceptable_compromise"),
    has_irreversible_sacrifice: allEvals.some((e: any) => Number(e.reversibility_score) < 0.2),
    corrosion_domains: [...corrosionDomains],
    avg_compromise_risk: Math.round(avgRisk * 1000) / 1000,
    avg_reversibility: Math.round(avgReversibility * 1000) / 1000,
    mission_dimension_sacrificed: missionSacrificed,
    signal_summary: summaryParts.length > 0 ? summaryParts.join(". ") + "." : "Tradeoff posture is balanced with no critical signals.",
  };
}

/** Sprint 109 → signals for Sprint 110 continuity simulation context */
export async function extractMissionSignals(
  client: SupabaseClient,
  orgId: string,
): Promise<MissionSignals> {
  const [{ data: evals }, { data: drifts }, { data: snaps }] = await Promise.all([
    client.from("mission_alignment_evaluations").select("alignment_score, erosion_score, drift_risk_score, posture").eq("organization_id", orgId).limit(200),
    client.from("mission_drift_events").select("drift_type, severity, resolved_at").eq("organization_id", orgId).limit(200),
    client.from("mission_integrity_snapshots").select("mission_health_score, drift_density_score").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(1),
  ]);

  const allEvals = evals || [];
  const allDrifts = drifts || [];

  const avgAlignment = allEvals.length > 0 ? allEvals.reduce((s, e: any) => s + Number(e.alignment_score), 0) / allEvals.length : 0.5;
  const avgErosion = allEvals.length > 0 ? allEvals.reduce((s, e: any) => s + Number(e.erosion_score), 0) / allEvals.length : 0;
  const unresolvedDrifts = allDrifts.filter((d: any) => !d.resolved_at);

  const postureDist: Record<string, number> = {};
  for (const e of allEvals) {
    const p = (e as any).posture || "unknown";
    postureDist[p] = (postureDist[p] || 0) + 1;
  }

  const recurrentTypes = new Set<string>();
  const typeCount: Record<string, number> = {};
  for (const d of allDrifts) {
    typeCount[(d as any).drift_type] = (typeCount[(d as any).drift_type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(typeCount)) {
    if (count >= 3) recurrentTypes.add(type);
  }

  const latestSnap = (snaps || [])[0];
  const driftDensity = latestSnap ? Number((latestSnap as any).drift_density_score) : 0;
  const missionHealth = latestSnap ? Number((latestSnap as any).mission_health_score) : avgAlignment;

  const summaryParts: string[] = [];
  if (avgErosion > 0.3) summaryParts.push("Elevated average erosion risk");
  if (recurrentTypes.size > 0) summaryParts.push(`Recurrent drift in: ${[...recurrentTypes].join(", ")}`);
  if (unresolvedDrifts.length > 3) summaryParts.push(`${unresolvedDrifts.length} unresolved drift events`);

  return {
    has_active_erosion: (postureDist["active_erosion"] || 0) > 0 || (postureDist["normative_compromise"] || 0) > 0,
    has_recurrent_drift: recurrentTypes.size > 0,
    has_commitments_under_stress: avgErosion > 0.3,
    avg_alignment: Math.round(avgAlignment * 1000) / 1000,
    avg_erosion: Math.round(avgErosion * 1000) / 1000,
    drift_density: Math.round(driftDensity * 1000) / 1000,
    mission_health: Math.round(missionHealth * 1000) / 1000,
    posture_distribution: postureDist,
    signal_summary: summaryParts.length > 0 ? summaryParts.join(". ") + "." : "Mission integrity signals are within healthy bounds.",
  };
}

/** Sprint 110 → signals for Sprints 107/108/109 feedback */
export async function extractSimulationSignals(
  client: SupabaseClient,
  orgId: string,
): Promise<SimulationSignals> {
  const [{ data: runs }, { data: stressPoints }, { data: snapshots }] = await Promise.all([
    client.from("scenario_simulation_runs").select("survivability_score, identity_preservation_score, continuity_stress_score").eq("organization_id", orgId).limit(200),
    client.from("simulation_stress_points").select("stress_type, severity").eq("organization_id", orgId).limit(200),
    client.from("future_continuity_snapshots").select("future_state_type, continuity_score").eq("organization_id", orgId).limit(200),
  ]);

  const allRuns = runs || [];
  const allStress = stressPoints || [];
  const allSnaps = snapshots || [];

  const avgSurv = allRuns.length > 0 ? allRuns.reduce((s, r: any) => s + Number(r.survivability_score || 0), 0) / allRuns.length : 0.5;
  const avgIdentity = allRuns.length > 0 ? allRuns.reduce((s, r: any) => s + Number(r.identity_preservation_score || 0), 0) / allRuns.length : 0.5;

  const stressTypeCount: Record<string, number> = {};
  for (const sp of allStress) {
    stressTypeCount[(sp as any).stress_type] = (stressTypeCount[(sp as any).stress_type] || 0) + 1;
  }
  const recurringStress = Object.entries(stressTypeCount).filter(([, c]) => c >= 2).map(([t]) => t);

  const stateOrder = ["collapsed", "fragmented", "degraded", "strained", "adaptive_recovery", "stable"];
  let worstState = "stable";
  for (const snap of allSnaps) {
    const st = (snap as any).future_state_type || "stable";
    if (stateOrder.indexOf(st) < stateOrder.indexOf(worstState)) worstState = st;
  }

  const leveragePoints: string[] = [];
  if (avgIdentity < 0.5) leveragePoints.push("Strengthen identity preservation mechanisms");
  if (recurringStress.length > 0) leveragePoints.push(`Address recurring stress: ${recurringStress.join(", ")}`);
  if (worstState === "collapsed" || worstState === "fragmented") leveragePoints.push("Critical: some scenarios project institutional collapse or fragmentation");

  return {
    avg_survivability: Math.round(avgSurv * 1000) / 1000,
    avg_identity_preservation: Math.round(avgIdentity * 1000) / 1000,
    has_fragile_subjects: allRuns.some((r: any) => Number(r.survivability_score) < 0.3),
    recurring_stress_types: recurringStress,
    worst_future_state: worstState,
    mitigation_leverage_points: leveragePoints,
    signal_summary: leveragePoints.length > 0 ? leveragePoints.join(". ") + "." : "Simulation signals are within acceptable bounds.",
  };
}

/** Aggregate all cross-sprint signals for a given organization */
export async function extractAllBlockWSignals(client: SupabaseClient, orgId: string) {
  const [horizon, tradeoff, mission, simulation] = await Promise.all([
    extractHorizonSignals(client, orgId),
    extractTradeoffSignals(client, orgId),
    extractMissionSignals(client, orgId),
    extractSimulationSignals(client, orgId),
  ]);
  return { horizon, tradeoff, mission, simulation };
}
