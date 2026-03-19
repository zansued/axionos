/**
 * Provider-Agnostic Deployment Contract Layer
 * 
 * Abstracts deployment into a contract with pluggable provider adapters.
 * Each provider implements config generation, validation, error parsing,
 * and fix suggestions.
 */

import type { HealthStatus } from "./deploy-contract.schema.ts";

// ══════════════════════════════════════════════════
//  PROVIDER ADAPTER INTERFACE
// ══════════════════════════════════════════════════

export type DeployProviderName = "vercel" | "netlify" | "aws" | "docker" | "custom";

export interface DeployProviderConfig {
  framework: string;
  install_command: string;
  build_command: string;
  output_directory: string;
  environment_variables?: Record<string, string>;
  rewrites?: Array<{ source: string; destination: string }>;
  extra?: Record<string, unknown>;
}

export interface DeployProviderResult {
  deploy_url: string | null;
  health_status: HealthStatus;
  error_code: string | null;
  error_message: string | null;
  provider_metadata?: Record<string, unknown>;
}

export interface DeployErrorSuggestion {
  error_pattern: string;
  title: string;
  suggestion: string;
  doc_url: string | null;
  severity: "error" | "warning" | "info";
}

export interface IDeployProviderAdapter {
  readonly name: DeployProviderName;
  
  /** Generate provider-specific config from initiative metadata */
  generateConfig(initiative: DeployInitiativeContext): DeployProviderConfig;
  
  /** Validate config before deployment */
  validateConfig(config: DeployProviderConfig): { valid: boolean; errors: string[] };
  
  /** Execute the deployment */
  deploy(initiative: DeployInitiativeContext, config: DeployProviderConfig): Promise<DeployProviderResult>;
  
  /** Parse provider-specific errors into suggestions */
  parseError(errorCode: string, errorMessage: string): DeployErrorSuggestion[];
  
  /** Perform health check on deployed URL */
  healthCheck(url: string): Promise<HealthStatus>;
}

// ══════════════════════════════════════════════════
//  INITIATIVE CONTEXT FOR DEPLOY
// ══════════════════════════════════════════════════

export interface DeployInitiativeContext {
  initiative_id: string;
  repo_url: string;
  commit_hash: string | null;
  framework: string;
  branch: string;
}

// ══════════════════════════════════════════════════
//  PROVIDER REGISTRY
// ══════════════════════════════════════════════════

export class DeployProviderRegistry {
  private adapters = new Map<DeployProviderName, IDeployProviderAdapter>();

  register(adapter: IDeployProviderAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  get(name: DeployProviderName): IDeployProviderAdapter | undefined {
    return this.adapters.get(name);
  }

  has(name: DeployProviderName): boolean {
    return this.adapters.has(name);
  }

  list(): DeployProviderName[] {
    return Array.from(this.adapters.keys());
  }
}

// ══════════════════════════════════════════════════
//  VERCEL ADAPTER
// ══════════════════════════════════════════════════

export class VercelAdapter implements IDeployProviderAdapter {
  readonly name: DeployProviderName = "vercel";

  generateConfig(initiative: DeployInitiativeContext): DeployProviderConfig {
    return {
      framework: initiative.framework || "vite",
      install_command: "npm install --include=dev --legacy-peer-deps",
      build_command: "npm run build",
      output_directory: "dist",
      rewrites: [{ source: "/(.*)", destination: "/index.html" }],
    };
  }

  validateConfig(config: DeployProviderConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.build_command) errors.push("build_command is required");
    if (!config.output_directory) errors.push("output_directory is required");
    const supported = ["vite", "next", "remix", "astro", "nuxt", "gatsby", "create-react-app"];
    if (config.framework && !supported.includes(config.framework)) {
      errors.push(`Framework "${config.framework}" may not be auto-detected by Vercel`);
    }
    return { valid: errors.length === 0, errors };
  }

  async deploy(initiative: DeployInitiativeContext, config: DeployProviderConfig): Promise<DeployProviderResult> {
    const match = initiative.repo_url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      return { deploy_url: null, health_status: "unknown", error_code: "INVALID_REPO_URL", error_message: `Cannot parse GitHub repo from: ${initiative.repo_url}` };
    }

    const [, owner, rawRepo] = match;
    const repo = rawRepo.replace(/\.git$/, "");
    const vercelToken = Deno.env.get("VERCEL_TOKEN");
    const vercelTeamId = Deno.env.get("VERCEL_TEAM_ID");
    const scopeQuery = vercelTeamId ? `?teamId=${encodeURIComponent(vercelTeamId)}` : "";

    if (!vercelToken) {
      return {
        deploy_url: null,
        health_status: "unknown",
        error_code: "VERCEL_TOKEN_MISSING",
        error_message: "VERCEL_TOKEN is not configured in the backend. Automatic Vercel deployment requires a token with access to the linked GitHub repositories.",
        provider_metadata: { mode: "configuration_missing", required_secret: "VERCEL_TOKEN" },
      };
    }

