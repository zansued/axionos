import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Prefer self-hosted Firecrawl, fall back to managed connector
    const FIRECRAWL_URL = Deno.env.get("FIRECRAWL_SELF_HOSTED_URL") || "https://api.firecrawl.dev";
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_SELF_HOSTED_KEY") || Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) return json({ error: "FIRECRAWL API KEY not configured" }, 500);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const { action, organization_id, source_id } = await req.json();

    switch (action) {
      // ── Run ingestion for a single source ──
      case "ingest_source": {
        if (!source_id || !organization_id) return json({ error: "source_id and organization_id required" }, 400);

        // 1. Fetch source
        const { data: source, error: srcErr } = await supabase
          .from("canon_sources")
          .select("*")
          .eq("id", source_id)
          .single();
        if (srcErr || !source) return json({ error: "Source not found" }, 404);

        // 2. Create sync run
        const { data: syncRun, error: syncErr } = await supabase
          .from("canon_source_sync_runs")
          .insert({
            organization_id,
            source_id,
            sync_status: "in_progress",
            candidates_found: 0,
            candidates_accepted: 0,
            candidates_rejected: 0,
            sync_notes: "",
            started_at: new Date().toISOString(),
            triggered_by: "canon-ingestion-agent",
          })
          .select()
          .single();
        if (syncErr) throw syncErr;

        try {
          // 3. Crawl with Firecrawl
          console.log(`Scraping source: ${source.source_url}`);
          const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
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
            await completeSyncRun(supabase, syncRun.id, source_id, 0, 0, 0, `Firecrawl error: ${scrapeData.error || scrapeResp.status}`);
            return json({ error: "Crawl failed", details: scrapeData.error }, 502);
          }

          const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
          if (!markdown || markdown.length < 100) {
            await completeSyncRun(supabase, syncRun.id, source_id, 0, 0, 0, "Insufficient content extracted");
            return json({ success: true, candidates_created: 0, message: "Insufficient content" });
          }

          // 4. Truncate to ~12k chars for LLM context
          const truncated = markdown.slice(0, 12000);

          // 5. Extract patterns via LLM
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
            if (llmResp.status === 429) {
              await completeSyncRun(supabase, syncRun.id, source_id, 0, 0, 0, "Rate limited by AI gateway");
              return json({ error: "Rate limited, please try again later" }, 429);
            }
            if (llmResp.status === 402) {
              await completeSyncRun(supabase, syncRun.id, source_id, 0, 0, 0, "AI credits exhausted");
              return json({ error: "AI credits exhausted" }, 402);
            }
            await completeSyncRun(supabase, syncRun.id, source_id, 0, 0, 0, `LLM error: ${llmResp.status}`);
            return json({ error: "Pattern extraction failed" }, 502);
          }

          const llmData = await llmResp.json();
          let patterns: any[] = [];

          // Parse tool call response
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
            await completeSyncRun(supabase, syncRun.id, source_id, 0, 0, 0, "No patterns extracted");
            return json({ success: true, candidates_created: 0, message: "No patterns extracted" });
          }

          // 6. Deduplicate against existing candidates
          const { data: existingCandidates } = await supabase
            .from("canon_candidate_entries")
            .select("title")
            .eq("organization_id", organization_id);

          const existingTitles = new Set((existingCandidates || []).map((c: any) => c.title.toLowerCase().trim()));

          const newPatterns = patterns.filter((p: any) => {
            const normalized = p.title.toLowerCase().trim();
            // Simple dedup: exact title match
            if (existingTitles.has(normalized)) return false;
            // Substring overlap check
            for (const existing of existingTitles) {
              if (existing.includes(normalized) || normalized.includes(existing)) return false;
            }
            return true;
          });

          // 7. Insert candidates
          let accepted = 0;
          const rejected = patterns.length - newPatterns.length;

          for (const p of newPatterns) {
            const { error: insertErr } = await supabase.from("canon_candidate_entries").insert({
              organization_id,
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
              submitted_by: "canon-ingestion-agent",
            });
            if (!insertErr) {
              accepted++;
              existingTitles.add(p.title.toLowerCase().trim());
            } else {
              console.error("Insert error:", insertErr.message);
            }
          }

          // 8. Complete sync run
          await completeSyncRun(supabase, syncRun.id, source_id, patterns.length, accepted, rejected,
            `Extracted ${patterns.length} patterns, ${accepted} new candidates created, ${rejected} duplicates skipped`);

          return json({
            success: true,
            candidates_found: patterns.length,
            candidates_created: accepted,
            duplicates_skipped: rejected,
            sync_run_id: syncRun.id,
          });

        } catch (innerErr) {
          console.error("Ingestion error:", innerErr);
          await completeSyncRun(supabase, syncRun.id, source_id, 0, 0, 0, `Error: ${innerErr.message}`);
          throw innerErr;
        }
      }

      // ── Run ingestion for all enabled sources ──
      case "ingest_all": {
        if (!organization_id) return json({ error: "organization_id required" }, 400);

        const { data: sources, error: srcErr } = await supabase
          .from("canon_sources")
          .select("id, source_name")
          .eq("organization_id", organization_id)
          .eq("status", "active");
        if (srcErr) throw srcErr;

        const results: any[] = [];
        for (const src of (sources || [])) {
          try {
            // Call self recursively for each source with delay
            const resp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/canon-ingestion-agent`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ action: "ingest_source", organization_id, source_id: src.id }),
            });
            const result = await resp.json();
            results.push({ source: src.source_name, ...result });
            // Rate limit: wait 3s between sources
            await new Promise((r) => setTimeout(r, 3000));
          } catch (err) {
            results.push({ source: src.source_name, error: err.message });
          }
        }

        return json({ success: true, results });
      }

      // ── Seed default sources ──
      case "seed_sources": {
        if (!organization_id) return json({ error: "organization_id required" }, 400);

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
          // Check if already exists
          const { data: existing } = await supabase
            .from("canon_sources")
            .select("id")
            .eq("organization_id", organization_id)
            .eq("source_url", src.source_url)
            .maybeSingle();

          if (!existing) {
            const { data, error } = await supabase.from("canon_sources").insert({
              organization_id,
              ...src,
              trust_level: "unknown",
              ingestion_status: "pending",
              sync_policy: "manual",
              approved_categories: [],
              source_notes: `Auto-seeded by Canon Ingestion Agent`,
              created_by: "canon-ingestion-agent",
              status: "active",
            }).select().single();
            if (!error && data) inserted.push(data);
          }
        }

        return json({ success: true, sources_created: inserted.length, sources: inserted });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("Canon ingestion agent error:", err);
    return json({ error: err.message }, 500);
  }
});

async function completeSyncRun(
  supabase: any, runId: string, sourceId: string,
  found: number, accepted: number, rejected: number, notes: string
) {
  await supabase.from("canon_source_sync_runs").update({
    sync_status: found > 0 ? "completed" : "completed_empty",
    candidates_found: found,
    candidates_accepted: accepted,
    candidates_rejected: rejected,
    sync_notes: notes,
    completed_at: new Date().toISOString(),
  }).eq("id", runId);

  await supabase.from("canon_sources").update({
    last_synced_at: new Date().toISOString(),
    ingestion_status: accepted > 0 ? "ingested" : "pending",
  }).eq("id", sourceId);
}
