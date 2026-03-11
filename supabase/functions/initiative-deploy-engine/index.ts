import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import {
  isValidDeployTransition,
  VERCEL_DEFAULT_CONFIG,
  type DeployStatus,
  type DeployResponse,
  type HealthStatus,
} from "../_shared/contracts/deploy-contract.schema.ts";

/**
 * Initiative Deploy Engine
 * 
 * Orchestrates the deploy lifecycle:
 * 1. Verify initiative is ready for deployment
 * 2. Read repo metadata
 * 3. Prepare deploy request for target platform
 * 4. Persist deploy state transitions
 * 5. Execute health check post-deploy
 * 6. Return structured deploy result
 * 
 * Input:  { initiative_id, deploy_target? }
 * Output: { initiative_id, deploy_status, deploy_url, health_status, error_code, error_message }
 */

serve(async (req) => {
  const result = await bootstrapPipeline(req, "initiative-deploy-engine");
  if (result instanceof Response) return result;
  const { initiative, ctx, serviceClient, body } = result;

  const deployTarget = body.deploy_target || initiative.deploy_target || "vercel";
  const initiativeId = ctx.initiativeId;

  const jobId = await createJob(ctx, "deploy", { deploy_target: deployTarget });

  try {
    // ── Step 1: Verify initiative is ready for deployment ──
    const currentStage = initiative.stage_status;
    const repoUrl = initiative.repo_url;
    const commitHash = initiative.commit_hash;

    // Must be published, deployed (re-deploy), or deploy_failed (retry)
    const deployableStates = ["published", "deployed", "deploy_failed"];
    if (!deployableStates.includes(currentStage)) {
      throw new Error(
        `Initiative must be in one of [${deployableStates.join(", ")}] to deploy. Current: ${currentStage}`
      );
    }

    if (!repoUrl) {
      throw new Error("Repository URL not found. Initiative must be published first.");
    }

    // Validate state transition
    if (!isValidDeployTransition(currentStage, "deploying")) {
      throw new Error(`Invalid state transition: ${currentStage} → deploying`);
    }

    pipelineLog(ctx, "deploy", `Starting deploy to ${deployTarget} from ${repoUrl}`);

    // ── Step 2: Transition to deploying ──
    await updateInitiative(ctx, {
      stage_status: "deploying",
      deploy_status: "deploying",
      deploy_target: deployTarget,
      deploy_error_code: null,
      deploy_error_message: null,
    });

    // ── Step 3: Execute deployment based on target ──
    let deployUrl: string | null = null;
    let healthStatus: HealthStatus = "unknown";
    let errorCode: string | null = null;
    let errorMessage: string | null = null;

    if (deployTarget === "vercel") {
      const deployResult = await executeVercelDeploy(
        serviceClient, initiative, repoUrl, commitHash, ctx
      );
      deployUrl = deployResult.deploy_url;
      healthStatus = deployResult.health_status;
      errorCode = deployResult.error_code;
      errorMessage = deployResult.error_message;
    } else {
      // Other targets: mark as contract-ready but not yet implemented
      errorCode = "UNSUPPORTED_TARGET";
      errorMessage = `Deploy target "${deployTarget}" is not yet supported. Only "vercel" is available.`;
    }

    // ── Step 4: Persist final state ──
    const finalStatus: DeployStatus = errorCode ? "deploy_failed" : "deployed";
    const now = new Date().toISOString();

    await updateInitiative(ctx, {
      stage_status: finalStatus,
      deploy_status: finalStatus,
      deploy_url: deployUrl,
      health_status: healthStatus,
      deploy_error_code: errorCode,
      deploy_error_message: errorMessage,
      deployed_at: finalStatus === "deployed" ? now : null,
      last_deploy_check_at: now,
    });

    pipelineLog(ctx, "deploy", `Deploy ${finalStatus}: ${deployUrl || errorMessage}`);

    const response: DeployResponse = {
      initiative_id: initiativeId,
      deploy_status: finalStatus,
      deploy_url: deployUrl,
      health_status: healthStatus,
      error_code: errorCode,
      error_message: errorMessage,
    };

    await completeJob(serviceClient, job.id, {
      deploy_target: deployTarget,
      deploy_status: finalStatus,
      deploy_url: deployUrl,
      health_status: healthStatus,
      error_code: errorCode,
      error_message: errorMessage,
      vercel_config: deployTarget === "vercel" ? VERCEL_DEFAULT_CONFIG : null,
    });

    return jsonResponse(response);

  } catch (err: any) {
    const errorMsg = err?.message || "Unknown deploy error";
    pipelineLog(ctx, "deploy", `Deploy failed: ${errorMsg}`);

    // Persist failure state
    await updateInitiative(serviceClient, initiativeId, {
      stage_status: "deploy_failed",
      deploy_status: "deploy_failed",
      deploy_error_code: "DEPLOY_ENGINE_ERROR",
      deploy_error_message: errorMsg,
      last_deploy_check_at: new Date().toISOString(),
    });

    await failJob(serviceClient, job.id, errorMsg);
    return errorResponse(errorMsg, 500);
  }
});

