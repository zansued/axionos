/**
 * AI Nervous System — Temporal Accumulation Engine (LIF Layer)
 * Sprint 1: Temporal Refinement
 *
 * Adds a Leaky Integrate-and-Fire inspired temporal layer to the NS pipeline.
 * This is a COMPLEMENTARY layer — it does NOT replace NS-01 through NS-05.
 *
 * Responsibilities:
 *  - Accumulate signal charge per domain/subdomain/group
 *  - Apply exponential decay (leak)
 *  - Detect spikes (fire events)
 *  - Compute operational states: nominal, elevated, stressed, pain, fatigued, recovering, critical_cascade
 *  - Detect cross-domain cascades
 *  - Produce temporal hints consumed by NS-04 (Decision Engine)
 *
 * INVARIANTS:
 *  - Pure computation + DB read/write. No LLM.
 *  - Advisory only — never triggers actions directly.
 *  - All state changes are auditable via previous_state + state_entered_at.
 *  - Tenant-isolated by organization_id.
 *  - 100% reversible: removing this module does not affect NS-01 to NS-05.
 */

import { SupabaseClient } from "npm:@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════

const TEMPORAL_ENGINE_VERSION = "1.0";

// Decay: charge(t) = charge(t-1) * e^(-λ * Δt_minutes)
const DEFAULT_LEAK_RATE = 0.05;
const DEFAULT_FIRE_THRESHOLD = 1.0;

// Operational state thresholds
const THRESHOLDS = {
  elevated: 0.3,
  stressed: 0.6,
  pain: 0.85,
  fatigued: 0.5,
  recovering: 0.2,
  critical_cascade: 0.7,
} as const;

const FATIGUE_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours without recovery
const RECOVERY_WINDOW_MS = 15 * 60 * 1000; // 15 minutes sustained below threshold
const CASCADE_MIN_DOMAINS = 3;

// Severity → charge contribution
const SEVERITY_CHARGE: Record<string, number> = {
  low: 0.05,
  medium: 0.15,
  high: 0.35,
  critical: 0.60,
};

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

export type OperationalState =
  | "nominal"
  | "elevated"
  | "stressed"
  | "pain"
  | "fatigued"
  | "recovering"
  | "critical_cascade";

export interface TemporalState {
  id: string;
  domain: string;
  subdomain: string;
  signal_group_id: string | null;
  accumulated_charge: number;
  leak_rate: number;
  fire_threshold: number;
  last_spike_at: string | null;
  spike_count: number;
  event_count_window: number;
  window_start_at: string;
  avg_severity_window: number;
  max_severity_window: number;
  operational_state: OperationalState;
  state_entered_at: string;
  previous_state: string | null;
  cascade_depth: number;
  cascade_related_domains: string[];
  updated_at: string;
}

export interface TemporalHint {
  domain: string;
  subdomain: string;
  operational_state: OperationalState;
  accumulated_charge: number;
  spike_count: number;
  cascade_depth: number;
  cascade_related_domains: string[];
  fatigue_detected: boolean;
  recovery_detected: boolean;
  priority_boost: number;
  surfacing_boost: number;
  calibration_hint: string;
}

export interface TemporalProcessingResult {
  processed: number;
  states_updated: number;
  spikes_fired: number;
  cascades_detected: number;
  state_transitions: Array<{
    domain: string;
    from: OperationalState;
    to: OperationalState;
  }>;
}

// ═══════════════════════════════════════════════════
// Core: Apply Decay
// ═══════════════════════════════════════════════════

/**
 * Apply exponential decay to accumulated charge.
 * charge(t) = charge(t-1) * e^(-λ * Δt)
 *
 * This is the "leak" in Leaky Integrate-and-Fire.
 */
export function applyDecay(
  currentCharge: number,
  leakRate: number,
  elapsedMinutes: number
): number {
  if (elapsedMinutes <= 0 || currentCharge <= 0) return currentCharge;
  const decayed = currentCharge * Math.exp(-leakRate * elapsedMinutes);
  return Math.round(decayed * 10000) / 10000;
}

// ═══════════════════════════════════════════════════
// Core: Integrate Event
// ═══════════════════════════════════════════════════

/**
 * Add charge from a new event.
 * Charge = severity contribution * novelty modifier * confidence modifier
 */
