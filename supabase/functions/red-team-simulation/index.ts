import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runScenario } from "../_shared/red-team/red-team-scenario-runner.ts";
import { validateSandbox, getDefaultSandboxConfig } from "../_shared/red-team/adversarial-sandbox-engine.ts";
import { computeFragilityScore } from "../_shared/red-team/fragility-scorer.ts";
import { detectBreach } from "../_shared/red-team/breach-detector.ts";
import { explainSimulation } from "../_shared/red-team/simulation-explainer.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    // 1. Authenticate + rate limit
    const authResult = await authenticateWithRateLimit(req, "red-team-simulation");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient } = authResult;

    const body = await req.json();
    const { action, ...params } = body;

    // 2. Resolve & validate org
    const { orgId, error: orgError } = await resolveAndValidateOrg(
      serviceClient, user.id, params.organization_id
    );
    if (orgError || !orgId) {
      return errorResponse(orgError || "Organization access denied", 403, req);
    }

    // 3. Audit
    await logSecurityAudit(serviceClient, {
      organization_id: orgId,
      actor_id: user.id,
      function_name: "red-team-simulation",
      action,
      context: { params_keys: Object.keys(params) },
    });

    switch (action) {
      case "list_exercises": {
        const { data, error } = await serviceClient
          .from("red_team_exercises")
          .select("*")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return jsonResponse({ exercises: data }, 200, req);
      }

      case "list_scenarios": {
        const { data, error } = await serviceClient
          .from("red_team_scenarios")
          .select("*")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        return jsonResponse({ scenarios: data }, 200, req);
      }

      case "list_runs": {
        const { data, error } = await serviceClient
          .from("red_team_simulation_runs")
          .select("*")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return jsonResponse({ runs: data }, 200, req);
      }

      case "list_findings": {
        const { data, error } = await serviceClient
          .from("red_team_findings")
          .select("*")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        return jsonResponse({ findings: data }, 200, req);
      }

      case "list_reviews": {
        const { data, error } = await serviceClient
          .from("red_team_review_queue")
          .select("*")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return jsonResponse({ reviews: data }, 200, req);
      }

      case "run_simulation": {
        const sandboxConfig = getDefaultSandboxConfig();
        const validation = validateSandbox(sandboxConfig);
        if (!validation.permitted) {
          return jsonResponse({ error: "Sandbox validation failed", violations: validation.violations }, 400, req);
        }

        const scenarioResult = runScenario({
          scenario_type: params.scenario_type ?? "invalid_contract_input_pressure",
          target_surface: params.target_surface ?? "general",
          threat_domain: params.threat_domain ?? "unknown",
          sandbox_mode: true,
          simulation_scope: "bounded",
        });

        const fragilityResult = computeFragilityScore({
          resisted_count: scenarioResult.resisted.length,
          failed_count: scenarioResult.failed.length,
          fragile_count: scenarioResult.fragile.length,
          breach_detected: scenarioResult.breach_detected,
          scenario_severity: params.severity ?? "medium",
        });

        const breachResult = detectBreach({
          run_log: scenarioResult.run_log,
          failed_items: scenarioResult.failed,
          fragile_items: scenarioResult.fragile,
          threat_domain: params.threat_domain ?? "unknown",
        });

        const explanation = explainSimulation({
          scenario_type: params.scenario_type ?? "invalid_contract_input_pressure",
          target_surface: params.target_surface ?? "general",
          threat_domain: params.threat_domain ?? "unknown",
          resisted: scenarioResult.resisted,
          failed: scenarioResult.failed,
          fragile: scenarioResult.fragile,
          breach_detected: breachResult.breach_detected,
          fragility_score: fragilityResult.score,
        });

        await logSecurityAudit(serviceClient, {
          organization_id: orgId,
          actor_id: user.id,
          function_name: "red-team-simulation",
          action: "simulation_executed",
          context: {
            scenario_type: params.scenario_type,
            breach_detected: breachResult.breach_detected,
            fragility_score: fragilityResult.score,
          },
        });

        return jsonResponse({
          scenario_result: scenarioResult,
          fragility: fragilityResult,
          breach: breachResult,
          explanation,
          sandbox_validation: validation,
        }, 200, req);
      }

      case "overview": {
        const [exercises, runs, findings, reviews] = await Promise.all([
          serviceClient.from("red_team_exercises").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
          serviceClient.from("red_team_simulation_runs").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
          serviceClient.from("red_team_findings").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
          serviceClient.from("red_team_review_queue").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "pending"),
        ]);

        return jsonResponse({
          total_exercises: exercises.count ?? 0,
          total_runs: runs.count ?? 0,
          total_findings: findings.count ?? 0,
          pending_reviews: reviews.count ?? 0,
        }, 200, req);
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400, req);
    }
  } catch (err) {
    console.error("[red-team-simulation] Error:", err);
    return errorResponse(err.message, 500, req);
  }
});
