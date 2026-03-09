import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { categorizeRoles } from "../_shared/strategic-succession/critical-role-mapper.ts";
import { detectKnowledgeConcentration } from "../_shared/strategic-succession/knowledge-concentration-detector.ts";
import { scoreSuccessionReadiness } from "../_shared/strategic-succession/succession-readiness-scorer.ts";
import { evaluateHandoffViability } from "../_shared/strategic-succession/handoff-orchestration-engine.ts";
import { evaluateStrategyContinuity } from "../_shared/strategic-succession/strategy-continuity-evaluator.ts";
import { detectTransitionRisks } from "../_shared/strategic-succession/transition-risk-detector.ts";
import { explainSuccession } from "../_shared/strategic-succession/succession-explainer.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const sKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const uc = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: ae } = await uc.auth.getUser();
    if (ae || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { action, organization_id, ...params } = await req.json();
    if (!organization_id) return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sc = createClient(url, sKey);
    const { data: mem } = await sc.from("organization_members").select("role").eq("organization_id", organization_id).eq("user_id", user.id).single();
    if (!mem) return new Response(JSON.stringify({ error: "Not a member" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let result: unknown;

    switch (action) {
      case "overview": {
        const [cRes, rRes, pRes, spRes, aRes, tRes] = await Promise.all([
          sc.from("succession_constitutions").select("*", { count: "exact", head: true }).eq("organization_id", organization_id),
          sc.from("critical_roles").select("*", { count: "exact", head: true }).eq("organization_id", organization_id),
          sc.from("role_continuity_profiles").select("*", { count: "exact", head: true }).eq("organization_id", organization_id),
          sc.from("succession_plans").select("*", { count: "exact", head: true }).eq("organization_id", organization_id).eq("status", "active"),
          sc.from("succession_assessments").select("*", { count: "exact", head: true }).eq("organization_id", organization_id),
          sc.from("continuity_transition_events").select("*", { count: "exact", head: true }).eq("organization_id", organization_id).is("resolved_at", null),
        ]);
        const { data: profiles } = await sc.from("role_continuity_profiles").select("backup_exists,knowledge_concentration_score,succession_readiness_level").eq("organization_id", organization_id);
        const all = profiles ?? [];
        const noBackup = all.filter((p: any) => !p.backup_exists).length;
        const highConcentration = all.filter((p: any) => (p.knowledge_concentration_score ?? 0) > 0.6).length;
        result = {
          constitutions: cRes.count ?? 0,
          critical_roles: rRes.count ?? 0,
          continuity_profiles: pRes.count ?? 0,
          active_plans: spRes.count ?? 0,
          assessments: aRes.count ?? 0,
          open_transitions: tRes.count ?? 0,
          roles_without_backup: noBackup,
          high_knowledge_concentration: highConcentration,
        };
        break;
      }
      case "constitutions": {
        const { data } = await sc.from("succession_constitutions").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
        result = data ?? [];
        break;
      }
      case "critical_roles": {
        const { data } = await sc.from("critical_roles").select("*").eq("organization_id", organization_id).order("criticality_level").limit(200);
        // Enrich with categorization from shared module
        const categorized = categorizeRoles(data ?? []);
        result = { roles: data ?? [], categorization: { totalRoles: categorized.total, criticalCount: categorized.critical.length, leadershipCount: categorized.leadership.length, knowledgeAnchorCount: categorized.knowledgeAnchors.length, domains: Object.keys(categorized.byDomain) } };
        break;
      }
      case "continuity_profiles": {
        const { data } = await sc.from("role_continuity_profiles").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(200);
        result = data ?? [];
        break;
      }
      case "succession_plans": {
        const { data } = await sc.from("succession_plans").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = data ?? [];
        break;
      }
      case "assessments": {
        const { data } = await sc.from("succession_assessments").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(50);
        result = data ?? [];
        break;
      }
      case "transition_events": {
        const { data } = await sc.from("continuity_transition_events").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(100);
        result = data ?? [];
        break;
      }

      // --- Uses shared modules for real computation ---
      case "compute_assessment": {
        const { data: profiles } = await sc.from("role_continuity_profiles").select("*").eq("organization_id", organization_id);
        const { data: roles } = await sc.from("critical_roles").select("*").eq("organization_id", organization_id);
        const { data: plans } = await sc.from("succession_plans").select("*").eq("organization_id", organization_id);
        const allProfiles = profiles ?? [];
        const allRoles = roles ?? [];

        // Knowledge concentration detection
        const concentrationInputs = allProfiles.map((p: any) => ({
          roleId: p.role_id,
          roleName: p.current_owner_ref ?? p.role_id,
          knowledgeConcentrationScore: p.knowledge_concentration_score ?? 0,
          backupExists: p.backup_exists ?? false,
          handoffMaturityScore: p.handoff_maturity_score ?? 0,
          criticalityLevel: allRoles.find((r: any) => r.id === p.role_id)?.criticality_level ?? "medium",
        }));
        const concentrationRisks = detectKnowledgeConcentration(concentrationInputs);

        // Succession readiness per profile
        const readinessResults = allProfiles.map((p: any) => {
          const role = allRoles.find((r: any) => r.id === p.role_id);
          const rolePlans = (plans ?? []).filter((pl: any) => pl.role_id === p.role_id);
          return {
            roleId: p.role_id,
            ownerRef: p.current_owner_ref,
            ...scoreSuccessionReadiness({
              backupExists: p.backup_exists ?? false,
              successionPlanExists: rolePlans.length > 0,
              successionPlanActive: rolePlans.some((pl: any) => pl.status === "active"),
              handoffMaturityScore: p.handoff_maturity_score ?? 0,
              knowledgeConcentrationScore: p.knowledge_concentration_score ?? 0,
              criticalityLevel: role?.criticality_level ?? "medium",
            }),
          };
        });

        // Transition risk detection
        const transitionInputs = allProfiles.map((p: any) => {
          const role = allRoles.find((r: any) => r.id === p.role_id);
          const rolePlans = (plans ?? []).filter((pl: any) => pl.role_id === p.role_id);
          return {
            roleName: role?.role_name ?? p.current_owner_ref ?? "unknown",
            criticalityLevel: role?.criticality_level ?? "medium",
            backupExists: p.backup_exists ?? false,
            successionPlanActive: rolePlans.some((pl: any) => pl.status === "active"),
            handoffMaturityScore: p.handoff_maturity_score ?? 0,
            knowledgeConcentrationScore: p.knowledge_concentration_score ?? 0,
          };
        });
        const transitionRisks = detectTransitionRisks(transitionInputs);

        // Handoff viability per plan
        const handoffResults = (plans ?? []).map((pl: any) => ({
          planId: pl.id,
          planCode: pl.plan_code,
          ...evaluateHandoffViability({
            handoff_sequence: pl.handoff_sequence ?? [],
            knowledge_transfer_steps: pl.knowledge_transfer_steps ?? [],
            authority_transfer_steps: pl.authority_transfer_steps ?? [],
            continuity_checks: pl.continuity_checks ?? [],
          }),
        }));

        // Strategy continuity aggregate
        const avgReadiness = readinessResults.length > 0 ? readinessResults.reduce((s: number, r: any) => s + r.score, 0) / readinessResults.length : 0;
        const avgConc = concentrationRisks.length > 0 ? concentrationInputs.reduce((s: number, c: any) => s + c.knowledgeConcentrationScore * 100, 0) / concentrationInputs.length : 0;
        const avgHandoff = handoffResults.length > 0 ? handoffResults.reduce((s: number, h: any) => s + h.completeness, 0) / handoffResults.length : 0;
        const continuity = evaluateStrategyContinuity({
          readinessScore: avgReadiness,
          concentrationRiskScore: avgConc,
          handoffViabilityScore: avgHandoff,
          memoryPreservationScore: 50,
          authorityIntegrityScore: 50,
        });

        result = {
          concentrationRisks,
          readinessResults,
          transitionRisks,
          handoffResults,
          continuity,
        };
        break;
      }

      case "recommendations": {
        const { data: profiles } = await sc.from("role_continuity_profiles").select("backup_exists,knowledge_concentration_score,handoff_maturity_score,succession_readiness_level").eq("organization_id", organization_id);
        const recs: string[] = [];
        const all = profiles ?? [];
        const noBackup = all.filter((p: any) => !p.backup_exists);
        if (noBackup.length > 0) recs.push(`${noBackup.length} critical roles without designated backup.`);
        const highConc = all.filter((p: any) => (p.knowledge_concentration_score ?? 0) > 0.6);
        if (highConc.length > 0) recs.push(`${highConc.length} roles with dangerous knowledge concentration (>60%).`);
        const lowHandoff = all.filter((p: any) => (p.handoff_maturity_score ?? 0) < 0.3);
        if (lowHandoff.length > 0) recs.push(`${lowHandoff.length} roles with weak handoff maturity (<30%).`);
        const fragile = all.filter((p: any) => p.succession_readiness_level === "fragile");
        if (fragile.length > 0) recs.push(`${fragile.length} roles with fragile succession readiness.`);
        const { count: openTransitions } = await sc.from("continuity_transition_events").select("*", { count: "exact", head: true }).eq("organization_id", organization_id).is("resolved_at", null);
        if ((openTransitions ?? 0) > 0) recs.push(`${openTransitions} unresolved transition events.`);
        if (recs.length === 0) recs.push("Succession posture is healthy.");
        result = { recommendations: recs };
        break;
      }

      case "explain": {
        const { role_id } = params;
        const { data: role } = await sc.from("critical_roles").select("*").eq("id", role_id).single();
        if (!role) { result = { error: "Role not found" }; break; }
        const { data: profile } = await sc.from("role_continuity_profiles").select("*").eq("role_id", role_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        const { data: rolePlans } = await sc.from("succession_plans").select("status,succession_type").eq("role_id", role_id);

        // Use shared explainer for structured output
        const explanation = explainSuccession({
          roleName: role.role_name,
          readinessLevel: profile?.succession_readiness_level ?? "unknown",
          readinessScore: profile ? scoreSuccessionReadiness({
            backupExists: profile.backup_exists ?? false,
            successionPlanExists: (rolePlans ?? []).length > 0,
            successionPlanActive: (rolePlans ?? []).some((p: any) => p.status === "active"),
            handoffMaturityScore: profile.handoff_maturity_score ?? 0,
            knowledgeConcentrationScore: profile.knowledge_concentration_score ?? 0,
            criticalityLevel: role.criticality_level ?? "medium",
          }).score : 0,
          backupExists: profile?.backup_exists ?? false,
          knowledgeConcentrationScore: profile?.knowledge_concentration_score ?? 0,
          handoffMaturityScore: profile?.handoff_maturity_score ?? 0,
          successionPlanActive: (rolePlans ?? []).some((p: any) => p.status === "active"),
        });

        result = {
          role: role.role_name,
          domain: role.domain,
          criticality: role.criticality_level,
          continuity_tier: role.continuity_tier,
          explanation,
          plans_count: (rolePlans ?? []).length,
          has_active_plan: (rolePlans ?? []).some((p: any) => p.status === "active"),
        };
        break;
      }

      default:
        result = { error: `Unknown action: ${action}` };
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
