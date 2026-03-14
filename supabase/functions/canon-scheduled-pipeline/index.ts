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
    // Validate cron secret to prevent unauthorized invocations
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");

    if (!expectedSecret || cronSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

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

    // Log the cron run
    await sb.from("audit_logs").insert({
      action: "canon_scheduled_pipeline",
      category: "cron",
      entity_type: "canon",
      message: `Scheduled pipeline completed: ${uniqueOrgIds.length} org(s) processed`,
      severity: "info",
      metadata: { summary, run_at: new Date().toISOString() },
    });

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
