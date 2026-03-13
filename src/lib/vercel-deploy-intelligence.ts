/**
 * Vercel Deploy Intelligence — Build Repair & Deployment Contract
 *
 * @status LEGACY — Sprint IH-4
 * @reason Deploy error parsing has been unified into DeployErrorParser.tsx
 *   which prefers adapter-provided suggestions from the backend deploy provider
 *   contract layer. This file's parseDeployError() and DEPLOY_ERROR_PATTERNS
 *   are no longer imported anywhere. The VercelBuildOptions / generateVercelJson
 *   utilities are still potentially useful for deploy config generation but
 *   have zero current consumers.
 *
 * Do not add new consumers of parseDeployError — use the deploy provider
 * adapter output path instead.
 *
 * Original contents:
 * 1. BuildOptions interface aligned with Vercel's contract
 * 2. vercel.json generator for initiatives
 * 3. Pretty Error Parser for deploy logs (LEGACY — superseded)
 * 4. Framework-to-config mapping with @vercel/backends support
 */

// ─── Vercel Build Contract ───────────────────────────────────────

export interface VercelBuildOptions {
  framework: string | null;
  buildCommand: string | null;
  installCommand: string | null;
  outputDirectory: string | null;
  nodeVersion: "18" | "20" | "22";
  devCommand?: string | null;
  rootDirectory?: string | null;
}

export interface VercelRoute {
  source: string;
  destination: string;
  methods?: string[];
}

export interface VercelConfig {
  $schema?: string;
  framework?: string;
  buildCommand?: string;
  installCommand?: string;
  outputDirectory?: string;
  nodeVersion?: string;
  rewrites?: VercelRoute[];
  functions?: Record<string, { runtime?: string; maxDuration?: number }>;
  env?: Record<string, string>;
  build?: { env?: Record<string, string> };
}

// ─── Framework Definitions ───────────────────────────────────────

export type FrameworkId =
  | "vite"
  | "nextjs"
  | "remix"
  | "nuxt"
  | "hono"
  | "elysia"
  | "fastapi"
  | "express"
  | "fastify"
  | "nestjs"
  | "astro"
  | "sveltekit";

export interface FrameworkDefinition {
  id: FrameworkId;
  name: string;
  category: "frontend" | "backend" | "fullstack";
  buildCommand: string;
  installCommand: string;
  outputDirectory: string;
  nodeVersion: "18" | "20" | "22";
  usesVercelBackends: boolean;
  bridgeConfig?: Partial<VercelConfig>;
  envFlags?: Record<string, string>;
}

