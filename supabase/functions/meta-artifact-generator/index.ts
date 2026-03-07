import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";
import { retrieveForArtifactGeneration } from "../_shared/engineering-memory-retriever.ts";

/**
 * meta-artifact-generator — Sprint 18 (Proposal Layer v2)
 *
 * Generates engineering artifacts from accepted Meta-Agent recommendations.
 * Now includes structured Related Historical Context sections and
 * decision/outcome-aware framing.
 *
 * SAFETY: Artifacts are pure proposals — they NEVER mutate system state.
 */

const AGENT_TYPE_TO_ARTIFACT: Record<string, string> = {
  ARCHITECTURE_META_AGENT: "ARCHITECTURE_PROPOSAL",
  AGENT_ROLE_DESIGNER: "AGENT_ROLE_SPEC",
  WORKFLOW_OPTIMIZER: "WORKFLOW_CHANGE_PROPOSAL",
  SYSTEM_EVOLUTION_ADVISOR: "ADR_DRAFT",
};

const REC_TYPE_OVERRIDES: Record<string, string> = {
  TECHNICAL_DEBT_ALERT: "ADR_DRAFT",
  ARCHITECTURE_CHANGE_PROPOSAL: "ARCHITECTURE_PROPOSAL",
  SYSTEM_EVOLUTION_REPORT: "IMPLEMENTATION_PLAN",
};

// ── Sprint 18: Extract historical signals from recommendation ──

interface HistoricalSignals {
  historical_alignment: string | null;
  historical_context_score: number;
  decision_history_signal: string;
  outcome_history_signal: string;
  historical_novelty_flag: boolean;
  prior_accepted: number;
  prior_rejected: number;
}

function extractHistoricalSignals(rec: Record<string, unknown>): HistoricalSignals {
  const evidence = Array.isArray(rec.supporting_evidence) ? rec.supporting_evidence : [];
  const histEvidence = evidence.find((e: any) =>
    typeof e.type === "string" && e.type.includes("history_context")
  ) as Record<string, unknown> | undefined;

  const sourceMetrics = rec.source_metrics as Record<string, unknown> | undefined;

  const alignment = histEvidence?.historical_alignment as string
    || sourceMetrics?.historical_alignment as string
    || null;

  const priorAccepted = Number(histEvidence?.prior_accepted || 0);
  const priorRejected = Number(histEvidence?.prior_rejected || 0);
  const novelty = Boolean(histEvidence?.novelty_flag);

  // Decision history signal
  let decisionSignal = "no_prior_decisions";
  if (priorAccepted > 0 && priorRejected === 0) decisionSignal = "historically_supported";
  else if (priorRejected > 0 && priorAccepted === 0) decisionSignal = "historically_contested";
  else if (priorAccepted > 0 && priorRejected > 0) decisionSignal = "historically_mixed";

  // Outcome history signal
  const outcomeScore = Number(histEvidence?.historical_support_score || 0);
  let outcomeSignal = "no_prior_outcomes";
  if (outcomeScore > 0.5) outcomeSignal = "positive_prior_outcomes";
  else if (outcomeScore > 0.2) outcomeSignal = "mixed_prior_outcomes";
  else if (outcomeScore > 0) outcomeSignal = "weak_prior_outcomes";

  return {
    historical_alignment: alignment,
    historical_context_score: Number(sourceMetrics?.historical_context_score || 0),
    decision_history_signal: decisionSignal,
    outcome_history_signal: outcomeSignal,
    historical_novelty_flag: novelty,
    prior_accepted: priorAccepted,
    prior_rejected: priorRejected,
  };
}

function generateADR(rec: Record<string, unknown>, hist: HistoricalSignals): Record<string, unknown> {
  return {
    format: "ADR_DRAFT",
    sections: {
      title: `ADR: ${rec.title}`,
      status: "Draft",
      context: `This ADR was generated from Meta-Agent recommendation "${rec.title}" by ${rec.meta_agent_type}.`,
      problem_statement: rec.description,
      evidence: rec.supporting_evidence,
      proposed_change: `Based on analysis of ${rec.target_component}, the system recommends structural changes to improve reliability and efficiency.`,
      impact_analysis: {
        confidence_score: rec.confidence_score,
        impact_score: rec.impact_score,
        priority_score: rec.priority_score,
        source_metrics: rec.source_metrics,
      },
      risks: [
        "Change may require coordinated deployment across affected components",
        "Rollback strategy should be defined before implementation",
      ],
      alternatives_considered: [
        "Maintain current architecture (accept observed inefficiency)",
        "Partial implementation targeting highest-impact subset",
      ],
      decision: "Pending human review and approval",
      rollback_considerations: "All changes should be reversible through standard deployment rollback procedures.",
      // Sprint 18: Historical framing
      historical_context: hist.historical_alignment ? {
        alignment: hist.historical_alignment,
        decision_history: hist.decision_history_signal,
        outcome_history: hist.outcome_history_signal,
        is_novel: hist.historical_novelty_flag,
        context_score: hist.historical_context_score,
      } : null,
    },
  };
}

