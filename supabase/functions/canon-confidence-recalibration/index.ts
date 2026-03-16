/**
 * Sprint 207 — Canon Confidence Recalibration Engine
 * 
 * Dedicated engine for recalibrating canon entry confidence scores
 * using the agent_learning_confidence_ledger for cumulative tracking.
 * 
 * Signals used:
 * - agent_learning_feedback (reinforcement/degradation/neutral)
 * - operational_learning_signals (outcome success rates)
 * - pattern_weight_factors (source trust, execution reinforcement)
 * - usage_count / review_count from canon_entries
 * 
 * Bounds: [0.05, 0.95], minimum delta: 0.01
 * Full traceability via confidence_recalibration_log + ledger
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

const CONFIDENCE_MIN = 0.05;
const CONFIDENCE_MAX = 0.95;
const MIN_DELTA = 0.01;
const LOOKBACK_DAYS = 30;
const MAX_ENTRIES_PER_RUN = 200;

interface RecalibrationFactors {
  evidence_density: number;
  source_trust: number;
  signal_agreement: number;
  execution_reinforcement: number;
  feedback_boost: number;
  feedback_degrade: number;
  usage_velocity: number;
}

function computeRecalibratedConfidence(
  currentConf: number,
  factors: RecalibrationFactors
): { newConf: number; delta: number; direction: string } {
  let newConf = currentConf;

  // ── Boost signals ──

  // High evidence + high trust
  if (factors.evidence_density > 0.5 && factors.source_trust > 0.6) {
    newConf += 0.03;
  }

  // Execution reinforcement
  if (factors.execution_reinforcement > 0.1) {
    newConf += Math.min(0.05, factors.execution_reinforcement * 0.15);
  }

  // Signal agreement (needs minimum 3 relevant signals)
  if (factors.signal_agreement > 0.7) {
    newConf += 0.02;
  }

  // Learning feedback reinforcement
  if (factors.feedback_boost > 0) {
    newConf += Math.min(0.04, factors.feedback_boost * 0.02);
  }

  // Usage velocity (frequent recent use = positive signal)
  if (factors.usage_velocity > 0.5) {
    newConf += 0.01;
  }

  // ── Degradation signals ──

  // Low usage, low reviews
  if (factors.evidence_density < 0.1 && factors.usage_velocity < 0.1) {
    newConf -= 0.02;
  }

  // Weak source trust
  if (factors.source_trust < 0.3) {
    newConf -= 0.03;
  }

  // Poor signal agreement
  if (factors.signal_agreement < 0.3) {
    newConf -= 0.02;
  }

  // Learning feedback degradation
  if (factors.feedback_degrade > 0) {
    newConf -= Math.min(0.04, factors.feedback_degrade * 0.02);
  }

  // Bound confidence
  newConf = Math.max(CONFIDENCE_MIN, Math.min(CONFIDENCE_MAX, newConf));
  newConf = Math.round(newConf * 100) / 100;

  const delta = Math.round((newConf - currentConf) * 1000) / 1000;
  const direction = delta > 0 ? "boost" : delta < 0 ? "degrade" : "neutral";

  return { newConf, delta, direction };
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { organization_id, triggered_by = "api", dry_run = false } = body;

    if (!organization_id) {
      return errorResponse("organization_id required", 400, req);
    }

    const startTime = Date.now();
    const lookbackDate = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // ═══ Fetch data in parallel ═══
    const [
      { data: entries },
      { data: feedbackData },
      { data: recentSignals },
      { data: weightFactors },
      { data: existingLedger },
    ] = await Promise.all([
      sb.from("canon_entries")
        .select("id, title, confidence_score, usage_count, review_count, category, domain_tags, lifecycle_status, updated_at")
        .eq("organization_id", organization_id)
        .eq("lifecycle_status", "approved")
        .limit(MAX_ENTRIES_PER_RUN),

      sb.from("agent_learning_feedback")
        .select("canon_entry_id, impact_direction, applied_confidence_delta, signal_strength, outcome_quality_score")
        .eq("organization_id", organization_id)
        .gte("created_at", lookbackDate)
        .eq("suppressed", false)
        .limit(1000),

      sb.from("operational_learning_signals")
        .select("signal_type, outcome_success, confidence, payload")
        .eq("organization_id", organization_id)
        .gte("created_at", lookbackDate)
        .limit(500),

      sb.from("pattern_weight_factors")
        .select("target_id, pattern_weight, source_trust, execution_reinforcement")
        .eq("organization_id", organization_id),

      sb.from("agent_learning_confidence_ledger")
        .select("canon_entry_id, current_effective_confidence, cumulative_delta, reinforcement_count, degradation_count, neutral_count, total_feedback_count")
        .eq("organization_id", organization_id),
    ]);

    if (!entries || entries.length === 0) {
      return jsonResponse({
        run_type: "recalibration",
        entries_evaluated: 0,
        entries_recalibrated: 0,
        message: "No active canon entries found",
      }, 200, req);
    }

    // ═══ Build lookup maps ═══
    const weightMap = new Map((weightFactors || []).map((w: any) => [w.target_id, w]));
    const ledgerMap = new Map((existingLedger || []).map((l: any) => [l.canon_entry_id, l]));

    // Group feedback by canon_entry_id
    const feedbackByEntry = new Map<string, { boosts: number; degrades: number; neutrals: number }>();
    for (const fb of (feedbackData || [])) {
      if (!fb.canon_entry_id) continue;
      const existing = feedbackByEntry.get(fb.canon_entry_id) || { boosts: 0, degrades: 0, neutrals: 0 };
      if (fb.impact_direction === "reinforcement") existing.boosts++;
      else if (fb.impact_direction === "degradation") existing.degrades++;
      else existing.neutrals++;
      feedbackByEntry.set(fb.canon_entry_id, existing);
    }

    // Org-level signal health
    const signalSuccess = (recentSignals || []).filter((s: any) => s.outcome_success).length;
    const signalTotal = (recentSignals || []).length;
    const orgSignalHealth = signalTotal > 0 ? signalSuccess / signalTotal : 0.5;

    // ═══ Recalibrate each entry ═══
    let recalibrated = 0;
    let boosted = 0;
    let degraded = 0;
    let maxDelta = 0;
    let totalDelta = 0;
    const recalibrationDetails: any[] = [];

    for (const entry of entries) {
      const currentConf = Number(entry.confidence_score) || 0.5;
      const usageCount = entry.usage_count || 0;
      const reviewCount = entry.review_count || 0;
      const weight = weightMap.get(entry.id);
      const feedback = feedbackByEntry.get(entry.id) || { boosts: 0, degrades: 0, neutrals: 0 };

      // Evidence density
      const evidenceDensity = Math.min(1.0, usageCount * 0.1 + reviewCount * 0.2);

      // Source trust
      const sourceTrust = weight ? Number(weight.source_trust) || 0.5 : 0.5;
      const executionReinforcement = weight ? Number(weight.execution_reinforcement) || 0 : 0;

      // Signal agreement by domain
      const domainTags = entry.domain_tags || [];
      const relevantSignals = (recentSignals || []).filter((s: any) =>
        domainTags.some((tag: string) => s.signal_type?.includes(tag) || s.payload?.domain === tag)
      );
      const signalAgreement = relevantSignals.length >= 3
        ? relevantSignals.filter((s: any) => s.outcome_success).length / relevantSignals.length
        : orgSignalHealth;

      // Usage velocity: how recently was it used (based on updated_at)
      const daysSinceUpdate = (Date.now() - new Date(entry.updated_at).getTime()) / (1000 * 60 * 60 * 24);
      const usageVelocity = daysSinceUpdate < 7 ? 1.0 : daysSinceUpdate < 14 ? 0.5 : 0.1;

      const factors: RecalibrationFactors = {
        evidence_density: evidenceDensity,
        source_trust: sourceTrust,
        signal_agreement: signalAgreement,
        execution_reinforcement: executionReinforcement,
        feedback_boost: feedback.boosts,
        feedback_degrade: feedback.degrades,
        usage_velocity: usageVelocity,
      };

      const { newConf, delta, direction } = computeRecalibratedConfidence(currentConf, factors);

      if (Math.abs(delta) < MIN_DELTA) continue;

      if (!dry_run) {
        // Update canon entry
        await sb.from("canon_entries").update({
          confidence_score: newConf,
          last_reviewed_at: new Date().toISOString(),
        }).eq("id", entry.id);

        // Log to recalibration log
        await sb.from("confidence_recalibration_log").insert({
          organization_id,
          target_type: "canon_entry",
          target_id: entry.id,
          previous_confidence: currentConf,
          new_confidence: newConf,
          recalibration_reason: `Sprint207 ${direction}: evid=${evidenceDensity.toFixed(2)}, trust=${sourceTrust.toFixed(2)}, sig=${signalAgreement.toFixed(2)}, fb_boost=${feedback.boosts}, fb_deg=${feedback.degrades}`,
          factors: { ...factors, delta },
          recalibrated_by: triggered_by,
        });

        // Upsert ledger entry
        const existingLedgerEntry = ledgerMap.get(entry.id);
        if (existingLedgerEntry) {
          await sb.from("agent_learning_confidence_ledger").update({
            current_effective_confidence: newConf,
            cumulative_delta: Number(existingLedgerEntry.cumulative_delta) + delta,
            last_delta: delta,
            reinforcement_count: existingLedgerEntry.reinforcement_count + (direction === "boost" ? 1 : 0),
            degradation_count: existingLedgerEntry.degradation_count + (direction === "degrade" ? 1 : 0),
            neutral_count: existingLedgerEntry.neutral_count + (direction === "neutral" ? 1 : 0),
            total_feedback_count: existingLedgerEntry.total_feedback_count + 1,
            last_updated_at: new Date().toISOString(),
          }).eq("canon_entry_id", entry.id).eq("organization_id", organization_id);
        } else {
          await sb.from("agent_learning_confidence_ledger").insert({
            organization_id,
            canon_entry_id: entry.id,
            current_effective_confidence: newConf,
            cumulative_delta: delta,
            last_delta: delta,
            reinforcement_count: direction === "boost" ? 1 : 0,
            degradation_count: direction === "degrade" ? 1 : 0,
            neutral_count: 0,
            total_feedback_count: 1,
          });
        }
      }

      recalibrated++;
      if (direction === "boost") boosted++;
      else if (direction === "degrade") degraded++;
      maxDelta = Math.max(maxDelta, Math.abs(delta));
      totalDelta += Math.abs(delta);

      recalibrationDetails.push({
        entry_id: entry.id,
        title: entry.title,
        previous: currentConf,
        new: newConf,
        delta,
        direction,
      });
    }

    const durationMs = Date.now() - startTime;
    const avgDelta = recalibrated > 0 ? totalDelta / recalibrated : 0;

    // Record the run
    if (!dry_run) {
      await sb.from("confidence_recalibration_runs").insert({
        organization_id,
        run_type: "sprint207_full",
        entries_evaluated: entries.length,
        entries_recalibrated: recalibrated,
        entries_boosted: boosted,
        entries_degraded: degraded,
        avg_delta: Math.round(avgDelta * 10000) / 10000,
        max_delta: Math.round(maxDelta * 10000) / 10000,
        feedback_signals_used: (feedbackData || []).length,
        run_duration_ms: durationMs,
        summary: { details: recalibrationDetails.slice(0, 20) },
        triggered_by,
      });
    }

    return jsonResponse({
      run_type: dry_run ? "dry_run" : "recalibration",
      entries_evaluated: entries.length,
      entries_recalibrated: recalibrated,
      entries_boosted: boosted,
      entries_degraded: degraded,
      avg_delta: Math.round(avgDelta * 10000) / 10000,
      max_delta: Math.round(maxDelta * 10000) / 10000,
      feedback_signals_used: (feedbackData || []).length,
      duration_ms: durationMs,
      details: recalibrationDetails,
    }, 200, req);
  } catch (err: any) {
    console.error("[canon-confidence-recalibration] Error:", err);
    return errorResponse(err.message, 500, req);
  }
});
