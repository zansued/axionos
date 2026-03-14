import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI, getAIConfig } from "../_shared/ai-client.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";

/**
 * Canon Evolution Engine — Sprint 202 (Review Consolidation)
 *
 * Post-canon maintenance engine. Does NOT review or promote raw candidates.
 * Candidate review authority belongs exclusively to canon-review-engine.
 *
 * Responsibilities:
 *   - deduplicate_candidates: merge duplicate candidates (utility, no review decisions)
 *   - reinforce_from_signals: boost confidence of canon entries from operational signals
 *   - run_full_pipeline: orchestrates review (via canon-review-engine) + dedup + reinforce
 *   - process_backlog: multi-round orchestration of review + dedup + promote + reinforce
 *   - get_pipeline_status: read-only pipeline health
 *
 * Removed in Sprint 202:
 *   - evaluate_candidates → consolidated into canon-review-engine
 *   - promote_candidates → consolidated into canon-review-engine
 */

Deno.serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const authResult = await authenticateWithRateLimit(req, "canon-evolution-engine");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient: supabase } = authResult;

    const body = await req.json();
    const { action, organization_id: payloadOrgId, ...params } = body;

    const { orgId: organization_id, error: orgError } = await resolveAndValidateOrg(supabase, user.id, payloadOrgId);
    if (orgError || !organization_id) return errorResponse(orgError || "Organization access denied", 403, req);

    await logSecurityAudit(supabase, {
      organization_id, actor_id: user.id,
      function_name: "canon-evolution-engine", action: action || "unknown",
    });

    const config = getAIConfig();

    switch (action) {
      // ═══════════════════════════════════════════════════
      // REMOVED — Sprint 202: Review authority consolidated
      // ═══════════════════════════════════════════════════
      case "evaluate_candidates":
      case "promote_candidates": {
        return jsonResponse({
          error: "deprecated",
          message: `Action "${action}" has been consolidated into canon-review-engine as of Sprint 202. Use canon-review-engine for candidate review and promotion.`,
          migration: {
            evaluate_candidates: "canon-review-engine → review_candidates",
            promote_candidates: "canon-review-engine → promote_approved",
          },
        }, 410, req);
      }

      // ═══════════════════════════════════════════════════
      // DEDUPLICATE — Find and merge similar candidates (utility only)
      // Does NOT make review decisions. Only marks duplicates.
      // ═══════════════════════════════════════════════════
      case "deduplicate_candidates": {
        const { data: candidates, error: fetchErr } = await supabase
          .from("canon_candidate_entries")
          .select("id, title, summary, knowledge_type, domain_scope, evaluation_score, internal_validation_status, source_reliability_score, merge_group_key")
          .eq("organization_id", organization_id)
          .in("internal_validation_status", ["approved", "needs_review", "pending"])
          .is("merged_with_id", null)
          .order("evaluation_score", { ascending: false })
          .limit(200);

        if (fetchErr) throw fetchErr;
        if (!candidates?.length) {
          return jsonResponse({ merged: 0, message: "No candidates to deduplicate" }, 200, req);
        }

        const { data: existingEntries } = await supabase
          .from("canon_entries")
          .select("id, title, summary")
          .eq("organization_id", organization_id)
          .limit(500);

        const existingTitles = (existingEntries || []).map((e: any) => e.title.toLowerCase());

        const mergeActions: any[] = [];
        const processed = new Set<string>();

        for (let i = 0; i < candidates.length; i++) {
          const c1 = candidates[i];
          if (processed.has(c1.id)) continue;

          const isDuplicateOfCanon = existingTitles.some((t: string) =>
            levenshteinSimilarity(t, c1.title.toLowerCase()) > 0.75
          );

          if (isDuplicateOfCanon) {
            await supabase.from("canon_candidate_entries").update({
              duplication_score: 1.0,
              internal_validation_status: "rejected",
              promotion_status: "rejected",
              promotion_decision_reason: "[Dedup/Sprint202] Duplicate of existing canon entry",
              reviewed_by: "canon-evolution-engine/dedup",
              updated_at: new Date().toISOString(),
            }).eq("id", c1.id);
            processed.add(c1.id);
            mergeActions.push({ action: "rejected_as_canon_duplicate", id: c1.id, title: c1.title });
            continue;
          }

          for (let j = i + 1; j < candidates.length; j++) {
            const c2 = candidates[j];
            if (processed.has(c2.id)) continue;

            const titleSim = levenshteinSimilarity(c1.title.toLowerCase(), c2.title.toLowerCase());
            const summarySim = c1.summary && c2.summary
              ? levenshteinSimilarity(c1.summary.toLowerCase().slice(0, 200), c2.summary.toLowerCase().slice(0, 200))
              : 0;
            const domainMatch = c1.domain_scope === c2.domain_scope ? 0.15 : 0;
            const typeMatch = c1.knowledge_type === c2.knowledge_type ? 0.1 : 0;

            const dupScore = titleSim * 0.5 + summarySim * 0.25 + domainMatch + typeMatch;

            if (dupScore > 0.7) {
              const keepId = (c1.evaluation_score || 0) >= (c2.evaluation_score || 0) ? c1.id : c2.id;
              const mergeId = keepId === c1.id ? c2.id : c1.id;
              const keepCandidate = keepId === c1.id ? c1 : c2;

              await supabase.from("canon_candidate_entries").update({
                merged_with_id: keepId,
                duplication_score: dupScore,
                internal_validation_status: "rejected",
                promotion_status: "rejected",
                promotion_decision_reason: `[Dedup/Sprint202] Merged with ${keepId} (similarity: ${(dupScore * 100).toFixed(0)}%)`,
                reviewed_by: "canon-evolution-engine/dedup",
                updated_at: new Date().toISOString(),
              }).eq("id", mergeId);

              const newReliability = Math.min(
                (keepCandidate.source_reliability_score || 50) + 5,
                100
              );
              await supabase.from("canon_candidate_entries").update({
                source_reliability_score: newReliability,
                merge_group_key: keepId,
                updated_at: new Date().toISOString(),
              }).eq("id", keepId);

              processed.add(mergeId);
              mergeActions.push({
                action: "merged",
                kept: keepId,
                merged: mergeId,
                similarity: dupScore,
              });
            }
          }
        }

        return jsonResponse({
          merged: mergeActions.filter(a => a.action === "merged").length,
          canon_duplicates: mergeActions.filter(a => a.action === "rejected_as_canon_duplicate").length,
          details: mergeActions,
        }, 200, req);
      }

      // ═══════════════════════════════════════════════════
      // REINFORCE — Boost confidence from operational signals (post-canon)
      // ═══════════════════════════════════════════════════
      case "reinforce_from_signals": {
        const { data: signals } = await supabase
          .from("learning_signals")
          .select("*")
          .eq("organization_id", organization_id)
          .in("signal_type", ["canon_success", "pattern_applied", "high_value_pattern"])
          .order("created_at", { ascending: false })
          .limit(200);

        if (!signals?.length) {
          return jsonResponse({ reinforced: 0, message: "No reinforcement signals found" }, 200, req);
        }

        let reinforced = 0;
        for (const signal of signals) {
          const entryId = signal.metadata?.canon_entry_id || signal.metadata?.pattern_id;
          if (!entryId) continue;

          const { data: entry } = await supabase
            .from("canon_entries")
            .select("id, confidence_score")
            .eq("id", entryId)
            .eq("organization_id", organization_id)
            .single();

          if (entry) {
            const newScore = Math.min((entry.confidence_score || 0) + 0.02, 1.0);
            await supabase.from("canon_entries").update({
              confidence_score: newScore,
              updated_at: new Date().toISOString(),
            }).eq("id", entry.id);
            reinforced++;
          }
        }

        return jsonResponse({ reinforced, signals_processed: signals.length }, 200, req);
      }

      // ═══════════════════════════════════════════════════
      // FULL PIPELINE — Delegates review to canon-review-engine
      // Then runs dedup + reinforce locally
      // ═══════════════════════════════════════════════════
      case "run_full_pipeline": {
        const baseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const invokeReview = async (a: string) => {
          const resp = await fetch(`${baseUrl}/functions/v1/canon-review-engine`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ action: a, organization_id }),
          });
          return resp.json();
        };

        const invokeLocal = async (a: string) => {
          const resp = await fetch(`${baseUrl}/functions/v1/canon-evolution-engine`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ action: a, organization_id }),
          });
          return resp.json();
        };

        // Step 1: Review via canon-review-engine (single authority)
        const reviewResult = await invokeReview("review_candidates");
        // Step 2: Dedup locally
        const dedupResult = await invokeLocal("deduplicate_candidates");
        // Step 3: Promote via canon-review-engine (single authority)
        const promoteResult = await invokeReview("promote_approved");
        // Step 4: Reinforce locally
        const reinforceResult = await invokeLocal("reinforce_from_signals");

        return jsonResponse({
          pipeline: "complete",
          review_engine: "canon-review-engine",
          review: reviewResult,
          deduplication: dedupResult,
          promotion: promoteResult,
          reinforcement: reinforceResult,
        }, 200, req);
      }

      // ═══════════════════════════════════════════════════
      // PROCESS BACKLOG — Multi-round, delegates review to canon-review-engine
      // ═══════════════════════════════════════════════════
      case "process_backlog": {
        const baseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const invokeEngine = async (engine: string, a: string, extra: Record<string, any> = {}) => {
          const resp = await fetch(`${baseUrl}/functions/v1/${engine}`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ action: a, organization_id, ...extra }),
          });
          return resp.json();
        };

        // Multi-round review via canon-review-engine
        const reviewResults: any[] = [];
        let totalReviewed = 0;
        for (let round = 0; round < 5; round++) {
          const result = await invokeEngine("canon-review-engine", "review_candidates");
          reviewResults.push(result);
          totalReviewed += result.reviewed || 0;
          if ((result.reviewed || 0) < 20) break;
        }

        // Dedup locally
        const dedupResult = await invokeEngine("canon-evolution-engine", "deduplicate_candidates");
        // Promote via canon-review-engine
        const promoteResult = await invokeEngine("canon-review-engine", "promote_approved");
        // Reinforce locally
        const reinforceResult = await invokeEngine("canon-evolution-engine", "reinforce_from_signals");
        // Status
        const statusResult = await invokeEngine("canon-evolution-engine", "get_pipeline_status");

        return jsonResponse({
          pipeline: "backlog_processed",
          review_engine: "canon-review-engine",
          total_reviewed: totalReviewed,
          review_rounds: reviewResults.length,
          deduplication: dedupResult,
          promotion: promoteResult,
          reinforcement: reinforceResult,
          final_status: statusResult,
        }, 200, req);
      }

      // ═══════════════════════════════════════════════════
      // PIPELINE STATUS (read-only)
      // ═══════════════════════════════════════════════════
      case "get_pipeline_status": {
        const [candidates, entries] = await Promise.all([
          supabase.from("canon_candidate_entries")
            .select("id, internal_validation_status, promotion_status")
            .eq("organization_id", organization_id),
          supabase.from("canon_entries")
            .select("id, lifecycle_status, approval_status, confidence_score")
            .eq("organization_id", organization_id),
        ]);

        const candData = candidates.data || [];
        const entryData = entries.data || [];

        return jsonResponse({
          review_authority: "canon-review-engine",
          candidates: {
            total: candData.length,
            pending_review: candData.filter((c: any) => c.internal_validation_status === "pending" && c.promotion_status === "pending").length,
            approved: candData.filter((c: any) => c.internal_validation_status === "approved" && c.promotion_status === "pending").length,
            needs_human_review: candData.filter((c: any) => c.internal_validation_status === "needs_review").length,
            rejected: candData.filter((c: any) => c.promotion_status === "rejected").length,
            promoted: candData.filter((c: any) => c.promotion_status === "promoted").length,
          },
          canon_entries: {
            total: entryData.length,
            active: entryData.filter((e: any) => e.lifecycle_status === "active").length,
            approved: entryData.filter((e: any) => e.approval_status === "approved").length,
            retrievable: entryData.filter((e: any) =>
              e.lifecycle_status === "active" && e.approval_status === "approved"
            ).length,
            avg_confidence: entryData.length > 0
              ? Number((entryData.reduce((sum: number, e: any) => sum + (e.confidence_score || 0), 0) / entryData.length).toFixed(2))
              : 0,
          },
        }, 200, req);
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400, req);
    }
  } catch (err: any) {
    console.error("canon-evolution-engine error:", err);
    return errorResponse(err.message || "Internal error", 500, req);
  }
});

// ── Utilities ──

function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen > 200) {
    const words1 = new Set(a.split(/\s+/));
    const words2 = new Set(b.split(/\s+/));
    let overlap = 0;
    for (const w of words1) if (words2.has(w)) overlap++;
    return overlap / Math.max(words1.size, words2.size);
  }
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) matrix[i][j] = j;
      else {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
      }
    }
  }
  return 1 - matrix[a.length][b.length] / maxLen;
}
