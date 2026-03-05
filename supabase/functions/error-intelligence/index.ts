import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";

/**
 * Error Intelligence Engine — AxionOS
 *
 * Analyzes error patterns ACROSS ALL projects to generate
 * prevention rules that improve generation quality over time.
 *
 * Actions:
 *   analyze_patterns  — scan recent errors and generate org-wide prevention rules
 *   get_radar         — return current error radar (top patterns, stats)
 *   get_metrics       — build success rate, avg repair attempts, etc.
 */

const MIN_PATTERN_COUNT = 2; // min occurrences before generating a rule

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const webhookSecret = Deno.env.get("SYNKRAIOS_WEBHOOK_SECRET");

    if (!serviceRoleKey) return errorResponse("Missing service role key", 500);

    // Auth: service role OR webhook secret OR user JWT
    const isService = authHeader === `Bearer ${serviceRoleKey}`;
    const isWebhook = webhookSecret && authHeader === `Bearer ${webhookSecret}`;

    let userId = "system";
    const sc = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

    if (!isService && !isWebhook) {
      const uc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader || "" } },
      });
      const { data: { user }, error } = await uc.auth.getUser();
      if (error || !user) return errorResponse("Unauthorized", 401);
      userId = user.id;
    }

    const body = await req.json();
    const { action, organization_id } = body;
    if (!action) return errorResponse("action is required", 400);
    if (!organization_id) return errorResponse("organization_id is required", 400);

    switch (action) {
      // ══════════════════════════════════════════
      // ANALYZE PATTERNS — scan errors, generate prevention rules
      // ══════════════════════════════════════════
      case "analyze_patterns": {
        // 1. Fetch recent unfixed + fixed errors across org
        const { data: errors } = await sc
          .from("project_errors")
          .select("id, error_type, error_message, file_path, root_cause, prevention_rule, fixed, initiative_id")
          .eq("organization_id", organization_id)
          .order("detected_at", { ascending: false })
          .limit(500);

        if (!errors?.length) {
          return jsonResponse({ success: true, patterns: 0, rules_created: 0, message: "No errors to analyze" });
        }

        // 2. Group by error_type + simplified message pattern
        const patternMap: Record<string, {
          count: number;
          fixed_count: number;
          files: Set<string>;
          messages: string[];
          prevention_rules: string[];
          error_ids: string[];
          initiatives: Set<string>;
        }> = {};

        for (const err of errors) {
          // Normalize error message to extract pattern
          const normalizedMsg = normalizeErrorMessage(err.error_message);
          const patternKey = `${err.error_type}::${normalizedMsg}`;

          if (!patternMap[patternKey]) {
            patternMap[patternKey] = {
              count: 0, fixed_count: 0,
              files: new Set(), messages: [], prevention_rules: [],
              error_ids: [], initiatives: new Set(),
            };
          }
          const p = patternMap[patternKey];
          p.count++;
          if (err.fixed) p.fixed_count++;
          if (err.file_path) p.files.add(err.file_path);
          if (p.messages.length < 5) p.messages.push(err.error_message.slice(0, 200));
          if (err.prevention_rule) p.prevention_rules.push(err.prevention_rule);
          p.error_ids.push(err.id);
          if (err.initiative_id) p.initiatives.add(err.initiative_id);
        }

        // 3. Filter patterns with MIN_PATTERN_COUNT occurrences
        const significantPatterns = Object.entries(patternMap)
          .filter(([, v]) => v.count >= MIN_PATTERN_COUNT)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 30);

        if (significantPatterns.length === 0) {
          return jsonResponse({ success: true, patterns: 0, rules_created: 0, message: "No recurring patterns found" });
        }

        // 4. Use AI to generate prevention rules for patterns without existing rules
        const patternsNeedingRules = significantPatterns.filter(
          ([, v]) => v.prevention_rules.length === 0
        ).slice(0, 15);

        let aiRulesCreated = 0;
        const apiKey = Deno.env.get("LOVABLE_API_KEY") || "";

        if (patternsNeedingRules.length > 0 && apiKey) {
          const patternsSummary = patternsNeedingRules.map(([key, v]) => ({
            pattern: key,
            count: v.count,
            fixed: v.fixed_count,
            affected_files: [...v.files].slice(0, 5),
            sample_messages: v.messages.slice(0, 3),
            across_projects: v.initiatives.size,
          }));

          try {
            const aiResult = await callAI(apiKey,
              `You are the AxionOS Error Intelligence Engine. Analyze recurring build error patterns and generate prevention rules.
Each rule must be actionable and specific — it tells code generation agents what to DO or AVOID.
Return ONLY valid JSON.`,
              `Analyze these ${patternsNeedingRules.length} recurring error patterns and generate prevention rules:

${JSON.stringify(patternsSummary, null, 2)}

Return:
{
  "rules": [
    {
      "pattern_key": "the pattern key from input",
      "prevention_rule": "Clear actionable rule for agents to follow",
      "confidence": 0.5 to 1.0 based on pattern frequency and clarity,
      "scope": "organization" or "initiative"
    }
  ]
}`,
              true
            );

            const parsed = JSON.parse(aiResult.content);
            for (const rule of (parsed.rules || [])) {
              const patternEntry = patternMap[rule.pattern_key];
              if (!patternEntry) continue;

              await sc.from("project_prevention_rules").insert({
                initiative_id: [...patternEntry.initiatives][0] || null,
                organization_id,
                error_pattern: rule.pattern_key.split("::")[1] || rule.pattern_key,
                prevention_rule: rule.prevention_rule,
                scope: rule.scope || "organization",
                confidence_score: rule.confidence || 0.5,
                source_error_id: patternEntry.error_ids[0] || null,
                times_triggered: patternEntry.count,
              });
              aiRulesCreated++;
            }
          } catch (e) {
            console.error("AI rule generation failed:", e);
          }
        }

        // 5. Bump existing rules that match recurring patterns
        let existingRulesBumped = 0;
        for (const [, v] of significantPatterns) {
          if (v.prevention_rules.length > 0) {
            // Already has rules — bump confidence on matching prevention_rules table entries
            const { data: existingRules } = await sc
              .from("project_prevention_rules")
              .select("id, confidence_score, times_triggered")
              .eq("organization_id", organization_id)
              .in("source_error_id", v.error_ids.slice(0, 10))
              .limit(5);

            for (const rule of (existingRules || [])) {
              await sc.from("project_prevention_rules").update({
                confidence_score: Math.min((rule.confidence_score || 0.5) + 0.05, 1.0),
                times_triggered: v.count,
                last_triggered_at: new Date().toISOString(),
              }).eq("id", rule.id);
              existingRulesBumped++;
            }
          }
        }

        return jsonResponse({
          success: true,
          total_errors_analyzed: errors.length,
          patterns: significantPatterns.length,
          rules_created: aiRulesCreated,
          rules_bumped: existingRulesBumped,
          top_patterns: significantPatterns.slice(0, 10).map(([key, v]) => ({
            pattern: key,
            count: v.count,
            fixed_rate: v.count > 0 ? (v.fixed_count / v.count * 100).toFixed(0) + "%" : "0%",
            across_projects: v.initiatives.size,
          })),
        });
      }

      // ══════════════════════════════════════════
      // GET RADAR — current error intelligence snapshot
      // ══════════════════════════════════════════
      case "get_radar": {
        // Top prevention rules (org-wide)
        const { data: rules } = await sc
          .from("project_prevention_rules")
          .select("*")
          .eq("organization_id", organization_id)
          .order("confidence_score", { ascending: false })
          .limit(50);

        // Recent error stats
        const { data: recentErrors } = await sc
          .from("project_errors")
          .select("error_type, fixed")
          .eq("organization_id", organization_id)
          .order("detected_at", { ascending: false })
          .limit(200);

        const errorsByType: Record<string, { total: number; fixed: number }> = {};
        for (const err of (recentErrors || [])) {
          if (!errorsByType[err.error_type]) errorsByType[err.error_type] = { total: 0, fixed: 0 };
          errorsByType[err.error_type].total++;
          if (err.fixed) errorsByType[err.error_type].fixed++;
        }

        return jsonResponse({
          success: true,
          rules: rules || [],
          error_distribution: errorsByType,
          total_rules: (rules || []).length,
          high_confidence_rules: (rules || []).filter((r: any) => r.confidence_score >= 0.8).length,
        });
      }

      // ══════════════════════════════════════════
      // GET METRICS — build success tracking
      // ══════════════════════════════════════════
      case "get_metrics": {
        // Count initiatives by stage_status
        const { data: initiatives } = await sc
          .from("initiatives")
          .select("id, stage_status, execution_progress")
          .eq("organization_id", organization_id)
          .order("updated_at", { ascending: false })
          .limit(100);

        let totalBuilds = 0;
        let successfulBuilds = 0;
        let totalRepairAttempts = 0;
        let buildsWith0Repairs = 0;

        for (const init of (initiatives || [])) {
          const ep = (init.execution_progress || {}) as any;
          if (ep.ci_status) {
            totalBuilds++;
            if (ep.ci_status === "success") successfulBuilds++;
            const attempts = ep.self_healing_attempt || 0;
            totalRepairAttempts += attempts;
            if (attempts === 0 && ep.ci_status === "success") buildsWith0Repairs++;
          }
        }

        const { count: totalErrors } = await sc
          .from("project_errors")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organization_id);

        const { count: totalRules } = await sc
          .from("project_prevention_rules")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organization_id);

        return jsonResponse({
          success: true,
          metrics: {
            build_success_rate: totalBuilds > 0 ? ((successfulBuilds / totalBuilds) * 100).toFixed(1) + "%" : "N/A",
            avg_repair_attempts: totalBuilds > 0 ? (totalRepairAttempts / totalBuilds).toFixed(1) : "0",
            zero_repair_builds: buildsWith0Repairs,
            total_builds_tracked: totalBuilds,
            total_errors_detected: totalErrors || 0,
            total_prevention_rules: totalRules || 0,
            first_time_success_rate: totalBuilds > 0
              ? ((buildsWith0Repairs / totalBuilds) * 100).toFixed(1) + "%"
              : "N/A",
          },
        });
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (e) {
    console.error("Error Intelligence Engine error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});

/** Normalize error message to find recurring patterns (strips file-specific details) */
function normalizeErrorMessage(msg: string): string {
  return msg
    .replace(/['"]([^'"]+\.(tsx?|jsx?|json|css|html))['"]/g, '"<FILE>"') // file paths
    .replace(/\b[a-f0-9]{7,40}\b/g, "<HASH>") // git SHAs
    .replace(/:\d+:\d+/g, ":<L>:<C>") // line:col
    .replace(/\d+\.\d+\.\d+/g, "<VER>") // semver
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);
}
