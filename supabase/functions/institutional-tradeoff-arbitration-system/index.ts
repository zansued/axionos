import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { resolveActiveConstitution, resolveActiveDimensions, getDefaultDimensions } from "../_shared/tradeoff-arbitration/tradeoff-dimension-resolver.ts";
import { listTradeoffSubjects } from "../_shared/tradeoff-arbitration/tradeoff-subject-mapper.ts";
import { analyzeGainSacrifice } from "../_shared/tradeoff-arbitration/gain-sacrifice-analyzer.ts";
import { assessCompromiseRisk } from "../_shared/tradeoff-arbitration/compromise-risk-assessor.ts";
import { evaluateReversibility } from "../_shared/tradeoff-arbitration/reversibility-evaluator.ts";
import { generateArbitrationRecommendations } from "../_shared/tradeoff-arbitration/tradeoff-arbitration-engine.ts";
import { explainTradeoff } from "../_shared/tradeoff-arbitration/tradeoff-explainer.ts";
import { extractHorizonSignals, extractSimulationSignals } from "../_shared/block-w-integration/cross-sprint-signals.ts";
import {
  computeHorizonToTradeoffModifiers,
  computeSimulationToTradeoffModifiers,
  aggregateModifiers,
  applyModifier,
  formatModifierExplanation,
  type CausalModifier,
} from "../_shared/block-w-integration/causal-modifiers.ts";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    // Auth hardening — Sprint 197
    const authResult = await authenticateWithRateLimit(req, "institutional-tradeoff-arbitration-system");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient } = authResult;

    const { action, organization_id: payloadOrgId, ...params } = await req.json();

    const { orgId: organization_id, error: orgError } = await resolveAndValidateOrg(serviceClient, user.id, payloadOrgId);
    if (orgError || !organization_id) return errorResponse(orgError || "Organization access denied", 403, req);

    await logSecurityAudit(serviceClient, {
      organization_id, actor_id: user.id,
      function_name: "institutional-tradeoff-arbitration-system", action: action || "unknown",
    });

    // ── OVERVIEW ──
    if (action === "overview") {
      const [constitutions, dimensions, subjects, events, recommendations] = await Promise.all([
        serviceClient.from("tradeoff_constitutions").select("id", { count: "exact" }).eq("organization_id", organization_id),
        serviceClient.from("tradeoff_dimensions").select("id", { count: "exact" }).eq("organization_id", organization_id).eq("active", true),
        serviceClient.from("tradeoff_subjects").select("id", { count: "exact" }).eq("organization_id", organization_id).eq("active", true),
        serviceClient.from("tradeoff_arbitration_events").select("id", { count: "exact" }).eq("organization_id", organization_id).is("resolved_at", null),
        serviceClient.from("tradeoff_recommendations").select("id", { count: "exact" }).eq("organization_id", organization_id).eq("active", true),
      ]);
      return json({
        constitutions: constitutions.count ?? 0,
        dimensions: dimensions.count ?? 0,
        active_subjects: subjects.count ?? 0,
        open_events: events.count ?? 0,
        active_recommendations: recommendations.count ?? 0,
      });
    }

    // ── CONSTITUTIONS ──
    if (action === "constitutions") {
      const { data } = await serviceClient.from("tradeoff_constitutions").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      return json({ constitutions: data ?? [] });
    }

    // ── SUBJECTS ALL (with inactive) ──
    if (action === "subjects_all") {
      const { data } = await serviceClient.from("tradeoff_subjects").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200);
      return json({ subjects: data ?? [] });
    }

    // ── EVALUATION HISTORY ──
    if (action === "evaluation_history") {
      const { data } = await serviceClient
        .from("tradeoff_evaluations")
        .select("compromise_risk_score, reversibility_score, legitimacy_tension_score, created_at")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: true })
        .limit(500);

      if (!data || data.length === 0) return json({ history: [] });

      const byDate = new Map<string, { risk: number[]; reversibility: number[]; tension: number[] }>();
      for (const row of data) {
        const date = new Date(row.created_at).toISOString().slice(0, 10);
        if (!byDate.has(date)) byDate.set(date, { risk: [], reversibility: [], tension: [] });
        const g = byDate.get(date)!;
        g.risk.push(Number(row.compromise_risk_score));
        g.reversibility.push(Number(row.reversibility_score));
        g.tension.push(Number(row.legitimacy_tension_score));
      }

      const history = Array.from(byDate.entries()).map(([date, g]) => ({
        date,
        compromise_risk: g.risk.reduce((a, b) => a + b, 0) / g.risk.length,
        reversibility: g.reversibility.reduce((a, b) => a + b, 0) / g.reversibility.length,
        legitimacy_tension: g.tension.reduce((a, b) => a + b, 0) / g.tension.length,
      }));

      return json({ history });
    }

    // ── DIMENSIONS ──
    if (action === "dimensions") {
      let dims = await resolveActiveDimensions(serviceClient, organization_id);
      if (dims.length === 0) {
        const defaults = getDefaultDimensions().map((d) => ({ ...d, organization_id }));
        const { data } = await serviceClient.from("tradeoff_dimensions").insert(defaults).select();
        dims = data ?? [];
      }
      return json({ dimensions: dims });
    }

    // ── SUBJECTS ──
    if (action === "subjects") {
      const subjects = await listTradeoffSubjects(serviceClient, organization_id, {
        subject_type: params.subject_type,
        domain: params.domain,
        active: params.active,
      });
      return json({ subjects });
    }

    // ── EVALUATE (with causal modifiers from Sprint 107 + 110) ──
    if (action === "evaluate") {
      const constitution = await resolveActiveConstitution(serviceClient, organization_id);
      let dimensions = await resolveActiveDimensions(serviceClient, organization_id);
      if (dimensions.length === 0) {
        const defaults = getDefaultDimensions().map((d) => ({ ...d, organization_id }));
        const { data } = await serviceClient.from("tradeoff_dimensions").insert(defaults).select();
        dimensions = data ?? [];
      }

      const subjects = await listTradeoffSubjects(serviceClient, organization_id, { active: true });
      if (subjects.length === 0) return json({ evaluations: [], events: [], recommendations: [], explanations: [], cross_sprint_modifiers: [] });

      // Fetch cross-sprint signals for causal modifiers
      const [horizonSignals, simSignals] = await Promise.all([
        extractHorizonSignals(serviceClient, organization_id),
        extractSimulationSignals(serviceClient, organization_id),
      ]);
      const horizonMods = computeHorizonToTradeoffModifiers(horizonSignals);
      const simMods = computeSimulationToTradeoffModifiers(simSignals);
      const allCausalMods: CausalModifier[] = [...horizonMods, ...simMods];
      const riskModBundle = aggregateModifiers(allCausalMods, "compromise_risk_score");
      const reversibilityModBundle = aggregateModifiers(allCausalMods, "reversibility_penalty");

      // Clean previous evaluation data
      await Promise.all([
        serviceClient.from("tradeoff_evaluations").delete().eq("organization_id", organization_id),
        serviceClient.from("tradeoff_recommendations").delete().eq("organization_id", organization_id),
        serviceClient.from("tradeoff_arbitration_events").delete().eq("organization_id", organization_id).is("resolved_at", null),
      ]);

      const evaluations = [];
      const allEvents = [];
      const allRecommendations = [];
      const allExplanations = [];

      for (const subject of subjects) {
        const analysis = analyzeGainSacrifice(subject, dimensions);
        const baseRisk = assessCompromiseRisk(analysis);
        const baseReversibility = evaluateReversibility(analysis);

        // Apply causal modifiers
        const adjustedRiskScore = applyModifier(baseRisk.compromise_risk_score, riskModBundle);
        const adjustedReversibilityScore = applyModifier(baseReversibility.reversibility_score, reversibilityModBundle);

        // Reclassify risk level with adjusted score
        let adjustedRiskLevel = baseRisk.risk_level;
        if (adjustedRiskScore >= 0.7) adjustedRiskLevel = "unacceptable";
        else if (adjustedRiskScore >= 0.5) adjustedRiskLevel = "high";
        else if (adjustedRiskScore >= 0.3) adjustedRiskLevel = "elevated";
        else adjustedRiskLevel = "acceptable";

        const adjustedRisk = {
          ...baseRisk,
          compromise_risk_score: Math.round(adjustedRiskScore * 10000) / 10000,
          risk_level: adjustedRiskLevel,
        };
        const adjustedReversibility = {
          ...baseReversibility,
          reversibility_score: Math.round(adjustedReversibilityScore * 10000) / 10000,
        };

        const recommendations = generateArbitrationRecommendations(analysis, adjustedRisk, adjustedReversibility);
        const explanation = explainTradeoff(analysis, adjustedRisk, adjustedReversibility, recommendations);

        const causalNote = allCausalMods.length > 0
          ? ` [Cross-sprint: risk ${riskModBundle.total_adjustment > 0 ? "+" : ""}${(riskModBundle.total_adjustment * 100).toFixed(1)}%]`
          : "";

        evaluations.push({ analysis, risk: adjustedRisk, reversibility: adjustedReversibility, baseRisk, baseReversibility });
        allRecommendations.push(...recommendations);
        allExplanations.push({
          ...explanation,
          base_compromise_risk: baseRisk.compromise_risk_score,
          adjusted_compromise_risk: adjustedRisk.compromise_risk_score,
          base_reversibility: baseReversibility.reversibility_score,
          adjusted_reversibility: adjustedReversibility.reversibility_score,
          cross_sprint_modifiers: allCausalMods,
          causal_explanation: causalNote,
        });

        // Persist evaluation
        await serviceClient.from("tradeoff_evaluations").insert({
          organization_id,
          constitution_id: constitution?.id ?? null,
          subject_id: subject.id,
          gain_dimensions: analysis.gains,
          sacrifice_dimensions: analysis.sacrifices,
          reversibility_score: adjustedReversibility.reversibility_score,
          compromise_risk_score: adjustedRisk.compromise_risk_score,
          legitimacy_tension_score: adjustedRisk.legitimacy_tension_score,
          arbitration_summary: `Posture: ${analysis.net_posture}, Risk: ${adjustedRiskLevel}${causalNote}`,
        });

        // Persist events for high/unacceptable risk
        if (adjustedRiskLevel === "high" || adjustedRiskLevel === "unacceptable") {
          const event = {
            organization_id,
            subject_id: subject.id,
            arbitration_type: adjustedRiskLevel === "unacceptable" ? "unacceptable_compromise" : "high_risk_compromise",
            severity: adjustedRiskLevel,
            affected_dimensions: adjustedRisk.corrosion_domains,
            event_summary: `${adjustedRisk.advisory}${causalNote}`,
            payload: { risk_factors: adjustedRisk.risk_factors, net_posture: analysis.net_posture, cross_sprint_influence: riskModBundle.total_adjustment },
          };
          await serviceClient.from("tradeoff_arbitration_events").insert(event);
          allEvents.push(event);
        }

        // Persist recommendations
        for (const rec of recommendations) {
          await serviceClient.from("tradeoff_recommendations").insert({
            organization_id,
            subject_id: rec.subject_id,
            recommendation_type: rec.recommendation_type,
            recommendation_summary: rec.recommendation_summary,
            preserved_values: rec.preserved_values,
            sacrificed_values: rec.sacrificed_values,
            rationale: rec.rationale,
            active: true,
          });
        }
      }

      return json({
        evaluated_subjects: evaluations.length,
        events_generated: allEvents.length,
        recommendations_generated: allRecommendations.length,
        evaluations: evaluations.map((e) => ({
          subject: e.analysis.subject_title,
          net_posture: e.analysis.net_posture,
          risk_level: e.risk.risk_level,
          reversibility: e.reversibility.reversibility_label,
          gains: e.analysis.gains.length,
          sacrifices: e.analysis.sacrifices.length,
          base_risk: e.baseRisk.compromise_risk_score,
          adjusted_risk: e.risk.compromise_risk_score,
        })),
        events: allEvents,
        recommendations: allRecommendations,
        explanations: allExplanations,
        cross_sprint_modifiers: {
          sources: ["Sprint 107 → Sprint 108", "Sprint 110 → Sprint 108"],
          modifiers: allCausalMods,
          risk_adjustment: riskModBundle,
          reversibility_adjustment: reversibilityModBundle,
        },
      });
    }

    // ── ARBITRATION_EVENTS ──
    if (action === "arbitration_events") {
      const { data } = await serviceClient
        .from("tradeoff_arbitration_events")
        .select("*, tradeoff_subjects(title, subject_type, domain)")
        .eq("organization_id", organization_id)
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      return json({ events: data ?? [] });
    }

    // ── RECOMMENDATIONS ──
    if (action === "recommendations") {
      const { data } = await serviceClient
        .from("tradeoff_recommendations")
        .select("*, tradeoff_subjects(title, subject_type, domain)")
        .eq("organization_id", organization_id)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(50);
      return json({ recommendations: data ?? [] });
    }

    // ── EXPLAIN ──
    if (action === "explain") {
      const subjectId = params.subject_id;
      if (!subjectId) return json({ error: "subject_id required" }, 400);

      const { data: subject } = await serviceClient.from("tradeoff_subjects").select("*").eq("id", subjectId).single();
      if (!subject) return json({ error: "Subject not found" }, 404);

      let dimensions = await resolveActiveDimensions(serviceClient, organization_id);
      if (dimensions.length === 0) {
        const defaults = getDefaultDimensions().map((d) => ({ ...d, organization_id }));
        const { data } = await serviceClient.from("tradeoff_dimensions").insert(defaults).select();
        dimensions = data ?? [];
      }

      const analysis = analyzeGainSacrifice(subject, dimensions);
      const risk = assessCompromiseRisk(analysis);
      const reversibility = evaluateReversibility(analysis);
      const recommendations = generateArbitrationRecommendations(analysis, risk, reversibility);
      const explanation = explainTradeoff(analysis, risk, reversibility, recommendations);

      // Causal context
      const [horizonSignals, simSignals] = await Promise.all([
        extractHorizonSignals(serviceClient, organization_id),
        extractSimulationSignals(serviceClient, organization_id),
      ]);
      const allMods = [
        ...computeHorizonToTradeoffModifiers(horizonSignals),
        ...computeSimulationToTradeoffModifiers(simSignals),
      ];

      return json({
        explanation,
        analysis,
        risk,
        reversibility,
        recommendations,
        cross_sprint_modifiers: allMods,
        causal_explanation: formatModifierExplanation(allMods),
      });
    }

    // ── CROSS-SPRINT SIGNALS ──
    if (action === "cross_sprint_signals") {
      const [horizonSignals, simSignals] = await Promise.all([
        extractHorizonSignals(serviceClient, organization_id),
        extractSimulationSignals(serviceClient, organization_id),
      ]);
      const horizonMods = computeHorizonToTradeoffModifiers(horizonSignals);
      const simMods = computeSimulationToTradeoffModifiers(simSignals);
      const allMods = [...horizonMods, ...simMods];
      const riskBundle = aggregateModifiers(allMods, "compromise_risk_score");

      return json({
        horizon_context: horizonSignals,
        simulation_context: simSignals,
        causal_modifiers: allMods,
        risk_adjustment: riskBundle,
        integration_note: "Horizon alignment (Sprint 107) and simulation fragility (Sprint 110) causally influence compromise risk and reversibility scores.",
      });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("Institutional Tradeoff Arbitration System error:", err);
    return json({ error: err.message ?? "Internal error" }, 500);
  }
});