function generateArchitectureProposal(rec: Record<string, unknown>, hist: HistoricalSignals): Record<string, unknown> {
  return {
    format: "ARCHITECTURE_PROPOSAL",
    sections: {
      title: `Architecture Proposal: ${rec.title}`,
      current_architecture_snapshot: `Component: ${rec.target_component}`,
      detected_structural_issue: rec.description,
      evidence: rec.supporting_evidence,
      proposed_change: `Restructure ${rec.target_component} based on observed patterns in execution metrics.`,
      compatibility_analysis: "Requires validation against existing pipeline contracts and governance rules.",
      migration_considerations: [
        "Staged rollout recommended",
        "Monitor observability metrics during transition",
        "Validate with existing test suite before full deployment",
      ],
      risk_assessment: {
        confidence: rec.confidence_score,
        impact: rec.impact_score,
        rollback_strategy: "Revert to previous architecture configuration via version control",
      },
      historical_context: hist.historical_alignment ? {
        alignment: hist.historical_alignment,
        decision_history: hist.decision_history_signal,
        outcome_history: hist.outcome_history_signal,
        is_novel: hist.historical_novelty_flag,
      } : null,
    },
  };
}

function generateAgentRoleSpec(rec: Record<string, unknown>, hist: HistoricalSignals): Record<string, unknown> {
  return {
    format: "AGENT_ROLE_SPEC",
    sections: {
      agent_name: `Proposed: ${(rec.title as string || "").replace(/^(Suggest|Create|Propose)\s+/i, "")}`,
      purpose: rec.description,
      evidence_for_creation: rec.supporting_evidence,
      inputs: ["Pipeline execution context", "Stage-specific data", "Error patterns"],
      outputs: ["Specialized processing results", "Status reports", "Error resolution attempts"],
      capabilities: ["Domain-specific task execution", "Pattern recognition", "Automated reporting"],
      constraints: [
        "Must operate within existing governance boundaries",
        "Cannot modify pipeline stages or contracts",
        "Must produce auditable outputs",
      ],
      interaction_with_existing_agents: "Coordinates through standard Agent OS event bus and handoff protocol.",
      estimated_complexity: rec.impact_score && Number(rec.impact_score) > 0.7 ? "high" : "medium",
      source_metrics: rec.source_metrics,
      historical_context: hist.historical_alignment ? {
        alignment: hist.historical_alignment,
        prior_role_proposals: hist.prior_accepted + hist.prior_rejected,
        decision_history: hist.decision_history_signal,
      } : null,
    },
  };
}

function generateWorkflowChangeProposal(rec: Record<string, unknown>, hist: HistoricalSignals): Record<string, unknown> {
  return {
    format: "WORKFLOW_CHANGE_PROPOSAL",
    sections: {
      title: `Workflow Change: ${rec.title}`,
      current_workflow: `Current workflow for ${rec.target_component}`,
      detected_inefficiency: rec.description,
      evidence_metrics: rec.supporting_evidence,
      proposed_change: `Optimize workflow for ${rec.target_component} based on ${rec.recommendation_type} analysis.`,
      expected_benefits: {
        confidence: rec.confidence_score,
        estimated_impact: rec.impact_score,
      },
      potential_risks: [
        "Workflow changes may affect downstream stage timing",
        "Parallel execution changes require concurrency validation",
      ],
      testing_strategy: "Run shadow execution with proposed workflow alongside current workflow to compare outcomes.",
      rollback_strategy: "Revert to previous workflow configuration; all changes are configuration-only.",
      historical_context: hist.historical_alignment ? {
        alignment: hist.historical_alignment,
        decision_history: hist.decision_history_signal,
        outcome_history: hist.outcome_history_signal,
      } : null,
    },
  };
}

function generateImplementationPlan(rec: Record<string, unknown>, hist: HistoricalSignals): Record<string, unknown> {
  return {
    format: "IMPLEMENTATION_PLAN",
    sections: {
      overview: `Implementation plan for: ${rec.title}`,
      scope: rec.description,
      steps: [
        "1. Review and validate proposal with engineering team",
        "2. Create detailed technical specification",
        "3. Implement changes in isolated branch",
        "4. Run full test suite and observability validation",
        "5. Stage deployment with monitoring",
        "6. Full rollout with rollback readiness",
      ],
      affected_components: [rec.target_component],
      testing_requirements: [
        "Unit tests for modified components",
        "Integration tests for pipeline interaction",
        "Observability validation for metric consistency",
      ],
      rollback_plan: "Standard git revert + configuration rollback. No irreversible data changes.",
      deployment_considerations: [
        "Use canary deployment strategy",
        "Monitor key metrics for 24h post-deployment",
        "Maintain previous version for instant rollback",
      ],
      source_evidence: rec.supporting_evidence,
      priority_assessment: {
        confidence: rec.confidence_score,
        impact: rec.impact_score,
        priority: rec.priority_score,
      },
      historical_context: hist.historical_alignment ? {
        alignment: hist.historical_alignment,
        decision_history: hist.decision_history_signal,
        outcome_history: hist.outcome_history_signal,
        context_score: hist.historical_context_score,
      } : null,
    },
  };
}