export const FRAMEWORK_REGISTRY: Record<FrameworkId, FrameworkDefinition> = {
  vite: {
    id: "vite",
    name: "Vite",
    category: "frontend",
    buildCommand: "npm run build",
    installCommand: "npm ci --include=dev",
    outputDirectory: "dist",
    nodeVersion: "20",
    usesVercelBackends: false,
    bridgeConfig: {
      rewrites: [{ source: "/(.*)", destination: "/index.html" }],
    },
  },
  nextjs: {
    id: "nextjs",
    name: "Next.js",
    category: "fullstack",
    buildCommand: "next build",
    installCommand: "npm ci",
    outputDirectory: ".next",
    nodeVersion: "20",
    usesVercelBackends: false,
  },
  remix: {
    id: "remix",
    name: "Remix",
    category: "fullstack",
    buildCommand: "remix build",
    installCommand: "npm ci",
    outputDirectory: "build",
    nodeVersion: "20",
    usesVercelBackends: false,
  },
  nuxt: {
    id: "nuxt",
    name: "Nuxt",
    category: "fullstack",
    buildCommand: "nuxt build",
    installCommand: "npm ci",
    outputDirectory: ".output",
    nodeVersion: "20",
    usesVercelBackends: false,
  },
  astro: {
    id: "astro",
    name: "Astro",
    category: "fullstack",
    buildCommand: "astro build",
    installCommand: "npm ci",
    outputDirectory: "dist",
    nodeVersion: "20",
    usesVercelBackends: false,
  },
  sveltekit: {
    id: "sveltekit",
    name: "SvelteKit",
    category: "fullstack",
    buildCommand: "vite build",
    installCommand: "npm ci",
    outputDirectory: ".svelte-kit",
    nodeVersion: "20",
    usesVercelBackends: false,
  },
  // ─── Backend Frameworks (use @vercel/backends) ─────────────────
  hono: {
    id: "hono",
    name: "Hono",
    category: "backend",
    buildCommand: "npm run build",
    installCommand: "npm ci",
    outputDirectory: "dist",
    nodeVersion: "20",
    usesVercelBackends: true,
    bridgeConfig: {
      rewrites: [{ source: "/api/(.*)", destination: "/api/$1" }],
      functions: { "api/**": { runtime: "@vercel/node", maxDuration: 30 } },
    },
    envFlags: { VERCEL_BACKENDS_BUILDS: "1" },
  },
  elysia: {
    id: "elysia",
    name: "Elysia",
    category: "backend",
    buildCommand: "bun build src/index.ts --outdir dist --target node",
    installCommand: "bun install",
    outputDirectory: "dist",
    nodeVersion: "20",
    usesVercelBackends: true,
    bridgeConfig: {
      rewrites: [{ source: "/api/(.*)", destination: "/api/$1" }],
      functions: { "api/**": { runtime: "@vercel/node", maxDuration: 30 } },
    },
    envFlags: { VERCEL_BACKENDS_BUILDS: "1" },
  },
  fastapi: {
    id: "fastapi",
    name: "FastAPI",
    category: "backend",
    buildCommand: "",
    installCommand: "pip install -r requirements.txt",
    outputDirectory: "",
    nodeVersion: "20",
    usesVercelBackends: false,
    bridgeConfig: {
      rewrites: [{ source: "/api/(.*)", destination: "/api/$1" }],
      functions: { "api/**/*.py": { runtime: "@vercel/python", maxDuration: 30 } },
    },
  },
  express: {
    id: "express",
    name: "Express",
    category: "backend",
    buildCommand: "npm run build",
    installCommand: "npm ci",
    outputDirectory: "dist",
    nodeVersion: "20",
    usesVercelBackends: true,
    bridgeConfig: {
      rewrites: [{ source: "/api/(.*)", destination: "/api/$1" }],
      functions: { "api/**": { runtime: "@vercel/node", maxDuration: 30 } },
    },
    envFlags: { VERCEL_BACKENDS_BUILDS: "1" },
  },
  fastify: {
    id: "fastify",
    name: "Fastify",
    category: "backend",
    buildCommand: "npm run build",
    installCommand: "npm ci",
    outputDirectory: "dist",
    nodeVersion: "20",
    usesVercelBackends: true,
    bridgeConfig: {
      rewrites: [{ source: "/api/(.*)", destination: "/api/$1" }],
      functions: { "api/**": { runtime: "@vercel/node", maxDuration: 30 } },
    },
    envFlags: { VERCEL_BACKENDS_BUILDS: "1" },
  },
  nestjs: {
    id: "nestjs",
    name: "NestJS",
    category: "backend",
    buildCommand: "npm run build",
    installCommand: "npm ci",
    outputDirectory: "dist",
    nodeVersion: "20",
    usesVercelBackends: true,
    bridgeConfig: {
      rewrites: [{ source: "/api/(.*)", destination: "/api/$1" }],
      functions: { "api/**": { runtime: "@vercel/node", maxDuration: 30 } },
    },
    envFlags: { VERCEL_BACKENDS_BUILDS: "1" },
  },
};

// ─── vercel.json Generator ───────────────────────────────────────

