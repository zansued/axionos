/**
 * AI Nervous System — NS-02: Signal Classification, Enrichment & Grouping
 *
 * ARCHITECTURE NOTES:
 * - All processing is backend-only, using service-role client.
 * - Classification is rule-based (no LLM), deterministic, and explainable.
 * - Enrichment attaches operational context without historical reasoning.
 * - Grouping uses fingerprint + time-window to cluster recurrent signals.
 * - Pattern creation is conservative: only when group evidence is sufficient.
 * - Live state updates are curated summaries, not raw dumps.
 *
 * EVOLUTION PATH:
 * - NS-03: Context Engine will correlate classified events with Canon Graph Memory.
 * - NS-04: Decision Layer will consume contextualized events to produce recommendations.
 * - NS-06: Learning feedback will refine scores based on action outcomes.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════
// Classification Rules (deterministic, rule-based)
// ═══════════════════════════════════════════════════

/** Maps event_type → { domain, subdomain } for auto-classification */
const EVENT_TYPE_CLASSIFICATION: Record<string, { domain: string; subdomain: string }> = {
  // Runtime
  latency_spike:              { domain: "runtime",    subdomain: "latency" },
  error_pattern_detected:     { domain: "runtime",    subdomain: "errors" },
  resource_exhaustion:        { domain: "runtime",    subdomain: "resources" },
  // Pipeline
  pipeline_state_changed:     { domain: "pipeline",   subdomain: "lifecycle" },
  pipeline_stage_failed:      { domain: "pipeline",   subdomain: "failure" },
  pipeline_stage_recovered:   { domain: "pipeline",   subdomain: "recovery" },
  // Agent
  agent_execution_failed:     { domain: "agent",      subdomain: "failure" },
  agent_execution_recovered:  { domain: "agent",      subdomain: "recovery" },
  agent_routing_anomaly:      { domain: "agent",      subdomain: "routing" },
  // Governance
  governance_violation_detected: { domain: "governance", subdomain: "violation" },
  policy_enforcement_triggered:  { domain: "governance", subdomain: "enforcement" },
  // Cost
  cost_anomaly_detected:      { domain: "cost",       subdomain: "anomaly" },
  budget_threshold_reached:   { domain: "cost",       subdomain: "threshold" },
  // Deployment
  deployment_state_changed:   { domain: "deployment", subdomain: "lifecycle" },
  deployment_rollback_triggered: { domain: "deployment", subdomain: "rollback" },
  // Learning
  pattern_learned:            { domain: "learning",   subdomain: "acquisition" },
  pattern_confidence_changed: { domain: "learning",   subdomain: "confidence" },
  // Optimization
  optimization_opportunity_detected: { domain: "runtime", subdomain: "optimization" },
  // Autonomic
  autonomic_action_executed:  { domain: "governance", subdomain: "autonomic" },
  autonomic_action_failed:    { domain: "governance", subdomain: "autonomic_failure" },
};

/** Severity escalation rules based on event_type */
const SEVERITY_OVERRIDES: Record<string, string> = {
  agent_execution_failed: "high",
  pipeline_stage_failed: "high",
  governance_violation_detected: "high",
  resource_exhaustion: "high",
  cost_anomaly_detected: "medium",
  deployment_rollback_triggered: "critical",
  autonomic_action_failed: "critical",
};

const SEVERITY_SCORES: Record<string, number> = {
  low: 0.25, medium: 0.50, high: 0.75, critical: 1.00,
};

// ═══════════════════════════════════════════════════
// Classifier
// ═══════════════════════════════════════════════════

interface ClassificationResult {
  event_domain: string;
  event_subdomain: string | null;
  severity: string;
  severity_score: number;
  novelty_score: number;
  confidence_score: number;
  classification_metadata: Record<string, unknown>;
}

/**
 * Classify a single nervous system event.
 * Rule-based, deterministic, no LLM.
 *
 * @param event - The raw event row
 * @param recentFingerprints - Count of same fingerprint in last hour (for novelty)
 * @returns ClassificationResult
 */
