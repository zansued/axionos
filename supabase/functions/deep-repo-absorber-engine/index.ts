import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { logSecurityAudit, resolveAndValidateOrg } from "../_shared/security-audit.ts";
import { callAI } from "../_shared/ai-client.ts";
import {
  validateSchema, validationErrorResponse, logValidationFailure,
  COMMON_FIELDS,
  type Schema,
} from "../_shared/input-validation.ts";

const GITHUB_API = "https://api.github.com";

const REPO_ABSORBER_SCHEMA: Schema = {
  repoUrl: COMMON_FIELDS.github_url,
  orgId: COMMON_FIELDS.organization_id,
  initiativeId: { type: "uuid", required: false },
};

const GITHUB_MAX_RETRIES = 4;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function encodeGitHubPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function parseRetryAfterMs(retryAfter: string | null): number | null {
  if (!retryAfter) return null;

  const asSeconds = Number(retryAfter);
  if (!Number.isNaN(asSeconds) && asSeconds >= 0) return asSeconds * 1000;

  const asDate = new Date(retryAfter).getTime();
  if (!Number.isNaN(asDate)) {
    const delta = asDate - Date.now();
    return delta > 0 ? delta : 0;
  }

  return null;
}

async function fetchGitHubWithRetry(url: string, ghHeaders: Record<string, string>) {
  let lastStatus = 0;
  let lastMessage = "Unknown GitHub error";

  for (let attempt = 0; attempt <= GITHUB_MAX_RETRIES; attempt++) {
    const resp = await fetch(url, { headers: ghHeaders });
    if (resp.ok) return resp;

    lastStatus = resp.status;
    const rateLimited = resp.status === 429 || (resp.status === 403 && resp.headers.get("x-ratelimit-remaining") === "0");
    const transientError = resp.status >= 500 && resp.status <= 599;

    if ((rateLimited || transientError) && attempt < GITHUB_MAX_RETRIES) {
      const retryAfterMs = parseRetryAfterMs(resp.headers.get("retry-after"));
      const exponentialBackoff = Math.min(1000 * (2 ** attempt), 12000);
      const jitter = Math.floor(Math.random() * 400);
      await sleep((retryAfterMs ?? exponentialBackoff) + jitter);
      continue;
    }

    lastMessage = (await resp.text()).slice(0, 300);
    break;
  }

  throw new Error(`GitHub request failed (${lastStatus}): ${lastMessage}`);
}

async function fetchGitHubJson(url: string, ghHeaders: Record<string, string>) {
  const resp = await fetchGitHubWithRetry(url, ghHeaders);
  return resp.json();
}

async function listRepoPathsFallback(ghHeaders: Record<string, string>, owner: string, repo: string, branch: string): Promise<string[]> {
  try {
    const rootUrl = `${GITHUB_API}/repos/${owner}/${repo}/contents?ref=${encodeURIComponent(branch)}`;
    const rootData = await fetchGitHubJson(rootUrl, ghHeaders);
    if (!Array.isArray(rootData)) return [];

    const paths: string[] = [];
    const directories = rootData.filter((item: any) => item?.type === "dir").slice(0, 8);

    for (const item of rootData) {
      if (item?.type === "file" && item.path) paths.push(item.path);
    }

    for (const dir of directories) {
      const nestedUrl = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeGitHubPath(dir.path)}?ref=${encodeURIComponent(branch)}`;
      const nestedData = await fetchGitHubJson(nestedUrl, ghHeaders);
      if (!Array.isArray(nestedData)) continue;

      for (const entry of nestedData) {
        if (entry?.type === "file" && entry.path) paths.push(entry.path);
      }
    }

    return Array.from(new Set(paths)).slice(0, 250);
  } catch (error) {
    console.warn("[DeepRepoAbsorber] Fallback path listing failed:", error);
    return [];
  }
}

async function getGitHubFileContent(ghHeaders: Record<string, string>, owner: string, repo: string, branch: string, path: string) {
  try {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeGitHubPath(path)}?ref=${encodeURIComponent(branch)}`;
    const data = await fetchGitHubJson(url, ghHeaders);
    return data?.content ? atob(data.content.replace(/\n/g, "")) : null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    // 1. Authenticate + rate limit (high-risk ingestion)
    const authResult = await authenticateWithRateLimit(req, "deep-repo-absorber-engine");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient } = authResult;

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return errorResponse("Invalid JSON body", 400, req); }

    // 2. Validate input schema (includes URL pattern check)
    const validation = validateSchema(body, REPO_ABSORBER_SCHEMA);
    if (!validation.valid) {
      await logValidationFailure(serviceClient, { actor_id: user.id, function_name: "deep-repo-absorber-engine", errors: validation.errors });
      return validationErrorResponse(validation.errors, req);
    }

    const repoUrl = body.repoUrl as string;
    const payloadOrgId = body.orgId as string | undefined;
    const initiativeId = body.initiativeId as string | undefined;

    // 3. Resolve & validate org
    const { orgId, error: orgError } = await resolveAndValidateOrg(
      serviceClient, user.id, payloadOrgId
    );
    if (orgError || !orgId) {
      return errorResponse(orgError || "Organization access denied", 403, req);
    }

    // 4. Audit
    await logSecurityAudit(serviceClient, {
      organization_id: orgId,
      actor_id: user.id,
      function_name: "deep-repo-absorber-engine",
      action: "repo_absorption_started",
      context: { repoUrl, initiativeId },
    });

    console.log(`[DeepRepoAbsorber] User ${user.id} initiating absorption of ${repoUrl} for org ${orgId}`);

    // Parse GitHub URL
    const urlParts = repoUrl.replace("https://github.com/", "").replace(/\/$/, "").split("/");
    const owner = urlParts[0];
    const repo = urlParts[1];

    if (!owner || !repo) return errorResponse("Invalid GitHub URL", 400, req);

    // Get GitHub Token from org connections (scoped by org)
    const { data: gitConns } = await serviceClient.from("git_connections")
      .select("github_token").eq("organization_id", orgId).eq("status", "active").limit(1);

    const ghHeaders: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "AxionOS-Deep-Absorber"
    };
    if (gitConns?.[0]?.github_token) {
      ghHeaders["Authorization"] = `Bearer ${gitConns[0].github_token}`;
    }

    // 1. Surface Mapping
    const repoInfo = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers: ghHeaders }).then(r => r.json());
    const defaultBranch = repoInfo.default_branch || "main";

    const treeResp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, { headers: ghHeaders });
    const treeData = await treeResp.json();

    if (!treeData.tree) return errorResponse("Failed to fetch repository tree", 500, req);

    const filePaths = treeData.tree.filter((t: any) => t.type === "blob").map((t: any) => t.path);

    // 2. Identify Entry Points
    const criticalFiles = [
      "package.json", "tsconfig.json", "docker-compose.yml", "Cargo.toml", "go.mod", "requirements.txt",
      "README.md", "docs/ARCHITECTURE.md"
    ];

    const filesToAbsorb = filePaths.filter((p: string) =>
      criticalFiles.includes(p) ||
      p.endsWith("main.ts") || p.endsWith("app.py") || p.endsWith("index.js")
    ).slice(0, 10);

    console.log(`[DeepRepoAbsorber] Found ${filesToAbsorb.length} critical files to parse.`);

    // 3. Extract Symbols
    const fileContents: Record<string, string> = {};
    for (const path of filesToAbsorb) {
      const content = await getGitHubFileContent(ghHeaders, owner, repo, defaultBranch, path);
      if (content) fileContents[path] = content.slice(0, 3000);
    }

    // 4. Generate Blueprint
    const systemPrompt = `You are the AxionOS Deep Repo Absorber Engine.
Your task is to analyze the structural files of a repository and extract its Canon (Architectural patterns, tech stack, data flow, and conventions).`;

    const userPrompt = `
Analyze the following repository: ${owner}/${repo}

## Directory Structure (Top 50 files)
${filePaths.slice(0, 50).join("\n")}

## Critical Files Content
${Object.entries(fileContents).map(([path, content]) => `### ${path}\n\`\`\`\n${content}\n\`\`\``).join("\n\n")}