export function generateVercelConfig(frameworkId: FrameworkId): VercelConfig {
  const fw = FRAMEWORK_REGISTRY[frameworkId];
  if (!fw) throw new Error(`Unknown framework: ${frameworkId}`);

  const config: VercelConfig = {
    $schema: "https://openapi.vercel.sh/vercel.json",
  };

  if (fw.category !== "backend" || frameworkId === "fastapi") {
    config.framework = fw.id === "vite" ? "vite" : fw.id;
  }

  if (fw.buildCommand) config.buildCommand = fw.buildCommand;
  if (fw.installCommand) config.installCommand = fw.installCommand;
  if (fw.outputDirectory) config.outputDirectory = fw.outputDirectory;

  // Merge bridge config
  if (fw.bridgeConfig) {
    if (fw.bridgeConfig.rewrites) config.rewrites = fw.bridgeConfig.rewrites;
    if (fw.bridgeConfig.functions) config.functions = fw.bridgeConfig.functions;
  }

  // Build env flags for @vercel/backends
  if (fw.envFlags && Object.keys(fw.envFlags).length > 0) {
    config.build = { env: fw.envFlags };
  }

  return config;
}

/**
 * Detect framework from package.json dependencies or file markers
 */
export function detectFramework(
  dependencies: Record<string, string>,
  devDependencies: Record<string, string> = {},
  fileMarkers: string[] = [],
): FrameworkId {
  const allDeps = { ...dependencies, ...devDependencies };

  if (allDeps["next"]) return "nextjs";
  if (allDeps["@remix-run/react"]) return "remix";
  if (allDeps["nuxt"]) return "nuxt";
  if (allDeps["astro"]) return "astro";
  if (allDeps["@sveltejs/kit"]) return "sveltekit";
  if (allDeps["hono"]) return "hono";
  if (allDeps["elysia"]) return "elysia";
  if (allDeps["@nestjs/core"]) return "nestjs";
  if (allDeps["fastify"]) return "fastify";
  if (allDeps["express"]) return "express";
  if (fileMarkers.some((f) => f.endsWith("requirements.txt"))) return "fastapi";
  if (allDeps["vite"]) return "vite";

  return "vite"; // default fallback
}

// ─── Pretty Error Parser ─────────────────────────────────────────

export interface DeployErrorSuggestion {
  errorCode: string;
  title: string;
  suggestion: string;
  docUrl: string;
  severity: "error" | "warning" | "info";
}

