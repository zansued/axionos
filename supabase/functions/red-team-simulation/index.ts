import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runScenario } from "../_shared/red-team/red-team-scenario-runner.ts";
import { validateSandbox, getDefaultSandboxConfig } from "../_shared/red-team/adversarial-sandbox-engine.ts";
import { computeFragilityScore } from "../_shared/red-team/fragility-scorer.ts";
import { detectBreach } from "../_shared/red-team/breach-detector.ts";
import { explainSimulation } from "../_shared/red-team/simulation-explainer.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";
import {
  validateSchema, validationErrorResponse, logValidationFailure,
  COMMON_ACTIONS, COMMON_FIELDS,
  type Schema,
} from "../_shared/input-validation.ts";

// ─── Input Schemas ───

const BASE_SCHEMA: Schema = {
  action: COMMON_FIELDS.action(COMMON_ACTIONS.RED_TEAM),
  organization_id: COMMON_FIELDS.organization_id,
};

const SIMULATION_SCHEMA: Schema = {
  ...BASE_SCHEMA,
  scenario_type: COMMON_FIELDS.safe_string(200),
  target_surface: COMMON_FIELDS.safe_string(200),
  threat_domain: COMMON_FIELDS.safe_string(200),
  severity: COMMON_FIELDS.severity,
};

function getSchemaForAction(action: string): Schema {
  if (action === "run_simulation") return SIMULATION_SCHEMA;
  return BASE_SCHEMA;
}

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    // 1. Authenticate + rate limit
    const authResult = await authenticateWithRateLimit(req, "red-team-simulation");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient } = authResult;

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return errorResponse("Invalid JSON body", 400, req); }

    // 2. Validate action
    const actionCheck = validateSchema(body, { action: COMMON_FIELDS.action(COMMON_ACTIONS.RED_TEAM) });
    if (!actionCheck.valid) {
      await logValidationFailure(serviceClient, { actor_id: user.id, function_name: "red-team-simulation", errors: actionCheck.errors });
      return validationErrorResponse(actionCheck.errors, req);
    }

    const action = body.action as string;
    const params = body;

    // 3. Full schema validation
    const schema = getSchemaForAction(action);
    const validation = validateSchema(body, schema);
    if (!validation.valid) {
      await logValidationFailure(serviceClient, { actor_id: user.id, function_name: "red-team-simulation", errors: validation.errors });
      return validationErrorResponse(validation.errors, req);
    }

    // 4. Resolve & validate org
    const { orgId, error: orgError } = await resolveAndValidateOrg(serviceClient, user.id, params.organization_id as string | undefined);
    if (orgError || !orgId) return errorResponse(orgError || "Organization access denied", 403, req);

    // 5. Audit
    await logSecurityAudit(serviceClient, {
      organization_id: orgId, actor_id: user.id,
      function_name: "red-team-simulation", action,
      context: { params_keys: Object.keys(params) },
    });

    switch (action) {
      case "list_exercises": {
        const { data, error } = await serviceClient.from("red_team_exercises").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return jsonResponse({ exercises: data }, 200, req);
      }
      case "list_scenarios": {
        const { data, error } = await serviceClient.from("red_team_scenarios").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(100);
        if (error) throw error;
        return jsonResponse({ scenarios: data }, 200, req);
      }
      case "list_runs": {
        const { data, error } = await serviceClient.from("red_team_simulation_runs").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return jsonResponse({ runs: data }, 200, req);
      }
      case "list_findings": {
        const { data, error } = await serviceClient.from("red_team_findings").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(100);
        if (error) throw error;
        return jsonResponse({ findings: data }, 200, req);
      }
      case "list_reviews": {
        const { data, error } = await serviceClient.from("red_team_review_queue").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return jsonResponse({ reviews: data }, 200, req);
      }
      case "run_simulation": {
        const sandboxConfig = getDefaultSandboxConfig();
        const sandboxValidation = validateSandbox(sandboxConfig);
        if (!sandboxValidation.permitted) {
          return jsonResponse({ error: "Sandbox validation failed", violations: sandboxValidation.violations }, 400, req);
        }

        const scenarioResult = runScenario({
          scenario_type: (params.scenario_type as string) ?? "invalid_contract_input_pressure",
          target_surface: (params.target_surface as string) ?? "general",
          threat_domain: (params.threat_domain as string) ?? "unknown",
          sandbox_mode: true, simulation_scope: "bounded",
        });

        const fragilityResult = computeFragilityScore({
          resisted_count: scenarioResult.resisted.length,
          failed_count: scenarioResult.failed.length,
          fragile_count: scenarioResult.fragile.length,
          breach_detected: scenarioResult.breach_detected,
          scenario_severity: (params.severity as string) ?? "medium",
        });

        const breachResult = detectBreach({
          run_log: scenarioResult.run_log, failed_items: scenarioResult.failed,
          fragile_items: scenarioResult.fragile, threat_domain: (params.threat_domain as string) ?? "unknown",
        });

        const explanation = explainSimulation({
          scenario_type: (params.scenario_type as string) ?? "invalid_contract_input_pressure",
          target_surface: (params.target_surface as string) ?? "general",
          threat_domain: (params.threat_domain as string) ?? "unknown",
          resisted: scenarioResult.resisted, failed: scenarioResult.failed,
          fragile: scenarioResult.fragile, breach_detected: breachResult.breach_detected,
          fragility_score: fragilityResult.score,
        });

        await logSecurityAudit(serviceClient, {
          organization_id: orgId, actor_id: user.id,
          function_name: "red-team-simulation", action: "simulation_executed",
          context: { scenario_type: params.scenario_type, breach_detected: breachResult.breach_detected, fragility_score: fragilityResult.score },
        });

        return jsonResponse({ scenario_result: scenarioResult, fragility: fragilityResult, breach: breachResult, explanation, sandbox_validation: sandboxValidation }, 200, req);
      }
      case "overview": {
        const [exercises, runs, findings, reviews] = await Promise.all([
          serviceClient.from("red_team_exercises").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
          serviceClient.from("red_team_simulation_runs").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
          serviceClient.from("red_team_findings").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
          serviceClient.from("red_team_review_queue").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "pending"),
        ]);
        return jsonResponse({ total_exercises: exercises.count ?? 0, total_runs: runs.count ?? 0, total_findings: findings.count ?? 0, pending_reviews: reviews.count ?? 0 }, 200, req);
      }
      default:
        return errorResponse(`Unknown action: ${action}`, 400, req);
    }
  } catch (err) {
    console.error("[red-team-simulation] Error:", err);
    return errorResponse(err.message, 500, req);
  }
});
