import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";
import { META_AUDIT_EVENTS, MetaRecommendation } from "../_shared/meta-agents/types.ts";
import { runArchitectureMetaAgent } from "../_shared/meta-agents/architecture-meta-agent.ts";
import { runAgentRoleDesigner } from "../_shared/meta-agents/agent-role-designer.ts";
import { runWorkflowOptimizer } from "../_shared/meta-agents/workflow-optimizer.ts";
import { runSystemEvolutionAdvisor } from "../_shared/meta-agents/system-evolution-advisor.ts";

/**
 * run-meta-agent-analysis — Sprint 13
 *
 * Orchestrator that runs all active Meta-Agents, deduplicates recommendations,
 * persists results, and writes audit logs.
 *
 * POST { organization_id }
 *
 * SAFETY: Idempotent within a time window via signature deduplication.
 */
serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await authenticate(req);
    if (auth instanceof Response) return auth;
    const { user, serviceClient: sc } = auth as AuthContext;

    const { organization_id } = await req.json();
    if (!organization_id) return errorResponse("organization_id required", 400);

    // Verify membership
    const { data: member } = await sc
      .from("organization_members")
      .select("role")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .single();
    if (!member) return errorResponse("Not a member of this organization", 403);

    // Audit: run start
    await sc.from("audit_logs").insert({
      user_id: user.id,
      action: META_AUDIT_EVENTS.META_AGENT_RUN,
      category: "meta_agents",
      message: "Meta-Agent analysis run started",
      organization_id,
      metadata: { meta_agents: ["ARCHITECTURE", "AGENT_ROLE", "WORKFLOW", "EVOLUTION"] },
    });

    // Run all Meta-Agents in parallel
    const [archRecs, roleRecs, workflowRecs, evolutionRecs] = await Promise.all([
      runArchitectureMetaAgent(sc, organization_id).catch((e) => { console.error("Architecture MA error:", e); return []; }),
      runAgentRoleDesigner(sc, organization_id).catch((e) => { console.error("Role Designer MA error:", e); return []; }),
      runWorkflowOptimizer(sc, organization_id).catch((e) => { console.error("Workflow Optimizer MA error:", e); return []; }),
      runSystemEvolutionAdvisor(sc, organization_id).catch((e) => { console.error("Evolution Advisor MA error:", e); return []; }),
    ]);

    const allRecs: MetaRecommendation[] = [...archRecs, ...roleRecs, ...workflowRecs, ...evolutionRecs];

    // Deduplicate: check existing signatures in last 7 days
    const signatures = allRecs.map((r) => r.recommendation_signature).filter(Boolean);
    let existingSignatures: Set<string> = new Set();

    if (signatures.length > 0) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: existing } = await sc
        .from("meta_agent_recommendations")
        .select("recommendation_signature")
        .eq("organization_id", organization_id)
        .gte("created_at", sevenDaysAgo)
        .in("recommendation_signature", signatures);

      existingSignatures = new Set((existing || []).map((e) => e.recommendation_signature));
    }

    // Filter out duplicates
    const newRecs = allRecs.filter((r) => !existingSignatures.has(r.recommendation_signature));

    // Persist new recommendations
    let created = 0;
    for (const rec of newRecs) {
      const { error } = await sc.from("meta_agent_recommendations").insert({
        organization_id,
        meta_agent_type: rec.meta_agent_type,
        recommendation_type: rec.recommendation_type,
        target_component: rec.target_component,
        title: rec.title,
        description: rec.description,
        confidence_score: rec.confidence_score,
        impact_score: rec.impact_score,
        priority_score: rec.priority_score,
        supporting_evidence: rec.supporting_evidence,
        source_metrics: rec.source_metrics,
        source_record_ids: rec.source_record_ids,
        recommendation_signature: rec.recommendation_signature,
        status: "pending",
      });

      if (!error) {
        created++;
        // Audit each creation
        await sc.from("audit_logs").insert({
          user_id: user.id,
          action: META_AUDIT_EVENTS.META_RECOMMENDATION_CREATED,
          category: "meta_agents",
          message: `Meta-recommendation: ${rec.title}`,
          organization_id,
          metadata: {
            meta_agent_type: rec.meta_agent_type,
            recommendation_type: rec.recommendation_type,
            confidence: rec.confidence_score,
            impact: rec.impact_score,
          },
        });
      }
    }

    return jsonResponse({
      total_analyzed: allRecs.length,
      duplicates_skipped: allRecs.length - newRecs.length,
      recommendations_created: created,
      by_agent: {
        architecture: archRecs.length,
        agent_role: roleRecs.length,
        workflow: workflowRecs.length,
        evolution: evolutionRecs.length,
      },
    });
  } catch (e) {
    console.error("run-meta-agent-analysis error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