const VERCEL_ERROR_MAP: Array<{
  pattern: RegExp;
  code: string;
  title: string;
  suggestion: string;
  docPath: string;
}> = [
  {
    pattern: /INVALID_VERCEL_CONFIG|invalid.*vercel\.json/i,
    code: "INVALID_VERCEL_CONFIG",
    title: "Invalid vercel.json configuration",
    suggestion: 'Check your vercel.json syntax. Common issue: using "builder" instead of "builds", or "routes" instead of "rewrites".',
    docPath: "/docs/projects/project-configuration",
  },
  {
    pattern: /builder.*is.*deprecated|"builder"/i,
    code: "DEPRECATED_BUILDER",
    title: 'Deprecated "builder" field',
    suggestion: 'Replace "builder" with "builds" in vercel.json. Vercel v3+ uses a different configuration format.',
    docPath: "/docs/projects/project-configuration#builds",
  },
  {
    pattern: /BUILD_UTILS_SPAWN_\d+|command.*not found|npm.*ERR/i,
    code: "BUILD_COMMAND_FAILED",
    title: "Build command failed",
    suggestion: "Verify your buildCommand in vercel.json. Ensure all dependencies are listed in package.json.",
    docPath: "/docs/deployments/builds#build-step",
  },
  {
    pattern: /FUNCTION_INVOCATION_TIMEOUT/i,
    code: "FUNCTION_TIMEOUT",
    title: "Serverless function timed out",
    suggestion: "Increase maxDuration in vercel.json functions config. Free tier max is 10s, Pro is 300s.",
    docPath: "/docs/functions/runtimes#max-duration",
  },
  {
    pattern: /NO_OUTPUT_DIRECTORY|output.*directory.*not.*found/i,
    code: "NO_OUTPUT_DIRECTORY",
    title: "Output directory not found",
    suggestion: "Set the correct outputDirectory in vercel.json. For Vite it's 'dist', for Next.js it's '.next'.",
    docPath: "/docs/projects/project-configuration#outputdirectory",
  },
  {
    pattern: /MODULE_NOT_FOUND|Cannot find module/i,
    code: "MODULE_NOT_FOUND",
    title: "Module not found during build",
    suggestion: "Check that all imports resolve correctly. Ensure dependencies are in package.json (not just devDependencies for production builds).",
    docPath: "/docs/deployments/troubleshoot-a-build#module-not-found",
  },
  {
    pattern: /EDGE_FUNCTION_INVOCATION_FAILED/i,
    code: "EDGE_FUNCTION_FAILED",
    title: "Edge function invocation failed",
    suggestion: "Edge functions have limited APIs. Ensure you're not using Node.js-only modules.",
    docPath: "/docs/functions/edge-functions/limitations",
  },
  {
    pattern: /memory.*exceeded|FUNCTION_PAYLOAD_TOO_LARGE/i,
    code: "MEMORY_EXCEEDED",
    title: "Function memory or payload limit exceeded",
    suggestion: "Reduce response payload size or optimize memory usage in your serverless function.",
    docPath: "/docs/functions/runtimes#memory",
  },
  {
    pattern: /node.*version|unsupported.*engine/i,
    code: "NODE_VERSION_MISMATCH",
    title: "Node.js version mismatch",
    suggestion: 'Set nodeVersion in vercel.json to "20" (recommended) or check engines field in package.json.',
    docPath: "/docs/functions/runtimes#node.js-version",
  },
  {
    pattern: /DEPLOYMENT_NOT_READY|deployment.*not.*found/i,
    code: "DEPLOYMENT_NOT_READY",
    title: "Deployment not ready or not found",
    suggestion: "The deployment may still be building. Wait a moment and check the deployment status.",
    docPath: "/docs/deployments/overview",
  },
];

/**
 * Parse a deploy error log and return structured suggestions.
 */
export function parseDeployError(logText: string): DeployErrorSuggestion[] {
  const suggestions: DeployErrorSuggestion[] = [];
  const seen = new Set<string>();

  for (const entry of VERCEL_ERROR_MAP) {
    if (entry.pattern.test(logText) && !seen.has(entry.code)) {
      seen.add(entry.code);
      suggestions.push({
        errorCode: entry.code,
        title: entry.title,
        suggestion: entry.suggestion,
        docUrl: `https://vercel.com${entry.docPath}`,
        severity: "error",
      });
    }
  }

  // Fallback: generic config suggestion for unrecognized errors
  if (suggestions.length === 0 && logText.length > 0) {
    suggestions.push({
      errorCode: "UNKNOWN_DEPLOY_ERROR",
      title: "Unrecognized deployment error",
      suggestion: "Check the full build log for details. Common causes: missing env vars, incorrect build command, or dependency issues.",
      docUrl: "https://vercel.com/docs/deployments/troubleshoot-a-build",
      severity: "warning",
    });
  }

  return suggestions;
}

/**
 * Map common user typos/mistakes in vercel.json to correct field names.
 */
export const CONFIG_FIELD_CORRECTIONS: Record<string, { correct: string; explanation: string }> = {
  builder: { correct: "builds", explanation: '"builder" was used in Vercel v1. Use "builds" instead.' },
  routes: { correct: "rewrites", explanation: '"routes" is legacy. Use "rewrites" for path-based routing.' },
  build: { correct: "buildCommand", explanation: 'Use "buildCommand" at root level for build configuration.' },
  output: { correct: "outputDirectory", explanation: 'Use "outputDirectory" for the build output path.' },
  node_version: { correct: "nodeVersion", explanation: "Use camelCase: nodeVersion." },
  functions_directory: { correct: "functions", explanation: 'Use "functions" object with glob patterns.' },
};