    try {
      const projectName = repo.slice(0, 100);

      let projectId: string | null = null;
      const getRes = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectName)}${scopeQuery}`, {
        headers: { Authorization: `Bearer ${vercelToken}` },
      });

      if (getRes.ok) {
        projectId = (await getRes.json()).id;
      } else if (getRes.status === 404) {
        const createRes = await fetch(`https://api.vercel.com/v10/projects${scopeQuery}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${vercelToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            name: projectName,
            framework: config.framework,
            gitRepository: { type: "github", repo: `${owner}/${repo}` },
            installCommand: config.install_command,
            buildCommand: config.build_command,
            outputDirectory: config.output_directory,
          }),
        });
        if (!createRes.ok) {
          const errBody = await createRes.text();
          return { deploy_url: null, health_status: "unknown", error_code: "VERCEL_PROJECT_CREATE_FAILED", error_message: errBody };
        }
        projectId = (await createRes.json()).id;
      } else {
        return { deploy_url: null, health_status: "unknown", error_code: "VERCEL_API_ERROR", error_message: await getRes.text() };
      }

      const deployRes = await fetch(`https://api.vercel.com/v13/deployments${scopeQuery}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${vercelToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName,
          project: projectId,
          gitSource: { type: "github", org: owner, repo, ref: initiative.commit_hash || initiative.branch || "main" },
        }),
      });

      if (!deployRes.ok) {
        return { deploy_url: null, health_status: "unknown", error_code: "VERCEL_DEPLOY_FAILED", error_message: await deployRes.text() };
      }

      const deployment = await deployRes.json();
      const url = deployment.url ? `https://${deployment.url}` : deployment.alias?.[0] ? `https://${deployment.alias[0]}` : null;

      if (!url) {
        return {
          deploy_url: null,
          health_status: "unknown",
          error_code: "VERCEL_DEPLOYMENT_URL_MISSING",
          error_message: "Vercel accepted the deployment, but no public deployment URL was returned.",
          provider_metadata: { deployment_id: deployment.id },
        };
      }

      const health = await this.healthCheck(url);
      return {
        deploy_url: url,
        health_status: health,
        error_code: null,
        error_message: null,
        provider_metadata: { deployment_id: deployment.id, team_id: vercelTeamId || null },
      };
    } catch (err: any) {
      return { deploy_url: null, health_status: "unknown", error_code: "VERCEL_EXCEPTION", error_message: err?.message || "Unknown Vercel error" };
    }
  }

  parseError(errorCode: string, errorMessage: string): DeployErrorSuggestion[] {
    const suggestions: DeployErrorSuggestion[] = [];
    const patterns: Array<{ pattern: RegExp; suggestion: DeployErrorSuggestion }> = [
      { pattern: /VERCEL_TOKEN_MISSING/i, suggestion: { error_pattern: "VERCEL_TOKEN_MISSING", title: "Vercel token missing", suggestion: "Configure the VERCEL_TOKEN secret (and optionally VERCEL_TEAM_ID) so AxionOS can create projects and deployments automatically instead of redirecting to manual setup.", doc_url: "https://vercel.com/guides/how-do-i-use-a-vercel-api-access-token", severity: "error" } },
      { pattern: /INVALID_REPO_URL/i, suggestion: { error_pattern: "INVALID_REPO_URL", title: "Invalid repository URL", suggestion: "Ensure the repo URL follows the format github.com/owner/repo", doc_url: "https://vercel.com/docs/git", severity: "error" } },
      { pattern: /PROJECT_CREATE_FAILED/i, suggestion: { error_pattern: "PROJECT_CREATE_FAILED", title: "Project creation failed", suggestion: "Check Vercel token permissions, VERCEL_TEAM_ID scope, and GitHub repo access inside Vercel.", doc_url: "https://vercel.com/docs/rest-api#endpoints/projects/create-a-project", severity: "error" } },
      { pattern: /DEPLOY_FAILED/i, suggestion: { error_pattern: "DEPLOY_FAILED", title: "Deployment failed", suggestion: "Check build logs. Common causes: missing dependencies, build script errors, or incompatible npm peer dependencies.", doc_url: "https://vercel.com/docs/deployments/troubleshoot-a-build", severity: "error" } },
      { pattern: /DEPLOYMENT_URL_MISSING/i, suggestion: { error_pattern: "DEPLOYMENT_URL_MISSING", title: "Deployment URL missing", suggestion: "The deploy was accepted but Vercel did not return a public URL. Check the deployment in Vercel and confirm the project finished provisioning.", doc_url: "https://vercel.com/docs/rest-api/reference/endpoints/deployments", severity: "warning" } },
      { pattern: /MODULE_NOT_FOUND|Cannot find module/i, suggestion: { error_pattern: "MODULE_NOT_FOUND", title: "Missing module", suggestion: "Run npm install locally and ensure all imports resolve", doc_url: "https://vercel.com/docs/deployments/troubleshoot-a-build#missing-dependencies", severity: "error" } },
      { pattern: /FUNCTION_INVOCATION_TIMEOUT/i, suggestion: { error_pattern: "FUNCTION_TIMEOUT", title: "Function timeout", suggestion: "Reduce function execution time or increase timeout in vercel.json", doc_url: "https://vercel.com/docs/functions/serverless-functions/runtimes#maxduration", severity: "warning" } },
    ];

    const combined = `${errorCode} ${errorMessage}`;
    for (const { pattern, suggestion } of patterns) {
      if (pattern.test(combined)) suggestions.push(suggestion);
    }
    return suggestions;
  }

  async healthCheck(url: string): Promise<HealthStatus> {
    try {
      await new Promise(r => setTimeout(r, 5000));
      const res = await fetch(url, { method: "GET", headers: { "User-Agent": "AxionOS-HealthCheck/1.0" } });
      return res.ok ? "healthy" : "unhealthy";
    } catch { return "unhealthy"; }
  }
}

// ══════════════════════════════════════════════════
//  DEFAULT REGISTRY
// ══════════════════════════════════════════════════

export function createDefaultRegistry(): DeployProviderRegistry {
  const registry = new DeployProviderRegistry();
  registry.register(new VercelAdapter());
  return registry;
}
