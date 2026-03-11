import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { pipelineLog, updateInitiative } from "../_shared/pipeline-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-approve");
  if (result instanceof Response) return result;
  const { initiative, ctx, serviceClient } = result;

  const currentStatus = initiative.stage_status;

  // Check gate permission
  const { data: hasPermission } = await serviceClient.rpc("has_gate_permission", {
    _user_id: ctx.userId,
    _org_id: ctx.organizationId,
    _stage: currentStatus,
    _action_type: "approve",
  });

  if (hasPermission === false) {
    return errorResponse("Você não tem permissão para aprovar este gate. Contate um administrador.", 403);
  }

  const approvalMap: Record<string, { field: string; nextStatus: string }> = {
    // Venture Intelligence stages (S01-S05)
    opportunity_discovered: { field: "approved_at_discovery", nextStatus: "market_signals_analyzing" },
    market_signals_analyzed: { field: "approved_at_discovery", nextStatus: "product_validating" },
    product_validated: { field: "approved_at_discovery", nextStatus: "revenue_strategizing" },
    revenue_strategized: { field: "approved_at_discovery", nextStatus: "discovered" },
    // Project Foundation & Architecture stages
    discovered: { field: "approved_at_discovery", nextStatus: "architecture_ready" },
    architected: { field: "approved_at_planning", nextStatus: "architecture_simulated" },
    architecture_simulated: { field: "approved_at_planning", nextStatus: "preventive_validated" },
    preventive_validated: { field: "approved_at_planning", nextStatus: "bootstrap_planned" },
    bootstrap_planned: { field: "approved_at_planning", nextStatus: "foundation_scaffolded" },
    scaffolded: { field: "approved_at_discovery", nextStatus: "simulating_modules" },
    foundation_scaffolded: { field: "approved_at_planning", nextStatus: "simulating_modules" },
    modules_simulated: { field: "approved_at_discovery", nextStatus: "analyzing_dependencies" },
    dependencies_analyzed: { field: "approved_at_discovery", nextStatus: "bootstrapping_schema" },
    // Engineering stages
    schema_bootstrapped: { field: "approved_at_planning", nextStatus: "provisioning_db" },
    db_provisioned: { field: "approved_at_planning", nextStatus: "analyzing_domain" },
    domain_analyzed: { field: "approved_at_planning", nextStatus: "generating_data_model" },
    data_model_generated: { field: "approved_at_planning", nextStatus: "synthesizing_logic" },
    logic_synthesized: { field: "approved_at_planning", nextStatus: "generating_api" },
    api_generated: { field: "approved_at_planning", nextStatus: "generating_ui" },
    ui_generated: { field: "approved_at_planning", nextStatus: "squad_ready" },
    squad_formed: { field: "approved_at_squad", nextStatus: "planning_ready" },
    planned: { field: "approved_at_planning", nextStatus: "in_progress" },
    validating: { field: "approved_at_planning", nextStatus: "ready_to_publish" },
    ready_to_publish: { field: "approved_at_planning", nextStatus: "published" },
    published: { field: "approved_at_planning", nextStatus: "observability_ready" },
    observability_ready: { field: "approved_at_planning", nextStatus: "analytics_ready" },
    analytics_ready: { field: "approved_at_planning", nextStatus: "behavior_analyzed" },
    behavior_analyzed: { field: "approved_at_planning", nextStatus: "growth_optimized" },
    growth_optimized: { field: "approved_at_planning", nextStatus: "product_evolved" },
    product_evolved: { field: "approved_at_planning", nextStatus: "architecture_evolved" },
    architecture_evolved: { field: "approved_at_planning", nextStatus: "system_evolved" },
    portfolio_managed: { field: "approved_at_planning", nextStatus: "system_evolved" },
    system_evolved: { field: "approved_at_planning", nextStatus: "completed" },
    // Post-deploy / runtime stages
    deployed: { field: "approved_at_planning", nextStatus: "observability_ready" },
    in_progress: { field: "approved_at_planning", nextStatus: "in_progress" },
    // Runtime-phase: "Marcar como Concluído" should complete the initiative
    runtime_active: { field: "approved_at_planning", nextStatus: "completed" },
    observing_product: { field: "approved_at_planning", nextStatus: "completed" },
    product_observed: { field: "approved_at_planning", nextStatus: "completed" },
    analyzing_product_metrics: { field: "approved_at_planning", nextStatus: "completed" },
    product_metrics_analyzed: { field: "approved_at_planning", nextStatus: "completed" },
    analyzing_user_behavior: { field: "approved_at_planning", nextStatus: "completed" },
    user_behavior_analyzed: { field: "approved_at_planning", nextStatus: "completed" },
    optimizing_growth: { field: "approved_at_planning", nextStatus: "completed" },
    learning_system: { field: "approved_at_planning", nextStatus: "completed" },
    system_learned: { field: "approved_at_planning", nextStatus: "completed" },
    managing_portfolio: { field: "approved_at_planning", nextStatus: "completed" },
  };

  const approval = approvalMap[currentStatus];
  if (!approval) {
    const terminalStates = ["completed", "archived"];
    if (terminalStates.includes(currentStatus)) {
      return jsonResponse({ success: true, new_status: currentStatus, message: "Already approved/advanced" });
    }
    return errorResponse(`Cannot approve at status: ${currentStatus}`, 400);
  }

  await updateInitiative(ctx, {
    stage_status: approval.nextStatus,
    [approval.field]: new Date().toISOString(),
  });
  await pipelineLog(ctx, "pipeline_stage_approved", `Stage aprovado: ${currentStatus} → ${approval.nextStatus}`);

  return jsonResponse({ success: true, previous_status: currentStatus, new_status: approval.nextStatus });
});
