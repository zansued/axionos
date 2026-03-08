import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticate } from "../_shared/auth.ts";
import { deriveRoleFromOrgRole, getRoleModel, CANONICAL_ROLES, RoleName } from "../_shared/role-based-experience/role-experience-model-manager.ts";
import { getNavigationForRole, getObservabilityTabsForRole } from "../_shared/role-based-experience/role-navigation-orchestrator.ts";
import { getPermissionsForRole } from "../_shared/role-based-experience/role-surface-permission-engine.ts";
import { getInformationLayers } from "../_shared/role-based-experience/role-information-layer-manager.ts";
import { detectLeakage, computeLeakageScore } from "../_shared/role-based-experience/complexity-leakage-detector.ts";
import { computeQualityMetrics } from "../_shared/role-based-experience/role-experience-quality-analyzer.ts";
import { getRecentOutcomes } from "../_shared/role-based-experience/role-experience-outcome-validator.ts";
import { explainAllRoles, explainRole } from "../_shared/role-based-experience/role-based-experience-explainer.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authResult = await authenticate(req);
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient } = authResult;

    const { action, organization_id, role_name } = await req.json();
    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    switch (action) {
      case "overview": {
        const roles: RoleName[] = ["default_user", "operator", "admin"];
        const overview = roles.map(r => {
          const nav = getNavigationForRole(r);
          const allSurfaces = [...nav.main, ...nav.bottom].map(i => i.key);
          const metrics = computeQualityMetrics(r, allSurfaces);
          return { role: r, nav_items: allSurfaces.length, metrics };
        });
        return json({ overview });
      }

      case "define_role_models": {
        const roles: RoleName[] = ["default_user", "operator", "admin"];
        const models = roles.map(r => CANONICAL_ROLES[r]);
        return json({ models });
      }

      case "evaluate_navigation": {
        const targetRole = (role_name as RoleName) || "default_user";
        const nav = getNavigationForRole(targetRole);
        const obsTabs = getObservabilityTabsForRole(targetRole);
        return json({
          role: targetRole,
          navigation: nav,
          observability_tabs: obsTabs === "all" ? "all" : Array.from(obsTabs),
        });
      }

      case "evaluate_permissions": {
        const targetRole = (role_name as RoleName) || "default_user";
        const perms = getPermissionsForRole(targetRole);
        return json({ role: targetRole, permissions: perms });
      }

      case "evaluate_information_layers": {
        const targetRole = (role_name as RoleName) || "default_user";
        const layers = getInformationLayers(targetRole);
        return json({ role: targetRole, information_layers: layers });
      }

      case "detect_complexity_leakage": {
        const targetRole = (role_name as RoleName) || "default_user";
        const nav = getNavigationForRole(targetRole);
        const allSurfaces = [...nav.main, ...nav.bottom].map(i => i.key);
        const signals = detectLeakage(targetRole, allSurfaces);
        const score = computeLeakageScore(targetRole, allSurfaces);
        return json({ role: targetRole, leakage_signals: signals, leakage_score: score });
      }

      case "role_experience_outcomes": {
        const outcomes = await getRecentOutcomes(serviceClient, organization_id);
        return json({ outcomes });
      }

      case "explain": {
        const targetRole = role_name as RoleName | undefined;
        if (targetRole) {
          return json({ explanation: explainRole(targetRole) });
        }
        return json({ explanations: explainAllRoles() });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
