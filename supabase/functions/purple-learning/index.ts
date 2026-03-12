import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { synthesizeLearning } from "../_shared/purple-learning/purple-learning-synthesizer.ts";
import { buildPattern } from "../_shared/purple-learning/security-pattern-builder.ts";
import { detectAntiPatterns } from "../_shared/purple-learning/security-anti-pattern-detector.ts";
import { generateSecureDevFeedback } from "../_shared/purple-learning/secure-dev-feedback-engine.ts";
import { explainSecurityCanon } from "../_shared/purple-learning/security-canon-explainer.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    // 1. Authenticate + rate limit
    const authResult = await authenticateWithRateLimit(req, "purple-learning");
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
      function_name: "purple-learning",
      action,
      context: { params_keys: Object.keys(params) },
    });

    switch (action) {
      case "overview": {
        const [candidates, patterns, antiPatterns, checklists, rules, reviews] = await Promise.all([
          serviceClient.from("security_canon_candidates").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
          serviceClient.from("security_pattern_entries").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
          serviceClient.from("security_anti_patterns").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
          serviceClient.from("secure_development_checklists").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
          serviceClient.from("security_validation_rules").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
          serviceClient.from("purple_learning_reviews").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("decision", "pending"),
        ]);
        return jsonResponse({
          total_candidates: candidates.count ?? 0,
          total_patterns: patterns.count ?? 0,
          total_anti_patterns: antiPatterns.count ?? 0,
          total_checklists: checklists.count ?? 0,
          total_rules: rules.count ?? 0,
          pending_reviews: reviews.count ?? 0,
        }, 200, req);
      }

      case "list_candidates": {
        const { data, error } = await serviceClient.from("security_canon_candidates").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return jsonResponse({ candidates: data }, 200, req);
      }

      case "list_patterns": {
        const { data, error } = await serviceClient.from("security_pattern_entries").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return jsonResponse({ patterns: data }, 200, req);
      }

      case "list_anti_patterns": {
        const { data, error } = await serviceClient.from("security_anti_patterns").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return jsonResponse({ anti_patterns: data }, 200, req);
      }

      case "list_checklists": {
        const { data, error } = await serviceClient.from("secure_development_checklists").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return jsonResponse({ checklists: data }, 200, req);
      }

      case "list_rules": {
        const { data, error } = await serviceClient.from("security_validation_rules").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return jsonResponse({ rules: data }, 200, req);
      }

      case "list_reviews": {
        const { data, error } = await serviceClient.from("purple_learning_reviews").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return jsonResponse({ reviews: data }, 200, req);
      }

      case "synthesize": {
        const candidates = synthesizeLearning({
          incident_type: params.incident_type ?? "contract_anomaly",
          severity: params.severity ?? "medium",
          target_surface: params.target_surface ?? "general",
          what_resisted: params.what_resisted ?? [],
          what_failed: params.what_failed ?? [],
          what_was_fragile: params.what_was_fragile ?? [],
          response_actions: params.response_actions ?? [],
          threat_domain: params.threat_domain ?? "unknown",
        });
        const patterns = candidates.map(c => buildPattern(c));
        const antiPatterns = detectAntiPatterns({
          failed_items: params.what_failed ?? [],
          fragile_items: params.what_was_fragile ?? [],
          incident_type: params.incident_type ?? "contract_anomaly",
          severity: params.severity ?? "medium",
        });

        await logSecurityAudit(serviceClient, {
          organization_id: orgId,
          actor_id: user.id,
          function_name: "purple-learning",
          action: "synthesis_executed",
          context: { candidates_count: candidates.length, anti_patterns_count: antiPatterns.length },
        });

        return jsonResponse({ candidates, patterns, anti_patterns: antiPatterns }, 200, req);
      }

      case "get_secure_dev_feedback": {
        const feedback = generateSecureDevFeedback({
          agent_type: params.agent_type ?? "BuildAgent",
          task_domain: params.task_domain ?? "general",
          stack: params.stack,
        });
        return jsonResponse({ feedback }, 200, req);
      }

      case "explain_pattern": {
        const explanation = explainSecurityCanon({
          pattern_type: params.pattern_type ?? "secure_implementation_pattern",
          title: params.title ?? "",
          summary: params.summary ?? "",
          agent_types: params.agent_types ?? [],
          confidence_score: params.confidence_score ?? 0,
          status: params.status ?? "active",
        });
        return jsonResponse({ explanation }, 200, req);
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400, req);
    }
  } catch (err) {
    console.error("[purple-learning] Error:", err);
    return errorResponse(err.message, 500, req);
  }
});
