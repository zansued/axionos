import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI, getAIConfig } from "../_shared/ai-client.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";

/**
 * Repo Trust Score & Pattern Weighting Engine — Sprint 180
 * Auth hardened — Sprint 196
 */

Deno.serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const authResult = await authenticateWithRateLimit(req, "repo-trust-score-engine");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient: supabase } = authResult;

    const body = await req.json();
    const { action, organization_id: payloadOrgId, ...params } = body;

    const { orgId: organization_id, error: orgError } = await resolveAndValidateOrg(supabase, user.id, payloadOrgId);
    if (orgError || !organization_id) return errorResponse(orgError || "Organization access denied", 403, req);

    await logSecurityAudit(supabase, {
      organization_id, actor_id: user.id,
      function_name: "repo-trust-score-engine", action: action || "unknown",
    });

    const config = getAIConfig();

    switch (action) {
      // ═══════════════════════════════════════════════════
      // 1. EVALUATE SOURCES — Compute trust scores for repos
      // ═══════════════════════════════════════════════════
      case "evaluate_sources": {
        const batchSize = params.batch_size || 20;

        const { data: sources, error: srcErr } = await supabase
          .from("canon_sources")
          .select("*")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: true })
          .limit(batchSize);

        if (srcErr) return errorResponse(srcErr.message, 500, req);
        if (!sources?.length) return jsonResponse({ evaluated: 0, message: "No sources to evaluate" }, 200, req);

        // Get existing trust profiles for context
        const { data: existingProfiles } = await supabase
          .from("canon_source_trust_profiles")
          .select("source_id, trust_score, trust_tier")
          .eq("organization_id", organization_id);

        // Get promotion stats per source
        const { data: candidates } = await supabase
          .from("learning_candidates")
          .select("source_type, status, evaluation_status")
          .eq("organization_id", organization_id);

        const evaluated: any[] = [];

        for (const source of sources) {
          // Compute trust factors
          const factors = computeTrustFactors(source, candidates || []);
          const trustScore = computeCompositeTrustScore(factors);
          const trustTier = getTrustTier(trustScore);

          // Count patterns from this source
          const sourceCandidates = (candidates || []).filter(
            (c: any) => c.source_type === source.source_type || c.source_type === source.source_name
          );
          const promoted = sourceCandidates.filter((c: any) => c.status === "promoted").length;
          const rejected = sourceCandidates.filter((c: any) => c.evaluation_status === "rejected").length;

          // Upsert repo trust score
          const { error: upsertErr } = await supabase
            .from("repo_trust_scores")
            .upsert({
              organization_id,
              source_id: source.id,
              source_name: source.source_name || "",
              source_url: source.source_url || "",
              trust_score: trustScore,
              trust_tier: trustTier,
              trust_factors: factors,
              patterns_extracted: sourceCandidates.length,
              patterns_promoted: promoted,
              patterns_rejected: rejected,
              promotion_success_rate: sourceCandidates.length > 0
                ? promoted / sourceCandidates.length
                : 0,
              last_evaluated_at: new Date().toISOString(),
              evaluated_by: "repo-trust-score-engine",
              evaluation_notes: `Evaluated ${Object.keys(factors).length} trust dimensions`,
              updated_at: new Date().toISOString(),
            }, { onConflict: "source_id" });

          if (!upsertErr) {
            evaluated.push({
              source_id: source.id,
              source_name: source.source_name,
              trust_score: trustScore,
              trust_tier: trustTier,
            });
          }
        }

        return jsonResponse({
          evaluated: evaluated.length,
          results: evaluated,
        }, 200, req);
      }

      // ═══════════════════════════════════════════════════
      // 2. WEIGHT PATTERNS — Compute weights for candidates
      // ═══════════════════════════════════════════════════
      case "weight_patterns": {
        const batchSize = params.batch_size || 50;

        const { data: candidates, error: candErr } = await supabase
          .from("learning_candidates")
          .select("*")
          .eq("organization_id", organization_id)
          .in("status", ["pending", "under_review", "approved"])
          .order("created_at", { ascending: true })
          .limit(batchSize);

        if (candErr) return errorResponse(candErr.message, 500, req);
        if (!candidates?.length) return jsonResponse({ weighted: 0 }, 200, req);

        // Get all trust scores for this org
        const { data: trustScores } = await supabase
          .from("repo_trust_scores")
          .select("*")
          .eq("organization_id", organization_id);

        const trustMap = new Map((trustScores || []).map((t: any) => [t.source_id, t]));

        const weighted: any[] = [];

        for (const candidate of candidates) {
          const weight = computePatternWeight(candidate, trustMap, candidates);

          await supabase.from("pattern_weight_factors").upsert({
            organization_id,
            target_type: "learning_candidate",
            target_id: candidate.id,
            pattern_weight: weight.pattern_weight,
            source_trust: weight.source_trust,
            source_support: weight.source_support,
            execution_reinforcement: weight.execution_reinforcement,
            recurrence_bonus: weight.recurrence_bonus,
            duplication_noise_penalty: weight.duplication_noise_penalty,
            weak_source_penalty: weight.weak_source_penalty,
            neural_feedback_bonus: weight.neural_feedback_bonus,
            distinct_source_count: weight.distinct_source_count,
            trusted_source_count: weight.trusted_source_count,
            source_refs: weight.source_refs,
            computation_notes: weight.notes,
            recalibration_count: 1,
            last_recalibrated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "target_type,target_id" });

          weighted.push({
            candidate_id: candidate.id,
            title: candidate.title,
            pattern_weight: weight.pattern_weight,
          });
        }

        return jsonResponse({ weighted: weighted.length, results: weighted }, 200, req);
      }

      // ═══════════════════════════════════════════════════
      // 3. RECALIBRATE CONFIDENCE — Adjust confidence scores
      // ═══════════════════════════════════════════════════
      case "recalibrate_confidence": {
        const batchSize = params.batch_size || 30;

        const { data: entries, error: entErr } = await supabase
          .from("canon_entries")
          .select("id, confidence_score, source_reference, canon_type")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false })
          .limit(batchSize);

        if (entErr) return errorResponse(entErr.message, 500, req);
        if (!entries?.length) return jsonResponse({ recalibrated: 0 }, 200, req);

        const { data: trustScores } = await supabase
          .from("repo_trust_scores")
          .select("*")
          .eq("organization_id", organization_id);

        const { data: weights } = await supabase
          .from("pattern_weight_factors")
          .select("*")
          .eq("organization_id", organization_id)
          .eq("target_type", "canon_entry");

        const weightMap = new Map((weights || []).map((w: any) => [w.target_id, w]));
        const recalibrated: any[] = [];

        for (const entry of entries) {
          const currentConf = entry.confidence_score || 0.5;
          const weightFactor = weightMap.get(entry.id);
          
          // Source trust contribution
          const avgTrust = trustScores?.length
            ? (trustScores as any[]).reduce((s: number, t: any) => s + Number(t.trust_score), 0) / trustScores.length
            : 0.5;

          // Weighted recalibration
          const sourceWeight = weightFactor ? Number(weightFactor.source_trust) : avgTrust;
          const executionBoost = weightFactor ? Number(weightFactor.execution_reinforcement) * 0.1 : 0;
          const recurrenceBoost = weightFactor ? Number(weightFactor.recurrence_bonus) * 0.05 : 0;

          const newConfidence = Math.min(1.0, Math.max(0.0,
            currentConf * 0.6 + sourceWeight * 0.25 + executionBoost + recurrenceBoost
          ));

          // Only log if meaningful change
          if (Math.abs(newConfidence - currentConf) > 0.01) {
            await supabase.from("confidence_recalibration_log").insert({
              organization_id,
              target_type: "canon_entry",
              target_id: entry.id,
              previous_confidence: currentConf,
              new_confidence: newConfidence,
              recalibration_reason: "Source trust and execution evidence recalibration",
              factors: {
                source_weight: sourceWeight,
                execution_boost: executionBoost,
                recurrence_boost: recurrenceBoost,
                original: currentConf,
              },
              recalibrated_by: "repo-trust-score-engine",
            });

            recalibrated.push({
              entry_id: entry.id,
              previous: currentConf,
              new: newConfidence,
            });
          }
        }

        return jsonResponse({ recalibrated: recalibrated.length, results: recalibrated }, 200, req);
      }

      // ═══════════════════════════════════════════════════
      // 4. GET TRUST DASHBOARD — Aggregated view
      // ═══════════════════════════════════════════════════
      case "get_trust_dashboard": {
        const [trustRes, weightRes, recalRes] = await Promise.all([
          supabase
            .from("repo_trust_scores")
            .select("*")
            .eq("organization_id", organization_id)
            .order("trust_score", { ascending: false }),
          supabase
            .from("pattern_weight_factors")
            .select("*")
            .eq("organization_id", organization_id)
            .order("pattern_weight", { ascending: false })
            .limit(20),
          supabase
            .from("confidence_recalibration_log")
            .select("*")
            .eq("organization_id", organization_id)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

        const trustScores = trustRes.data || [];
        const topWeighted = weightRes.data || [];
        const recentRecalibrations = recalRes.data || [];

        // Tier distribution
        const tierDist: Record<string, number> = {};
        for (const t of trustScores) {
          tierDist[t.trust_tier] = (tierDist[t.trust_tier] || 0) + 1;
        }

        return jsonResponse({
          total_sources: trustScores.length,
          tier_distribution: tierDist,
          top_trusted: trustScores.slice(0, 5),
          low_trust: trustScores.filter((t: any) => Number(t.trust_score) < 0.3).slice(0, 5),
          top_weighted_patterns: topWeighted,
          recent_recalibrations: recentRecalibrations,
          avg_trust_score: trustScores.length
            ? (trustScores.reduce((s: number, t: any) => s + Number(t.trust_score), 0) / trustScores.length).toFixed(3)
            : 0,
        }, req);
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400, req);
    }
  } catch (err: any) {
    console.error("repo-trust-score-engine error:", err);
    return errorResponse(err.message || "Internal error", 500, req);
  }
});