export function integrateEvent(
  currentCharge: number,
  severity: string,
  noveltyScore: number,
  confidenceScore: number
): { newCharge: number; contribution: number } {
  const baseContribution = SEVERITY_CHARGE[severity] || 0.05;

  // Novelty amplifies (novel events are more "stimulating")
  const noveltyMod = 0.7 + noveltyScore * 0.6; // range: 0.7 to 1.3
  // Confidence amplifies (high confidence events carry more weight)
  const confidenceMod = 0.5 + confidenceScore * 0.5; // range: 0.5 to 1.0

  const contribution =
    Math.round(baseContribution * noveltyMod * confidenceMod * 10000) / 10000;
  const newCharge =
    Math.round((currentCharge + contribution) * 10000) / 10000;

  return { newCharge, contribution };
}

// ═══════════════════════════════════════════════════
// Core: Determine Operational State
// ═══════════════════════════════════════════════════

export function determineOperationalState(
  charge: number,
  spikeCount: number,
  avgSeverity: number,
  previousState: OperationalState,
  timeSinceStateChange_ms: number,
  cascadeDepth: number
): OperationalState {
  // Critical cascade: multiple domains in distress simultaneously
  if (
    cascadeDepth >= CASCADE_MIN_DOMAINS &&
    charge >= THRESHOLDS.critical_cascade
  ) {
    return "critical_cascade";
  }

  // Pain: anomalous saturation with recurrence and impact
  if (
    charge >= THRESHOLDS.pain &&
    spikeCount >= 3 &&
    avgSeverity >= 0.7
  ) {
    return "pain";
  }

  // Fatigued: sustained load without recovery
  if (
    charge >= THRESHOLDS.fatigued &&
    (previousState === "stressed" ||
      previousState === "pain" ||
      previousState === "fatigued") &&
    timeSinceStateChange_ms >= FATIGUE_WINDOW_MS
  ) {
    return "fatigued";
  }

  // Recovering: was stressed+, now below recovery threshold sustained
  if (
    (previousState === "stressed" ||
      previousState === "pain" ||
      previousState === "fatigued" ||
      previousState === "critical_cascade") &&
    charge < THRESHOLDS.recovering &&
    timeSinceStateChange_ms >= RECOVERY_WINDOW_MS
  ) {
    return "recovering";
  }

  // Stressed
  if (charge >= THRESHOLDS.stressed) {
    return "stressed";
  }

  // Elevated
  if (charge >= THRESHOLDS.elevated) {
    return "elevated";
  }

  // If recovering and charge stays low, transition to nominal
  if (previousState === "recovering" && charge < THRESHOLDS.elevated) {
    return "nominal";
  }

  return "nominal";
}

// ═══════════════════════════════════════════════════
// Core: Check Spike (Fire)
// ═══════════════════════════════════════════════════

export function checkSpike(charge: number, threshold: number): boolean {
  return charge >= threshold;
}

// ═══════════════════════════════════════════════════
// Core: Generate Temporal Hint
// ═══════════════════════════════════════════════════

/**
 * Produces a TemporalHint that the Decision Engine can consume
 * to boost priority, adjust surfacing, or add calibration context.
 */
export function generateTemporalHint(state: TemporalState): TemporalHint {
  const os = state.operational_state;

  let priorityBoost = 0;
  let surfacingBoost = 0;
  let calibrationHint = "";
  let fatigueDetected = false;
  let recoveryDetected = false;

  switch (os) {
    case "nominal":
      calibrationHint = "Domain operating within normal parameters.";
      break;
    case "elevated":
      priorityBoost = 0.05;
      surfacingBoost = 0.05;
      calibrationHint =
        "Elevated signal density. Monitor for escalation.";
      break;
    case "stressed":
      priorityBoost = 0.15;
      surfacingBoost = 0.1;
      calibrationHint =
        "Sustained pressure detected. Consider proactive investigation.";
      break;
    case "pain":
      priorityBoost = 0.25;
      surfacingBoost = 0.2;
      calibrationHint =
        "Anomalous saturation with recurrence. Immediate operator attention recommended.";
      break;
    case "fatigued":
      priorityBoost = 0.2;
      surfacingBoost = 0.15;
      fatigueDetected = true;
      calibrationHint =
        "System fatigue: sustained load without recovery. Risk of degraded responsiveness.";
      break;
    case "recovering":
      priorityBoost = 0.0;
      surfacingBoost = 0.05;
      recoveryDetected = true;
      calibrationHint =
        "Recovery phase detected. Maintaining monitoring posture.";
      break;
    case "critical_cascade":
      priorityBoost = 0.3;
      surfacingBoost = 0.3;
      calibrationHint = `Cross-domain cascade: ${state.cascade_related_domains.join(", ")}. Multi-domain instability.`;
      break;
  }

  return {
    domain: state.domain,
    subdomain: state.subdomain,
    operational_state: os,
    accumulated_charge: state.accumulated_charge,
    spike_count: state.spike_count,
    cascade_depth: state.cascade_depth,
    cascade_related_domains: state.cascade_related_domains,
    fatigue_detected: fatigueDetected,
    recovery_detected: recoveryDetected,
    priority_boost: priorityBoost,
    surfacing_boost: surfacingBoost,
    calibration_hint: calibrationHint,
  };
}