export function classifyEvent(
  event: Record<string, unknown>,
  recentFingerprintCount: number
): ClassificationResult {
  const eventType = event.event_type as string;
  const emittedDomain = event.event_domain as string;
  const emittedSeverity = event.severity as string;

  // 1. Domain/subdomain classification
  const typeClass = EVENT_TYPE_CLASSIFICATION[eventType];
  const domain = typeClass?.domain || emittedDomain;
  const subdomain = typeClass?.subdomain || (event.event_subdomain as string) || null;

  // 2. Severity (override if rule exists, else keep emitted)
  const overrideSeverity = SEVERITY_OVERRIDES[eventType];
  const severity = overrideSeverity
    ? escalateSeverity(emittedSeverity, overrideSeverity)
    : emittedSeverity;
  const severityScore = SEVERITY_SCORES[severity] ?? 0.25;

  // 3. Novelty score (inverse of frequency — more occurrences = less novel)
  const noveltyScore = recentFingerprintCount <= 1
    ? 0.90
    : recentFingerprintCount <= 3
      ? 0.60
      : recentFingerprintCount <= 10
        ? 0.30
        : 0.10;

  // 4. Confidence score (based on signal completeness)
  const completenessFactors = [
    event.source_type ? 1 : 0,
    event.event_type ? 1 : 0,
    event.event_domain ? 1 : 0,
    event.summary ? 1 : 0,
    event.fingerprint ? 1 : 0,
    event.service_name || event.agent_id ? 1 : 0,
    typeClass ? 1 : 0, // Known event type → higher confidence
  ];
  const confidenceScore = completenessFactors.reduce((a, b) => a + b, 0) / completenessFactors.length;

  return {
    event_domain: domain,
    event_subdomain: subdomain,
    severity,
    severity_score: severityScore,
    novelty_score: noveltyScore,
    confidence_score: Math.round(confidenceScore * 10000) / 10000,
    // FROZEN CONTRACT v1.0 — keys must match NsClassificationMetadata
    // Required: classified_by, rule_version, type_matched
    // Optional: severity_overridden, fingerprint_count_1h
    classification_metadata: {
      classified_by: "ns02_rule_engine",
      rule_version: "1.0",
      type_matched: !!typeClass,
      severity_overridden: !!overrideSeverity,
      fingerprint_count_1h: recentFingerprintCount,
    },
  };
}

/** Only escalate severity, never downgrade */
function escalateSeverity(current: string, override: string): string {
  const order = ["low", "medium", "high", "critical"];
  const ci = order.indexOf(current);
  const oi = order.indexOf(override);
  return oi > ci ? override : current;
}

// ═══════════════════════════════════════════════════
// Enrichment
// ═══════════════════════════════════════════════════

interface EnrichmentResult {
  normalized_source_label: string;
  category_hints: string[];
  enrichment_metadata: Record<string, unknown>;
}

/**
 * Enrich a classified event with operational context.
 * Lightweight — no historical lookup, no LLM.
 */
export function enrichEvent(event: Record<string, unknown>): EnrichmentResult {
  const sourceType = event.source_type as string;
  const serviceName = event.service_name as string | null;
  const eventType = event.event_type as string;
  const domain = event.event_domain as string;

  // Normalized source label
  const normalizedSource = serviceName
    ? `${sourceType}/${serviceName}`
    : sourceType;

  // Category hints (lightweight tags for future context engine)
  const hints: string[] = [];
  if (eventType.includes("failed") || eventType.includes("error")) hints.push("failure");
  if (eventType.includes("recovered")) hints.push("recovery");
  if (eventType.includes("anomaly") || eventType.includes("spike")) hints.push("anomaly");
  if (eventType.includes("violation")) hints.push("governance_concern");
  if (eventType.includes("rollback")) hints.push("rollback");
  if (eventType.includes("learned") || eventType.includes("confidence")) hints.push("learning_signal");
  if (domain === "cost") hints.push("cost_impact");
  if (domain === "security") hints.push("security_relevant");

  return {
    normalized_source_label: normalizedSource,
    category_hints: hints,
    enrichment_metadata: {
      enriched_by: "ns02_enricher",
      enrichment_version: "1.0",
    },
  };
}

