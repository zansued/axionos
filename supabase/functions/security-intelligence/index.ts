import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { mapSecuritySurfaces } from "../_shared/security-intelligence/security-surface-mapper.ts";
import { classifyThreatDomains, getCompositeRiskScore } from "../_shared/security-intelligence/threat-domain-classifier.ts";
import { computeExposureScore } from "../_shared/security-intelligence/exposure-score-engine.ts";
import { explainRisk } from "../_shared/security-intelligence/security-boundary-explainer.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

    const { action, organization_id } = await req.json();
    if (!organization_id) return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: corsHeaders });

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
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ data: result }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
