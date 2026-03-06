import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { normalizeErrorSignature, extractFileTypes, computePatternKey } from "../_shared/repair/error-signature-normalizer.ts";
import { computeSuccessRate, computeConfidence } from "../_shared/contracts/repair-strategy-effectiveness.schema.ts";

/**
 * Error Pattern Library Engine — AxionOS Sprint 7
 *
 * Aggregates repair_evidence into reusable error patterns,
 * computes strategy effectiveness, and identifies prevention candidates.
 *
 * Actions:
 *   aggregate_patterns   — scan repair evidence and build/update error patterns
 *   get_patterns         — return current error patterns for org
 *   get_effectiveness    — return strategy effectiveness data
 *   get_candidates       — return prevention rule candidates
 */

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) return errorResponse("Missing service role key", 500);

    const isService = authHeader === `Bearer ${serviceRoleKey}`;
    const sc = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

    if (!isService) {
      const uc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader || "" } },
      });
      const { data: { user }, error } = await uc.auth.getUser();
      if (error || !user) return errorResponse("Unauthorized", 401);
    }

    const body = await req.json();
    const { action, organization_id, initiative_id, time_window_days } = body;
    if (!action) return errorResponse("action is required", 400);
    if (!organization_id) return errorResponse("organization_id is required", 400);

    switch (action) {
      // ══════════════════════════════════════════
      // AGGREGATE PATTERNS
      // ══════════════════════════════════════════
      case "aggregate_patterns": {
        // 1. Fetch repair evidence
        let query = sc
          .from("repair_evidence")
          .select("*")
          .eq("organization_id", organization_id)
          .order("created_at", { ascending: false })
          .limit(500);

        if (initiative_id) {
          query = query.eq("initiative_id", initiative_id);
        }
        if (time_window_days) {
          const since = new Date(Date.now() - time_window_days * 86400000).toISOString();
          query = query.gte("created_at", since);
        }

        const { data: evidence } = await query;
        if (!evidence?.length) {
          return jsonResponse({ success: true, patterns_detected: 0, patterns_updated: 0, message: "No repair evidence to aggregate" });
        }

        // 2. Group by normalized signature
        const patternMap: Record<string, {
          error_category: string;
          raw_signature: string;
          normalized: string;
          frequency: number;
          stages: Set<string>;
          file_types: Set<string>;
          strategies_success: Record<string, number>;
          strategies_fail: Record<string, number>;
          total_successes: number;
          total_failures: number;
          first_seen: string;
          last_seen: string;
          durations: number[];
          messages: string[];
        }> = {};

        for (const ev of evidence) {
          const normalized = normalizeErrorSignature(ev.error_message || "");
          const key = computePatternKey(ev.error_category, normalized);

          if (!patternMap[key]) {
            patternMap[key] = {
              error_category: ev.error_category,
              raw_signature: ev.error_signature || "",
              normalized,
              frequency: 0,
              stages: new Set(),
              file_types: new Set(),
              strategies_success: {},
              strategies_fail: {},
              total_successes: 0,
              total_failures: 0,
              first_seen: ev.created_at,
              last_seen: ev.created_at,
              durations: [],
              messages: [],
            };
          }

          const p = patternMap[key];
          p.frequency++;
          p.stages.add(ev.stage_name);
          for (const ft of extractFileTypes(ev.error_message || "")) p.file_types.add(ft);
          for (const f of (ev.files_touched || [])) {
            const ext = f.match(/\.\w+$/)?.[0];
            if (ext) p.file_types.add(ext);
          }

          const strategy = ev.repair_strategy || "unknown";
          if (ev.repair_result === "fixed") {
            p.strategies_success[strategy] = (p.strategies_success[strategy] || 0) + 1;
            p.total_successes++;
          } else if (ev.repair_result === "failed") {
            p.strategies_fail[strategy] = (p.strategies_fail[strategy] || 0) + 1;
            p.total_failures++;
          }

          if (ev.created_at < p.first_seen) p.first_seen = ev.created_at;
          if (ev.created_at > p.last_seen) p.last_seen = ev.created_at;
          if (ev.duration_ms) p.durations.push(ev.duration_ms);
          if (p.messages.length < 3) p.messages.push((ev.error_message || "").slice(0, 100));
        }

        // 3. Upsert error patterns
        let patternsCreated = 0;
        let patternsUpdated = 0;

        for (const [key, p] of Object.entries(patternMap)) {
          if (p.frequency < 2) continue; // skip single occurrences

          const successRate = computeSuccessRate(p.total_successes, p.total_successes + p.total_failures);
          const confidence = computeConfidence(p.frequency, successRate);

          const severity = p.frequency >= 10 ? "critical" : p.frequency >= 5 ? "high" : p.frequency >= 3 ? "medium" : "low";
          const repairability = successRate >= 80 ? "high" : successRate >= 50 ? "medium" : successRate > 0 ? "low" : "unknown";

          const successfulStrategies = Object.entries(p.strategies_success)
            .sort((a, b) => b[1] - a[1]).map(([s]) => s);
          const failedStrategies = Object.entries(p.strategies_fail)
            .sort((a, b) => b[1] - a[1]).map(([s]) => s);

          // Check if pattern exists
          const { data: existing } = await sc
            .from("error_patterns")
            .select("id, frequency")
            .eq("organization_id", organization_id)
            .eq("normalized_signature", p.normalized)
            .eq("error_category", p.error_category)
            .limit(1);

          const patternData = {
            organization_id,
            error_category: p.error_category,
            error_signature: p.raw_signature,
            normalized_signature: p.normalized,
            title: `${p.error_category}: ${p.normalized.slice(0, 80)}`,
            description: p.messages[0] || "",
            frequency: p.frequency,
            first_seen_at: p.first_seen,
            last_seen_at: p.last_seen,
            affected_stages: [...p.stages],
            affected_file_types: [...p.file_types],
            successful_strategies: successfulStrategies,
            failed_strategies: failedStrategies,
            success_rate: successRate,
            severity,
            repairability,
            confidence_score: confidence,
            updated_at: new Date().toISOString(),
          };

          if (existing?.length) {
            await sc.from("error_patterns").update(patternData).eq("id", existing[0].id);
            patternsUpdated++;
          } else {
            await sc.from("error_patterns").insert(patternData);
            patternsCreated++;
          }
        }

        // 4. Update strategy effectiveness
        const strategyAgg: Record<string, {
          category: string; strategy: string;
          successes: number; failures: number; durations: number[];
          last_used: string;
        }> = {};

        for (const ev of evidence) {
          const sKey = `${ev.error_category}::${ev.repair_strategy}`;
          if (!strategyAgg[sKey]) {
            strategyAgg[sKey] = {
              category: ev.error_category,
              strategy: ev.repair_strategy || "unknown",
              successes: 0, failures: 0, durations: [], last_used: ev.created_at,
            };
          }
          const s = strategyAgg[sKey];
          if (ev.repair_result === "fixed") s.successes++;
          else if (ev.repair_result === "failed") s.failures++;
          if (ev.duration_ms) s.durations.push(ev.duration_ms);
          if (ev.created_at > s.last_used) s.last_used = ev.created_at;
        }

        for (const [, s] of Object.entries(strategyAgg)) {
          const total = s.successes + s.failures;
          if (total === 0) continue;
          const sr = computeSuccessRate(s.successes, total);
          const avgDuration = s.durations.length > 0
            ? Math.round(s.durations.reduce((a, b) => a + b, 0) / s.durations.length)
            : 0;

          const { data: existing } = await sc
            .from("strategy_effectiveness")
            .select("id")
            .eq("organization_id", organization_id)
            .eq("error_category", s.category)
            .eq("repair_strategy", s.strategy)
            .limit(1);

          const seData = {
            organization_id,
            error_category: s.category,
            repair_strategy: s.strategy,
            attempts_total: total,
            successes_total: s.successes,
            failures_total: s.failures,
            success_rate: sr,
            average_duration_ms: avgDuration,
            last_used_at: s.last_used,
            confidence_score: computeConfidence(total, sr),
            updated_at: new Date().toISOString(),
          };

          if (existing?.length) {
            await sc.from("strategy_effectiveness").update(seData).eq("id", existing[0].id);
          } else {
            await sc.from("strategy_effectiveness").insert(seData);
          }
        }

        // 5. Generate prevention candidates for high-frequency patterns
        let candidatesCreated = 0;
        const { data: topPatterns } = await sc
          .from("error_patterns")
          .select("id, error_category, normalized_signature, frequency, successful_strategies, repairability")
          .eq("organization_id", organization_id)
          .gte("frequency", 3)
          .order("frequency", { ascending: false })
          .limit(20);

        for (const pattern of (topPatterns || [])) {
          // Check if candidate already exists
          const { data: existingCand } = await sc
            .from("prevention_rule_candidates")
            .select("id")
            .eq("pattern_id", pattern.id)
            .limit(1);

          if (existingCand?.length) continue;

          const ruleType = pattern.error_category.includes("dependency") ? "dependency_check"
            : pattern.error_category.includes("import") ? "code_guardrail"
            : pattern.error_category.includes("build_config") ? "scaffold_hardening"
            : "validation_rule";

          const bestStrategy = (pattern.successful_strategies as string[])?.[0] || "none";

          await sc.from("prevention_rule_candidates").insert({
            organization_id,
            pattern_id: pattern.id,
            rule_type: ruleType,
            description: `Recurring ${pattern.error_category} detected ${pattern.frequency} times`,
            proposed_action: bestStrategy !== "none"
              ? `Apply ${bestStrategy} proactively during scaffold/validation`
              : `Add pre-build validation for ${pattern.error_category}`,
            expected_impact: `Prevent ~${pattern.frequency} repair cycles`,
            confidence_score: pattern.repairability === "high" ? 0.85 : 0.5,
          });
          candidatesCreated++;
        }

        return jsonResponse({
          success: true,
          patterns_detected: patternsCreated + patternsUpdated,
          patterns_created: patternsCreated,
          patterns_updated: patternsUpdated,
          strategy_entries: Object.keys(strategyAgg).length,
          candidates_created: candidatesCreated,
        });
      }

      // ══════════════════════════════════════════
      // GET PATTERNS
      // ══════════════════════════════════════════
      case "get_patterns": {
        const { data: patterns } = await sc
          .from("error_patterns")
          .select("*")
          .eq("organization_id", organization_id)
          .order("frequency", { ascending: false })
          .limit(50);

        return jsonResponse({ success: true, patterns: patterns || [] });
      }

      // ══════════════════════════════════════════
      // GET EFFECTIVENESS
      // ══════════════════════════════════════════
      case "get_effectiveness": {
        const { data: effectiveness } = await sc
          .from("strategy_effectiveness")
          .select("*")
          .eq("organization_id", organization_id)
          .order("attempts_total", { ascending: false })
          .limit(50);

        return jsonResponse({ success: true, effectiveness: effectiveness || [] });
      }

      // ══════════════════════════════════════════
      // GET CANDIDATES
      // ══════════════════════════════════════════
      case "get_candidates": {
        const { data: candidates } = await sc
          .from("prevention_rule_candidates")
          .select("*, error_patterns(title, error_category, frequency)")
          .eq("organization_id", organization_id)
          .order("confidence_score", { ascending: false })
          .limit(30);

        return jsonResponse({ success: true, candidates: candidates || [] });
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (e) {
    console.error("Error Pattern Library Engine error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