// ══════════════════════════════════════════════════
//  VERCEL DEPLOYMENT
// ══════════════════════════════════════════════════

interface VercelDeployResult {
  deploy_url: string | null;
  health_status: HealthStatus;
  error_code: string | null;
  error_message: string | null;
}

async function executeVercelDeploy(
  _serviceClient: any,
  initiative: any,
  repoUrl: string,
  commitHash: string | null,
  ctx: any
): Promise<VercelDeployResult> {
  // Extract owner/repo from URL
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    return {
      deploy_url: null,
      health_status: "unknown",
      error_code: "INVALID_REPO_URL",
      error_message: `Cannot parse GitHub repo from URL: ${repoUrl}`,
    };
  }

  const [, owner, repo] = match;
  const cleanRepo = repo.replace(/\.git$/, "");

  // Check for Vercel token
  const vercelToken = Deno.env.get("VERCEL_TOKEN");

  if (!vercelToken) {
    // Fallback: Generate Vercel deploy link (manual one-click)
    const deployLink = `https://vercel.com/new/clone?repository-url=${encodeURIComponent(
      `https://github.com/${owner}/${cleanRepo}`
    )}&project-name=${encodeURIComponent(cleanRepo)}`;

    pipelineLog(ctx, "deploy", `VERCEL_TOKEN not configured. Providing manual deploy link.`);

    return {
      deploy_url: deployLink,
      health_status: "unknown",
      error_code: null,
      error_message: null,
    };
  }

  // ── Vercel API Deployment ──
  try {
    // Step 1: Check if project exists or create it
    const projectName = cleanRepo.slice(0, 100);

    // Try to get existing project
    let projectId: string | null = null;
    const getProjectRes = await fetch(
      `https://api.vercel.com/v9/projects/${encodeURIComponent(projectName)}`,
      { headers: { Authorization: `Bearer ${vercelToken}` } }
    );

    if (getProjectRes.ok) {
      const projectData = await getProjectRes.json();
      projectId = projectData.id;
    } else if (getProjectRes.status === 404) {
      // Create project linked to GitHub repo
      const createRes = await fetch("https://api.vercel.com/v10/projects", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: projectName,
          framework: "vite",
          gitRepository: {
            type: "github",
            repo: `${owner}/${cleanRepo}`,
          },
          installCommand: VERCEL_DEFAULT_CONFIG.install_command,
          buildCommand: VERCEL_DEFAULT_CONFIG.build_command,
          outputDirectory: VERCEL_DEFAULT_CONFIG.output_directory,
        }),
      });

      if (!createRes.ok) {
        const errBody = await createRes.text();
        return {
          deploy_url: null,
          health_status: "unknown",
          error_code: "VERCEL_PROJECT_CREATE_FAILED",
          error_message: `Failed to create Vercel project: ${errBody}`,
        };
      }

      const created = await createRes.json();
      projectId = created.id;
    } else {
      const errBody = await getProjectRes.text();
      return {
        deploy_url: null,
        health_status: "unknown",
        error_code: "VERCEL_API_ERROR",
        error_message: `Vercel API error: ${errBody}`,
      };
    }

    // Step 2: Create deployment
    const deployRes = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: projectName,
        project: projectId,
        gitSource: {
          type: "github",
          org: owner,
          repo: cleanRepo,
          ref: commitHash || "main",
        },
      }),
    });

    if (!deployRes.ok) {
      const errBody = await deployRes.text();
      return {
        deploy_url: null,
        health_status: "unknown",
        error_code: "VERCEL_DEPLOY_FAILED",
        error_message: `Vercel deployment failed: ${errBody}`,
      };
    }

    const deployment = await deployRes.json();
    const url = deployment.url
      ? `https://${deployment.url}`
      : deployment.alias?.[0]
        ? `https://${deployment.alias[0]}`
        : null;

    // Step 3: Health check
    let healthResult: HealthStatus = "unknown";
    if (url) {
      healthResult = await performHealthCheck(url);
    }

    return {
      deploy_url: url,
      health_status: healthResult,
      error_code: null,
      error_message: null,
    };

  } catch (err: any) {
    return {
      deploy_url: null,
      health_status: "unknown",
      error_code: "VERCEL_EXCEPTION",
      error_message: err?.message || "Unknown Vercel deployment error",
    };
  }
}

// ══════════════════════════════════════════════════
//  HEALTH CHECK
// ══════════════════════════════════════════════════

async function performHealthCheck(url: string): Promise<HealthStatus> {
  try {
    // Wait a bit for deployment to propagate
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "AxionOS-HealthCheck/1.0" },
    });

    if (res.ok) {
      return "healthy";
    }
    return "unhealthy";
  } catch {
    return "unhealthy";
  }
}
