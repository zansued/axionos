import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI, getAIConfig } from "../_shared/ai-client.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";

/**
 * Canon Review Engine — Sprint 170
 *
 * Automated candidate review, scoring, classification, and promotion.
 * Closes the gap between ingestion (canon_candidate_entries with pending status)
 * and promotion (requires internal_validation_status=approved).
 *
 * Actions:
 *   - review_candidates: AI-review batch of pending candidates
 *   - promote_approved: promote all reviewed+approved candidates to canon_entries
 *   - run_full_pipeline: review + promote in one call
 *   - get_pipeline_status: current pipeline health
 */

Deno.serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    // Auth hardening — Sprint 196
    const authResult = await authenticateWithRateLimit(req, "canon-review-engine");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient: supabase } = authResult;

    const body = await req.json();
    const { action, organization_id: payloadOrgId } = body;

    const { orgId: organization_id, error: orgError } = await resolveAndValidateOrg(supabase, user.id, payloadOrgId);
    if (orgError || !organization_id) return errorResponse(orgError || "Organization access denied", 403, req);

    await logSecurityAudit(supabase, {
      organization_id, actor_id: user.id,
      function_name: "canon-review-engine", action: action || "unknown",
    });

    const config = getAIConfig();

    switch (action) {
      // ── Review pending candidates with AI ──
      case "review_candidates": {
        const { data: candidates, error: fetchErr } = await supabase
          .from("canon_candidate_entries")
          .select("*")
          .eq("organization_id", organization_id)
          .eq("internal_validation_status", "pending")
          .eq("promotion_status", "pending")
          .order("created_at", { ascending: true })
          .limit(20);

        if (fetchErr) throw fetchErr;
        if (!candidates || candidates.length === 0) {
          return jsonResponse({ reviewed: 0, message: "No pending candidates" }, 200, req);
        }

        // Fetch existing canon entries for dedup check
        const { data: existingEntries } = await supabase
          .from("canon_entries")
          .select("id, title, summary, practice_type, stack_scope, topic")
          .eq("organization_id", organization_id)
          .neq("lifecycle_status", "deprecated")
          .limit(500);

        const existingTitles = (existingEntries || []).map((e: any) => e.title.toLowerCase());
        const existingSummaries = (existingEntries || []).map((e: any) => e.summary?.toLowerCase() || "");

        // Also fetch already-reviewed candidates to check for cross-candidate duplication
        const { data: reviewedCandidates } = await supabase
          .from("canon_candidate_entries")
          .select("title, summary")
          .eq("organization_id", organization_id)
          .neq("internal_validation_status", "pending")
          .limit(500);

        const reviewedTitles = (reviewedCandidates || []).map((c: any) => c.title.toLowerCase());

        const results: Array<{ id: string; verdict: string; reason: string }> = [];

        // Process candidates in batches of 5 for AI review
        for (let i = 0; i < candidates.length; i += 5) {
          const batch = candidates.slice(i, i + 5);

          const candidateSummaries = batch.map((c: any, idx: number) => 
            `[${idx + 1}] Title: "${c.title}"\n    Type: ${c.knowledge_type}\n    Domain: ${c.domain_scope}\n    Summary: ${c.summary}\n    Reliability: ${c.source_reliability_score}/100`
          ).join("\n\n");

          const existingContext = existingTitles.length > 0
            ? `\nExisting canon entries (check for duplicates):\n${existingTitles.slice(0, 50).map(t => `- ${t}`).join("\n")}`
            : "";

          try {
            const aiResult = await callAI(
              config.key,
              `You are a Canon Knowledge Quality Reviewer for AxionOS. Evaluate engineering knowledge candidates for promotion to the institutional canon.

For each candidate, assess:
1. QUALITY: Is the pattern clearly defined, actionable, and reusable? (0-100)
2. NOVELTY: Does it add new knowledge not already in the canon? (0-100)
3. RELEVANCE: Is it useful for software engineering teams? (0-100)
4. CLARITY: Is the description clear enough to be applied? (0-100)

Produce a verdict for each:
- "approve" — high quality, novel, relevant (scores avg > 60)
- "reject" — low quality, duplicate, irrelevant, or too vague (scores avg < 40)
- "needs_human_review" — borderline cases (scores avg 40-60)

Return ONLY valid JSON: {"reviews": [{"index": 1, "verdict": "approve"|"reject"|"needs_human_review", "quality": N, "novelty": N, "relevance": N, "clarity": N, "reason": "brief explanation"}]}`,
              `Review these canon candidates:\n\n${candidateSummaries}${existingContext}`,
              true, // JSON mode
              2,
              false,
              "canon_review",
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

            // Apply verdicts
            for (const review of reviews) {
              const candidateIdx = (review.index || 1) - 1;
              const candidate = batch[candidateIdx];
              if (!candidate) continue;

              // Additional dedup check
              const titleLower = candidate.title.toLowerCase();
              const isDuplicate = existingTitles.some((t: string) => 
                t.includes(titleLower) || titleLower.includes(t) ||
                levenshteinSimilarity(t, titleLower) > 0.8
              ) || reviewedTitles.some((t: string) =>
                t.includes(titleLower) || titleLower.includes(t) ||
                levenshteinSimilarity(t, titleLower) > 0.8
              );

              let verdict = review.verdict;
              let reason = review.reason || "";

              if (isDuplicate && verdict === "approve") {
                verdict = "reject";
                reason = `Duplicate detected: similar entry already exists in canon. ${reason}`;
              }

              // Compute composite score
              const avgScore = ((review.quality || 0) + (review.novelty || 0) + (review.relevance || 0) + (review.clarity || 0)) / 4;

              const updates: Record<string, unknown> = {
                updated_at: new Date().toISOString(),
                reviewed_by: "canon-review-engine",
                novelty_score: review.novelty || 0,
              };

              if (verdict === "approve") {
                updates.internal_validation_status = "approved";
                updates.promotion_decision_reason = reason;
                updates.source_reliability_score = Math.round(Math.max(candidate.source_reliability_score || 0, avgScore));
              } else if (verdict === "reject") {
                updates.internal_validation_status = "rejected";
                updates.promotion_status = "rejected";
                updates.promotion_decision_reason = reason;
              } else {
                // needs_human_review — mark as pending but with a note
                updates.internal_validation_status = "needs_review";
                updates.promotion_decision_reason = `[AI Review] ${reason}. Scores: Q=${review.quality} N=${review.novelty} R=${review.relevance} C=${review.clarity}`;
              }

              await supabase.from("canon_candidate_entries")
                .update(updates)
                .eq("id", candidate.id)
                .eq("organization_id", organization_id);

              results.push({ id: candidate.id, verdict, reason });
            }
          } catch (aiErr: any) {
            console.error("AI review batch failed:", aiErr.message);
            // On AI failure, skip this batch — don't block the whole pipeline
            continue;
          }
        }

        return jsonResponse({
          reviewed: results.length,
          approved: results.filter(r => r.verdict === "approve").length,
          rejected: results.filter(r => r.verdict === "reject").length,
          needs_human_review: results.filter(r => r.verdict === "needs_human_review").length,
          details: results,
        }, 200, req);
      }

      // ── Promote all approved candidates to canon entries ──
      case "promote_approved": {
        const { data: approved, error: aErr } = await supabase
          .from("canon_candidate_entries")
          .select("*")
          .eq("organization_id", organization_id)
          .eq("internal_validation_status", "approved")
          .eq("promotion_status", "pending")
          .order("source_reliability_score", { ascending: false })
          .limit(50);

        if (aErr) throw aErr;
        if (!approved || approved.length === 0) {
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
              canon_type: candidate.knowledge_type === "anti_pattern" ? "anti_pattern" : "pattern",
              practice_type: candidate.knowledge_type || "pattern",
              lifecycle_status: "approved",
              approval_status: "approved",
              confidence_score: Math.min((candidate.source_reliability_score || 50) / 100, 1),
              summary: candidate.summary || "",
              body: candidate.body || "",
              implementation_guidance: "",
              stack_scope: candidate.domain_scope || "general",
              layer_scope: "general",
              problem_scope: "general",
              topic: candidate.domain_scope || "general",
              subtopic: candidate.knowledge_type || "pattern",
              tags: [],
              source_reference: candidate.source_reference || "",
              source_type: candidate.source_type || "external_documentation",
              source_candidate_id: candidate.id,
              approved_by: "canon-review-engine",
              created_by: candidate.submitted_by || "canon-review-engine",
              metadata: {},
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
            await supabase.from("canon_candidate_entries").update({
              promotion_status: "promoted",
              promoted_entry_id: entry.id,
              promoted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq("id", candidate.id);

            // Create initial version
            await supabase.from("canon_entry_versions").insert({
              entry_id: entry.id,
              organization_id,
              version_number: 1,
              title: entry.title,
              summary: entry.summary,
              body: entry.body,
              implementation_guidance: "",
              change_description: "Auto-promoted from canon candidate review",
              changed_by: "canon-review-engine",
            });

            // Status history
            await supabase.from("canon_entry_status_history").insert({
              entry_id: entry.id,
              organization_id,
              from_status: "none",
              to_status: "approved",
              reason: `Auto-promoted from candidate ${candidate.id}. Review: ${candidate.promotion_decision_reason || "approved by AI review"}`,
              changed_by: "canon-review-engine",
            });

            // Update source lifecycle if exists
            if (candidate.source_id) {
              await supabase.from("canon_sources").update({
                ingestion_lifecycle_state: "canon_promoted",
                updated_at: new Date().toISOString(),
              }).eq("id", candidate.source_id);
            }

            promoted++;
            promotedEntries.push({ id: entry.id, title: entry.title });
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

      // ── Full pipeline: review + promote (inline to avoid recursive auth issues) ──
      case "run_full_pipeline": {
        // Step 1: Review pending candidates
        let reviewResult: any = { reviewed: 0, approved: 0, rejected: 0, needs_human_review: 0 };
        try {
          const { data: candidates, error: fetchErr } = await supabase
            .from("canon_candidate_entries")
            .select("*")
            .eq("organization_id", organization_id)
            .eq("internal_validation_status", "pending")
            .eq("promotion_status", "pending")
            .order("created_at", { ascending: true })
            .limit(20);

          if (!fetchErr && candidates && candidates.length > 0) {
            const { data: existingEntries } = await supabase
              .from("canon_entries")
              .select("id, title, summary, practice_type, stack_scope, topic")
              .eq("organization_id", organization_id)
              .neq("lifecycle_status", "deprecated")
              .limit(500);

            const existingTitles = (existingEntries || []).map((e: any) => e.title.toLowerCase());

            const { data: reviewedCandidates } = await supabase
              .from("canon_candidate_entries")
              .select("title, summary")
              .eq("organization_id", organization_id)
              .neq("internal_validation_status", "pending")
              .limit(500);

            const reviewedTitles = (reviewedCandidates || []).map((c: any) => c.title.toLowerCase());
            const results: Array<{ id: string; verdict: string; reason: string }> = [];

            for (let i = 0; i < candidates.length; i += 5) {
              const batch = candidates.slice(i, i + 5);
              const candidateSummaries = batch.map((c: any, idx: number) =>
                `[${idx + 1}] Title: "${c.title}"\n    Type: ${c.knowledge_type}\n    Domain: ${c.domain_scope}\n    Summary: ${c.summary}\n    Reliability: ${c.source_reliability_score}/100`
              ).join("\n\n");

              const existingContext = existingTitles.length > 0
                ? `\nExisting canon entries (check for duplicates):\n${existingTitles.slice(0, 50).map(t => `- ${t}`).join("\n")}`
                : "";

              try {
                const aiResult = await callAI(
                  config.key,
                  `You are a Canon Knowledge Quality Reviewer for AxionOS. Evaluate engineering knowledge candidates for promotion to the institutional canon.

For each candidate, assess:
1. QUALITY: Is the pattern clearly defined, actionable, and reusable? (0-100)
2. NOVELTY: Does it add new knowledge not already in the canon? (0-100)
3. RELEVANCE: Is it useful for software engineering teams? (0-100)
4. CLARITY: Is the description clear enough to be applied? (0-100)

Produce a verdict for each:
- "approve" — high quality, novel, relevant (scores avg > 60)
- "reject" — low quality, duplicate, irrelevant, or too vague (scores avg < 40)
- "needs_human_review" — borderline cases (scores avg 40-60)

Return ONLY valid JSON: {"reviews": [{"index": 1, "verdict": "approve"|"reject"|"needs_human_review", "quality": N, "novelty": N, "relevance": N, "clarity": N, "reason": "brief explanation"}]}`,
                  `Review these canon candidates:\n\n${candidateSummaries}${existingContext}`,
                  true, 2, false, "canon_review", organization_id,
                );

                let reviews: any[] = [];
                try {
                  const parsed = JSON.parse(aiResult.content);
                  reviews = parsed.reviews || [];
                } catch { continue; }

                for (const review of reviews) {
                  const candidateIdx = (review.index || 1) - 1;
                  const candidate = batch[candidateIdx];
                  if (!candidate) continue;

                  const titleLower = candidate.title.toLowerCase();
                  const isDuplicate = existingTitles.some((t: string) =>
                    t.includes(titleLower) || titleLower.includes(t) || levenshteinSimilarity(t, titleLower) > 0.8
                  ) || reviewedTitles.some((t: string) =>
                    t.includes(titleLower) || titleLower.includes(t) || levenshteinSimilarity(t, titleLower) > 0.8
                  );

                  let verdict = review.verdict;
                  let reason = review.reason || "";
                  if (isDuplicate && verdict === "approve") {
                    verdict = "reject";
                    reason = `Duplicate detected: similar entry already exists in canon. ${reason}`;
                  }

                  const avgScore = ((review.quality || 0) + (review.novelty || 0) + (review.relevance || 0) + (review.clarity || 0)) / 4;
                  const updates: Record<string, unknown> = {
                    updated_at: new Date().toISOString(),
                    reviewed_by: "canon-review-engine",
                    novelty_score: review.novelty || 0,
                  };

                  if (verdict === "approve") {
                    updates.internal_validation_status = "approved";
                    updates.promotion_decision_reason = reason;
                    updates.source_reliability_score = Math.round(Math.max(candidate.source_reliability_score || 0, avgScore));
                  } else if (verdict === "reject") {
                    updates.internal_validation_status = "rejected";
                    updates.promotion_status = "rejected";
                    updates.promotion_decision_reason = reason;
                  } else {
                    updates.internal_validation_status = "needs_review";
                    updates.promotion_decision_reason = `[AI Review] ${reason}. Scores: Q=${review.quality} N=${review.novelty} R=${review.relevance} C=${review.clarity}`;
                  }

                  await supabase.from("canon_candidate_entries").update(updates).eq("id", candidate.id).eq("organization_id", organization_id);
                  results.push({ id: candidate.id, verdict, reason });
                }
              } catch (aiErr: any) {
                console.error("AI review batch failed:", aiErr.message);
                continue;
              }
            }

            reviewResult = {
              reviewed: results.length,
              approved: results.filter(r => r.verdict === "approve").length,
              rejected: results.filter(r => r.verdict === "reject").length,
              needs_human_review: results.filter(r => r.verdict === "needs_human_review").length,
            };
          }
        } catch (reviewErr: any) {
          console.error("Pipeline review step failed:", reviewErr.message);
        }

        // Step 2: Promote approved candidates
        let promoteResult: any = { promoted: 0 };
        try {
          const { data: approved } = await supabase
            .from("canon_candidate_entries")
            .select("*")
            .eq("organization_id", organization_id)
            .eq("internal_validation_status", "approved")
            .eq("promotion_status", "pending")
            .order("source_reliability_score", { ascending: false })
            .limit(50);

          if (approved && approved.length > 0) {
            let promoted = 0;
            const promotedEntries: any[] = [];

            for (const candidate of approved) {
              try {
                const slug = candidate.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
                const canonEntry = {
                  organization_id,
                  title: candidate.title,
                  slug: `${slug}-${Date.now()}-${promoted}`,
                  canon_type: candidate.knowledge_type === "anti_pattern" ? "anti_pattern" : "pattern",
                  practice_type: candidate.knowledge_type || "pattern",
                  lifecycle_status: "approved",
                  approval_status: "approved",
                  confidence_score: Math.min((candidate.source_reliability_score || 50) / 100, 1),
                  summary: candidate.summary || "",
                  body: candidate.body || "",
                  implementation_guidance: "",
                  stack_scope: candidate.domain_scope || "general",
                  layer_scope: "general",
                  problem_scope: "general",
                  topic: candidate.domain_scope || "general",
                  subtopic: candidate.knowledge_type || "pattern",
                  tags: [],
                  source_reference: candidate.source_reference || "",
                  source_type: candidate.source_type || "external_documentation",
                  source_candidate_id: candidate.id,
                  approved_by: "canon-review-engine",
                  created_by: candidate.submitted_by || "canon-review-engine",
                  metadata: {},
                  structured_guidance: {},
                };

                const { data: entry, error: insertErr } = await supabase.from("canon_entries").insert(canonEntry).select().single();
                if (insertErr) { console.error("Canon entry insert error:", insertErr.message); continue; }

                await supabase.from("canon_candidate_entries").update({
                  promotion_status: "promoted",
                  promoted_entry_id: entry.id,
                  promoted_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }).eq("id", candidate.id);

                await supabase.from("canon_entry_versions").insert({
                  entry_id: entry.id, organization_id, version_number: 1,
                  title: entry.title, summary: entry.summary, body: entry.body,
                  implementation_guidance: "",
                  change_description: "Auto-promoted from canon candidate review",
                  changed_by: "canon-review-engine",
                });

                await supabase.from("canon_entry_status_history").insert({
                  entry_id: entry.id, organization_id,
                  from_status: "none", to_status: "approved",
                  reason: `Auto-promoted from candidate ${candidate.id}. Review: ${candidate.promotion_decision_reason || "approved by AI review"}`,
                  changed_by: "canon-review-engine",
                });

                if (candidate.source_id) {
                  await supabase.from("canon_sources").update({
                    ingestion_lifecycle_state: "canon_promoted",
                    updated_at: new Date().toISOString(),
                  }).eq("id", candidate.source_id);
                }

                promoted++;
                promotedEntries.push({ id: entry.id, title: entry.title });
              } catch (e: any) {
                console.error("Promote error for", candidate.id, e.message);
              }
            }

            promoteResult = { promoted, total_eligible: approved.length, entries: promotedEntries };
          }
        } catch (promoteErr: any) {
          console.error("Pipeline promote step failed:", promoteErr.message);
        }

        return jsonResponse({
          pipeline: "complete",
          review: reviewResult,
          promotion: promoteResult,
        }, 200, req);
      }

      // ── Pipeline status ──
      case "get_pipeline_status": {
        const [candidates, entries] = await Promise.all([
          supabase.from("canon_candidate_entries")
            .select("id, internal_validation_status, promotion_status")
            .eq("organization_id", organization_id),
          supabase.from("canon_entries")
            .select("id, lifecycle_status, approval_status")
            .eq("organization_id", organization_id),
        ]);

        const candData = candidates.data || [];
        const entryData = entries.data || [];

        return jsonResponse({
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
            active: entryData.filter((e: any) => e.lifecycle_status === "approved").length,
            approved: entryData.filter((e: any) => e.approval_status === "approved").length,
            retrievable: entryData.filter((e: any) =>
              (e.lifecycle_status === "approved") &&
              e.approval_status === "approved"
            ).length,
          },
        }, 200, req);
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400, req);
    }
  } catch (err: any) {
    console.error("canon-review-engine error:", err);
    return errorResponse(err.message || "Internal error", 500, req);
  }
});

// ── Utility ──

function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0 || lenB === 0) return 0;

  // Use shorter strings for performance
  const maxLen = Math.max(lenA, lenB);
  if (maxLen > 200) {
    // For long strings, use simple overlap check
    const words1 = new Set(a.split(/\s+/));
    const words2 = new Set(b.split(/\s+/));
    let overlap = 0;
    for (const w of words1) if (words2.has(w)) overlap++;
    return overlap / Math.max(words1.size, words2.size);
  }

  const matrix: number[][] = [];
  for (let i = 0; i <= lenA; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= lenB; j++) {
      if (i === 0) {
        matrix[i][j] = j;
      } else {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }
  }
  return 1 - matrix[lenA][lenB] / maxLen;
}
