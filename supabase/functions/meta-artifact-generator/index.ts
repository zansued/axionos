import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";
import { retrieveForArtifactGeneration } from "../_shared/engineering-memory-retriever.ts";

/**
 * meta-artifact-generator — Sprint 14
 *
 * Generates engineering artifacts from accepted Meta-Agent recommendations.
 * Artifact types: ADR_DRAFT, ARCHITECTURE_PROPOSAL, AGENT_ROLE_SPEC,
 *                 WORKFLOW_CHANGE_PROPOSAL, IMPLEMENTATION_PLAN
 *
 * SAFETY: Artifacts are pure proposals — they NEVER mutate system state.
 * Idempotent: unique constraint on (recommendation_id, artifact_type) prevents duplicates.
 *
 * POST { recommendation_id }
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

function generateADR(rec: Record<string, unknown>): Record<string, unknown> {
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
    },
  };
}

function generateArchitectureProposal(rec: Record<string, unknown>): Record<string, unknown> {
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
    },
  };
}

function generateAgentRoleSpec(rec: Record<string, unknown>): Record<string, unknown> {
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
    },
  };
}

function generateWorkflowChangeProposal(rec: Record<string, unknown>): Record<string, unknown> {
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
    },
  };
}

function generateImplementationPlan(rec: Record<string, unknown>): Record<string, unknown> {
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
    },
  };
}

const GENERATORS: Record<string, (rec: Record<string, unknown>) => Record<string, unknown>> = {
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

    // Fetch recommendation
    const { data: rec, error: fetchErr } = await sc
      .from("meta_agent_recommendations")
      .select("*")
      .eq("id", recommendation_id)
      .single();

    if (fetchErr || !rec) return errorResponse("Recommendation not found", 404);

    // Only accepted recommendations can generate artifacts
    if (rec.status !== "accepted") {
      return errorResponse(`Cannot generate artifact for recommendation with status "${rec.status}". Only accepted recommendations produce artifacts.`, 409);
    }

    // Verify membership
    const { data: member } = await sc
      .from("organization_members")
      .select("role")
      .eq("organization_id", rec.organization_id)
      .eq("user_id", user.id)
      .single();
    if (!member) return errorResponse("Not a member of this organization", 403);

    // Determine artifact type
    const artifactType = REC_TYPE_OVERRIDES[rec.recommendation_type]
      || AGENT_TYPE_TO_ARTIFACT[rec.meta_agent_type]
      || "ADR_DRAFT";

    // Check for existing artifact (idempotency via unique constraint)
    const { data: existing } = await sc
      .from("meta_agent_artifacts")
      .select("id")
      .eq("recommendation_id", recommendation_id)
      .eq("artifact_type", artifactType)
      .maybeSingle();

    if (existing) {
      return jsonResponse({ id: existing.id, artifact_type: artifactType, status: "already_exists" });
    }

    // ── Sprint 16: Retrieve related historical memory (advisory, non-blocking) ──
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

    // Generate artifact content
    const generator = GENERATORS[artifactType] || generateADR;
    const content = generator(rec);

    // Enrich content with related memory context if available
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
      },
    });

    return jsonResponse({
      id: artifact.id,
      artifact_type: artifactType,
      status: "created",
      recommendation_id,
    });
  } catch (e) {
    console.error("meta-artifact-generator error:", e);
    return errorResponse(e.message || "Internal error", 500);
  }
});
