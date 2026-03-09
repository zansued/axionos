import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { resolveActiveConstitution, resolveActiveHorizons, getDefaultHorizons } from "../_shared/multi-horizon-alignment/horizon-model-resolver.ts";
import { listSubjects } from "../_shared/multi-horizon-alignment/alignment-subject-mapper.ts";
import { scoreSubjectAcrossHorizons } from "../_shared/multi-horizon-alignment/multi-horizon-scorer.ts";
import { detectTemporalConflicts } from "../_shared/multi-horizon-alignment/temporal-tension-detector.ts";
import { assessDeferredRisk } from "../_shared/multi-horizon-alignment/deferred-risk-evaluator.ts";
import { generateRecommendations } from "../_shared/multi-horizon-alignment/horizon-recommendation-engine.ts";
import { explainHorizonPosture } from "../_shared/multi-horizon-alignment/horizon-explainer.ts";
import { extractSimulationSignals } from "../_shared/block-w-integration/cross-sprint-signals.ts";
import { computeSimulationToHorizonModifiers, aggregateModifiers, applyModifier, formatModifierExplanation } from "../_shared/block-w-integration/causal-modifiers.ts";

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
      const [constitutions, horizons, subjects, conflicts, recommendations] = await Promise.all([
        serviceClient.from("strategic_horizon_constitutions").select("id", { count: "exact" }).eq("organization_id", organization_id),
        serviceClient.from("strategic_horizons").select("id", { count: "exact" }).eq("organization_id", organization_id),
        serviceClient.from("strategic_alignment_subjects").select("id", { count: "exact" }).eq("organization_id", organization_id).eq("active", true),
        serviceClient.from("horizon_conflict_events").select("id", { count: "exact" }).eq("organization_id", organization_id).is("resolved_at", null),
        serviceClient.from("multi_horizon_recommendations").select("id", { count: "exact" }).eq("organization_id", organization_id).eq("active", true),
      ]);

      return json({
        constitutions: constitutions.count ?? 0,
        horizons: horizons.count ?? 0,
        active_subjects: subjects.count ?? 0,
        open_conflicts: conflicts.count ?? 0,
        active_recommendations: recommendations.count ?? 0,
      });
    }

    // ── CONSTITUTIONS ──
    if (action === "constitutions") {
      const { data } = await serviceClient
        .from("strategic_horizon_constitutions")
        .select("*")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false });
      return json({ constitutions: data ?? [] });
    }

    // ── SUBJECTS LIST (with inactive) ──
    if (action === "subjects_all") {
      const { data } = await serviceClient
        .from("strategic_alignment_subjects")
        .select("*")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(200);
      return json({ subjects: data ?? [] });
    }

    // ── HISTORY — evaluation trend over time ──
    if (action === "evaluation_history") {
      const { data } = await serviceClient
        .from("horizon_alignment_evaluations")
        .select("alignment_score, tension_score, deferred_risk_score, created_at, strategic_horizons(horizon_type)")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: true })
        .limit(500);

      if (!data || data.length === 0) return json({ history: [] });

      // Group by date (day)
      const byDate = new Map<string, { alignment: number[]; tension: number[]; deferred_risk: number[] }>();
      for (const row of data) {
        const date = new Date(row.created_at).toISOString().slice(0, 10);
        if (!byDate.has(date)) byDate.set(date, { alignment: [], tension: [], deferred_risk: [] });
        const g = byDate.get(date)!;
        g.alignment.push(Number(row.alignment_score));
        g.tension.push(Number(row.tension_score));
        g.deferred_risk.push(Number(row.deferred_risk_score));
      }

      const history = Array.from(byDate.entries()).map(([date, g]) => ({
        date,
        alignment: g.alignment.reduce((a, b) => a + b, 0) / g.alignment.length,
        tension: g.tension.reduce((a, b) => a + b, 0) / g.tension.length,
        deferred_risk: g.deferred_risk.reduce((a, b) => a + b, 0) / g.deferred_risk.length,
      }));

      return json({ history });
    }

    // ── HORIZONS ──
    if (action === "horizons") {
      let horizons = await resolveActiveHorizons(serviceClient, organization_id);
      if (horizons.length === 0) {
        const defaults = getDefaultHorizons().map((h) => ({ ...h, organization_id, active: true }));
        const { data } = await serviceClient.from("strategic_horizons").insert(defaults).select();
        horizons = data ?? [];
      }
      return json({ horizons });
    }

    // ── SUBJECTS ──
    if (action === "subjects") {
      const subjects = await listSubjects(serviceClient, organization_id, {
        subject_type: params.subject_type,
        domain: params.domain,
        active: params.active,
      });
      return json({ subjects });
    }

    // ── EVALUATE (with causal modifiers from Sprint 110) ──
    if (action === "evaluate") {
      const constitution = await resolveActiveConstitution(serviceClient, organization_id);
      const weights = constitution?.default_horizon_weights ?? { short_term: 0.25, medium_term: 0.30, long_term: 0.25, mission_continuity: 0.20 };

      const horizons = await resolveActiveHorizons(serviceClient, organization_id);
      if (horizons.length === 0) return json({ error: "No active horizons. Call action=horizons first." }, 400);

      const subjects = await listSubjects(serviceClient, organization_id, { active: true });
      if (subjects.length === 0) return json({ evaluations: [], conflicts: [], recommendations: [], explanations: [], cross_sprint_modifiers: [] });

      // Fetch simulation signals for causal modifiers (Sprint 110 → 107)
      const simSignals = await extractSimulationSignals(serviceClient, organization_id);
      const causalMods = computeSimulationToHorizonModifiers(simSignals);
      const deferredRiskMods = aggregateModifiers(causalMods, "deferred_risk_awareness");
      const fragMods = aggregateModifiers(causalMods, "long_term_fragility");

      // Cleanup previous evaluation data
      await Promise.all([
        serviceClient.from("horizon_alignment_evaluations").delete().eq("organization_id", organization_id),
        serviceClient.from("horizon_conflict_events").delete().eq("organization_id", organization_id).is("resolved_at", null),
        serviceClient.from("multi_horizon_recommendations").delete().eq("organization_id", organization_id).eq("active", true),
      ]);

      const evaluations = [];
      const allConflicts = [];
      const allRecommendations = [];
      const allExplanations = [];

      for (const subject of subjects) {
        const evaluation = scoreSubjectAcrossHorizons(subject, horizons, weights);
        const conflicts = detectTemporalConflicts(evaluation);
        const risk = assessDeferredRisk(evaluation);
        const recommendations = generateRecommendations(evaluation, risk, conflicts);
        const explanation = explainHorizonPosture(evaluation, risk, conflicts, recommendations);

        // Apply causal modifiers to deferred risk scores for long_term and mission_continuity
        const adjustedScores = evaluation.scores.map(s => {
          if (s.horizon_type === "long_term" || s.horizon_type === "mission_continuity") {
            const adjustedDeferred = applyModifier(s.deferred_risk_score, deferredRiskMods);
            return { ...s, deferred_risk_score: adjustedDeferred };
          }
          return s;
        });

        evaluations.push({ ...evaluation, scores: adjustedScores });
        allConflicts.push(...conflicts);
        allRecommendations.push(...recommendations);

        // Build causal-aware explanation
        const causalNote = causalMods.length > 0
          ? ` [Cross-sprint: ${deferredRiskMods.summary}]`
          : "";
        allExplanations.push({
          ...explanation,
          cross_sprint_modifiers: causalMods,
          causal_explanation: causalNote,
        });

        // Persist evaluations with adjusted scores
        for (const score of adjustedScores) {
          await serviceClient.from("horizon_alignment_evaluations").insert({
            organization_id,
            constitution_id: constitution?.id ?? null,
            subject_id: subject.id,
            horizon_id: score.horizon_id,
            alignment_score: score.alignment_score,
            tension_score: score.tension_score,
            deferred_risk_score: score.deferred_risk_score,
            support_level: score.support_level,
            evaluation_summary: `Posture: ${evaluation.overall_posture}${causalNote}`,
          });
        }

        // Persist conflicts
        for (const conflict of conflicts) {
          await serviceClient.from("horizon_conflict_events").insert({
            organization_id,
            subject_id: conflict.subject_id,
            conflict_type: conflict.conflict_type,
            severity: conflict.severity,
            affected_horizons: conflict.affected_horizons,
            event_summary: conflict.event_summary,
            payload: conflict.payload,
          });
        }

        // Persist recommendations
        for (const rec of recommendations) {
          await serviceClient.from("multi_horizon_recommendations").insert({
            organization_id,
            subject_id: rec.subject_id,
            recommendation_type: rec.recommendation_type,
            target_horizon: rec.target_horizon,
            recommendation_summary: rec.recommendation_summary,
            rationale: rec.rationale,
            tradeoff_note: rec.tradeoff_note,
            priority_level: rec.priority_level,
            active: true,
          });
        }
      }

      return json({
        evaluated_subjects: evaluations.length,
        conflicts_detected: allConflicts.length,
        recommendations_generated: allRecommendations.length,
        evaluations: evaluations.map((e) => ({
          subject: e.subject.title,
          posture: e.overall_posture,
          composite_alignment: e.composite_alignment,
          composite_tension: e.composite_tension,
        })),
        conflicts: allConflicts,
        recommendations: allRecommendations,
        explanations: allExplanations,
        cross_sprint_modifiers: {
          source: "Sprint 110 → Sprint 107",
          modifiers: causalMods,
          deferred_risk_adjustment: deferredRiskMods,
          fragility_adjustment: fragMods,
        },
      });
    }

    // ── CONFLICTS ──
    if (action === "conflicts") {
      const { data } = await serviceClient
        .from("horizon_conflict_events")
        .select("*, strategic_alignment_subjects(title, subject_type, domain)")
        .eq("organization_id", organization_id)
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      return json({ conflicts: data ?? [] });
    }

    // ── RECOMMENDATIONS ──
    if (action === "recommendations") {
      const { data } = await serviceClient
        .from("multi_horizon_recommendations")
        .select("*, strategic_alignment_subjects(title, subject_type, domain)")
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

      const { data: subject } = await serviceClient
        .from("strategic_alignment_subjects")
        .select("*")
        .eq("id", subjectId)
        .single();
      if (!subject) return json({ error: "Subject not found" }, 404);

      const constitution = await resolveActiveConstitution(serviceClient, organization_id);
      const weights = constitution?.default_horizon_weights ?? { short_term: 0.25, medium_term: 0.30, long_term: 0.25, mission_continuity: 0.20 };
      const horizons = await resolveActiveHorizons(serviceClient, organization_id);

      const evaluation = scoreSubjectAcrossHorizons(subject, horizons, weights);
      const conflicts = detectTemporalConflicts(evaluation);
      const risk = assessDeferredRisk(evaluation);
      const recommendations = generateRecommendations(evaluation, risk, conflicts);
      const explanation = explainHorizonPosture(evaluation, risk, conflicts, recommendations);

      // Causal context
      const simSignals = await extractSimulationSignals(serviceClient, organization_id);
      const causalMods = computeSimulationToHorizonModifiers(simSignals);

      return json({
        explanation,
        risk,
        conflicts,
        recommendations,
        cross_sprint_modifiers: causalMods,
        causal_explanation: formatModifierExplanation(causalMods),
      });
    }

    // ── CROSS-SPRINT SIGNALS ──
    if (action === "cross_sprint_signals") {
      const simSignals = await extractSimulationSignals(serviceClient, organization_id);
      const causalMods = computeSimulationToHorizonModifiers(simSignals);
      const deferredRiskMods = aggregateModifiers(causalMods, "deferred_risk_awareness");
      const fragMods = aggregateModifiers(causalMods, "long_term_fragility");

      return json({
        simulation_feedback: simSignals,
        causal_modifiers: causalMods,
        deferred_risk_adjustment: deferredRiskMods,
        fragility_adjustment: fragMods,
        integration_note: "Simulation signals (Sprint 110) causally influence deferred risk scores and long-term fragility assessments.",
      });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("Multi-Horizon Strategic Alignment Engine error:", err);
    return json({ error: err.message ?? "Internal error" }, 500);
  }
});
