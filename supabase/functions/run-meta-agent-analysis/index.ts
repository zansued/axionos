import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";
import { META_AUDIT_EVENTS, MetaRecommendation } from "../_shared/meta-agents/types.ts";
import { runArchitectureMetaAgent } from "../_shared/meta-agents/architecture-meta-agent.ts";
import { runAgentRoleDesigner } from "../_shared/meta-agents/agent-role-designer.ts";
import { runWorkflowOptimizer } from "../_shared/meta-agents/workflow-optimizer.ts";
import { runSystemEvolutionAdvisor } from "../_shared/meta-agents/system-evolution-advisor.ts";
import { applyQualityGate, normalizeSignature } from "../_shared/meta-agents/validation.ts";
import { getMetaAgentHistoricalContext, HistoricalContext } from "../_shared/meta-agents/meta-agent-memory-context.ts";

/**
 * run-meta-agent-analysis — Sprint 19 (Quality Feedback Loop)
 *
 * Orchestrator that runs all active Meta-Agents with historical context,
 * applies quality gates, deduplicates, persists results, and writes audit logs.
 *
 * POST { organization_id }
 *
 * SAFETY: Memory enrichment is advisory and non-blocking.
 */
serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const runStart = Date.now();

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
      message: "Meta-Agent analysis run started (memory-aware)",
      organization_id,
      metadata: { meta_agents: ["ARCHITECTURE", "AGENT_ROLE", "WORKFLOW", "EVOLUTION"], memory_aware: true },
    });

    // ── Sprint 18: Retrieve historical context for each meta-agent (advisory, non-blocking) ──
    const historyContexts: Record<string, HistoricalContext> = {};
    try {
      const [archCtx, roleCtx, workflowCtx, evolutionCtx] = await Promise.all([
        getMetaAgentHistoricalContext(sc, organization_id, "ARCHITECTURE_META_AGENT").catch(() => null),
        getMetaAgentHistoricalContext(sc, organization_id, "AGENT_ROLE_DESIGNER").catch(() => null),
        getMetaAgentHistoricalContext(sc, organization_id, "WORKFLOW_OPTIMIZER").catch(() => null),
        getMetaAgentHistoricalContext(sc, organization_id, "SYSTEM_EVOLUTION_ADVISOR").catch(() => null),
      ]);
      if (archCtx) historyContexts.architecture = archCtx;
      if (roleCtx) historyContexts.agent_role = roleCtx;
      if (workflowCtx) historyContexts.workflow = workflowCtx;
      if (evolutionCtx) historyContexts.evolution = evolutionCtx;
    } catch (e) {
      console.warn("Historical context retrieval failed (non-blocking):", e);
    }

    // Run all Meta-Agents in parallel with historical context
    const [archRecs, roleRecs, workflowRecs, evolutionRecs] = await Promise.all([
      runArchitectureMetaAgent(sc, organization_id, historyContexts.architecture).catch((e) => { console.error("Architecture MA error:", e); return []; }),
      runAgentRoleDesigner(sc, organization_id, historyContexts.agent_role).catch((e) => { console.error("Role Designer MA error:", e); return []; }),
      runWorkflowOptimizer(sc, organization_id, historyContexts.workflow).catch((e) => { console.error("Workflow Optimizer MA error:", e); return []; }),
      runSystemEvolutionAdvisor(sc, organization_id, historyContexts.evolution).catch((e) => { console.error("Evolution Advisor MA error:", e); return []; }),
    ]);

    const allRecs: MetaRecommendation[] = [...archRecs, ...roleRecs, ...workflowRecs, ...evolutionRecs];

    // --- Quality Gate ---
    const { accepted: qualityPassed, suppressed } = applyQualityGate(allRecs);

    if (suppressed.length > 0) {
      console.info(`Quality gate suppressed ${suppressed.length} recommendations:`,
        suppressed.map((s) => `${s.rec.title}: ${s.reason}`)
      );
    }

    // --- Normalize signatures ---
    for (const rec of qualityPassed) {
      rec.recommendation_signature = normalizeSignature(rec.recommendation_signature);
    }

    // Deduplicate: check existing signatures in last 7 days
    const signatures = qualityPassed.map((r) => r.recommendation_signature).filter(Boolean);
    let existingSignatures: Set<string> = new Set();

    if (signatures.length > 0) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: existing } = await sc
        .from("meta_agent_recommendations")
        .select("recommendation_signature")
        .eq("organization_id", organization_id)
        .gte("created_at", sevenDaysAgo)
        .in("recommendation_signature", signatures);

      existingSignatures = new Set(
        (existing || []).map((e) => e.recommendation_signature).filter(Boolean)
      );
    }

    const newRecs = qualityPassed.filter((r) => !existingSignatures.has(r.recommendation_signature));
    const duplicatesSkipped = qualityPassed.length - newRecs.length;

    // Count memory-enriched recommendations
    const memoryEnrichedCount = newRecs.filter((r) =>
      Array.isArray(r.supporting_evidence) &&
      r.supporting_evidence.some((e: any) => e.type?.includes("history_context"))
    ).length;

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
            priority: rec.priority_score,
            memory_enriched: Array.isArray(rec.supporting_evidence) &&
              rec.supporting_evidence.some((e: any) => e.type?.includes("history_context")),
            historical_alignment: (rec.source_metrics as any)?.historical_alignment || null,
          },
        });
      }
    }

    const runDurationMs = Date.now() - runStart;

    const avgConfidence = newRecs.length > 0
      ? newRecs.reduce((a, r) => a + r.confidence_score, 0) / newRecs.length : 0;
    const avgImpact = newRecs.length > 0
      ? newRecs.reduce((a, r) => a + r.impact_score, 0) / newRecs.length : 0;

    const runMetrics = {
      total_generated: allRecs.length,
      quality_suppressed: suppressed.length,
      duplicates_skipped: duplicatesSkipped,
      recommendations_created: created,
      memory_enriched_count: memoryEnrichedCount,
      avg_confidence: Math.round(avgConfidence * 1000) / 1000,
      avg_impact: Math.round(avgImpact * 1000) / 1000,
      run_duration_ms: runDurationMs,
      by_agent: {
        architecture: archRecs.length,
        agent_role: roleRecs.length,
        workflow: workflowRecs.length,
        evolution: evolutionRecs.length,
      },
      history_context_available: {
        architecture: !!historyContexts.architecture,
        agent_role: !!historyContexts.agent_role,
        workflow: !!historyContexts.workflow,
        evolution: !!historyContexts.evolution,
      },
    };

    // Audit: run complete
    await sc.from("audit_logs").insert({
      user_id: user.id,
      action: META_AUDIT_EVENTS.META_AGENT_RUN,
      category: "meta_agents",
      message: `Meta-Agent analysis complete: ${created} created, ${suppressed.length} suppressed, ${duplicatesSkipped} deduplicated, ${memoryEnrichedCount} memory-enriched`,
      organization_id,
      metadata: runMetrics,
    });

    return jsonResponse(runMetrics);
  } catch (e) {
    console.error("run-meta-agent-analysis error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
