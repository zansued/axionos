import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { computePortfolioMetrics, identifyDegradingMembers } from "../_shared/strategy-portfolio/strategy-portfolio-analyzer.ts";
import { detectConflicts } from "../_shared/strategy-portfolio/strategy-portfolio-conflict-detector.ts";
import { generateRecommendations, isForbiddenTarget } from "../_shared/strategy-portfolio/strategy-portfolio-optimizer.ts";
import { computeExposureAdjustments } from "../_shared/strategy-portfolio/strategy-exposure-balancer.ts";
import { validateTransition } from "../_shared/strategy-portfolio/strategy-lifecycle-manager.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return errorResponse("Unauthorized", 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return errorResponse("Unauthorized", 401);

  const body = await req.json();
  const { action, organizationId } = body;
  if (!organizationId) return errorResponse("organizationId required", 400);

  try {
    switch (action) {
      case "overview": {
        const [portfoliosRes, membersRes, metricsRes, conflictsRes] = await Promise.all([
          supabase.from("strategy_portfolios").select("*").eq("organization_id", organizationId),
          supabase.from("strategy_portfolio_members").select("*, execution_strategy_families(strategy_family_key, strategy_family_name)").eq("organization_id", organizationId),
          supabase.from("strategy_portfolio_metrics").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(20),
          supabase.from("strategy_portfolio_conflicts").select("*").eq("organization_id", organizationId).eq("status", "open").order("created_at", { ascending: false }).limit(20),
        ]);
        return jsonResponse({
          portfolios: portfoliosRes.data || [],
          members: membersRes.data || [],
          metrics: metricsRes.data || [],
          conflicts: conflictsRes.data || [],
          summary: {
            total_portfolios: (portfoliosRes.data || []).length,
            active_portfolios: (portfoliosRes.data || []).filter((p: any) => p.status === "active").length,
            total_members: (membersRes.data || []).length,
            active_members: (membersRes.data || []).filter((m: any) => m.lifecycle_status === "active").length,
            degrading_members: (membersRes.data || []).filter((m: any) => m.lifecycle_status === "degrading").length,
            open_conflicts: (conflictsRes.data || []).length,
          },
        });
      }

      case "portfolios": {
        const { data } = await supabase.from("strategy_portfolios").select("*").eq("organization_id", organizationId);
        return jsonResponse({ portfolios: data || [] });
      }

      case "conflicts": {
        const { portfolioId } = body;
        let q = supabase.from("strategy_portfolio_conflicts").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(50);
        if (portfolioId) q = q.eq("portfolio_id", portfolioId);
        const { data } = await q;
        return jsonResponse({ conflicts: data || [] });
      }

      case "metrics": {
        const { portfolioId } = body;
        if (!portfolioId) return errorResponse("portfolioId required", 400);

        // Fetch members and outcomes for this portfolio
        const { data: members } = await supabase.from("strategy_portfolio_members").select("*").eq("portfolio_id", portfolioId);
        const familyIds = (members || []).map((m: any) => m.strategy_family_id);

        let outcomes: any[] = [];
        if (familyIds.length > 0) {
          const { data: variants } = await supabase.from("execution_strategy_variants").select("id").in("strategy_family_id", familyIds).eq("organization_id", organizationId);
          const variantIds = (variants || []).map((v: any) => v.id);
          if (variantIds.length > 0) {
            const { data: exps } = await supabase.from("execution_strategy_experiments").select("id").in("strategy_variant_id", variantIds);
            const expIds = (exps || []).map((e: any) => e.id);
            if (expIds.length > 0) {
              const { data: outs } = await supabase.from("execution_strategy_outcomes").select("*").in("experiment_id", expIds);
              outcomes = outs || [];
            }
          }
        }

        const computed = computePortfolioMetrics(members || [], outcomes);

        // Persist snapshot
        await supabase.from("strategy_portfolio_metrics").insert({
          organization_id: organizationId,
          portfolio_id: portfolioId,
          ...computed,
          snapshot_data: { computed_at: new Date().toISOString() },
        });

        return jsonResponse({ metrics: computed });
      }

      case "recommendations": {
        const { portfolioId } = body;
        if (!portfolioId) return errorResponse("portfolioId required", 400);

        const { data: members } = await supabase.from("strategy_portfolio_members").select("*, execution_strategy_families(strategy_family_key)").eq("portfolio_id", portfolioId);

        // Compute metrics
        const { data: familyIds } = await supabase.from("strategy_portfolio_members").select("strategy_family_id").eq("portfolio_id", portfolioId);
        const metrics = computePortfolioMetrics(members || [], []);

        const recs = generateRecommendations(members || [], metrics);

        // Detect conflicts
        const conflictInputs = (members || []).map((m: any) => ({
          member_id: m.id,
          strategy_family_id: m.strategy_family_id,
          family_key: m.execution_strategy_families?.strategy_family_key || "",
          lifecycle_status: m.lifecycle_status,
          exposure_weight: m.exposure_weight,
          performance_score: m.performance_score,
        }));
        const conflicts = detectConflicts(conflictInputs, []);

        // Persist new conflicts
        for (const c of conflicts) {
          await supabase.from("strategy_portfolio_conflicts").insert({
            organization_id: organizationId,
            portfolio_id: portfolioId,
            conflict_type: c.conflict_type,
            affected_strategy_ids: c.affected_strategy_ids,
            severity: c.severity,
            confidence: c.confidence,
            description: c.description,
            recommended_resolution: c.recommended_resolution,
          });
        }

        return jsonResponse({ recommendations: recs, conflicts });
      }

      case "lifecycle_update": {
        const { memberId, targetStatus, reason } = body;
        if (!memberId || !targetStatus) return errorResponse("memberId and targetStatus required", 400);

        const { data: member } = await supabase.from("strategy_portfolio_members")
          .select("*, execution_strategy_families(strategy_family_key)")
          .eq("id", memberId).single();
        if (!member) return errorResponse("Member not found", 404);

        // Forbidden family guard
        const familyKey = (member as any).execution_strategy_families?.strategy_family_key || "";
        if (isForbiddenTarget(familyKey)) {
          return errorResponse(`Cannot modify lifecycle of forbidden family: ${familyKey}`, 403);
        }

        const result = validateTransition({
          member_id: memberId,
          strategy_family_id: member.strategy_family_id,
          current_status: member.lifecycle_status,
          target_status: targetStatus,
          reason: reason || "",
          evidence_refs: body.evidenceRefs || [],
        });

        if (!result.allowed) {
          return errorResponse(result.rejection_reason || "Transition not allowed", 400);
        }

        await supabase.from("strategy_portfolio_members").update({
          lifecycle_status: targetStatus,
          last_evaluated_at: new Date().toISOString(),
        }).eq("id", memberId);

        return jsonResponse({ success: true, transition: result });
      }

      case "explain": {
        const { portfolioId } = body;
        if (!portfolioId) return errorResponse("portfolioId required", 400);

        const [portfolioRes, membersRes, metricsRes, conflictsRes] = await Promise.all([
          supabase.from("strategy_portfolios").select("*").eq("id", portfolioId).single(),
          supabase.from("strategy_portfolio_members").select("*, execution_strategy_families(strategy_family_key, strategy_family_name, status)").eq("portfolio_id", portfolioId),
          supabase.from("strategy_portfolio_metrics").select("*").eq("portfolio_id", portfolioId).order("created_at", { ascending: false }).limit(5),
          supabase.from("strategy_portfolio_conflicts").select("*").eq("portfolio_id", portfolioId).eq("status", "open"),
        ]);

        return jsonResponse({
          portfolio: portfolioRes.data,
          members: membersRes.data || [],
          recent_metrics: metricsRes.data || [],
          open_conflicts: conflictsRes.data || [],
          governance: {
            advisory_first: true,
            forbidden_mutations: ["pipeline_topology", "governance_rules", "billing_logic", "plan_enforcement", "execution_contracts", "hard_safety_constraints"],
          },
        });
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (e: any) {
    console.error("Strategy Portfolio Governance error:", e);
    return errorResponse(e.message, 500);
  }
});