// ═══════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════

function computeTrustFactors(source: any, candidates: any[]): Record<string, number> {
  const factors: Record<string, number> = {};

  // Activity recency (based on last_synced_at)
  if (source.last_synced_at) {
    const daysSince = (Date.now() - new Date(source.last_synced_at).getTime()) / (1000 * 60 * 60 * 24);
    factors.activity_recency = daysSince < 7 ? 1.0 : daysSince < 30 ? 0.7 : daysSince < 90 ? 0.4 : 0.2;
  } else {
    factors.activity_recency = 0.3;
  }

  // Structural clarity (based on source metadata)
  factors.structural_clarity = source.source_notes?.length > 50 ? 0.8 : 0.4;

  // Source type quality
  const typeScores: Record<string, number> = {
    repository: 0.8, documentation: 0.9, framework: 0.85, internal: 0.7,
    community: 0.5, experimental: 0.3,
  };
  factors.source_type_quality = typeScores[source.source_type] || 0.5;

  // Trust level from source
  const trustLevels: Record<string, number> = {
    high: 0.9, medium: 0.6, low: 0.3, untrusted: 0.1,
  };
  factors.configured_trust = trustLevels[source.trust_level] || 0.5;

  // Documentation quality (heuristic from notes/categories)
  factors.documentation_quality = (source.approved_categories?.length > 0) ? 0.7 : 0.4;

  // Domain scope breadth
  factors.domain_scope = source.domain_scope === "broad" ? 0.6 : source.domain_scope === "specific" ? 0.8 : 0.5;

  // Ingestion health
  factors.ingestion_health = source.ingestion_lifecycle_state === "active" ? 0.9
    : source.ingestion_lifecycle_state === "paused" ? 0.5 : 0.3;

  // Historical promotion success
  const sourceCandidates = candidates.filter(
    (c: any) => c.source_type === source.source_type || c.source_type === source.source_name
  );
  const promoted = sourceCandidates.filter((c: any) => c.status === "promoted").length;
  factors.historical_promotion_success = sourceCandidates.length > 0
    ? promoted / sourceCandidates.length
    : 0.5;

  // Maintenance signals
  factors.maintenance_signals = source.sync_policy === "auto" ? 0.8
    : source.sync_policy === "manual" ? 0.5 : 0.4;

  // Pattern quality (avg confidence of candidates from this source)
  const avgConf = sourceCandidates.length > 0
    ? sourceCandidates.reduce((s: number, c: any) => s + (c.confidence_score || 0), 0) / sourceCandidates.length
    : 0.5;
  factors.pattern_quality = avgConf;

  return factors;
}

