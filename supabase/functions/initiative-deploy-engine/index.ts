import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob, transitionStage } from "../_shared/pipeline-helpers.ts";
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
import {
  validatePublishConfirmation,
  type PublishConfirmation,
} from "../_shared/contracts/publish-confirmation.schema.ts";

/**
 * Initiative Deploy Engine — Sprint 206: Reliable Deploy + Publish Contract
 * 
 * Changes from Sprint 205:
 * 1. Validates PublishConfirmation contract before deploying
 * 2. Uses transitionStage() for state-machine-validated transitions
 * 3. Health check with retry (up to 3 attempts)
 * 4. Structured deploy pre-flight gate
 */

const providerRegistry = createDefaultRegistry();
const HEALTH_CHECK_RETRIES = 3;
const HEALTH_CHECK_DELAY_MS = 8000;

serve(async (req) => {
  const result = await bootstrapPipeline(req, "initiative-deploy-engine");
  if (result instanceof Response) return result;
  const { initiative, ctx, serviceClient, body } = result;

  const deployTarget = (body.deploy_target || initiative.deploy_target || "vercel") as DeployProviderName;
  const initiativeId = ctx.initiativeId;

  const jobId = await createJob(ctx, "deploy", { deploy_target: deployTarget });

  try {
    // ── Step 1: Validate publish confirmation contract ──
    const publishConfirmation = initiative.publish_confirmation as unknown;

    // If no publish_confirmation exists, skip contract validation (backward compat)
    const hasConfirmation = publishConfirmation != null && typeof publishConfirmation === "object" && Object.keys(publishConfirmation as Record<string, unknown>).length > 0;
    const pcValidation = hasConfirmation
      ? validatePublishConfirmation(publishConfirmation)
      : { valid: true, errors: [], warnings: ["No publish confirmation present — skipping contract validation"], deploy_ready: true };

    if (!pcValidation.valid) {
      pipelineLog(ctx, "deploy_preflight_failed",
        `Publish confirmation validation failed: ${pcValidation.errors.join("; ")}`,
        { errors: pcValidation.errors, warnings: pcValidation.warnings });
    }

    if (hasConfirmation && !pcValidation.deploy_ready) {
      throw new Error(
        `Deploy blocked by publish confirmation contract: ${pcValidation.errors.join("; ")}`
      );
    }

    // Log warnings even if deploy proceeds
    if (pcValidation.warnings.length > 0) {
      pipelineLog(ctx, "deploy_preflight_warnings",
        `Publish confirmation warnings: ${pcValidation.warnings.join("; ")}`,
        { warnings: pcValidation.warnings });
    }

    // ── Step 2: Verify initiative is ready ──
    const currentStage = initiative.stage_status;
    const repoUrl = initiative.repo_url;

    const deployableStates = ["published", "deployed", "deploy_failed"];
    if (!deployableStates.includes(currentStage)) {
      throw new Error(`Initiative must be in [${deployableStates.join(", ")}] to deploy. Current: ${currentStage}`);
    }
    if (!repoUrl) throw new Error("Repository URL not found. Initiative must be published first.");

    // ── Step 3: Resolve provider adapter ──
    const adapter = providerRegistry.get(deployTarget);
    if (!adapter) {
      const available = providerRegistry.list().join(", ");
      throw new Error(`Deploy provider "${deployTarget}" not registered. Available: ${available}`);
    }

    pipelineLog(ctx, "deploy", `Starting deploy to ${deployTarget} via provider adapter`);

    // ── Step 4: Transition to deploying (state-machine validated) ──
    const transResult = await transitionStage(ctx, "deploying", {
      deploy_status: "deploying",
      deploy_target: deployTarget,
      deploy_error_code: null,
      deploy_error_message: null,
    });

    if (!transResult.success) {
      throw new Error(`State transition blocked: ${transResult.reason}`);
    }

    // ── Step 5: Generate & validate config ──
    const pc = publishConfirmation as PublishConfirmation | null;
    const initiativeContext: DeployInitiativeContext = {
      initiative_id: initiativeId,
      repo_url: repoUrl,
      commit_hash: pc?.commit_sha || initiative.commit_hash || null,
      framework: initiative.framework || "vite",
      branch: pc?.branch || initiative.branch || "main",
    };

    const config = adapter.generateConfig(initiativeContext);
    const validation = adapter.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Deploy config validation failed: ${validation.errors.join("; ")}`);
    }

    // ── Step 6: Execute deployment via adapter ──
    const deployResult = await adapter.deploy(initiativeContext, config);

    // ── Step 7: Security matcher validation on result ──
    const matcherInput = {
      status_code: deployResult.error_code ? 500 : 200,
      body: JSON.stringify(deployResult),
    };
    const matchReport = evaluateSecurityRules(PIPELINE_SECURITY_RULES, matcherInput);
    if (!matchReport.passed) {
      const logEntry = buildMatcherLogEntry("initiative-deploy-engine", matchReport);
      pipelineLog(ctx, "security_matcher_flagged", `Security matcher flagged: ${logEntry.matched_rule_ids.join(", ")}`, logEntry as unknown as Record<string, unknown>);
    }

    // ── Step 8: Parse errors for suggestions ──
    let errorSuggestions: unknown[] = [];
    if (deployResult.error_code && deployResult.error_message) {
      errorSuggestions = adapter.parseError(deployResult.error_code, deployResult.error_message);
    }

    // ── Step 9: Health check with retry ──
    let finalHealth: HealthStatus = deployResult.health_status;
    if (deployResult.deploy_url && !deployResult.error_code && finalHealth !== "healthy") {
      for (let attempt = 1; attempt <= HEALTH_CHECK_RETRIES; attempt++) {
        pipelineLog(ctx, "health_check_retry", `Health check attempt ${attempt}/${HEALTH_CHECK_RETRIES}...`);
        await new Promise(r => setTimeout(r, HEALTH_CHECK_DELAY_MS));
        try {
          finalHealth = await adapter.healthCheck(deployResult.deploy_url);
          if (finalHealth === "healthy") {
            pipelineLog(ctx, "health_check_passed", `Health check passed on attempt ${attempt}`);
            break;
          }
        } catch (hcErr) {
          pipelineLog(ctx, "health_check_error", `Health check attempt ${attempt} error: ${hcErr}`);
        }
      }
    }

    // ── Step 10: Persist final state via transitionStage ──
    const finalStatus: DeployStatus = deployResult.error_code ? "deploy_failed" : "deployed";
    const now = new Date().toISOString();

    const finalTransition = await transitionStage(ctx, finalStatus, {
      deploy_status: finalStatus,
      deploy_url: deployResult.deploy_url,
      health_status: finalHealth,
      deploy_error_code: deployResult.error_code,
      deploy_error_message: deployResult.error_message,
      deployed_at: finalStatus === "deployed" ? now : null,
      last_deploy_check_at: now,
    });

    if (!finalTransition.success) {
      // Force-update if transition fails (edge case: concurrent state change)
      pipelineLog(ctx, "deploy_transition_fallback",
        `Final transition to ${finalStatus} blocked (${finalTransition.reason}), force-updating fields`);
      await updateInitiative(ctx, {
        deploy_status: finalStatus,
        deploy_url: deployResult.deploy_url,
        health_status: finalHealth,
        deploy_error_code: deployResult.error_code,
        deploy_error_message: deployResult.error_message,
        last_deploy_check_at: now,
      });
    }

    pipelineLog(ctx, "deploy", `Deploy ${finalStatus}: ${deployResult.deploy_url || deployResult.error_message}`);

    const response: DeployResponse & { error_suggestions?: unknown[]; security_report?: unknown; publish_contract_valid?: boolean } = {
      initiative_id: initiativeId,
      deploy_status: finalStatus,
      deploy_url: deployResult.deploy_url,
      health_status: finalHealth,
      error_code: deployResult.error_code,
      error_message: deployResult.error_message,
      ...(errorSuggestions.length > 0 ? { error_suggestions: errorSuggestions } : {}),
      ...(!matchReport.passed ? { security_report: { highest_severity: matchReport.highest_severity, matched_rules: matchReport.rules_matched } } : {}),
      publish_contract_valid: pcValidation.valid,
    };

    await completeJob(ctx, jobId!, {
      deploy_target: deployTarget,
      deploy_status: finalStatus,
      deploy_url: deployResult.deploy_url,
      health_status: finalHealth,
      error_code: deployResult.error_code,
      error_message: deployResult.error_message,
      provider_metadata: deployResult.provider_metadata || null,
      security_matcher_passed: matchReport.passed,
      publish_contract_valid: pcValidation.valid,
      health_check_retries: HEALTH_CHECK_RETRIES,
    });

    return jsonResponse(response);

  } catch (err: any) {
    const errorMsg = err?.message || "Unknown deploy error";
    pipelineLog(ctx, "deploy", `Deploy failed: ${errorMsg}`);

    // Use transitionStage for failure state, fallback to updateInitiative
    const failTransition = await transitionStage(ctx, "deploy_failed", {
      deploy_status: "deploy_failed",
      deploy_error_code: "DEPLOY_ENGINE_ERROR",
      deploy_error_message: errorMsg,
      last_deploy_check_at: new Date().toISOString(),
    });

    if (!failTransition.success) {
      await updateInitiative(ctx, {
        deploy_status: "deploy_failed",
        deploy_error_code: "DEPLOY_ENGINE_ERROR",
        deploy_error_message: errorMsg,
        last_deploy_check_at: new Date().toISOString(),
      });
    }

    await failJob(ctx, jobId!, errorMsg);
    return errorResponse(errorMsg, 500);
  }
});
