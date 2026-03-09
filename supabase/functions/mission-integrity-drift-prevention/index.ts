import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { evaluateAlignmentPosture, computeAlignmentScores } from "../_shared/mission-integrity/alignment-vs-erosion-engine.ts";
import { detectPatterns, computeDriftDensity } from "../_shared/mission-integrity/drift-pattern-detector.ts";
import { assessNormativeErosion } from "../_shared/mission-integrity/normative-erosion-assessor.ts";
import { generateCorrections } from "../_shared/mission-integrity/mission-correction-engine.ts";
import { explainMissionIntegrity } from "../_shared/mission-integrity/mission-explainer.ts";
import { resolveActiveConstitution, extractProtectedCommitments } from "../_shared/mission-integrity/mission-constitution-resolver.ts";
import { filterActiveSubjects, groupSubjectsByDomain } from "../_shared/mission-integrity/mission-subject-mapper.ts";
import { extractTradeoffSignals } from "../_shared/block-w-integration/cross-sprint-signals.ts";

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

        // Resolve active constitution for protected commitments
        const activeConst = resolveActiveConstitution((constitutions || []) as any);
        const protectedCommitments = activeConst ? extractProtectedCommitments(activeConst as any) : [];

        // Compute posture distribution from evaluations
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

      // ── run_evaluation: the actual computation action ──
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

        const protectedCommitments = extractProtectedCommitments(activeConst as any);
        const missionStatement = activeConst.mission_statement || "";
        const subjectsByDomain = groupSubjectsByDomain(activeSubjects);

        // Cleanup old evaluations, drift events, and recommendations for this org
        await Promise.all([
          supabase.from("mission_alignment_evaluations").delete().eq("organization_id", organization_id),
          supabase.from("mission_drift_events").delete().eq("organization_id", organization_id).is("resolved_at", null),
          supabase.from("mission_correction_recommendations").delete().eq("organization_id", organization_id).eq("active", true),
        ]);

        const newEvaluations: any[] = [];
        const newDriftEvents: any[] = [];
        const correctionInputs: any[] = [];

        for (const subject of activeSubjects) {
          // Compute alignment scores from subject content vs mission
          const scores = computeAlignmentScores(subject.summary || "", missionStatement);
          const verdict = evaluateAlignmentPosture(scores);

          // Assess normative erosion
          const erosionAssessment = assessNormativeErosion({
            alignment_score: scores.alignment_score,
            erosion_score: scores.erosion_score,
            adaptation_score: scores.adaptation_score,
            protected_commitments: protectedCommitments,
            subject_summary: subject.summary || "",
          });

          newEvaluations.push({
            organization_id,
            subject_id: subject.id,
            constitution_id: activeConst.id,
            alignment_score: scores.alignment_score,
            drift_risk_score: scores.drift_risk_score,
            erosion_score: scores.erosion_score,
            adaptation_score: scores.adaptation_score,
            posture: verdict.posture,
            evaluation_summary: `${verdict.explanation} ${erosionAssessment.explanation}`,
          });

          // Generate drift events for non-healthy postures
          if (!verdict.is_healthy) {
            newDriftEvents.push({
              organization_id,
              subject_id: subject.id,
              drift_type: scores.erosion_score >= 0.4 ? "normative" : scores.drift_risk_score >= 0.5 ? "strategic" : "operational",
              severity: verdict.posture === "normative_compromise" ? "critical" : verdict.posture === "active_erosion" ? "high" : verdict.posture === "significant_drift" ? "high" : "medium",
              event_summary: verdict.explanation,
              payload: { scores, posture: verdict.posture, erosion_type: erosionAssessment.erosion_type, commitments_at_risk: erosionAssessment.commitments_at_risk },
            });
          }

          // Collect correction inputs
          if (verdict.requires_correction) {
            correctionInputs.push({
              subject_id: subject.id,
              posture: verdict.posture,
              alignment_score: scores.alignment_score,
              drift_risk_score: scores.drift_risk_score,
              erosion_score: scores.erosion_score,
              domain: subject.domain,
            });
          }
        }

        // Persist evaluations
        if (newEvaluations.length > 0) {
          await supabase.from("mission_alignment_evaluations").insert(newEvaluations);
        }

        // Persist drift events
        if (newDriftEvents.length > 0) {
          await supabase.from("mission_drift_events").insert(newDriftEvents);
        }

        // Generate and persist corrections
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

        // Detect drift patterns from ALL drift events (including historical resolved ones)
        const { data: allDriftEvents } = await supabase.from("mission_drift_events").select("*").eq("organization_id", organization_id).limit(500);
        const driftPatterns = detectPatterns((allDriftEvents || []) as any);
        const driftDensity = computeDriftDensity((allDriftEvents || []) as any, activeSubjects.length);

        // Compute snapshot scores
        const avgAlignment = newEvaluations.length > 0 ? newEvaluations.reduce((s, e) => s + e.alignment_score, 0) / newEvaluations.length : 0;
        const missionHealth = Math.max(0, avgAlignment - driftDensity * 0.5);
        const correctionReadiness = corrections.length > 0 ? Math.min(1, corrections.filter(c => c.correction_priority !== "critical").length / corrections.length) : 1;

        // Generate explanation
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

        // Persist snapshot
        await supabase.from("mission_integrity_snapshots").insert({
          organization_id,
          constitution_id: activeConst.id,
          mission_health_score: Math.round(missionHealth * 10000) / 10000,
          drift_density_score: Math.round(driftDensity * 10000) / 10000,
          correction_readiness_score: Math.round(correctionReadiness * 10000) / 10000,
          snapshot_scope: "full",
          snapshot_summary: explanation.health_summary,
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
        // Data-driven explanation
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

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, data: result }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