// ═══════════════════════════════════════════════════
// Cascade Detection
// ═══════════════════════════════════════════════════

export function detectCascade(
  allDomainStates: Array<{
    domain: string;
    operational_state: OperationalState;
    accumulated_charge: number;
  }>
): { isCascade: boolean; depth: number; domains: string[] } {
  const stressedDomains = allDomainStates.filter(
    (s) =>
      s.operational_state === "stressed" ||
      s.operational_state === "pain" ||
      s.operational_state === "critical_cascade"
  );

  return {
    isCascade: stressedDomains.length >= CASCADE_MIN_DOMAINS,
    depth: stressedDomains.length,
    domains: stressedDomains.map((s) => s.domain),
  };
}

// ═══════════════════════════════════════════════════
// DB: Process temporal batch
// ═══════════════════════════════════════════════════

/**
 * Main batch processor. Called after NS-02 classification.
 * For each recently classified event not yet temporally processed,
 * updates the temporal state for its domain.
 */
export async function processTemporalBatch(
  sc: SupabaseClient,
  orgId: string,
  batchSize = 50
): Promise<TemporalProcessingResult> {
  const result: TemporalProcessingResult = {
    processed: 0,
    states_updated: 0,
    spikes_fired: 0,
    cascades_detected: 0,
    state_transitions: [],
  };

  // Fetch recently classified events not yet temporally processed
  const { data: events, error } = await sc
    .from("nervous_system_events")
    .select(
      "id, event_domain, event_subdomain, severity, severity_score, novelty_score, confidence_score, signal_group_id, classification_metadata, created_at"
    )
    .eq("organization_id", orgId)
    .in("status", ["classified", "contextualized", "decided"])
    .order("created_at", { ascending: true })
    .limit(Math.min(batchSize, 100));

  if (error || !events?.length) return result;

  // Filter events not yet temporally processed
  const unprocessed = events.filter((e) => {
    const meta = e.classification_metadata as Record<string, unknown> | null;
    return !meta?.temporal_processed;
  });

  if (!unprocessed.length) return result;

  const now = Date.now();

  for (const event of unprocessed) {
    try {
      result.processed++;

      const domain = event.event_domain as string;
      const subdomain = (event.event_subdomain as string) || "general";
      const severity = (event.severity as string) || "low";
      const novelty = (event.novelty_score as number) || 0.5;
      const confidence = (event.confidence_score as number) || 0.5;

      // Get or create temporal state for this domain
      let { data: state } = await sc
        .from("nervous_system_temporal_state")
        .select("*")
        .eq("organization_id", orgId)
        .eq("domain", domain)
        .eq("subdomain", subdomain)
        .is("signal_group_id", null)
        .maybeSingle();

      if (!state) {
        const { data: newState, error: createErr } = await sc
          .from("nervous_system_temporal_state")
          .insert({
            organization_id: orgId,
            domain,
            subdomain,
            accumulated_charge: 0,
            leak_rate: DEFAULT_LEAK_RATE,
            fire_threshold: DEFAULT_FIRE_THRESHOLD,
            operational_state: "nominal",
          })
          .select("*")
          .single();

        if (createErr || !newState) {
          console.error(
            `[NS-Temporal] Failed to create state for ${domain}/${subdomain}:`,
            createErr?.message
          );
          continue;
        }
        state = newState;
      }

      // 1. Apply decay since last update
      const lastUpdate = new Date(state.updated_at).getTime();
      const elapsedMinutes = (now - lastUpdate) / 60000;
      let charge = applyDecay(
        Number(state.accumulated_charge),
        Number(state.leak_rate),
        elapsedMinutes
      );

      // 2. Integrate new event
      const { newCharge, contribution } = integrateEvent(
        charge,
        severity,
        novelty,
        confidence
      );
      charge = newCharge;

      // 3. Update window metrics
      const windowStart = new Date(state.window_start_at).getTime();
      let eventCountWindow = (state.event_count_window as number) + 1;
      let avgSeverity = Number(state.avg_severity_window);
      let maxSeverity = Number(state.max_severity_window);
      const sevScore = (event.severity_score as number) || 0.25;

      // Reset window if expired
      if (now - windowStart > (state.window_duration_ms as number)) {
        eventCountWindow = 1;
        avgSeverity = sevScore;
        maxSeverity = sevScore;
      } else {
        avgSeverity =
          (avgSeverity * (eventCountWindow - 1) + sevScore) /
          eventCountWindow;
        maxSeverity = Math.max(maxSeverity, sevScore);
      }

      // 4. Check spike
      let spikeCount = state.spike_count as number;
      let lastSpikeAt = state.last_spike_at as string | null;
      const fired = checkSpike(charge, Number(state.fire_threshold));
      if (fired) {
        spikeCount++;
        lastSpikeAt = new Date().toISOString();
        result.spikes_fired++;
        // After fire, reset charge to 50% (refractory period)
        charge = Math.round(charge * 0.5 * 10000) / 10000;
      }

      // 5. Determine operational state
      const timeSinceStateChange =
        now - new Date(state.state_entered_at).getTime();
      const previousState = state.operational_state as OperationalState;

      const newState = determineOperationalState(
        charge,
        spikeCount,
        avgSeverity,
        previousState,
        timeSinceStateChange,
        state.cascade_depth as number
      );

      const stateChanged = newState !== previousState;
      if (stateChanged) {
        result.state_transitions.push({
          domain,
          from: previousState,
          to: newState,
        });
      }

      // 6. Update DB
      const { error: updateErr } = await sc
        .from("nervous_system_temporal_state")
        .update({
          accumulated_charge: charge,
          event_count_window: eventCountWindow,
          avg_severity_window:
            Math.round(avgSeverity * 10000) / 10000,
          max_severity_window:
            Math.round(maxSeverity * 10000) / 10000,
          spike_count: spikeCount,
          last_spike_at: lastSpikeAt,
          operational_state: newState,
          state_entered_at: stateChanged
            ? new Date().toISOString()
            : state.state_entered_at,
          previous_state: stateChanged
            ? previousState
            : state.previous_state,
          window_start_at:
            now - windowStart > (state.window_duration_ms as number)
              ? new Date().toISOString()
              : state.window_start_at,
          updated_at: new Date().toISOString(),
        })
        .eq("id", state.id);

      if (!updateErr) result.states_updated++;

      // 7. Mark event as temporally processed
      const existingMeta =
        (event.classification_metadata as Record<string, unknown>) || {};
      await sc
        .from("nervous_system_events")
        .update({
          classification_metadata: {
            ...existingMeta,
            temporal_processed: true,
            temporal_charge: charge,
            temporal_state: newState,
            temporal_contribution: contribution,
            temporal_engine_version: TEMPORAL_ENGINE_VERSION,
          },
        })
        .eq("id", event.id)
        .eq("organization_id", orgId);
    } catch (e) {
      console.error("[NS-Temporal] Error processing event:", e);
    }
  }

  // 8. Cross-domain cascade detection
  const { data: allStates } = await sc
    .from("nervous_system_temporal_state")
    .select("domain, operational_state, accumulated_charge")
    .eq("organization_id", orgId);

  if (allStates?.length) {
    const cascade = detectCascade(
      allStates as Array<{
        domain: string;
        operational_state: OperationalState;
        accumulated_charge: number;
      }>
    );
    if (cascade.isCascade) {
      result.cascades_detected = 1;
      for (const dom of cascade.domains) {
        await sc
          .from("nervous_system_temporal_state")
          .update({
            cascade_depth: cascade.depth,
            cascade_related_domains: cascade.domains,
            operational_state: "critical_cascade",
            updated_at: new Date().toISOString(),
          })
          .eq("organization_id", orgId)
          .eq("domain", dom);
      }
    } else {
      // Clear cascade state on domains that are no longer cascading
      await sc
        .from("nervous_system_temporal_state")
        .update({
          cascade_depth: 0,
          cascade_related_domains: [],
        })
        .eq("organization_id", orgId)
        .eq("operational_state", "critical_cascade")
        .lt("accumulated_charge", THRESHOLDS.critical_cascade);
    }
  }

  // 9. Update live state
  await updateTemporalLiveState(sc, orgId).catch((e) => {
    console.warn("[NS-Temporal] Live state update failed:", e);
  });

  return result;
}