// ═══════════════════════════════════════════════════
// Grouping
// ═══════════════════════════════════════════════════

const GROUP_WINDOW_HOURS = 1;
const MIN_EVENTS_FOR_PATTERN = 5;

/**
 * Process grouping for a classified event.
 * Upserts into nervous_system_signal_groups.
 *
 * @returns The signal_group_id, or null if grouping failed
 */
export async function groupSignal(
  sc: SupabaseClient,
  event: Record<string, unknown>,
  classification: ClassificationResult
): Promise<string | null> {
  const orgId = event.organization_id as string;
  const fingerprint = event.fingerprint as string;
  if (!fingerprint) return null;

  const groupKey = `${classification.event_domain}::${event.event_type}::${fingerprint}`;

  // Try to find existing active group
  const { data: existingGroup } = await sc
    .from("nervous_system_signal_groups")
    .select("id, event_count, first_seen_at, severity, severity_score")
    .eq("organization_id", orgId)
    .eq("group_key", groupKey)
    .eq("status", "active")
    .single();

  if (existingGroup) {
    // Update existing group
    const newCount = (existingGroup.event_count || 1) + 1;
    const recurrenceScore = Math.min(1.0, newCount / 20); // Saturates at 20

    // Escalate severity if needed
    const groupSeverity = escalateSeverity(existingGroup.severity, classification.severity);

    const { error } = await sc
      .from("nervous_system_signal_groups")
      .update({
        event_count: newCount,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        severity: groupSeverity,
        severity_score: SEVERITY_SCORES[groupSeverity] ?? existingGroup.severity_score,
        recurrence_score: recurrenceScore,
        novelty_score: classification.novelty_score,
        representative_event_id: event.id as string,
      })
      .eq("id", existingGroup.id);

    if (error) {
      console.error("[NS-02 Grouper] Failed to update group:", error.message);
      return null;
    }

    return existingGroup.id;
  }

  // Create new group
  const { data: newGroup, error } = await sc
    .from("nervous_system_signal_groups")
    .insert({
      organization_id: orgId,
      fingerprint,
      group_key: groupKey,
      title: (event.summary as string).slice(0, 200),
      event_domain: classification.event_domain,
      event_subdomain: classification.event_subdomain,
      event_type: event.event_type as string,
      severity: classification.severity,
      severity_score: classification.severity_score,
      event_count: 1,
      first_seen_at: (event.occurred_at as string) || new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      representative_event_id: event.id as string,
      novelty_score: classification.novelty_score,
      confidence_score: classification.confidence_score,
      recurrence_score: 0.0,
      source_type: event.source_type as string,
      service_name: (event.service_name as string) || null,
      summary: (event.summary as string).slice(0, 500),
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[NS-02 Grouper] Failed to create group:", error.message);
    return null;
  }

  return newGroup?.id || null;
}

// ═══════════════════════════════════════════════════
// Pattern promotion (conservative)
// ═══════════════════════════════════════════════════

/**
 * Check if a signal group has enough evidence to promote to a pattern.
 * Only creates patterns when MIN_EVENTS_FOR_PATTERN is reached.
 */
export async function maybePromoteToPattern(
  sc: SupabaseClient,
  orgId: string,
  groupId: string
): Promise<void> {
  const { data: group } = await sc
    .from("nervous_system_signal_groups")
    .select("*")
    .eq("id", groupId)
    .eq("organization_id", orgId)
    .single();

  if (!group || group.event_count < MIN_EVENTS_FOR_PATTERN) return;

  const patternKey = `${group.event_domain}::${group.event_type}`;

  const { data: existingPattern } = await sc
    .from("nervous_system_event_patterns")
    .select("id, occurrence_count")
    .eq("organization_id", orgId)
    .eq("pattern_key", patternKey)
    .single();

  if (existingPattern) {
    // Update occurrence count
    await sc
      .from("nervous_system_event_patterns")
      .update({
        occurrence_count: group.event_count,
        confidence_score: group.confidence_score,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingPattern.id);
  } else {
    // Create new pattern — conservative, evidence-based
    await sc
      .from("nervous_system_event_patterns")
      .insert({
        organization_id: orgId,
        pattern_key: patternKey,
        title: `Recurring: ${group.title}`.slice(0, 200),
        domain: group.event_domain,
        subdomain: group.event_subdomain,
        description: `Auto-detected pattern from ${group.event_count} occurrences.`,
        occurrence_count: group.event_count,
        confidence_score: group.confidence_score,
        metadata: {
          source_group_id: groupId,
          promoted_at: new Date().toISOString(),
          promoted_by: "ns02_pattern_promoter",
          min_threshold: MIN_EVENTS_FOR_PATTERN,
        },
      });
  }
}

// ═══════════════════════════════════════════════════
// Main Processing Pipeline
// ═══════════════════════════════════════════════════

interface ProcessingResult {
  processed: number;
  classified: number;
  grouped: number;
  patterns_promoted: number;
  errors: number;
}

/**
 * Process pending "new" events for a tenant.
 * Pipeline: validate → classify → enrich → group → lifecycle → live state.
 *
 * @param sc - Service-role client
 * @param orgId - Tenant ID
 * @param batchSize - Max events to process (default 50)
 */
export async function processPendingEvents(
  sc: SupabaseClient,
  orgId: string,
  batchSize = 50
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    processed: 0, classified: 0, grouped: 0, patterns_promoted: 0, errors: 0,
  };

  // 1. Fetch pending events
  const { data: pendingEvents, error } = await sc
    .from("nervous_system_events")
    .select("*")
    .eq("organization_id", orgId)
    .eq("status", "new")
    .order("created_at", { ascending: true })
    .limit(Math.min(batchSize, 100));

  if (error || !pendingEvents || pendingEvents.length === 0) {
    return result;
  }

  // 2. Precompute fingerprint frequencies (for novelty scoring)
  const oneHourAgo = new Date(Date.now() - GROUP_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const fingerprints = [...new Set(pendingEvents.map(e => e.fingerprint).filter(Boolean))];
  const fingerprintCounts: Record<string, number> = {};

  if (fingerprints.length > 0) {
    const { data: fpEvents } = await sc
      .from("nervous_system_events")
      .select("fingerprint")
      .eq("organization_id", orgId)
      .in("fingerprint", fingerprints)
      .gte("created_at", oneHourAgo);

    for (const e of fpEvents || []) {
      if (e.fingerprint) {
        fingerprintCounts[e.fingerprint] = (fingerprintCounts[e.fingerprint] || 0) + 1;
      }
    }
  }

  // 3. Process each event
  const groupsUpdated = new Set<string>();

  for (const event of pendingEvents) {
    try {
      result.processed++;

      // Classify
      const fpCount = fingerprintCounts[event.fingerprint] || 0;
      const classification = classifyEvent(event, fpCount);

      // Enrich
      const enrichment = enrichEvent(event);

      // Merge classification + enrichment into FROZEN v1.0 contract
      // All keys here MUST exist in NsClassificationMetadata interface
      const classificationMeta = {
        // Required (classifier)
        classified_by: classification.classification_metadata.classified_by as string,
        rule_version: classification.classification_metadata.rule_version as string,
        type_matched: classification.classification_metadata.type_matched as boolean,
        // Optional (classifier)
        severity_overridden: classification.classification_metadata.severity_overridden as boolean | undefined,
        fingerprint_count_1h: classification.classification_metadata.fingerprint_count_1h as number | undefined,
        // Optional (enricher)
        enriched_by: enrichment.enrichment_metadata.enriched_by as string,
        enrichment_version: enrichment.enrichment_metadata.enrichment_version as string,
        normalized_source: enrichment.normalized_source_label,
        category_hints: enrichment.category_hints,
      };

      // Group
      let signalGroupId: string | null = null;
      if (event.fingerprint) {
        signalGroupId = await groupSignal(sc, event, classification);
        if (signalGroupId) {
          result.grouped++;
          groupsUpdated.add(signalGroupId);
        }
      }

      // Update event with classification results + lifecycle transition
      const { error: updateError } = await sc
        .from("nervous_system_events")
        .update({
          event_domain: classification.event_domain,
          event_subdomain: classification.event_subdomain,
          severity: classification.severity,
          severity_score: classification.severity_score,
          novelty_score: classification.novelty_score,
          confidence_score: classification.confidence_score,
          classification_metadata: classificationMeta,
          signal_group_id: signalGroupId,
          status: "classified",
          classified_at: new Date().toISOString(),
        })
        .eq("id", event.id)
        .eq("organization_id", orgId);

      if (updateError) {
        console.error(`[NS-02] Failed to update event ${event.id}:`, updateError.message);
        result.errors++;
      } else {
        result.classified++;
      }
    } catch (e) {
      console.error(`[NS-02] Error processing event:`, e);
      result.errors++;
    }
  }

  // 4. Check pattern promotion for updated groups
  for (const groupId of groupsUpdated) {
    try {
      await maybePromoteToPattern(sc, orgId, groupId);
      result.patterns_promoted++;
    } catch {
      // Non-fatal
    }
  }

  // 5. Update live state with curated classification summary
  await updateClassifiedLiveState(sc, orgId).catch((e) => {
    console.warn("[NS-02] Live state update failed (non-blocking):", e);
  });

  return result;
}

// ═══════════════════════════════════════════════════
// Curated Live State (for UI consumption)
// ═══════════════════════════════════════════════════

/**
 * Update live state with classified signal summaries.
 * This is what the UI reads — curated, not raw.
 */
async function updateClassifiedLiveState(
  sc: SupabaseClient,
  orgId: string
): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Active signal groups (top by severity and recurrence)
  const { data: topGroups } = await sc
    .from("nervous_system_signal_groups")
    .select("id, title, event_domain, event_type, severity, event_count, last_seen_at, recurrence_score")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .gte("last_seen_at", oneHourAgo)
    .order("severity_score", { ascending: false })
    .limit(10);

  // Classified event counts by domain
  const { data: classifiedEvents } = await sc
    .from("nervous_system_events")
    .select("event_domain, severity, status")
    .eq("organization_id", orgId)
    .eq("status", "classified")
    .gte("created_at", oneHourAgo)
    .limit(500);

  const domainCounts: Record<string, number> = {};
  const severityCounts: Record<string, number> = {};
  for (const e of classifiedEvents || []) {
    domainCounts[e.event_domain] = (domainCounts[e.event_domain] || 0) + 1;
    severityCounts[e.severity] = (severityCounts[e.severity] || 0) + 1;
  }

  // Pending (unprocessed) count
  const { count: pendingCount } = await sc
    .from("nervous_system_events")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "new");

  await sc
    .from("nervous_system_live_state")
    .upsert(
      {
        state_key: "classified_summary",
        organization_id: orgId,
        updated_at: new Date().toISOString(),
        state_value: {
          classified_last_hour: classifiedEvents?.length || 0,
          pending_count: pendingCount || 0,
          by_domain: domainCounts,
          by_severity: severityCounts,
          top_signal_groups: topGroups || [],
          last_updated: new Date().toISOString(),
        },
      },
      { onConflict: "organization_id,state_key" }
    );
}
