import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import {
  isValidDeployTransition,
  type DeployStatus,
  type DeployResponse,
  type HealthStatus,
} from "../_shared/contracts/deploy-contract.schema.ts";
import {
  createDefaultRegistry,
  type DeployInitiativeContext,
  type DeployProviderName,
} from "../_shared/contracts/deploy-provider.schema.ts";
import {
  evaluateSecurityRules,
  PIPELINE_SECURITY_RULES,
  buildMatcherLogEntry,
} from "../_shared/contracts/security-matcher.schema.ts";

/**
 * Initiative Deploy Engine — Provider-Agnostic
 * 
 * Uses the DeployProviderRegistry to delegate deployment to pluggable adapters.
 * Validates responses using the declarative security matcher engine.
 */

const providerRegistry = createDefaultRegistry();

serve(async (req) => {
  const result = await bootstrapPipeline(req, "initiative-deploy-engine");
  if (result instanceof Response) return result;
  const { initiative, ctx, serviceClient, body } = result;

  const deployTarget = (body.deploy_target || initiative.deploy_target || "vercel") as DeployProviderName;
  const initiativeId = ctx.initiativeId;

  const jobId = await createJob(ctx, "deploy", { deploy_target: deployTarget });

  try {
    // ── Step 1: Verify initiative is ready ──
    const currentStage = initiative.stage_status;
    const repoUrl = initiative.repo_url;

    const deployableStates = ["published", "deployed", "deploy_failed"];
    if (!deployableStates.includes(currentStage)) {
      throw new Error(`Initiative must be in [${deployableStates.join(", ")}] to deploy. Current: ${currentStage}`);
    }
    if (!repoUrl) throw new Error("Repository URL not found. Initiative must be published first.");
    if (!isValidDeployTransition(currentStage, "deploying")) {
      throw new Error(`Invalid state transition: ${currentStage} → deploying`);
    }

    // ── Step 2: Resolve provider adapter ──
    const adapter = providerRegistry.get(deployTarget);
    if (!adapter) {
      const available = providerRegistry.list().join(", ");
      throw new Error(`Deploy provider "${deployTarget}" not registered. Available: ${available}`);
    }

    pipelineLog(ctx, "deploy", `Starting deploy to ${deployTarget} via provider adapter`);

    await updateInitiative(ctx, {
      stage_status: "deploying",
      deploy_status: "deploying",
      deploy_target: deployTarget,
      deploy_error_code: null,
      deploy_error_message: null,
    });

    // ── Step 3: Generate & validate config ──
    const initiativeContext: DeployInitiativeContext = {
      initiative_id: initiativeId,
      repo_url: repoUrl,
      commit_hash: initiative.commit_hash || null,
      framework: initiative.framework || "vite",
      branch: initiative.branch || "main",
    };

    const config = adapter.generateConfig(initiativeContext);
    const validation = adapter.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Deploy config validation failed: ${validation.errors.join("; ")}`);
    }

    // ── Step 4: Execute deployment via adapter ──
    const deployResult = await adapter.deploy(initiativeContext, config);

    // ── Step 5: Security matcher validation on result ──
    const matcherInput = {
      status_code: deployResult.error_code ? 500 : 200,
      body: JSON.stringify(deployResult),
    };
    const matchReport = evaluateRules(PIPELINE_SECURITY_RULES, matcherInput);
    if (!matchReport.passed) {
      pipelineLog(ctx, "deploy", `Security matcher flagged: ${matchReport.results.filter(r => r.matched).map(r => r.rule_name).join(", ")}`);
    }

    // ── Step 6: Parse errors for suggestions ──
    let errorSuggestions: unknown[] = [];
    if (deployResult.error_code && deployResult.error_message) {
      errorSuggestions = adapter.parseError(deployResult.error_code, deployResult.error_message);
    }

    // ── Step 7: Persist final state ──
    const finalStatus: DeployStatus = deployResult.error_code ? "deploy_failed" : "deployed";
    const now = new Date().toISOString();

    await updateInitiative(ctx, {
      stage_status: finalStatus,
      deploy_status: finalStatus,
      deploy_url: deployResult.deploy_url,
      health_status: deployResult.health_status,
      deploy_error_code: deployResult.error_code,
      deploy_error_message: deployResult.error_message,
      deployed_at: finalStatus === "deployed" ? now : null,
      last_deploy_check_at: now,
    });

    pipelineLog(ctx, "deploy", `Deploy ${finalStatus}: ${deployResult.deploy_url || deployResult.error_message}`);

    const response: DeployResponse & { error_suggestions?: unknown[]; security_report?: unknown } = {
      initiative_id: initiativeId,
      deploy_status: finalStatus,
      deploy_url: deployResult.deploy_url,
      health_status: deployResult.health_status,
      error_code: deployResult.error_code,
      error_message: deployResult.error_message,
      ...(errorSuggestions.length > 0 ? { error_suggestions: errorSuggestions } : {}),
      ...(!matchReport.passed ? { security_report: { highest_severity: matchReport.highest_severity, matched_rules: matchReport.rules_matched } } : {}),
    };

    await completeJob(ctx, jobId!, {
      deploy_target: deployTarget,
      deploy_status: finalStatus,
      deploy_url: deployResult.deploy_url,
      health_status: deployResult.health_status,
      error_code: deployResult.error_code,
      error_message: deployResult.error_message,
      provider_metadata: deployResult.provider_metadata || null,
      security_matcher_passed: matchReport.passed,
    });

    return jsonResponse(response);

  } catch (err: any) {
    const errorMsg = err?.message || "Unknown deploy error";
    pipelineLog(ctx, "deploy", `Deploy failed: ${errorMsg}`);

    await updateInitiative(ctx, {
      stage_status: "deploy_failed",
      deploy_status: "deploy_failed",
      deploy_error_code: "DEPLOY_ENGINE_ERROR",
      deploy_error_message: errorMsg,
      last_deploy_check_at: new Date().toISOString(),
    });

    await failJob(ctx, jobId!, errorMsg);
    return errorResponse(errorMsg, 500);
  }
});
