import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";
import { mapSecuritySurfaces } from "../_shared/security-intelligence/security-surface-mapper.ts";
import { classifyThreatDomains, getCompositeRiskScore } from "../_shared/security-intelligence/threat-domain-classifier.ts";
import { computeExposureScore } from "../_shared/security-intelligence/exposure-score-engine.ts";
import { explainRisk } from "../_shared/security-intelligence/security-boundary-explainer.ts";

/**
 * Security Intelligence Engine
 * Auth hardened — Sprint 200
 */

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const authResult = await authenticateWithRateLimit(req, "security-intelligence");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient: supabase } = authResult;

    const { action, organization_id: payloadOrgId } = await req.json();

    const { orgId: organization_id, error: orgError } = await resolveAndValidateOrg(supabase, user.id, payloadOrgId);
    if (orgError || !organization_id) return errorResponse(orgError || "Organization access denied", 403, req);

    await logSecurityAudit(supabase, {
      organization_id, actor_id: user.id,
      function_name: "security-intelligence", action: action || "unknown",
    });

    let result: unknown;

    switch (action) {
      case "overview": {
        const [surfaces, threats, exposures, contracts, tenantBoundaries, runtimeBoundaries, reviews] = await Promise.all([
          supabase.from("security_surfaces").select("*").eq("organization_id", organization_id).order("exposure_score", { ascending: false }),
          supabase.from("threat_domains").select("*").eq("organization_id", organization_id),
          supabase.from("exposure_scores").select("*").eq("organization_id", organization_id).order("composite_risk", { ascending: false }),
          supabase.from("contract_risk_profiles").select("*").eq("organization_id", organization_id),
          supabase.from("tenant_boundary_surfaces").select("*").eq("organization_id", organization_id),
          supabase.from("runtime_security_boundaries").select("*").eq("organization_id", organization_id),
          supabase.from("security_surface_reviews").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }),
        ]);
        result = {
          surfaces: surfaces.data || [],
          threats: threats.data || [],
          exposures: exposures.data || [],
          contracts: contracts.data || [],
          tenantBoundaries: tenantBoundaries.data || [],
          runtimeBoundaries: runtimeBoundaries.data || [],
          reviews: reviews.data || [],
          totalSurfaces: (surfaces.data || []).length,
          totalThreats: (threats.data || []).length,
          criticalExposures: (exposures.data || []).filter((e: any) => e.composite_risk >= 0.75).length,
          pendingReviews: (reviews.data || []).filter((r: any) => r.verdict === "pending").length,
        };
        break;
      }

      case "map_surfaces": {
        const canonical = mapSecuritySurfaces();
        result = canonical;
        break;
      }

      case "classify_threats": {
        const threats = classifyThreatDomains();
        result = threats.map(t => ({ ...t, composite_risk: getCompositeRiskScore(t) }));
        break;
      }

      case "compute_exposure": {
        const { data: surfaces } = await supabase.from("security_surfaces").select("*").eq("organization_id", organization_id);
        const threats = classifyThreatDomains();
        const threatMap = new Map(threats.map(t => [t.threat_type, t]));

        result = (surfaces || []).map((s: any) => {
          const threat = threatMap.get(s.threat_domain);
          const exposure = computeExposureScore({
            exposure_score: s.exposure_score || 0,
            blast_radius_estimate: s.blast_radius_estimate || 0,
            tenant_sensitivity: s.tenant_sensitivity || 0,
            rollback_sensitivity: s.rollback_sensitivity || 0,
            threat_likelihood: threat?.likelihood_score || 0.2,
            threat_impact: threat?.impact_score || 0.5,
          });
          return { surface_id: s.id, surface_name: s.surface_name, ...exposure };
        });
        break;
      }

      case "explain_surface": {
        const { surface_id } = await req.json();
        const { data: surface } = await supabase.from("security_surfaces").select("*").eq("id", surface_id).single();
        if (!surface) { result = { explanation: "Surface not found" }; break; }
        const explanation = explainRisk({
          surface_name: surface.surface_name,
          threat_domain: surface.threat_domain,
          composite_risk: surface.exposure_score,
          risk_class: surface.exposure_score >= 0.75 ? "critical" : surface.exposure_score >= 0.5 ? "high" : surface.exposure_score >= 0.25 ? "moderate" : "low",
          factors: [],
        });
        result = { explanation };
        break;
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400, req);
    }

    return jsonResponse({ data: result }, 200, req);
  } catch (err: any) {
    return errorResponse(err.message || "Internal error", 500, req);
  }
});
