import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Canon Scheduled Pipeline — Cron-safe edge function
 * 
 * Called by pg_cron daily at midnight to automatically:
 * 1. Ingest all active sources for each organization
 * 2. Review and promote new candidates via canon-review-engine
 * 
 * Authentication: Uses a shared CRON_SECRET header instead of user JWT.
 * This function operates with service-role privileges.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate: accept either CRON_SECRET header or Authorization with anon/service key
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("Authorization") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const isValidCronSecret = expectedSecret && cronSecret === expectedSecret;
    const isValidAuth = authHeader === `Bearer ${anonKey}` || authHeader === `Bearer ${serviceKey}`;

    if (!isValidCronSecret && !isValidAuth) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, svcKey);

    const FIRECRAWL_URL = Deno.env.get("FIRECRAWL_SELF_HOSTED_URL") || "https://api.firecrawl.dev";
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_SELF_HOSTED_KEY") || Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!FIRECRAWL_API_KEY || !LOVABLE_API_KEY) {
      console.error("Missing required API keys for scheduled pipeline");
      return new Response(
        JSON.stringify({ error: "Missing API keys", firecrawl: !!FIRECRAWL_API_KEY, lovable: !!LOVABLE_API_KEY }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find all organizations with active canon sources
    const { data: orgSources, error: orgErr } = await sb
      .from("canon_sources")
      .select("organization_id")
      .eq("status", "active");

    if (orgErr) throw orgErr;

    const uniqueOrgIds = [...new Set((orgSources || []).map((s: any) => s.organization_id))];
    console.log(`[cron] Found ${uniqueOrgIds.length} org(s) with active sources`);

    const summary: any[] = [];

    for (const orgId of uniqueOrgIds) {
      try {
        // Phase 1: Get active sources for this org
        const { data: sources } = await sb
          .from("canon_sources")
          .select("id, source_name, source_url, source_type, domain_scope, trust_level")
          .eq("organization_id", orgId)
          .eq("status", "active");

        if (!sources || sources.length === 0) continue;

        console.log(`[cron] Org ${orgId}: ingesting ${sources.length} source(s)`);
        let totalCandidates = 0;

        for (const src of sources) {
          try {
            // Create sync run record
            const { data: syncRun } = await sb
              .from("canon_source_sync_runs")
              .insert({
                organization_id: orgId,
                source_id: src.id,
                sync_status: "in_progress",
                lifecycle_state: "queued",
                candidates_found: 0,
                candidates_accepted: 0,
                candidates_rejected: 0,
                documents_fetched: 0,
                chunks_created: 0,
                candidates_promoted: 0,
                duplicates_skipped: 0,
                sync_notes: "Scheduled pipeline run",
                started_at: new Date().toISOString(),
                triggered_by: "cron_scheduled_pipeline",
              })
              .select("id")
              .single();

            // Scrape source
            await sb.from("canon_sources").update({ ingestion_lifecycle_state: "fetched" }).eq("id", src.id);

            const scrapeResp = await fetch(`${FIRECRAWL_URL}/v1/scrape`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ url: src.source_url, formats: ["markdown"], timeout: 30000 }),
            });

            if (!scrapeResp.ok) {
              const errText = await scrapeResp.text();
              console.error(`[cron] Scrape failed for ${src.source_name}: ${errText}`);
              if (syncRun?.id) {
                await completeSyncRun(sb, syncRun.id, src.id, 0, 0, 0, `Scrape failed: ${scrapeResp.status}`, "failed");
              }
              continue;
            }

            const scrapeData = await scrapeResp.json();
            const markdown = scrapeData?.data?.markdown || "";

            if (!markdown || markdown.length < 50) {
              console.log(`[cron] No meaningful content from ${src.source_name}`);
              if (syncRun?.id) {
                await completeSyncRun(sb, syncRun.id, src.id, 0, 0, 0, "No meaningful content extracted", "completed_empty");
              }
              continue;
            }

            // AI extraction
            await sb.from("canon_sources").update({ ingestion_lifecycle_state: "ai_processing" }).eq("id", src.id);

            const truncated = markdown.substring(0, 8000);
            const aiResp = await fetch("https://runyuhxgsezsezjypskr.supabase.co/functions/v1/ai-gateway", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  {
                    role: "system",
                    content: `You are a knowledge extraction engine. Extract reusable technical patterns from the text. Return ONLY a JSON array of objects with: title, summary, category (one of: architecture_pattern, best_practice, design_principle, coding_standard, tool_recommendation, process_guideline, anti_pattern), confidence (0-1), domain_tags (array of strings). Max 8 patterns. Be selective — only extract genuinely reusable knowledge.`,
                  },
                  {
                    role: "user",
                    content: `Source: ${src.source_name} (${src.source_type})\nDomain: ${src.domain_scope}\n\n${truncated}`,
                  },
                ],
              }),
            });

            if (!aiResp.ok) {
              console.error(`[cron] AI extraction failed for ${src.source_name}`);
              if (syncRun?.id) {
                await completeSyncRun(sb, syncRun.id, src.id, 0, 0, 0, "AI extraction failed", "failed");
              }
              continue;
            }

            const aiData = await aiResp.json();
            const raw = aiData?.choices?.[0]?.message?.content || "";
            let patterns: any[] = [];
            try {
              const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
              patterns = JSON.parse(cleaned);
              if (!Array.isArray(patterns)) patterns = [];
            } catch {
              patterns = [];
            }

            // Check for duplicates and insert candidates
            const { data: existing } = await sb
              .from("canon_candidate_entries")
              .select("title")
              .eq("organization_id", orgId);

            const existingTitles = new Set((existing || []).map((e: any) => e.title?.toLowerCase().trim()));
            let accepted = 0;
            let rejected = 0;

            for (const p of patterns) {
              if (!p.title || existingTitles.has(p.title.toLowerCase().trim())) {
                rejected++;
                continue;
              }

              const { error: insertErr } = await sb.from("canon_candidate_entries").insert({
                organization_id: orgId,
                title: p.title,
                summary: p.summary || "",
                category: p.category || "best_practice",
                domain_tags: p.domain_tags || [],
                confidence_score: p.confidence || 0.5,
                source_refs: [{ source_id: src.id, source_name: src.source_name, url: src.source_url }],
                review_status: "pending",
                internal_validation_status: "pending",
                trial_status: "none",
                promotion_status: "pending",
                promotion_decision_reason: "",
                submitted_by: "cron_scheduled_pipeline",
              });

              if (!insertErr) {
                accepted++;
                existingTitles.add(p.title.toLowerCase().trim());
              }
            }

            totalCandidates += accepted;

            if (syncRun?.id) {
              await completeSyncRun(
                sb, syncRun.id, src.id, patterns.length, accepted, rejected,
                `Cron: ${patterns.length} patterns, ${accepted} new, ${rejected} skipped`,
                "candidate_generated"
              );
            }

            // Throttle between sources
            await new Promise((r) => setTimeout(r, 3000));
          } catch (srcErr: any) {
            console.error(`[cron] Error processing source ${src.source_name}:`, srcErr.message);
          }
        }

        // Phase 2: Run review + promote pipeline for this org
        if (totalCandidates > 0) {
          console.log(`[cron] Org ${orgId}: running review pipeline for ${totalCandidates} new candidates`);
          try {
            // Review candidates
            const { data: pendingCandidates } = await sb
              .from("canon_candidate_entries")
              .select("id, title, summary, category, confidence_score, domain_tags, source_refs")
              .eq("organization_id", orgId)
              .eq("review_status", "pending")
              .limit(50);

            let reviewed = 0;
            for (const candidate of (pendingCandidates || [])) {
              await sb.from("canon_candidate_entries").update({
                review_status: "reviewed",
                internal_validation_status: candidate.confidence_score >= 0.5 ? "approved" : "rejected",
                promotion_decision_reason: candidate.confidence_score >= 0.5
                  ? "Auto-approved by scheduled pipeline (confidence >= 0.5)"
                  : "Auto-rejected by scheduled pipeline (low confidence)",
              }).eq("id", candidate.id);
              reviewed++;
            }

            // Promote approved candidates
            const { data: approved } = await sb
              .from("canon_candidate_entries")
              .select("*")
              .eq("organization_id", orgId)
              .eq("internal_validation_status", "approved")
              .eq("promotion_status", "pending");

            let promoted = 0;
            for (const c of (approved || [])) {
              const { error: insertErr } = await sb.from("canon_entries").insert({
                organization_id: orgId,
                title: c.title,
                summary: c.summary,
                category: c.category,
                confidence_score: c.confidence_score,
                domain_tags: c.domain_tags || [],
                source_refs: c.source_refs || [],
                lifecycle_status: "approved",
                approval_status: "approved",
                lineage_depth: 0,
                usage_count: 0,
                review_count: 1,
                last_reviewed_at: new Date().toISOString(),
              });

              if (!insertErr) {
                await sb.from("canon_candidate_entries").update({
                  promotion_status: "promoted",
                }).eq("id", c.id);
                promoted++;
              }
            }

            summary.push({
              organization_id: orgId,
              sources_processed: sources.length,
              candidates_created: totalCandidates,
              reviewed,
              promoted,
            });
          } catch (reviewErr: any) {
            console.error(`[cron] Review pipeline error for org ${orgId}:`, reviewErr.message);
            summary.push({ organization_id: orgId, error: reviewErr.message });
          }
        } else {
          summary.push({ organization_id: orgId, sources_processed: sources.length, candidates_created: 0, message: "No new candidates" });
        }
      } catch (orgErr: any) {
        console.error(`[cron] Org ${orgId} pipeline error:`, orgErr.message);
        summary.push({ organization_id: orgId, error: orgErr.message });
      }
    }

    // ═══ Phase 3: Repo Trust Evaluation ═══
    console.log(`[cron] Phase 3: Evaluating repo trust for ${uniqueOrgIds.length} org(s)`);
    const trustSummary: any[] = [];

    for (const orgId of uniqueOrgIds) {
      try {
        // Get all sources for trust evaluation
        const { data: sources } = await sb
          .from("canon_sources")
          .select("*")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: true })
          .limit(50);

        if (!sources?.length) continue;

        // Get candidates for promotion stats
        const { data: candidates } = await sb
          .from("learning_candidates")
          .select("source_type, status, evaluation_status, confidence_score, source_domains, pattern_signature, evidence_count, signal_count")
          .eq("organization_id", orgId);

        let evaluated = 0;

        for (const source of sources) {
          const factors = computeTrustFactors(source, candidates || []);
          const trustScore = computeCompositeTrustScore(factors);
          const trustTier = getTrustTier(trustScore);

          const sourceCandidates = (candidates || []).filter(
            (c: any) => c.source_type === source.source_type || c.source_type === source.source_name
          );
          const promoted = sourceCandidates.filter((c: any) => c.status === "promoted").length;
          const rejected = sourceCandidates.filter((c: any) => c.evaluation_status === "rejected").length;

          const { error: upsertErr } = await sb
            .from("repo_trust_scores")
            .upsert({
              organization_id: orgId,
              source_id: source.id,
              source_name: source.source_name || "",
              source_url: source.source_url || "",
              trust_score: trustScore,
              trust_tier: trustTier,
              trust_factors: factors,
              patterns_extracted: sourceCandidates.length,
              patterns_promoted: promoted,
              patterns_rejected: rejected,
              promotion_success_rate: sourceCandidates.length > 0 ? promoted / sourceCandidates.length : 0,
              last_evaluated_at: new Date().toISOString(),
              evaluated_by: "cron_scheduled_pipeline",
              evaluation_notes: `Cron trust eval: ${Object.keys(factors).length} dimensions`,
              updated_at: new Date().toISOString(),
            }, { onConflict: "source_id" });

          if (!upsertErr) evaluated++;
        }

        // Phase 3b: Weight patterns
        const { data: weightCandidates } = await sb
          .from("learning_candidates")
          .select("*")
          .eq("organization_id", orgId)
          .in("status", ["pending", "under_review", "approved"])
          .limit(50);

        const { data: trustScores } = await sb
          .from("repo_trust_scores")
          .select("*")
          .eq("organization_id", orgId);

        const trustMap = new Map((trustScores || []).map((t: any) => [t.source_id, t]));
        let weighted = 0;

        for (const candidate of (weightCandidates || [])) {
          const weight = computePatternWeight(candidate, trustMap, weightCandidates || []);

          const { error: wErr } = await sb.from("pattern_weight_factors").upsert({
            organization_id: orgId,
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

          if (!wErr) weighted++;
        }

        trustSummary.push({ organization_id: orgId, sources_evaluated: evaluated, patterns_weighted: weighted });
      } catch (trustErr: any) {
        console.error(`[cron] Trust evaluation error for org ${orgId}:`, trustErr.message);
        trustSummary.push({ organization_id: orgId, error: trustErr.message });
      }
    }

    console.log(`[cron] Trust evaluation complete:`, JSON.stringify(trustSummary));

    // ═══ Phase 4: Operational Pattern Mining ═══
    console.log(`[cron] Phase 4: Mining operational patterns for ${uniqueOrgIds.length} org(s)`);
    const miningSummary: any[] = [];

    for (const orgId of uniqueOrgIds) {
      try {
        // Fetch recent signals (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: signals } = await sb
          .from("operational_learning_signals")
          .select("id, signal_type, outcome, outcome_success, confidence, payload, created_at")
          .eq("organization_id", orgId)
          .gte("created_at", sevenDaysAgo)
          .order("created_at", { ascending: false })
          .limit(200);

        if (!signals || signals.length < 3) {
          miningSummary.push({ organization_id: orgId, signals_found: signals?.length || 0, patterns_mined: 0, candidates_created: 0, message: "Insufficient signals" });
          continue;
        }

        // Group by signal_type to detect recurring patterns
        const groupedByType = new Map<string, any[]>();
        for (const sig of signals) {
          const key = sig.signal_type || "unknown";
          if (!groupedByType.has(key)) groupedByType.set(key, []);
          groupedByType.get(key)!.push(sig);
        }

        let patternsMined = 0;
        let candidatesCreated = 0;

        for (const [signalType, group] of groupedByType) {
          if (group.length < 3) continue; // minimum 3 occurrences

          const successCount = group.filter((s: any) => s.outcome_success).length;
          const successRate = successCount / group.length;
          const avgConfidence = group.reduce((sum: number, s: any) => sum + (s.confidence || 0.5), 0) / group.length;

          // Only mine patterns with sufficient confidence
          if (avgConfidence < 0.6 && successRate < 0.6) continue;

          patternsMined++;

          // Determine pattern category based on signal characteristics
          let category = "best_practice";
          let patternTitle = "";
          let patternSummary = "";

          if (successRate >= 0.8) {
            category = "best_practice";
            patternTitle = `Operational success pattern: ${signalType}`;
            patternSummary = `Recurring successful pattern "${signalType}" detected across ${group.length} occurrences with ${Math.round(successRate * 100)}% success rate and avg confidence ${avgConfidence.toFixed(2)}.`;
          } else if (successRate <= 0.3) {
            category = "anti_pattern";
            patternTitle = `Operational anti-pattern: ${signalType}`;
            patternSummary = `Recurring failure pattern "${signalType}" detected across ${group.length} occurrences with only ${Math.round(successRate * 100)}% success rate. Requires investigation.`;
          } else {
            category = "process_guideline";
            patternTitle = `Operational pattern: ${signalType}`;
            patternSummary = `Mixed-outcome pattern "${signalType}" observed ${group.length} times with ${Math.round(successRate * 100)}% success rate. May benefit from refinement.`;
          }

          // Check for duplicate before inserting as canon candidate
          const { data: existingCandidate } = await sb
            .from("canon_candidate_entries")
            .select("id")
            .eq("organization_id", orgId)
            .ilike("title", `%${signalType}%`)
            .limit(1);

          if (existingCandidate && existingCandidate.length > 0) continue;

          const { error: insertErr } = await sb.from("canon_candidate_entries").insert({
            organization_id: orgId,
            title: patternTitle,
            summary: patternSummary,
            category,
            domain_tags: ["operational_learning", signalType],
            confidence_score: Math.round(avgConfidence * 100) / 100,
            source_refs: [{ source: "operational_pattern_mining", signal_type: signalType, occurrences: group.length, success_rate: successRate }],
            review_status: "pending",
            internal_validation_status: "pending",
            trial_status: "none",
            promotion_status: "pending",
            promotion_decision_reason: "",
            submitted_by: "cron_pattern_mining",
          });

          if (!insertErr) candidatesCreated++;
        }

        miningSummary.push({ organization_id: orgId, signals_found: signals.length, patterns_mined: patternsMined, candidates_created: candidatesCreated });
      } catch (mineErr: any) {
        console.error(`[cron] Pattern mining error for org ${orgId}:`, mineErr.message);
        miningSummary.push({ organization_id: orgId, error: mineErr.message });
      }
    }

    console.log(`[cron] Pattern mining complete:`, JSON.stringify(miningSummary));

    // ═══ Phase 5: Confidence Recalibration (Sprint 207 — delegated to canon-confidence-recalibration) ═══
    console.log(`[cron] Phase 5: Delegating recalibration to canon-confidence-recalibration for ${uniqueOrgIds.length} org(s)`);
    const recalibrationSummary: any[] = [];

    for (const orgId of uniqueOrgIds) {
      try {
        const recalResp = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/canon-confidence-recalibration`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              organization_id: orgId,
              triggered_by: "cron_scheduled_pipeline",
            }),
          }
        );
        const recalResult = await recalResp.json();
        recalibrationSummary.push({ organization_id: orgId, ...recalResult });
      } catch (recalErr: any) {
        console.error(`[cron] Recalibration delegation error for org ${orgId}:`, recalErr.message);
        recalibrationSummary.push({ organization_id: orgId, error: recalErr.message });
      }
    }

    console.log(`[cron] Confidence recalibration complete:`, JSON.stringify(recalibrationSummary));

    // Log the cron run
    await sb.from("audit_logs").insert({
      action: "canon_scheduled_pipeline",
      category: "cron",
      entity_type: "canon",
      message: `Scheduled pipeline completed: ${uniqueOrgIds.length} org(s) processed`,
      severity: "info",
      metadata: { summary, trust_summary: trustSummary, mining_summary: miningSummary, recalibration_summary: recalibrationSummary, run_at: new Date().toISOString() },
    });

    // Sprint 205: Emit operational learning signal per org
    for (const orgSummary of summary) {
      await sb.from("operational_learning_signals").insert({
        organization_id: orgSummary.organization_id,
        signal_type: "scheduled_pipeline_completed",
        outcome: `Pipeline: ${orgSummary.candidates_created || 0} candidates, ${orgSummary.promoted || 0} promoted`,
        outcome_success: !orgSummary.error,
        payload: orgSummary,
      });
    }

    console.log(`[cron] Pipeline complete:`, JSON.stringify(summary));

    return new Response(
      JSON.stringify({ success: true, orgs_processed: uniqueOrgIds.length, summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[cron] Fatal error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function completeSyncRun(
  sb: any, runId: string, sourceId: string,
  found: number, accepted: number, rejected: number,
  notes: string, lifecycleState: string
) {
  await sb.from("canon_source_sync_runs").update({
    sync_status: found > 0 ? "completed" : "completed_empty",
    lifecycle_state: lifecycleState,
    candidates_found: found,
    candidates_accepted: accepted,
    candidates_rejected: rejected,
    documents_fetched: 1,
    chunks_created: 1,
    duplicates_skipped: rejected,
    sync_notes: notes,
    completed_at: new Date().toISOString(),
  }).eq("id", runId);

  await sb.from("canon_sources").update({
    last_synced_at: new Date().toISOString(),
    ingestion_status: accepted > 0 ? "ingested" : "pending",
  }).eq("id", sourceId);
}

// ═══════════════════════════════════════════════════
// Repo Trust Helper Functions (inlined from repo-trust-score-engine)
// ═══════════════════════════════════════════════════

function computeTrustFactors(source: any, candidates: any[]): Record<string, number> {
  const factors: Record<string, number> = {};

  if (source.last_synced_at) {
    const daysSince = (Date.now() - new Date(source.last_synced_at).getTime()) / (1000 * 60 * 60 * 24);
    factors.activity_recency = daysSince < 7 ? 1.0 : daysSince < 30 ? 0.7 : daysSince < 90 ? 0.4 : 0.2;
  } else {
    factors.activity_recency = 0.3;
  }

  factors.structural_clarity = source.source_notes?.length > 50 ? 0.8 : 0.4;

  const typeScores: Record<string, number> = {
    repository: 0.8, documentation: 0.9, framework: 0.85, internal: 0.7,
    community: 0.5, experimental: 0.3,
  };
  factors.source_type_quality = typeScores[source.source_type] || 0.5;

  const trustLevels: Record<string, number> = {
    high: 0.9, medium: 0.6, low: 0.3, untrusted: 0.1,
  };
  factors.configured_trust = trustLevels[source.trust_level] || 0.5;

  factors.documentation_quality = (source.approved_categories?.length > 0) ? 0.7 : 0.4;
  factors.domain_scope = source.domain_scope === "broad" ? 0.6 : source.domain_scope === "specific" ? 0.8 : 0.5;
  factors.ingestion_health = source.ingestion_lifecycle_state === "active" ? 0.9
    : source.ingestion_lifecycle_state === "paused" ? 0.5 : 0.3;

  const sourceCandidates = candidates.filter(
    (c: any) => c.source_type === source.source_type || c.source_type === source.source_name
  );
  const promoted = sourceCandidates.filter((c: any) => c.status === "promoted").length;
  factors.historical_promotion_success = sourceCandidates.length > 0 ? promoted / sourceCandidates.length : 0.5;

  factors.maintenance_signals = source.sync_policy === "auto" ? 0.8
    : source.sync_policy === "manual" ? 0.5 : 0.4;

  const avgConf = sourceCandidates.length > 0
    ? sourceCandidates.reduce((s: number, c: any) => s + (c.confidence_score || 0), 0) / sourceCandidates.length
    : 0.5;
  factors.pattern_quality = avgConf;

  return factors;
}

function computeCompositeTrustScore(factors: Record<string, number>): number {
  const weights: Record<string, number> = {
    activity_recency: 0.10, structural_clarity: 0.08, source_type_quality: 0.10,
    configured_trust: 0.15, documentation_quality: 0.08, domain_scope: 0.05,
    ingestion_health: 0.09, historical_promotion_success: 0.20,
    maintenance_signals: 0.05, pattern_quality: 0.10,
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

function computePatternWeight(candidate: any, trustMap: Map<string, any>, allCandidates: any[]): any {
  let sourceTrust = 0.5;
  let trustedSourceCount = 0;
  const sourceRefs: any[] = [];

  const domains = candidate.source_domains || [];
  for (const [, trust] of trustMap) {
    if (trust.source_name && domains.includes?.(trust.source_name)) {
      sourceTrust = Math.max(sourceTrust, Number(trust.trust_score));
      if (Number(trust.trust_score) >= 0.6) trustedSourceCount++;
      sourceRefs.push({ source: trust.source_name, trust: trust.trust_score });
    }
  }

  const similar = allCandidates.filter(
    (c: any) => c.id !== candidate.id && c.pattern_signature === candidate.pattern_signature
  );
  const recurrenceBonus = Math.min(0.3, similar.length * 0.05);
  const evidenceCount = candidate.evidence_count || 0;
  const executionReinforcement = Math.min(0.3, evidenceCount * 0.02);
  const duplicationNoise = similar.length > 5 ? 0.1 : 0;
  const weakSourcePenalty = sourceTrust < 0.3 ? 0.15 : sourceTrust < 0.5 ? 0.05 : 0;
  const signalCount = candidate.signal_count || 0;
  const neuralFeedbackBonus = Math.min(0.2, signalCount * 0.01);

  const patternWeight = Math.min(1.0, Math.max(0.0,
    (sourceTrust * 0.35) + executionReinforcement + recurrenceBonus + neuralFeedbackBonus
    - duplicationNoise - weakSourcePenalty
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
    notes: `Cron weight: ${domains?.length || 0} domains, trust=${sourceTrust}`,
  };
}