// ═══════════════════════════════════════════════════
// Live State
// ═══════════════════════════════════════════════════

async function updateTemporalLiveState(
  sc: SupabaseClient,
  orgId: string
): Promise<void> {
  const { data: states } = await sc
    .from("nervous_system_temporal_state")
    .select(
      "domain, subdomain, operational_state, accumulated_charge, spike_count, cascade_depth"
    )
    .eq("organization_id", orgId);

  if (!states?.length) return;

  const domainSummary: Record<string, unknown> = {};
  let worstState: OperationalState = "nominal";
  const stateRank: Record<OperationalState, number> = {
    nominal: 0,
    recovering: 1,
    elevated: 2,
    stressed: 3,
    fatigued: 4,
    pain: 5,
    critical_cascade: 6,
  };

  for (const s of states) {
    domainSummary[s.domain as string] = {
      state: s.operational_state,
      charge: s.accumulated_charge,
      spikes: s.spike_count,
    };
    const st = s.operational_state as OperationalState;
    if (stateRank[st] > stateRank[worstState]) {
      worstState = st;
    }
  }

  const distressStates = ["stressed", "pain", "fatigued", "critical_cascade"];

  await sc
    .from("nervous_system_live_state")
    .upsert(
      {
        state_key: "temporal_summary",
        organization_id: orgId,
        updated_at: new Date().toISOString(),
        state_value: {
          worst_state: worstState,
          domain_states: domainSummary,
          total_domains: Object.keys(domainSummary).length,
          domains_in_distress: states.filter((s) =>
            distressStates.includes(s.operational_state as string)
          ).length,
          last_updated: new Date().toISOString(),
        },
      },
      { onConflict: "organization_id,state_key" }
    );
}