Extract the intelligence and return a JSON object with the following structure:
{
  "architecture_type": "Brief description (e.g., Next.js Monolith, Python Microservices)",
  "tech_stack": ["React", "TypeScript", "Tailwind", etc...],
  "learning_candidates": [
    {
      "title": "Pattern Name",
      "summary": "How this repo solves a specific problem",
      "type": "architecture_pattern|implementation_pattern|best_practice",
      "domain": "frontend|backend|infrastructure|general"
    }
  ]
}
    `;

    const aiResult = await callAI(
      Deno.env.get("OPENAI_API_KEY") || "",
      systemPrompt,
      userPrompt,
      true,
      3,
      true
    );

    const absorptionData = JSON.parse(aiResult.content);

    // 5. Inject into Canon Intelligence Hub — use validated orgId, lower default confidence
    const candidates = absorptionData.learning_candidates || [];
    const insertedIds = [];

    for (const candidate of candidates) {
      const { data, error } = await serviceClient.from("learning_candidates").insert({
        organization_id: orgId,
        initiative_id: initiativeId || null,
        title: `[Deep Absorber] ${candidate.title}`,
        summary: `Absorbed from ${owner}/${repo}: ${candidate.summary}`,
        proposed_practice_type: candidate.type,
        confidence_score: 60, // Reduced from 85 — external sources need review
        signal_count: 1,
        source_type: "deep_repo_absorber",
        review_status: "pending",
        payload: {
          domain: candidate.domain,
          source_repo: repoUrl,
          tech_stack: absorptionData.tech_stack,
          absorbed_by: user.id,
        }
      }).select("id").single();

      if (!error && data) insertedIds.push(data.id);
    }

    // 6. Operational Signal
    await serviceClient.from("operational_learning_signals").insert({
      organization_id: orgId,
      initiative_id: initiativeId || null,
      signal_type: "repo_absorbed",
      outcome: `Successfully absorbed repository ${owner}/${repo}. Extracted ${candidates.length} canonical patterns.`,
      outcome_success: true,
      payload: { repo: repoUrl, architecture: absorptionData.architecture_type, actor: user.id }
    });

    await logSecurityAudit(serviceClient, {
      organization_id: orgId,
      actor_id: user.id,
      function_name: "deep-repo-absorber-engine",
      action: "repo_absorption_completed",
      context: { repoUrl, patterns_extracted: candidates.length, candidate_ids: insertedIds },
    });

    return jsonResponse({
      message: `Repository absorbed successfully`,
      architecture: absorptionData.architecture_type,
      stack: absorptionData.tech_stack,
      patterns_extracted: candidates.length,
      candidate_ids: insertedIds
    }, 200, req);

  } catch (error) {
    console.error("[DeepRepoAbsorber] Error:", error);
    return errorResponse(error.message, 500, req);
  }
});