function computeCompositeTrustScore(factors: Record<string, number>): number {
  const weights: Record<string, number> = {
    activity_recency: 0.10,
    structural_clarity: 0.08,
    source_type_quality: 0.10,
    configured_trust: 0.15,
    documentation_quality: 0.08,
    domain_scope: 0.05,
    ingestion_health: 0.09,
    historical_promotion_success: 0.20,
    maintenance_signals: 0.05,
    pattern_quality: 0.10,
  };

  let score = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (factors[key] !== undefined) {
      score += factors[key] * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? Math.round((score / totalWeight) * 1000) / 1000 : 0.5;
}

function getTrustTier(score: number): string {
  if (score >= 0.8) return "high";
  if (score >= 0.6) return "medium";
  if (score >= 0.4) return "low";
  return "untrusted";
}

function computePatternWeight(
  candidate: any,
  trustMap: Map<string, any>,
  allCandidates: any[]
): any {
  // Find source trust
  let sourceTrust = 0.5;
  let trustedSourceCount = 0;
  const sourceRefs: any[] = [];

  // Check trust from source domains
  const domains = candidate.source_domains || [];
  for (const [, trust] of trustMap) {
    if (trust.source_name && domains.includes?.(trust.source_name)) {
      sourceTrust = Math.max(sourceTrust, Number(trust.trust_score));
      if (Number(trust.trust_score) >= 0.6) trustedSourceCount++;
      sourceRefs.push({ source: trust.source_name, trust: trust.trust_score });
    }
  }

  // Recurrence: how many similar candidates exist
  const similar = allCandidates.filter(
    (c: any) => c.id !== candidate.id && c.pattern_signature === candidate.pattern_signature
  );
  const recurrenceBonus = Math.min(0.3, similar.length * 0.05);

  // Execution reinforcement from evidence count
  const evidenceCount = candidate.evidence_count || 0;
  const executionReinforcement = Math.min(0.3, evidenceCount * 0.02);

  // Duplication noise
  const duplicationNoise = similar.length > 5 ? 0.1 : 0;

  // Weak source penalty
  const weakSourcePenalty = sourceTrust < 0.3 ? 0.15 : sourceTrust < 0.5 ? 0.05 : 0;

  // Neural feedback bonus (from signal count)
  const signalCount = candidate.signal_count || 0;
  const neuralFeedbackBonus = Math.min(0.2, signalCount * 0.01);

  // Composite weight
  const patternWeight = Math.min(1.0, Math.max(0.0,
    (sourceTrust * 0.35)
    + (executionReinforcement)
    + (recurrenceBonus)
    + (neuralFeedbackBonus)
    - (duplicationNoise)
    - (weakSourcePenalty)
  ));

  return {
    pattern_weight: Math.round(patternWeight * 1000) / 1000,
    source_trust: sourceTrust,
    source_support: domains?.length || 1,
    execution_reinforcement: executionReinforcement,
    recurrence_bonus: recurrenceBonus,
    duplication_noise_penalty: duplicationNoise,
    weak_source_penalty: weakSourcePenalty,
    neural_feedback_bonus: neuralFeedbackBonus,
    distinct_source_count: domains?.length || 1,
    trusted_source_count: trustedSourceCount,
    source_refs: sourceRefs,
    notes: `Weight computed from ${Object.keys({ sourceTrust, executionReinforcement, recurrenceBonus }).length} factors`,
  };
}
