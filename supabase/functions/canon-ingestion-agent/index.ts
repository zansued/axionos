import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    // 1. Authenticate + rate limit
    const authResult = await authenticateWithRateLimit(req, "canon-ingestion-agent");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient } = authResult;

    const FIRECRAWL_URL = Deno.env.get("FIRECRAWL_SELF_HOSTED_URL") || "https://api.firecrawl.dev";
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_SELF_HOSTED_KEY") || Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) return errorResponse("FIRECRAWL API KEY not configured", 500, req);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return errorResponse("LOVABLE_API_KEY not configured", 500, req);

    const { action, organization_id: payloadOrgId, source_id } = await req.json();

    // 2. Resolve & validate org
    const { orgId, error: orgError } = await resolveAndValidateOrg(
      serviceClient, user.id, payloadOrgId
    );
    if (orgError || !orgId) {
      return errorResponse(orgError || "Organization access denied", 403, req);
    }

    // 3. Audit
    await logSecurityAudit(serviceClient, {
      organization_id: orgId,
      actor_id: user.id,
      function_name: "canon-ingestion-agent",
      action,
      context: { source_id },
    });

    switch (action) {
      case "ingest_source": {
        if (!source_id) return errorResponse("source_id required", 400, req);

        // Verify source belongs to org
        const { data: source, error: srcErr } = await serviceClient
          .from("canon_sources")
          .select("*")
          .eq("id", source_id)
          .eq("organization_id", orgId)
          .single();
        if (srcErr || !source) return errorResponse("Source not found in your organization", 404, req);

        await serviceClient.from("canon_sources").update({
          ingestion_lifecycle_state: "queued",
          updated_at: new Date().toISOString(),
        }).eq("id", source_id);

        const { data: syncRun, error: syncErr } = await serviceClient
          .from("canon_source_sync_runs")
          .insert({
            organization_id: orgId,
            source_id,
            sync_status: "in_progress",
            lifecycle_state: "queued",
            candidates_found: 0,
            candidates_accepted: 0,
            candidates_rejected: 0,
            documents_fetched: 0,
            chunks_created: 0,
            candidates_promoted: 0,
            duplicates_skipped: 0,
            sync_notes: "",
            started_at: new Date().toISOString(),
            triggered_by: user.id,
          })
          .select()
          .single();
        if (syncErr) throw syncErr;

        try {
          console.log(`Scraping source: ${source.source_url}`);
          await serviceClient.from("canon_sources").update({ ingestion_lifecycle_state: "fetched" }).eq("id", source_id);
          await serviceClient.from("canon_source_sync_runs").update({ lifecycle_state: "fetched" }).eq("id", syncRun.id);

          const scrapeResp = await fetch(`${FIRECRAWL_URL}/v1/scrape`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: source.source_url,
              formats: ["markdown"],
              onlyMainContent: true,
              waitFor: 5000,
            }),
          });

          const scrapeData = await scrapeResp.json();
          if (!scrapeResp.ok) {
            console.error("Firecrawl error:", scrapeData);
            await serviceClient.from("canon_sources").update({ ingestion_lifecycle_state: "failed" }).eq("id", source_id);
            await completeSyncRun(serviceClient, syncRun.id, source_id, 0, 0, 0, 0, 0, 0, `Firecrawl error: ${scrapeData.error || scrapeResp.status}`, "failed");
            return errorResponse("Crawl failed", 502, req);
          }

          const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";

          await serviceClient.from("canon_sources").update({ ingestion_lifecycle_state: "parsed" }).eq("id", source_id);
          await serviceClient.from("canon_source_sync_runs").update({ lifecycle_state: "parsed", documents_fetched: 1 }).eq("id", syncRun.id);

          if (!markdown || markdown.length < 100) {
            await completeSyncRun(serviceClient, syncRun.id, source_id, 0, 0, 0, 1, 0, 0, "Insufficient content extracted", "parsed");
            return jsonResponse({ success: true, candidates_created: 0, message: "Insufficient content" }, 200, req);
          }

          const truncated = markdown.slice(0, 12000);
          await serviceClient.from("canon_sources").update({ ingestion_lifecycle_state: "chunked" }).eq("id", source_id);
          await serviceClient.from("canon_source_sync_runs").update({ lifecycle_state: "chunked", chunks_created: 1 }).eq("id", syncRun.id);

          console.log("Extracting patterns via LLM...");
          const llmResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                  content: `You are an engineering pattern extraction agent. Analyze documentation content and extract reusable software engineering patterns.

For each pattern found, return a JSON array of objects with these fields:
- title: concise pattern name (5-80 chars)
- summary: what it does and why it matters (10-200 chars)
- knowledge_type: one of "pattern", "anti_pattern", "best_practice", "architectural_guideline", "implementation_recipe", "template"
- domain_scope: one of "frontend", "backend", "infrastructure", "architecture", "general", "devops", "security", "testing"
- body: detailed description with implementation guidance (100-500 chars)
- confidence_score: 0-100 based on how clearly the source defines this pattern

Extract 3-8 distinct, high-quality patterns. Focus on actionable, reusable engineering knowledge.
Return ONLY a valid JSON array, no other text.`,
                },
                {
                  role: "user",
                  content: `Extract engineering patterns from this documentation source "${source.source_name}" (${source.source_url}):\n\n${truncated}`,
                },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "extract_patterns",
                    description: "Return extracted engineering patterns from the documentation.",
                    parameters: {
                      type: "object",
                      properties: {
                        patterns: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              title: { type: "string" },
                              summary: { type: "string" },
                              knowledge_type: { type: "string", enum: ["pattern", "anti_pattern", "best_practice", "architectural_guideline", "implementation_recipe", "template"] },
                              domain_scope: { type: "string", enum: ["frontend", "backend", "infrastructure", "architecture", "general", "devops", "security", "testing"] },
                              body: { type: "string" },
                              confidence_score: { type: "number", minimum: 0, maximum: 100 },
                            },
                            required: ["title", "summary", "knowledge_type", "domain_scope", "body", "confidence_score"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["patterns"],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "extract_patterns" } },
            }),
          });

          if (!llmResp.ok) {
            const errText = await llmResp.text();
            console.error("LLM error:", llmResp.status, errText);
            await serviceClient.from("canon_sources").update({ ingestion_lifecycle_state: "failed" }).eq("id", source_id);
            if (llmResp.status === 429) {
              await completeSyncRun(serviceClient, syncRun.id, source_id, 0, 0, 0, 1, 1, 0, "Rate limited by AI gateway", "failed");
              return errorResponse("Rate limited, please try again later", 429, req);
            }
            if (llmResp.status === 402) {
              await completeSyncRun(serviceClient, syncRun.id, source_id, 0, 0, 0, 1, 1, 0, "AI credits exhausted", "failed");
              return errorResponse("AI credits exhausted", 402, req);
            }
            await completeSyncRun(serviceClient, syncRun.id, source_id, 0, 0, 0, 1, 1, 0, `LLM error: ${llmResp.status}`, "failed");
            return errorResponse("Pattern extraction failed", 502, req);
          }

          await serviceClient.from("canon_sources").update({ ingestion_lifecycle_state: "classified" }).eq("id", source_id);
          await serviceClient.from("canon_source_sync_runs").update({ lifecycle_state: "classified" }).eq("id", syncRun.id);

          const llmData = await llmResp.json();
          let patterns: any[] = [];

          const toolCall = llmData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            try {
              const parsed = JSON.parse(toolCall.function.arguments);
              patterns = parsed.patterns || [];
            } catch {
              console.error("Failed to parse tool call arguments");
            }
          }

          if (patterns.length === 0) {
            await completeSyncRun(serviceClient, syncRun.id, source_id, 0, 0, 0, 1, 1, 0, "No patterns extracted", "classified");
            return jsonResponse({ success: true, candidates_created: 0, message: "No patterns extracted" }, 200, req);
          }

          // Deduplicate (scoped by org)
          const { data: existingCandidates } = await serviceClient
            .from("canon_candidate_entries")
            .select("title")
            .eq("organization_id", orgId);

          const existingTitles = new Set((existingCandidates || []).map((c: any) => c.title.toLowerCase().trim()));

          const newPatterns = patterns.filter((p: any) => {
            const normalized = p.title.toLowerCase().trim();
            if (existingTitles.has(normalized)) return false;
            for (const existing of existingTitles) {
              if (existing.includes(normalized) || normalized.includes(existing)) return false;
            }
            return true;
          });

          let accepted = 0;
          const rejected = patterns.length - newPatterns.length;

          for (const p of newPatterns) {
            const { error: insertErr } = await serviceClient.from("canon_candidate_entries").insert({
              organization_id: orgId,
              source_id,
              title: p.title,
              summary: p.summary,
              body: p.body || "",
              knowledge_type: p.knowledge_type,
              domain_scope: p.domain_scope || "general",
              source_type: source.source_type || "external_documentation",
              source_reference: source.source_url,
              source_reliability_score: Math.min(p.confidence_score || 50, 100),
              novelty_score: 0,
              conflict_with_existing_canon: false,
              internal_validation_status: "pending",
              trial_status: "none",
              promotion_status: "pending",
              promotion_decision_reason: "",
              submitted_by: user.id,
            });
            if (!insertErr) {
              accepted++;
              existingTitles.add(p.title.toLowerCase().trim());
            } else {
              console.error("Insert error:", insertErr.message);
            }
          }

          await serviceClient.from("canon_sources").update({ ingestion_lifecycle_state: "candidate_generated" }).eq("id", source_id);
          await completeSyncRun(serviceClient, syncRun.id, source_id, patterns.length, accepted, rejected, 1, 1, rejected,
            `Extracted ${patterns.length} patterns, ${accepted} new candidates created, ${rejected} duplicates skipped`, "candidate_generated");

          await logSecurityAudit(serviceClient, {
            organization_id: orgId,
            actor_id: user.id,
            function_name: "canon-ingestion-agent",
            action: "ingestion_completed",
            context: { source_id, candidates_found: patterns.length, candidates_created: accepted },
          });

          return jsonResponse({
            success: true,
            candidates_found: patterns.length,
            candidates_created: accepted,
            duplicates_skipped: rejected,
            sync_run_id: syncRun.id,
          }, 200, req);

        } catch (innerErr) {
          console.error("Ingestion error:", innerErr);
          await serviceClient.from("canon_sources").update({ ingestion_lifecycle_state: "failed" }).eq("id", source_id);
          await completeSyncRun(serviceClient, syncRun.id, source_id, 0, 0, 0, 0, 0, 0, `Error: ${innerErr.message}`, "failed");
          throw innerErr;
        }
      }

      case "ingest_all": {
        const { data: sources, error: srcErr } = await serviceClient
          .from("canon_sources")
          .select("id, source_name")
          .eq("organization_id", orgId)
          .eq("status", "active");
        if (srcErr) throw srcErr;

        // For ingest_all, call self with service-role but pass the user's auth header
        const authHeader = req.headers.get("Authorization") || "";
        const results: any[] = [];
        for (const src of (sources || [])) {
          try {
            const resp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/canon-ingestion-agent`, {
              method: "POST",
              headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ action: "ingest_source", organization_id: orgId, source_id: src.id }),
            });
            const result = await resp.json();
            results.push({ source: src.source_name, ...result });
            await new Promise((r) => setTimeout(r, 3000));
          } catch (err) {
            results.push({ source: src.source_name, error: err.message });
          }
        }

        return jsonResponse({ success: true, results }, 200, req);
      }

      case "seed_sources": {
        const defaultSources = [
          { source_name: "React Documentation", source_type: "official_framework_docs", source_url: "https://react.dev/learn", domain_scope: "frontend" },
          { source_name: "Next.js Documentation", source_type: "official_framework_docs", source_url: "https://nextjs.org/docs", domain_scope: "frontend" },
          { source_name: "Supabase Documentation", source_type: "official_framework_docs", source_url: "https://supabase.com/docs", domain_scope: "backend" },
          { source_name: "Docker Documentation", source_type: "technical_reference", source_url: "https://docs.docker.com/get-started/", domain_scope: "infrastructure" },
          { source_name: "AWS Architecture", source_type: "technical_reference", source_url: "https://aws.amazon.com/architecture/", domain_scope: "architecture" },
          { source_name: "W3Schools Web Reference", source_type: "external_documentation", source_url: "https://www.w3schools.com/", domain_scope: "frontend" },
        ];

        const inserted: any[] = [];
        for (const src of defaultSources) {
          const { data: existing } = await serviceClient
            .from("canon_sources")
            .select("id")
            .eq("organization_id", orgId)
            .eq("source_url", src.source_url)
            .maybeSingle();

          if (!existing) {
            const { data, error } = await serviceClient.from("canon_sources").insert({
              organization_id: orgId,
              ...src,
              trust_level: "unknown",
              ingestion_status: "pending",
              ingestion_lifecycle_state: "discovered",
              sync_policy: "manual",
              approved_categories: [],
              source_notes: `Auto-seeded by Canon Ingestion Agent`,
              created_by: user.id,
              status: "active",
            }).select().single();
            if (!error && data) inserted.push(data);
          }
        }

        return jsonResponse({ success: true, sources_created: inserted.length, sources: inserted }, 200, req);
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400, req);
    }
  } catch (err) {
    console.error("Canon ingestion agent error:", err);
    return errorResponse(err.message, 500, req);
  }
});

async function completeSyncRun(
  supabase: any, runId: string, sourceId: string,
  found: number, accepted: number, rejected: number,
  docsFetched: number, chunksCreated: number, dupsSkipped: number,
  notes: string, lifecycleState: string = "candidate_generated"
) {
  await supabase.from("canon_source_sync_runs").update({
    sync_status: found > 0 ? "completed" : "completed_empty",
    lifecycle_state: lifecycleState,
    candidates_found: found,
    candidates_accepted: accepted,
    candidates_rejected: rejected,
    documents_fetched: docsFetched,
    chunks_created: chunksCreated,
    duplicates_skipped: dupsSkipped,
    sync_notes: notes,
    completed_at: new Date().toISOString(),
  }).eq("id", runId);

  await supabase.from("canon_sources").update({
    last_synced_at: new Date().toISOString(),
    ingestion_status: accepted > 0 ? "ingested" : "pending",
  }).eq("id", sourceId);
}
