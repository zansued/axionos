import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI, getAIConfig } from "../_shared/ai-client.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";

/**
 * Canon Evolution Engine — Sprint 171 (Auth hardened Sprint 197)
 *
 * Complete institutional knowledge metabolism pipeline:
 *   source → candidate → evaluation → dedup → promotion → canon_entry → retrievable
 */

Deno.serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    // Auth hardening — Sprint 197
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

    const config = getAIConfig();

    switch (action) {
      // ═══════════════════════════════════════════════════
      // 1. EVALUATE — Score candidates with AI
      // ═══════════════════════════════════════════════════
      case "evaluate_candidates": {
        const batchSize = params.batch_size || 20;
        
        const { data: candidates, error: fetchErr } = await supabase
          .from("canon_candidate_entries")
          .select("*")
          .eq("organization_id", organization_id)
          .eq("evaluation_status", "pending")
          .eq("internal_validation_status", "pending")
          .is("merged_with_id", null)
          .order("created_at", { ascending: true })
          .limit(batchSize);

        if (fetchErr) throw fetchErr;
        if (!candidates?.length) {
          return jsonResponse({ evaluated: 0, message: "No pending candidates" }, 200, req);
        }

        // Fetch existing canon for dedup context
        const { data: existingEntries } = await supabase
          .from("canon_entries")
          .select("id, title, summary, practice_type, stack_scope, topic")
          .eq("organization_id", organization_id)
          .neq("lifecycle_status", "deprecated")
          .limit(500);

        const existingContext = (existingEntries || [])
          .map((e: any) => `• ${e.title} (${e.practice_type}, ${e.stack_scope})`)
          .slice(0, 40)
          .join("\n");

        const results: any[] = [];

        // Process in AI batches of 5
        for (let i = 0; i < candidates.length; i += 5) {
          const batch = candidates.slice(i, i + 5);

          const candidateDescriptions = batch.map((c: any, idx: number) =>
            `[${idx + 1}] Title: "${c.title}"
    Type: ${c.knowledge_type}
    Domain: ${c.domain_scope}
    Summary: ${c.summary?.slice(0, 300)}
    Source Reliability: ${c.source_reliability_score}/100`
          ).join("\n\n");

          try {
            const aiResult = await callAI(
              config.key,
              `You are the Canon Evolution Engine for AxionOS — an institutional knowledge quality evaluator.

Evaluate each candidate on 5 dimensions (0-100):
1. QUALITY: Is the pattern clearly defined, actionable, and reusable?
2. NOVELTY: Does it add new knowledge not in the existing canon?
3. RELEVANCE: Is it useful for software engineering teams?
4. CLARITY: Is the description clear enough to be applied?
5. DOMAIN_FIT: Does it fit a clear engineering domain (frontend, backend, architecture, etc.)?

Compute an overall evaluation_score = weighted average (Quality 30%, Novelty 25%, Relevance 20%, Clarity 15%, Domain Fit 10%).

Determine evaluation_status:
- "ready_to_promote" — score >= 65, no dedup concern
- "needs_human_review" — score 45-64, or uncertain novelty
- "rejected" — score < 45, duplicate, irrelevant, or too vague

Also classify:
- pattern_classification: one of [best_practice, anti_pattern, implementation_recipe, architecture_pattern, convention, template, methodology, operational_guideline]
- domain_classification: one of [frontend, backend, fullstack, architecture, devops, testing, security, data, general]

Return ONLY valid JSON:
{"evaluations": [{"index": 1, "quality": N, "novelty": N, "relevance": N, "clarity": N, "domain_fit": N, "evaluation_score": N, "evaluation_status": "...", "pattern_classification": "...", "domain_classification": "...", "notes": "brief explanation"}]}`,
              `Evaluate these candidates:\n\n${candidateDescriptions}\n\n${existingContext ? `Existing canon entries (check novelty):\n${existingContext}` : "No existing canon entries yet."}`,
              true,
              2,
              false,
              "canon_evolution_evaluation",
              organization_id,
            );

            let evaluations: any[] = [];
            try {
              const parsed = JSON.parse(aiResult.content);
              evaluations = parsed.evaluations || [];
            } catch {
              console.error("Failed to parse AI evaluation response");
              continue;
            }

            for (const ev of evaluations) {
              const candidate = batch[(ev.index || 1) - 1];
              if (!candidate) continue;

              const evalScore = ev.evaluation_score || 0;
              const evalStatus = ev.evaluation_status || "needs_human_review";

              const updates: Record<string, unknown> = {
                evaluation_score: evalScore,
                evaluation_notes: ev.notes || "",
                evaluation_status: evalStatus,
                pattern_classification: ev.pattern_classification || "",
                domain_classification: ev.domain_classification || "",
                updated_at: new Date().toISOString(),
              };

              // Map evaluation_status to internal_validation_status
              if (evalStatus === "ready_to_promote") {
                updates.internal_validation_status = "approved";
              } else if (evalStatus === "rejected") {
                updates.internal_validation_status = "rejected";
                updates.promotion_status = "rejected";
                updates.promotion_decision_reason = `[Evolution Engine] ${ev.notes}`;
              } else {
                updates.internal_validation_status = "needs_review";
                updates.promotion_decision_reason = `[Needs Review] Score: ${evalScore}. ${ev.notes}`;
              }

              await supabase.from("canon_candidate_entries")
                .update(updates)
                .eq("id", candidate.id)
                .eq("organization_id", organization_id);

              results.push({
                id: candidate.id,
                title: candidate.title,
                evaluation_score: evalScore,
                evaluation_status: evalStatus,
                pattern_classification: ev.pattern_classification,
                domain_classification: ev.domain_classification,
              });
            }
          } catch (aiErr: any) {
            console.error("AI evaluation batch failed:", aiErr.message);
            continue;
          }
        }

        return jsonResponse({
          evaluated: results.length,
          ready_to_promote: results.filter(r => r.evaluation_status === "ready_to_promote").length,
          needs_human_review: results.filter(r => r.evaluation_status === "needs_human_review").length,
          rejected: results.filter(r => r.evaluation_status === "rejected").length,
          details: results,
        }, 200, req);
      }

      // ═══════════════════════════════════════════════════
      // 2. DEDUPLICATE — Find and merge similar candidates
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

        // Also check against existing canon entries
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

          // Check against existing canon entries first
          const isDuplicateOfCanon = existingTitles.some((t: string) =>
            levenshteinSimilarity(t, c1.title.toLowerCase()) > 0.75
          );

          if (isDuplicateOfCanon) {
            await supabase.from("canon_candidate_entries").update({
              duplication_score: 1.0,
              evaluation_status: "rejected",
              internal_validation_status: "rejected",
              promotion_status: "rejected",
              promotion_decision_reason: "[Dedup] Duplicate of existing canon entry",
              updated_at: new Date().toISOString(),
            }).eq("id", c1.id);
            processed.add(c1.id);
            mergeActions.push({ action: "rejected_as_canon_duplicate", id: c1.id, title: c1.title });
            continue;
          }

          // Find similar candidates
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
              // Keep the one with higher score, merge the other
              const keepId = (c1.evaluation_score || 0) >= (c2.evaluation_score || 0) ? c1.id : c2.id;
              const mergeId = keepId === c1.id ? c2.id : c1.id;
              const keepCandidate = keepId === c1.id ? c1 : c2;

              await supabase.from("canon_candidate_entries").update({
                merged_with_id: keepId,
                duplication_score: dupScore,
                evaluation_status: "merged",
                internal_validation_status: "rejected",
                promotion_status: "rejected",
                promotion_decision_reason: `[Dedup] Merged with ${keepId} (similarity: ${(dupScore * 100).toFixed(0)}%)`,
                updated_at: new Date().toISOString(),
              }).eq("id", mergeId);

              // Boost the keeper's confidence
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
      // 3. PROMOTE — Approved candidates → canon_entries
      // ═══════════════════════════════════════════════════
      case "promote_candidates": {
        const { data: approved, error: aErr } = await supabase
          .from("canon_candidate_entries")
          .select("*")
          .eq("organization_id", organization_id)
          .eq("internal_validation_status", "approved")
          .eq("promotion_status", "pending")
          .is("merged_with_id", null)
          .order("evaluation_score", { ascending: false })
          .limit(50);

        if (aErr) throw aErr;
        if (!approved?.length) {
          return jsonResponse({ promoted: 0, message: "No approved candidates to promote" }, 200, req);
        }

        let promoted = 0;
        const promotedEntries: any[] = [];

        for (const candidate of approved) {
          try {
            const slug = candidate.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")
              .slice(0, 80);

            const canonEntry = {
              organization_id,
              title: candidate.title,
              slug: `${slug}-${Date.now()}-${promoted}`,
              canon_type: mapKnowledgeType(candidate.knowledge_type),
              practice_type: candidate.pattern_classification || candidate.knowledge_type || "pattern",
              lifecycle_status: "approved",
              approval_status: "approved",
              confidence_score: Math.min((candidate.evaluation_score || candidate.source_reliability_score || 50) / 100, 1),
              summary: candidate.summary || "",
              body: candidate.body || "",
              implementation_guidance: "",
              stack_scope: candidate.domain_classification || candidate.domain_scope || "general",
              layer_scope: "general",
              problem_scope: "general",
              topic: candidate.domain_classification || candidate.domain_scope || "general",
              subtopic: candidate.knowledge_type || "pattern",
              tags: [],
              source_reference: candidate.source_reference || "",
              source_type: candidate.source_type || "external_documentation",
              source_candidate_id: candidate.id,
              approved_by: "canon-evolution-engine",
              created_by: candidate.submitted_by || "canon-evolution-engine",
              metadata: {
                evaluation_score: candidate.evaluation_score,
                evaluation_notes: candidate.evaluation_notes,
                pattern_classification: candidate.pattern_classification,
                domain_classification: candidate.domain_classification,
                promoted_by: "canon-evolution-engine",
                promoted_at: new Date().toISOString(),
              },
              structured_guidance: {},
            };

            const { data: entry, error: insertErr } = await supabase
              .from("canon_entries")
              .insert(canonEntry)
              .select()
              .single();

            if (insertErr) {
              console.error("Canon entry insert error:", insertErr.message);
              continue;
            }

            // Update candidate status
            await supabase.from("canon_candidate_entries").update({
              promotion_status: "promoted",
              promoted_entry_id: entry.id,
              promoted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq("id", candidate.id);

            // Create version record
            try {
              await supabase.from("canon_entry_versions").insert({
                entry_id: entry.id,
                organization_id,
                version_number: 1,
                title: entry.title,
                summary: entry.summary,
                body: entry.body,
                implementation_guidance: "",
                change_description: "Promoted from candidate by Canon Evolution Engine",
                changed_by: "canon-evolution-engine",
              });
            } catch (_) {}

            // Create audit trail
            try {
              await supabase.from("canon_entry_status_history").insert({
                entry_id: entry.id,
                organization_id,
                from_status: "none",
                to_status: "approved",
                reason: `Auto-promoted by Canon Evolution Engine. Evaluation score: ${candidate.evaluation_score || 'N/A'}. ${candidate.evaluation_notes || ''}`,
                changed_by: "canon-evolution-engine",
              });
            } catch (_) {}

            // Update source lifecycle if linked
            if (candidate.source_id) {
              try {
                await supabase.from("canon_sources").update({
                  ingestion_lifecycle_state: "canon_promoted",
                  updated_at: new Date().toISOString(),
                }).eq("id", candidate.source_id);
              } catch (_) {}
            }

            promoted++;
            promotedEntries.push({
              id: entry.id,
              title: entry.title,
              evaluation_score: candidate.evaluation_score,
              pattern_classification: candidate.pattern_classification,
              domain_classification: candidate.domain_classification,
            });
          } catch (e: any) {
            console.error("Promote error for", candidate.id, e.message);
          }
        }

        return jsonResponse({
          promoted,
          total_eligible: approved.length,
          entries: promotedEntries,
        }, 200, req);
      }

      // ═══════════════════════════════════════════════════
      // 4. REINFORCE — Boost confidence from operational signals
      // ═══════════════════════════════════════════════════
      case "reinforce_from_signals": {
        // Find canon entries that appear in successful execution signals
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
      // 5. FULL PIPELINE — Evaluate → Dedup → Promote
      // ═══════════════════════════════════════════════════
      case "run_full_pipeline": {
        const baseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const invoke = async (a: string) => {
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

        const evalResult = await invoke("evaluate_candidates");
        const dedupResult = await invoke("deduplicate_candidates");
        const promoteResult = await invoke("promote_candidates");
        const reinforceResult = await invoke("reinforce_from_signals");

        return jsonResponse({
          pipeline: "complete",
          evaluation: evalResult,
          deduplication: dedupResult,
          promotion: promoteResult,
          reinforcement: reinforceResult,
        }, 200, req);
      }

      // ═══════════════════════════════════════════════════
      // 6. PROCESS BACKLOG — All pending, multiple rounds
      // ═══════════════════════════════════════════════════
      case "process_backlog": {
        const baseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const invoke = async (a: string, extra: Record<string, any> = {}) => {
          const resp = await fetch(`${baseUrl}/functions/v1/canon-evolution-engine`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ action: a, organization_id, ...extra }),
          });
          return resp.json();
        };

        // Run evaluation in multiple rounds to process full backlog
        const evalResults: any[] = [];
        let totalEvaluated = 0;
        for (let round = 0; round < 5; round++) {
          const result = await invoke("evaluate_candidates", { batch_size: 20 });
          evalResults.push(result);
          totalEvaluated += result.evaluated || 0;
          if ((result.evaluated || 0) < 20) break; // No more pending
        }

        const dedupResult = await invoke("deduplicate_candidates");
        const promoteResult = await invoke("promote_candidates");
        const reinforceResult = await invoke("reinforce_from_signals");

        // Get final status
        const statusResult = await invoke("get_pipeline_status");

        return jsonResponse({
          pipeline: "backlog_processed",
          total_evaluated: totalEvaluated,
          evaluation_rounds: evalResults.length,
          deduplication: dedupResult,
          promotion: promoteResult,
          reinforcement: reinforceResult,
          final_status: statusResult,
        }, 200, req);
      }

      // ═══════════════════════════════════════════════════
      // 7. PIPELINE STATUS
      // ═══════════════════════════════════════════════════
      case "get_pipeline_status": {
        const [candidates, entries] = await Promise.all([
          supabase.from("canon_candidate_entries")
            .select("id, internal_validation_status, promotion_status, evaluation_status, evaluation_score")
            .eq("organization_id", organization_id),
          supabase.from("canon_entries")
            .select("id, lifecycle_status, approval_status, confidence_score")
            .eq("organization_id", organization_id),
        ]);

        const candData = candidates.data || [];
        const entryData = entries.data || [];

        return jsonResponse({
          candidates: {
            total: candData.length,
            pending: candData.filter((c: any) => c.evaluation_status === "pending").length,
            evaluated: candData.filter((c: any) => c.evaluation_status !== "pending").length,
            ready_to_promote: candData.filter((c: any) => c.evaluation_status === "ready_to_promote" && c.promotion_status === "pending").length,
            needs_human_review: candData.filter((c: any) => c.evaluation_status === "needs_human_review").length,
            rejected: candData.filter((c: any) => c.promotion_status === "rejected").length,
            merged: candData.filter((c: any) => c.evaluation_status === "merged").length,
            promoted: candData.filter((c: any) => c.promotion_status === "promoted").length,
            avg_evaluation_score: candData.length > 0
              ? Math.round(candData.reduce((sum: number, c: any) => sum + (c.evaluation_score || 0), 0) / candData.length)
              : 0,
          },
          canon_entries: {
            total: entryData.length,
            active: entryData.filter((e: any) => e.lifecycle_status === "active").length,
            approved: entryData.filter((e: any) => e.approval_status === "approved").length,
            retrievable: entryData.filter((e: any) =>
              (e.lifecycle_status === "active" || e.lifecycle_status === "approved") &&
              e.approval_status === "approved"
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

function mapKnowledgeType(kt: string): string {
  // Valid enum: pattern, template, anti_pattern, architectural_guideline, implementation_recipe, failure_memory, external_knowledge
  const map: Record<string, string> = {
    pattern: "pattern",
    anti_pattern: "anti_pattern",
    best_practice: "pattern",
    architectural_guideline: "architectural_guideline",
    implementation_recipe: "implementation_recipe",
    template: "template",
    methodology: "pattern",
    convention: "pattern",
    operational_guideline: "pattern",
    architecture_pattern: "architectural_guideline",
    failure_memory: "failure_memory",
    external_knowledge: "external_knowledge",
  };
  return map[kt] || "pattern";
}

