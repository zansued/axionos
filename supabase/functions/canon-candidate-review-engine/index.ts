import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI, getAIConfig } from "../_shared/ai-client.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";

/**
 * Canon Candidate Review Engine — Sprint 164
 *
 * Evaluates learning_candidates and classifies them:
 *   - rejected: low quality, irrelevant, or too vague
 *   - needs_merge: duplicate or variation of existing knowledge
 *   - needs_human_review: borderline quality, requires steward judgment
 *   - ready_to_promote: high quality, novel, actionable pattern
 *
 * Actions:
 *   - review_pending: evaluate batch of pending candidates
 *   - promote_ready: promote ready_to_promote → canon_entries
 *   - run_full_cycle: review + promote in one call
 *   - get_status: pipeline metrics
 */

Deno.serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { action, organization_id, ...params } = await req.json();
    if (!organization_id) return errorResponse("organization_id required", 400, req);

    const config = getAIConfig();

    switch (action) {
      // ═══════════════════════════════════════════════════
      // 1. REVIEW PENDING — Score and classify candidates
      // ═══════════════════════════════════════════════════
      case "review_pending": {
        const batchSize = params.batch_size || 20;

        const { data: candidates, error: fetchErr } = await supabase
          .from("learning_candidates")
          .select("*")
          .eq("organization_id", organization_id)
          .in("review_status", ["pending", "pending_review"])
          .eq("evaluation_status", "pending")
          .order("created_at", { ascending: true })
          .limit(batchSize);

        if (fetchErr) throw fetchErr;
        if (!candidates?.length) {
          return jsonResponse({ reviewed: 0, message: "No pending candidates" }, 200, req);
        }

        // Fetch existing canon entries for dedup/merge detection
        const { data: existingEntries } = await supabase
          .from("canon_entries")
          .select("id, title, summary, practice_type, stack_scope")
          .eq("organization_id", organization_id)
          .neq("lifecycle_status", "deprecated")
          .limit(500);

        const existingContext = (existingEntries || [])
          .map((e: any) => `• ${e.title} (${e.practice_type})`)
          .slice(0, 40)
          .join("\n");

        // Also fetch existing learning_candidates to detect cross-candidate dupes
        const { data: allCandidates } = await supabase
          .from("learning_candidates")
          .select("id, title, summary, proposed_practice_type")
          .eq("organization_id", organization_id)
          .neq("review_status", "pending")
          .limit(300);

        const existingCandidateTitles = (allCandidates || []).map((c: any) => (c.title || "").toLowerCase());

        const results: any[] = [];

        // Process in AI batches of 5
        for (let i = 0; i < candidates.length; i += 5) {
          const batch = candidates.slice(i, i + 5);

          const descriptions = batch.map((c: any, idx: number) =>
            `[${idx + 1}] Title: "${c.title || c.pattern_signature || 'Untitled'}"
    Type: ${c.proposed_practice_type || c.candidate_type || 'unknown'}
    Scope: ${c.candidate_scope || 'general'}
    Summary: ${(c.summary || 'No summary').slice(0, 300)}
    Confidence: ${c.confidence_score || 0}
    Evidence Count: ${c.evidence_count || 0}
    Signal Count: ${c.signal_count || 0}
    Source: ${c.source_type || 'unknown'}`
          ).join("\n\n");

          try {
            const aiResult = await callAI(
              config.key,
              `You are the Canon Candidate Review Engine for AxionOS. You evaluate operational learning candidates for potential promotion to institutional knowledge (Canon).

For each candidate, score on 5 dimensions (0-100):
1. QUALITY: Is the pattern clearly defined and actionable?
2. CLARITY: Is the description clear enough to be applied by engineers?
3. SPECIFICITY: Is it specific enough to be a reusable pattern (not too generic)?
4. REUSABILITY: Can this be applied across multiple projects/contexts?
5. DOMAIN_ALIGNMENT: Does it fit a clear engineering domain?

Determine evaluation_status:
- "ready_to_promote" — average score >= 65, novel, actionable
- "needs_human_review" — average score 45-64, or uncertain quality
- "needs_merge" — similar to existing canon entry or another candidate (provide merge_target)
- "rejected" — average score < 45, too vague, duplicate, or irrelevant

Return ONLY valid JSON:
{"reviews": [{"index": 1, "quality": N, "clarity": N, "specificity": N, "reusability": N, "domain_alignment": N, "overall_score": N, "evaluation_status": "...", "merge_target": "title of similar entry if needs_merge", "notes": "brief explanation"}]}`,
              `Review these learning candidates:\n\n${descriptions}\n\n${existingContext ? `Existing canon entries (check for duplicates/merges):\n${existingContext}` : "No existing canon entries."}`,
              true,
              2,
              false,
              "canon_candidate_review",
              organization_id,
            );

            let reviews: any[] = [];
            try {
              const parsed = JSON.parse(aiResult.content);
              reviews = parsed.reviews || [];
            } catch {
              console.error("Failed to parse AI review response");
              continue;
            }

            for (const review of reviews) {
              const candidate = batch[(review.index || 1) - 1];
              if (!candidate) continue;

              const overallScore = review.overall_score || 0;
              let evalStatus = review.evaluation_status || "needs_human_review";

              // Additional dedup check against existing candidates
              const titleLower = (candidate.title || candidate.pattern_signature || "").toLowerCase();
              if (titleLower && existingCandidateTitles.some((t: string) =>
                t && (levenshteinSimilarity(t, titleLower) > 0.8)
              )) {
                if (evalStatus === "ready_to_promote") {
                  evalStatus = "needs_merge";
                  review.notes = `Cross-candidate duplicate detected. ${review.notes || ""}`;
                }
              }

              const updates: Record<string, unknown> = {
                evaluation_score: overallScore,
                evaluation_notes: `Q:${review.quality} C:${review.clarity} S:${review.specificity} R:${review.reusability} D:${review.domain_alignment}. ${review.notes || ""}`,
                evaluation_status: evalStatus,
                review_status: evalStatus === "ready_to_promote" ? "approved"
                  : evalStatus === "rejected" ? "rejected"
                  : evalStatus === "needs_merge" ? "needs_merge"
                  : "needs_review",
                reviewed_by: "canon-candidate-review-engine",
                reviewed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              // Boost confidence for high-scoring candidates
              if (overallScore >= 70 && candidate.confidence_score < overallScore) {
                updates.confidence_score = overallScore;
              }

              await supabase.from("learning_candidates")
                .update(updates)
                .eq("id", candidate.id)
                .eq("organization_id", organization_id);

              results.push({
                id: candidate.id,
                title: candidate.title || candidate.pattern_signature,
                evaluation_score: overallScore,
                evaluation_status: evalStatus,
              });
            }
          } catch (aiErr: any) {
            console.error("AI review batch failed:", aiErr.message);
            continue;
          }
        }

        return jsonResponse({
          reviewed: results.length,
          ready_to_promote: results.filter(r => r.evaluation_status === "ready_to_promote").length,
          needs_human_review: results.filter(r => r.evaluation_status === "needs_human_review").length,
          needs_merge: results.filter(r => r.evaluation_status === "needs_merge").length,
          rejected: results.filter(r => r.evaluation_status === "rejected").length,
          details: results,
        }, 200, req);
      }

      // ═══════════════════════════════════════════════════
      // 2. PROMOTE READY — Move approved → canon_entries
      // ═══════════════════════════════════════════════════
      case "promote_ready": {
        const { data: ready, error: rErr } = await supabase
          .from("learning_candidates")
          .select("*")
          .eq("organization_id", organization_id)
          .eq("evaluation_status", "ready_to_promote")
          .in("review_status", ["approved", "ready_to_promote"])
          .is("promoted_entry_id", null)
          .order("evaluation_score", { ascending: false })
          .limit(50);

        if (rErr) throw rErr;
        if (!ready?.length) {
          return jsonResponse({ promoted: 0, message: "No candidates ready to promote" }, 200, req);
        }

        let promoted = 0;
        const promotedEntries: any[] = [];

        for (const candidate of ready) {
          try {
            const title = candidate.title || candidate.pattern_signature || "Untitled Pattern";
            const slug = title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")
              .slice(0, 80);

            // Valid canon_entry_type enum: pattern, template, anti_pattern, architectural_guideline, implementation_recipe, failure_memory, external_knowledge
            const canonType = mapToCanonType(candidate.proposed_practice_type || candidate.candidate_type);

            const canonEntry = {
              organization_id,
              title,
              slug: `${slug}-lc-${Date.now()}-${promoted}`,
              canon_type: canonType,
              practice_type: candidate.proposed_practice_type || candidate.candidate_type || "pattern",
              lifecycle_status: "approved",  // valid enum
              approval_status: "approved",   // valid enum
              confidence_score: Math.min((candidate.evaluation_score || candidate.confidence_score || 50) / 100, 1),
              summary: candidate.summary || "",
              body: "",
              implementation_guidance: "",
              stack_scope: candidate.candidate_scope || "general",
              layer_scope: "general",
              problem_scope: "general",
              topic: candidate.candidate_scope || "general",
              subtopic: candidate.proposed_practice_type || "pattern",
              tags: [],
              source_reference: candidate.source_type || "operational_learning",
              source_type: candidate.source_type || "operational",
              approved_by: "canon-candidate-review-engine",
              created_by: "canon-candidate-review-engine",
              metadata: {
                source: "learning_candidates",
                learning_candidate_id: candidate.id,
                evaluation_score: candidate.evaluation_score,
                signal_count: candidate.signal_count,
                evidence_count: candidate.evidence_count,
                promoted_by: "canon-candidate-review-engine",
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

            // Update candidate
            await supabase.from("learning_candidates").update({
              status: "promoted",
              review_status: "promoted",
              evaluation_status: "promoted",
              promoted_entry_id: entry.id,
              updated_at: new Date().toISOString(),
            }).eq("id", candidate.id);

            // Audit trail
            try {
              await supabase.from("canon_entry_status_history").insert({
                entry_id: entry.id,
                organization_id,
                from_status: "none",
                to_status: "approved",
                reason: `Promoted from learning candidate ${candidate.id}. Score: ${candidate.evaluation_score}. ${candidate.evaluation_notes || ""}`,
                changed_by: "canon-candidate-review-engine",
              });
            } catch (_) {}

            // Version record
            try {
              await supabase.from("canon_entry_versions").insert({
                entry_id: entry.id,
                organization_id,
                version_number: 1,
                title: entry.title,
                summary: entry.summary,
                body: entry.body || "",
                implementation_guidance: "",
                change_description: "Promoted from operational learning candidate by Review Engine",
                changed_by: "canon-candidate-review-engine",
              });
            } catch (_) {}

            promoted++;
            promotedEntries.push({ id: entry.id, title: entry.title, score: candidate.evaluation_score });
          } catch (e: any) {
            console.error("Promote error for", candidate.id, e.message);
          }
        }

        return jsonResponse({
          promoted,
          total_eligible: ready.length,
          entries: promotedEntries,
        }, 200, req);
      }

      // ═══════════════════════════════════════════════════
      // 3. FULL CYCLE — Review + Promote
      // ═══════════════════════════════════════════════════
      case "run_full_cycle": {
        const baseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const invoke = async (a: string) => {
          const resp = await fetch(`${baseUrl}/functions/v1/canon-candidate-review-engine`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ action: a, organization_id }),
          });
          return resp.json();
        };

        const reviewResult = await invoke("review_pending");
        const promoteResult = await invoke("promote_ready");

        return jsonResponse({
          pipeline: "complete",
          review: reviewResult,
          promotion: promoteResult,
        }, 200, req);
      }

      // ═══════════════════════════════════════════════════
      // 4. STATUS — Pipeline metrics
      // ═══════════════════════════════════════════════════
      case "get_status": {
        const { data: candidates } = await supabase
          .from("learning_candidates")
          .select("id, status, review_status, evaluation_status, evaluation_score")
          .eq("organization_id", organization_id);

        const data = candidates || [];

        return jsonResponse({
          total: data.length,
          pending: data.filter((c: any) => c.evaluation_status === "pending").length,
          ready_to_promote: data.filter((c: any) => c.evaluation_status === "ready_to_promote").length,
          needs_human_review: data.filter((c: any) => c.evaluation_status === "needs_human_review").length,
          needs_merge: data.filter((c: any) => c.evaluation_status === "needs_merge").length,
          rejected: data.filter((c: any) => c.review_status === "rejected").length,
          promoted: data.filter((c: any) => c.review_status === "promoted").length,
          avg_score: data.length > 0
            ? Math.round(data.reduce((s: number, c: any) => s + (c.evaluation_score || 0), 0) / data.length)
            : 0,
        }, 200, req);
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400, req);
    }
  } catch (err: any) {
    console.error("canon-candidate-review-engine error:", err);
    return errorResponse(err.message || "Internal error", 500, req);
  }
});

// ── Utilities ──

function mapToCanonType(kt: string): string {
  // Valid enum: pattern, template, anti_pattern, architectural_guideline, implementation_recipe, failure_memory, external_knowledge
  const map: Record<string, string> = {
    pattern: "pattern",
    execution_pattern: "pattern",
    anti_pattern: "anti_pattern",
    best_practice: "pattern",
    architecture_pattern: "architectural_guideline",
    architectural_guideline: "architectural_guideline",
    implementation_pattern: "implementation_recipe",
    implementation_recipe: "implementation_recipe",
    template: "template",
    failure_memory: "failure_memory",
    external_knowledge: "external_knowledge",
    methodology: "pattern",
    convention: "pattern",
  };
  return map[kt] || "pattern";
}

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
