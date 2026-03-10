import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { computeKernelSnapshot } from "../_shared/kernel-integrity/kernel-integrity-snapshotter.ts";
import { detectCorrosion } from "../_shared/kernel-integrity/corrosion-signal-detector.ts";
import { analyzeBloat } from "../_shared/kernel-integrity/architectural-bloat-analyzer.ts";
import { detectExistentialDrift } from "../_shared/kernel-integrity/existential-drift-detector.ts";
import { scoreLegibility } from "../_shared/kernel-integrity/legibility-scorer.ts";
import { checkGovernanceIntegrity } from "../_shared/kernel-integrity/governance-integrity-checker.ts";
import { recommendProtection } from "../_shared/kernel-integrity/kernel-protection-recommender.ts";
import { explainKernelIntegrity, explainPosture } from "../_shared/kernel-integrity/anti-corrosion-explainer.ts";
import { resolveProtectedDomains } from "../_shared/kernel-integrity/kernel-boundary-registry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { action, organization_id, payload } = await req.json();

    switch (action) {
      case "snapshot_kernel_integrity": {
        const snapshot = computeKernelSnapshot(payload);
        const domains = resolveProtectedDomains();
        const { error } = await supabase.from("kernel_integrity_snapshots").insert({
          organization_id,
          kernel_identity_version: payload.kernel_identity_version || "1.0",
          protected_domains: domains,
          ...snapshot,
        });
        if (error) throw error;
        return new Response(JSON.stringify({ snapshot, domains }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "analyze_corrosion": {
        const result = detectCorrosion(payload);
        if (result.corrosion_score > 0.3) {
          await supabase.from("corrosion_signals").insert({
            organization_id,
            signal_type: "composite_corrosion",
            severity: result.severity,
            affected_domain: "kernel",
            description: `Corrosion detected: ${result.signals.map(s => s.type).join(", ")}`,
            corrosion_score: result.corrosion_score,
            evidence_refs: result.signals,
          });
        }
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "analyze_bloat": {
        const result = analyzeBloat(payload);
        if (result.bloat_score > 0.3) {
          await supabase.from("architectural_bloat_indicators").insert({
            organization_id,
            indicator_type: "composite_bloat",
            affected_layer: "architecture",
            description: result.recommendation,
            bloat_score: result.bloat_score,
            net_value_score: result.net_value_score,
            evidence_refs: result.indicators,
            recommendation: result.recommendation,
          });
        }
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "detect_existential_drift": {
        const result = detectExistentialDrift(payload);
        if (result.drift_score > 0.15) {
          await supabase.from("existential_drift_cases").insert({
            organization_id,
            drift_type: result.severity,
            violated_principle: result.violated_principles.join(", ") || "none",
            description: result.rationale.join("; "),
            drift_score: result.drift_score,
            severity: result.severity === "existential" ? "critical" : result.severity === "active" ? "high" : result.severity === "emerging" ? "moderate" : "low",
            remediation_path: result.remediation_path,
          });
        }
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "evaluate_legibility": {
        const result = scoreLegibility(payload);
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "evaluate_governance_integrity": {
        const result = checkGovernanceIntegrity(payload);
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "recommend_protection_action": {
        const result = recommendProtection(payload);
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "submit_kernel_review": {
        const { error } = await supabase.from("kernel_protection_reviews").insert({
          organization_id,
          snapshot_id: payload.snapshot_id,
          reviewer_id: payload.reviewer_id,
          review_type: payload.review_type || "routine",
          review_scope: payload.review_scope || "full",
          findings: payload.findings || [],
          recommendations: payload.recommendations || [],
          overall_posture: payload.overall_posture || "healthy",
          status: "pending",
          review_notes: payload.review_notes || "",
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "explain_kernel_posture": {
        const info = explainKernelIntegrity();
        const narrative = payload?.scores ? explainPosture(payload.posture || "unknown", payload.scores) : "";
        return new Response(JSON.stringify({ ...info, narrative }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