// ═══════════════════════════════════════════════════
// Get Temporal Hints for Decision Engine
// ═══════════════════════════════════════════════════

/**
 * Called by the Decision Engine (NS-04) to get temporal context
 * for a specific domain before making a decision.
 */
export async function getTemporalHintForDomain(
  sc: SupabaseClient,
  orgId: string,
  domain: string,
  subdomain?: string
): Promise<TemporalHint | null> {
  const { data: state } = await sc
    .from("nervous_system_temporal_state")
    .select("*")
    .eq("organization_id", orgId)
    .eq("domain", domain)
    .eq("subdomain", subdomain || "general")
    .is("signal_group_id", null)
    .maybeSingle();

  if (!state) return null;

  // Apply decay to get current charge
  const elapsed =
    (Date.now() - new Date(state.updated_at).getTime()) / 60000;
  const currentCharge = applyDecay(
    Number(state.accumulated_charge),
    Number(state.leak_rate),
    elapsed
  );

  return generateTemporalHint({
    ...state,
    accumulated_charge: currentCharge,
  } as unknown as TemporalState);
}

// ═══════════════════════════════════════════════════
// Get full temporal state for a domain (API)
// ═══════════════════════════════════════════════════

export async function getTemporalState(
  sc: SupabaseClient,
  orgId: string,
  domain?: string
): Promise<TemporalState[]> {
  let query = sc
    .from("nervous_system_temporal_state")
    .select("*")
    .eq("organization_id", orgId)
    .order("domain", { ascending: true });

  if (domain) query = query.eq("domain", domain);

  const { data, error } = await query.limit(100);
  if (error || !data) return [];

  // Apply real-time decay to each state
  const now = Date.now();
  return data.map((s) => {
    const elapsed = (now - new Date(s.updated_at).getTime()) / 60000;
    return {
      ...s,
      accumulated_charge: applyDecay(
        Number(s.accumulated_charge),
        Number(s.leak_rate),
        elapsed
      ),
    } as unknown as TemporalState;
  });
}

// ═══════════════════════════════════════════════════
// Get temporal summary for live dashboard
// ═══════════════════════════════════════════════════

export async function getTemporalSummary(
  sc: SupabaseClient,
  orgId: string
): Promise<Record<string, unknown> | null> {
  const { data } = await sc
    .from("nervous_system_live_state")
    .select("state_value, updated_at")
    .eq("organization_id", orgId)
    .eq("state_key", "temporal_summary")
    .maybeSingle();

  return data?.state_value as Record<string, unknown> | null;
}
