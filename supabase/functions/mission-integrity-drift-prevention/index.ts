import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { evaluateAlignmentPosture, computeAlignmentScores } from "../_shared/mission-integrity/alignment-vs-erosion-engine.ts";
import { detectPatterns, computeDriftDensity } from "../_shared/mission-integrity/drift-pattern-detector.ts";
import { assessNormativeErosion } from "../_shared/mission-integrity/normative-erosion-assessor.ts";
import { generateCorrections } from "../_shared/mission-integrity/mission-correction-engine.ts";
import { explainMissionIntegrity } from "../_shared/mission-integrity/mission-explainer.ts";
import { resolveActiveConstitution, extractProtectedCommitments } from "../_shared/mission-integrity/mission-constitution-resolver.ts";
import { filterActiveSubjects, groupSubjectsByDomain } from "../_shared/mission-integrity/mission-subject-mapper.ts";
import { extractTradeoffSignals, extractSimulationSignals } from "../_shared/block-w-integration/cross-sprint-signals.ts";
import {
  computeTradeoffToMissionModifiers,
  computeSimulationToMissionModifiers,
  aggregateModifiers,
  applyModifier,
  formatModifierExplanation,
  type CausalModifier,
} from "../_shared/block-w-integration/causal-modifiers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: corsHeaders });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    const { action, organization_id } = body;

    if (!organization_id) return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: corsHeaders });

    const { data: _member } = await supabase.from("organization_members").select("role").eq("organization_id", organization_id).eq("user_id", user.id).single();
    if (!_member) return new Response(JSON.stringify({ error: "Not a member" }), { status: 403, headers: corsHeaders });

    let result: unknown;

    switch (action) {
      case "overview": {
        const [{ data: constitutions }, { data: subjects }, { data: evaluations }, { data: driftEvents }, { data: recommendations }, { data: snapshots }] = await Promise.all([
          supabase.from("mission_constitutions").select("*").eq("organization_id", organization_id).limit(100),
          supabase.from("mission_integrity_subjects").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("mission_alignment_evaluations").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("mission_drift_events").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("mission_correction_recommendations").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("mission_integrity_snapshots").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(10),
        ]);

        const allEvals = evaluations || [];
        const allDrifts = driftEvents || [];
        const unresolvedDrift = allDrifts.filter((d: any) => !d.resolved_at).length;
        const avgAlignment = allEvals.length > 0 ? allEvals.reduce((s: number, e: any) => s + Number(e.alignment_score), 0) / allEvals.length : 0;
        const avgErosion = allEvals.length > 0 ? allEvals.reduce((s: number, e: any) => s + Number(e.erosion_score), 0) / allEvals.length : 0;

        const activeConst = resolveActiveConstitution((constitutions || []) as any);
        const protectedCommitments = activeConst ? extractProtectedCommitments(activeConst as any) : [];

        const postureDistribution: Record<string, number> = {};
        for (const ev of allEvals) {
          const p = (ev as any).posture || "unknown";
          postureDistribution[p] = (postureDistribution[p] || 0) + 1;
        }

        result = {
          total_constitutions: (constitutions || []).length,
          total_subjects: (subjects || []).length,
          total_evaluations: allEvals.length,
          total_drift_events: allDrifts.length,
          unresolved_drift: unresolvedDrift,
          total_recommendations: (recommendations || []).length,
          active_recommendations: (recommendations || []).filter((r: any) => r.active).length,
          avg_alignment_score: Math.round(avgAlignment * 10000) / 10000,
          avg_erosion_score: Math.round(avgErosion * 10000) / 10000,
          latest_snapshot: (snapshots || [])[0] || null,
          protected_commitments: protectedCommitments,
          posture_distribution: postureDistribution,
          governance_mode: "advisory_first",
        };
        break;
      }

      case "constitutions": {
        const { data } = await supabase.from("mission_constitutions").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = { constitutions: data || [] };
        break;
      }

      case "subjects": {
        const { data } = await supabase.from("mission_integrity_subjects").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200);
        result = { subjects: data || [] };
        break;
      }

      case "evaluate": {
        const { data } = await supabase.from("mission_alignment_evaluations").select("*, mission_constitutions(constitution_name), mission_integrity_subjects(title, domain, subject_type)").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200);
        result = { evaluations: data || [] };
        break;
      }

      // ── run_evaluation: with causal modifiers from Sprint 108 + 110 ──
      case "run_evaluation": {
        const [{ data: constitutions }, { data: subjects }] = await Promise.all([
          supabase.from("mission_constitutions").select("*").eq("organization_id", organization_id).limit(100),
          supabase.from("mission_integrity_subjects").select("*").eq("organization_id", organization_id).limit(200),
        ]);

        const activeConst = resolveActiveConstitution((constitutions || []) as any);
        if (!activeConst) {
          result = { error: "No active mission constitution found. Create one before evaluating." };
          break;
        }

        const activeSubjects = filterActiveSubjects((subjects || []) as any);
        if (activeSubjects.length === 0) {
          result = { error: "No active subjects to evaluate." };
          break;
        }

        // Fetch cross-sprint signals for causal modifiers
        const [tradeoffSignals, simSignals] = await Promise.all([
          extractTradeoffSignals(supabase, organization_id),
          extractSimulationSignals(supabase, organization_id),
        ]);
        const tradeoffMods = computeTradeoffToMissionModifiers(tradeoffSignals);
        const simMods = computeSimulationToMissionModifiers(simSignals);
        const allCausalMods: CausalModifier[] = [...tradeoffMods, ...simMods];
        const driftModBundle = aggregateModifiers(allCausalMods, "drift_risk_score");
        const erosionModBundle = aggregateModifiers(allCausalMods, "erosion_score");
        const erosionWarningBundle = aggregateModifiers(allCausalMods, "erosion_warning");

        const protectedCommitments = extractProtectedCommitments(activeConst as any);
        const missionStatement = activeConst.mission_statement || "";

        // Cleanup old data
        await Promise.all([
          supabase.from("mission_alignment_evaluations").delete().eq("organization_id", organization_id),
          supabase.from("mission_drift_events").delete().eq("organization_id", organization_id).is("resolved_at", null),
          supabase.from("mission_correction_recommendations").delete().eq("organization_id", organization_id).eq("active", true),
        ]);

        const newEvaluations: any[] = [];
        const newDriftEvents: any[] = [];
        const correctionInputs: any[] = [];

        for (const subject of activeSubjects) {
          const scores = computeAlignmentScores(subject.summary || "", missionStatement);

          // Apply causal modifiers to drift and erosion scores
          const adjustedDrift = applyModifier(scores.drift_risk_score, driftModBundle);
          const adjustedErosion = applyModifier(scores.erosion_score, erosionModBundle);
          // Also factor in erosion_warning from simulation
          const erosionWithWarning = applyModifier(adjustedErosion, erosionWarningBundle);

          const adjustedScores = {
            ...scores,
            drift_risk_score: Math.round(adjustedDrift * 10000) / 10000,
            erosion_score: Math.round(erosionWithWarning * 10000) / 10000,
          };

          const verdict = evaluateAlignmentPosture(adjustedScores);

          const erosionAssessment = assessNormativeErosion({
            alignment_score: adjustedScores.alignment_score,
            erosion_score: adjustedScores.erosion_score,
            adaptation_score: adjustedScores.adaptation_score,
            protected_commitments: protectedCommitments,
            subject_summary: subject.summary || "",
          });

          const causalNote = allCausalMods.length > 0
            ? ` [Cross-sprint: drift ${driftModBundle.total_adjustment > 0 ? "+" : ""}${(driftModBundle.total_adjustment * 100).toFixed(1)}%, erosion ${erosionModBundle.total_adjustment > 0 ? "+" : ""}${(erosionModBundle.total_adjustment * 100).toFixed(1)}%]`
            : "";

          newEvaluations.push({
            organization_id,
            subject_id: subject.id,
            constitution_id: activeConst.id,
            alignment_score: adjustedScores.alignment_score,
            drift_risk_score: adjustedScores.drift_risk_score,
            erosion_score: adjustedScores.erosion_score,
            adaptation_score: adjustedScores.adaptation_score,
            posture: verdict.posture,
            evaluation_summary: `${verdict.explanation} ${erosionAssessment.explanation}${causalNote}`,
          });

          if (!verdict.is_healthy) {
            newDriftEvents.push({
              organization_id,
              subject_id: subject.id,
              drift_type: adjustedScores.erosion_score >= 0.4 ? "normative" : adjustedScores.drift_risk_score >= 0.5 ? "strategic" : "operational",
              severity: verdict.posture === "normative_compromise" ? "critical" : verdict.posture === "active_erosion" ? "high" : verdict.posture === "significant_drift" ? "high" : "medium",
              event_summary: `${verdict.explanation}${causalNote}`,
              payload: { scores: adjustedScores, posture: verdict.posture, erosion_type: erosionAssessment.erosion_type, commitments_at_risk: erosionAssessment.commitments_at_risk, cross_sprint_influence: { drift: driftModBundle.total_adjustment, erosion: erosionModBundle.total_adjustment } },
            });
          }

          if (verdict.requires_correction) {
            correctionInputs.push({
              subject_id: subject.id,
              posture: verdict.posture,
              alignment_score: adjustedScores.alignment_score,
              drift_risk_score: adjustedScores.drift_risk_score,
              erosion_score: adjustedScores.erosion_score,
              domain: subject.domain,
            });
          }
        }

        // Persist evaluations
        if (newEvaluations.length > 0) await supabase.from("mission_alignment_evaluations").insert(newEvaluations);
        if (newDriftEvents.length > 0) await supabase.from("mission_drift_events").insert(newDriftEvents);

        const corrections = generateCorrections(correctionInputs);
        if (corrections.length > 0) {
          const correctionRows = corrections.map(c => ({
            organization_id,
            subject_id: c.subject_id,
            recommendation_type: c.recommendation_type,
            recommendation_summary: c.recommendation_summary,
            correction_priority: c.correction_priority,
            rationale: c.rationale,
            active: true,
          }));
          await supabase.from("mission_correction_recommendations").insert(correctionRows);
        }

        // Detect drift patterns
        const { data: allDriftEvents } = await supabase.from("mission_drift_events").select("*").eq("organization_id", organization_id).limit(500);
        const driftPatterns = detectPatterns((allDriftEvents || []) as any);
        const driftDensity = computeDriftDensity((allDriftEvents || []) as any, activeSubjects.length);

        // Compute snapshot
        const avgAlignment = newEvaluations.length > 0 ? newEvaluations.reduce((s, e) => s + e.alignment_score, 0) / newEvaluations.length : 0;
        const missionHealth = Math.max(0, avgAlignment - driftDensity * 0.5);
        const correctionReadiness = corrections.length > 0 ? Math.min(1, corrections.filter(c => c.correction_priority !== "critical").length / corrections.length) : 1;

        const explanation = explainMissionIntegrity({
          mission_health_score: missionHealth,
          drift_density_score: driftDensity,
          correction_readiness_score: correctionReadiness,
          total_subjects: activeSubjects.length,
          total_evaluations: newEvaluations.length,
          total_drift_events: (allDriftEvents || []).length,
          unresolved_drift: (allDriftEvents || []).filter((d: any) => !d.resolved_at).length,
          total_recommendations: corrections.length,
          drift_patterns: driftPatterns,
        });

        await supabase.from("mission_integrity_snapshots").insert({
          organization_id,
          constitution_id: activeConst.id,
          mission_health_score: Math.round(missionHealth * 10000) / 10000,
          drift_density_score: Math.round(driftDensity * 10000) / 10000,
          correction_readiness_score: Math.round(correctionReadiness * 10000) / 10000,
          snapshot_scope: "full",
          snapshot_summary: `${explanation.health_summary} ${allCausalMods.length > 0 ? `[Cross-sprint modifiers applied: ${allCausalMods.length}]` : ""}`,
        });

        result = {
          total_evaluated: newEvaluations.length,
          total_drift_events_generated: newDriftEvents.length,
          total_corrections_generated: corrections.length,
          drift_patterns: driftPatterns,
          drift_density: driftDensity,
          mission_health: Math.round(missionHealth * 10000) / 10000,
          explanation,
          posture_distribution: newEvaluations.reduce((acc: Record<string, number>, e: any) => {
            acc[e.posture] = (acc[e.posture] || 0) + 1;
            return acc;
          }, {}),
          cross_sprint_modifiers: {
            sources: ["Sprint 108 → Sprint 109", "Sprint 110 → Sprint 109"],
            modifiers: allCausalMods,
            drift_adjustment: driftModBundle,
            erosion_adjustment: erosionModBundle,
          },
        };
        break;
      }

      case "drift_events": {
        const { data } = await supabase.from("mission_drift_events").select("*, mission_integrity_subjects(title, domain)").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200);
        result = { drift_events: data || [] };
        break;
      }

      case "recommendations": {
        const { data } = await supabase.from("mission_correction_recommendations").select("*, mission_integrity_subjects(title, domain)").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200);
        result = { recommendations: data || [] };
        break;
      }

      case "snapshots": {
        const { data } = await supabase.from("mission_integrity_snapshots").select("*, mission_constitutions(constitution_name)").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50);
        result = { snapshots: data || [] };
        break;
      }

      case "explain": {
        const [{ data: evals }, { data: driftEvts }, { data: recs }, { data: constitutions }] = await Promise.all([
          supabase.from("mission_alignment_evaluations").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("mission_drift_events").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("mission_correction_recommendations").select("*").eq("organization_id", organization_id).limit(200),
          supabase.from("mission_constitutions").select("*").eq("organization_id", organization_id).limit(100),
        ]);

        const allEvals = evals || [];
        const allDrifts = driftEvts || [];
        const activeConst = resolveActiveConstitution((constitutions || []) as any);
        const protectedCommitments = activeConst ? extractProtectedCommitments(activeConst as any) : [];

        if (allEvals.length === 0) {
          result = {
            explanation: "No evaluations have been run yet. Execute 'run_evaluation' to compute mission alignment postures.",
            drift_types: ["operational", "strategic", "identity", "normative", "incentive"],
            posture_levels: ["mission_aligned", "healthy_adaptation", "mild_drift", "significant_drift", "active_erosion", "normative_compromise"],
            core_principles: ["advisory-first", "no-silent-erosion", "mission-before-performance", "drift-is-measurable", "adaptation-is-not-erosion"],
            safety_constraints: ["Advisory-first", "No autonomous mission rewrite", "Human review for corrections", "Tenant isolation via RLS"],
          };
          break;
        }

        const driftPatterns = detectPatterns(allDrifts as any);
        const driftDensity = computeDriftDensity(allDrifts as any, allEvals.length);
        const avgAlignment = allEvals.reduce((s: number, e: any) => s + Number(e.alignment_score), 0) / allEvals.length;
        const missionHealth = Math.max(0, avgAlignment - driftDensity * 0.5);

        const explanation = explainMissionIntegrity({
          mission_health_score: missionHealth,
          drift_density_score: driftDensity,
          correction_readiness_score: (recs || []).length > 0 ? 0.5 : 1,
          total_subjects: allEvals.length,
          total_evaluations: allEvals.length,
          total_drift_events: allDrifts.length,
          unresolved_drift: allDrifts.filter((d: any) => !d.resolved_at).length,
          total_recommendations: (recs || []).length,
          drift_patterns: driftPatterns,
        });

        result = {
          ...explanation,
          protected_commitments: protectedCommitments,
          drift_types: ["operational", "strategic", "identity", "normative", "incentive"],
          posture_levels: ["mission_aligned", "healthy_adaptation", "mild_drift", "significant_drift", "active_erosion", "normative_compromise"],
          core_principles: ["advisory-first", "no-silent-erosion", "mission-before-performance", "drift-is-measurable", "adaptation-is-not-erosion"],
          safety_constraints: ["Advisory-first", "No autonomous mission rewrite", "Human review for corrections", "Tenant isolation via RLS"],
        };
        break;
      }

      case "cross_sprint_signals": {
        const [tradeoffSignals, simSignals] = await Promise.all([
          extractTradeoffSignals(supabase, organization_id),
          extractSimulationSignals(supabase, organization_id),
        ]);
        const tradeoffMods = computeTradeoffToMissionModifiers(tradeoffSignals);
        const simMods = computeSimulationToMissionModifiers(simSignals);
        const allMods = [...tradeoffMods, ...simMods];
        const driftBundle = aggregateModifiers(allMods, "drift_risk_score");
        const erosionBundle = aggregateModifiers(allMods, "erosion_score");

        result = {
          tradeoff_pressure: tradeoffSignals,
          simulation_feedback: simSignals,
          causal_modifiers: allMods,
          drift_adjustment: driftBundle,
          erosion_adjustment: erosionBundle,
          integration_note: "Tradeoff signals (Sprint 108) and simulation feedback (Sprint 110) causally influence drift risk and erosion scores.",
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, data: result }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