const GENERATORS: Record<string, (rec: Record<string, unknown>, hist: HistoricalSignals) => Record<string, unknown>> = {
  ADR_DRAFT: generateADR,
  ARCHITECTURE_PROPOSAL: generateArchitectureProposal,
  AGENT_ROLE_SPEC: generateAgentRoleSpec,
  WORKFLOW_CHANGE_PROPOSAL: generateWorkflowChangeProposal,
  IMPLEMENTATION_PLAN: generateImplementationPlan,
};

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = await authenticate(req);
    if (auth instanceof Response) return auth;
    const { user, serviceClient: sc } = auth as AuthContext;

    const { recommendation_id } = await req.json();
    if (!recommendation_id) return errorResponse("recommendation_id required", 400);

    const { data: rec, error: fetchErr } = await sc
      .from("meta_agent_recommendations")
      .select("*")
      .eq("id", recommendation_id)
      .single();

    if (fetchErr || !rec) return errorResponse("Recommendation not found", 404);

    if (rec.status !== "accepted") {
      return errorResponse(`Cannot generate artifact for recommendation with status "${rec.status}". Only accepted recommendations produce artifacts.`, 409);
    }

    const { data: member } = await sc
      .from("organization_members")
      .select("role")
      .eq("organization_id", rec.organization_id)
      .eq("user_id", user.id)
      .single();
    if (!member) return errorResponse("Not a member of this organization", 403);

    const artifactType = REC_TYPE_OVERRIDES[rec.recommendation_type]
      || AGENT_TYPE_TO_ARTIFACT[rec.meta_agent_type]
      || "ADR_DRAFT";

    const { data: existing } = await sc
      .from("meta_agent_artifacts")
      .select("id")
      .eq("recommendation_id", recommendation_id)
      .eq("artifact_type", artifactType)
      .maybeSingle();

    if (existing) {
      return jsonResponse({ id: existing.id, artifact_type: artifactType, status: "already_exists" });
    }

    // ── Sprint 18: Retrieve related historical memory (advisory, non-blocking) ──
    let relatedMemory: unknown[] = [];
    try {
      const memResult = await retrieveForArtifactGeneration(sc, rec.organization_id, {
        artifact_type: artifactType,
        target_component: rec.target_component,
        recommendation_type: rec.recommendation_type,
        meta_agent_type: rec.meta_agent_type,
      });
      relatedMemory = memResult.entries || [];
    } catch (e) {
      console.warn("Memory retrieval for artifact generation failed (non-blocking):", e);
    }

    // Sprint 18: Extract historical signals from recommendation evidence
    const histSignals = extractHistoricalSignals(rec);

    // Generate artifact content with historical signals
    const generator = GENERATORS[artifactType] || generateADR;
    const content = generator(rec, histSignals);

    // Enrich content with related memory context if available (max 5)
    if (relatedMemory.length > 0) {
      (content as any).related_historical_context = relatedMemory.slice(0, 5).map((m: any) => ({
        title: m.title,
        memory_type: m.memory_type,
        summary: m.summary,
        created_at: m.created_at,
        relevance_rank: m._rank_score,
      }));
    }

    // Persist artifact
    const { data: artifact, error: insertErr } = await sc
      .from("meta_agent_artifacts")
      .insert({
        organization_id: rec.organization_id,
        workspace_id: rec.workspace_id || null,
        recommendation_id,
        artifact_type: artifactType,
        title: `${artifactType.replace(/_/g, " ")}: ${rec.title}`,
        summary: rec.description,
        content,
        status: "draft",
        created_by_meta_agent: rec.meta_agent_type,
        linked_resources: [{ type: "recommendation", id: recommendation_id }],
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("Artifact insert error:", insertErr);
      return errorResponse("Failed to create artifact", 500);
    }

    // Audit log
    await sc.from("audit_logs").insert({
      user_id: user.id,
      action: "META_ARTIFACT_CREATED",
      category: "meta_agents",
      entity_type: "meta_agent_artifacts",
      entity_id: artifact.id,
      message: `Generated ${artifactType} from recommendation: ${rec.title}`,
      organization_id: rec.organization_id,
      metadata: {
        artifact_type: artifactType,
        recommendation_id,
        meta_agent_type: rec.meta_agent_type,
        recommendation_type: rec.recommendation_type,
        memory_enriched: relatedMemory.length > 0,
        historical_alignment: histSignals.historical_alignment,
        historical_novelty: histSignals.historical_novelty_flag,
      },
    });

    return jsonResponse({
      id: artifact.id,
      artifact_type: artifactType,
      status: "created",
      recommendation_id,
      memory_enriched: relatedMemory.length > 0,
      historical_alignment: histSignals.historical_alignment,
    });
  } catch (e) {
    console.error("meta-artifact-generator error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
