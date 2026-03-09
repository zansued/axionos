import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { action, organization_id, ...params } = await req.json();
    if (!organization_id) return json({ error: "organization_id required" }, 400);

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

    // ── EVALUATE ──
    if (action === "evaluate") {
      const constitution = await resolveActiveConstitution(serviceClient, organization_id);
      let dimensions = await resolveActiveDimensions(serviceClient, organization_id);
      if (dimensions.length === 0) {
        const defaults = getDefaultDimensions().map((d) => ({ ...d, organization_id }));
        const { data } = await serviceClient.from("tradeoff_dimensions").insert(defaults).select();
        dimensions = data ?? [];
      }

      const subjects = await listTradeoffSubjects(serviceClient, organization_id, { active: true });
      if (subjects.length === 0) return json({ evaluations: [], events: [], recommendations: [], explanations: [] });

      const evaluations = [];
      const allEvents = [];
      const allRecommendations = [];
      const allExplanations = [];

      for (const subject of subjects) {
        const analysis = analyzeGainSacrifice(subject, dimensions);
        const risk = assessCompromiseRisk(analysis);
        const reversibility = evaluateReversibility(analysis);
        const recommendations = generateArbitrationRecommendations(analysis, risk, reversibility);
        const explanation = explainTradeoff(analysis, risk, reversibility, recommendations);

        evaluations.push({ analysis, risk, reversibility });
        allRecommendations.push(...recommendations);
        allExplanations.push(explanation);

        // Persist evaluation
        await serviceClient.from("tradeoff_evaluations").insert({
          organization_id,
          constitution_id: constitution?.id ?? null,
          subject_id: subject.id,
          gain_dimensions: analysis.gains,
          sacrifice_dimensions: analysis.sacrifices,
          reversibility_score: reversibility.reversibility_score,
          compromise_risk_score: risk.compromise_risk_score,
          legitimacy_tension_score: risk.legitimacy_tension_score,
          arbitration_summary: `Posture: ${analysis.net_posture}, Risk: ${risk.risk_level}`,
        });

        // Persist events for high/unacceptable risk
        if (risk.risk_level === "high" || risk.risk_level === "unacceptable") {
          const event = {
            organization_id,
            subject_id: subject.id,
            arbitration_type: risk.risk_level === "unacceptable" ? "unacceptable_compromise" : "high_risk_compromise",
            severity: risk.risk_level,
            affected_dimensions: risk.corrosion_domains,
            event_summary: risk.advisory,
            payload: { risk_factors: risk.risk_factors, net_posture: analysis.net_posture },
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
        })),
        events: allEvents,
        recommendations: allRecommendations,
        explanations: allExplanations,
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

      return json({ explanation, analysis, risk, reversibility, recommendations });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("Institutional Tradeoff Arbitration System error:", err);
    return json({ error: err.message ?? "Internal error" }, 500);
  }
});
