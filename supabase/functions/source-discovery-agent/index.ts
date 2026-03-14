/**
 * Source Discovery Agent — Canon Intelligence Hub
 * 
 * Discovers official documentation, GitHub repos, and high-trust sources
 * by topic/domain. Uses AI to score and classify candidates.
 * 
 * Actions:
 *   - discover_sources: AI-powered search for official sources by topic
 *   - discover_repos: Search GitHub for architecture-relevant repos by topic
 *   - score_candidates: Compute trust scores for discovered candidates
 *   - approve_candidate: Approve a candidate and promote to canon_sources
 *   - reject_candidate: Reject a candidate with reason
 *   - get_candidates: List candidates for a run or organization
 */

import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { validateSchema, logValidationFailure, type Schema } from "../_shared/input-validation.ts";
import { logSecurityAudit } from "../_shared/security-audit.ts";
import { callAI, getAIConfig } from "../_shared/ai-client.ts";
import { logSecurityAudit, logValidationFailure } from "../_shared/security-audit.ts";
import { callAI, getAIConfig } from "../_shared/ai-client.ts";


const ACTIONS = ["discover_sources", "discover_repos", "score_candidates", "approve_candidate", "reject_candidate", "get_candidates"] as const;

const REQUEST_SCHEMA: Schema = {
  action: { type: "string", required: true, enum: ACTIONS },
  organization_id: { type: "uuid", required: true },
  topic: { type: "string", required: false, maxLength: 200 },
  candidate_id: { type: "uuid", required: false },
  rejection_reason: { type: "string", required: false, maxLength: 500 },
  run_id: { type: "uuid", required: false },
};

// Default blocked domain patterns (SEO blogs, noisy aggregators)
const DEFAULT_BLOCKED_PATTERNS = [
  "medium.com", "dev.to", "hashnode.dev", "freecodecamp.org",
  "w3schools.com", "geeksforgeeks.org", "tutorialspoint.com",
  "javatpoint.com", "baeldung.com",
];

// Well-known official domains by topic
const OFFICIAL_DOMAINS: Record<string, string[]> = {
  react: ["react.dev", "reactjs.org", "github.com/facebook/react"],
  nextjs: ["nextjs.org", "github.com/vercel/next.js"],
  supabase: ["supabase.com", "github.com/supabase/supabase"],
  docker: ["docs.docker.com", "github.com/docker"],
  kubernetes: ["kubernetes.io", "github.com/kubernetes"],
  postgres: ["postgresql.org", "github.com/postgres"],
  opentelemetry: ["opentelemetry.io", "github.com/open-telemetry"],
  langgraph: ["langchain-ai.github.io/langgraph", "github.com/langchain-ai/langgraph"],
  n8n: ["docs.n8n.io", "github.com/n8n-io/n8n"],
  typescript: ["typescriptlang.org", "github.com/microsoft/TypeScript"],
  tailwind: ["tailwindcss.com", "github.com/tailwindlabs/tailwindcss"],
  vite: ["vite.dev", "vitejs.dev", "github.com/vitejs/vite"],
  prisma: ["prisma.io", "github.com/prisma/prisma"],
  drizzle: ["orm.drizzle.team", "github.com/drizzle-team/drizzle-orm"],
  langchain: ["python.langchain.com", "js.langchain.com", "github.com/langchain-ai/langchain"],
  deno: ["deno.land", "docs.deno.com", "github.com/denoland/deno"],
  rust: ["rust-lang.org", "doc.rust-lang.org", "github.com/rust-lang/rust"],
  go: ["go.dev", "pkg.go.dev", "github.com/golang/go"],
};

interface DiscoveredSource {
  source_url: string;
  source_name: string;
  source_type: string;
  official_domain_match: boolean;
  official_org_match: boolean;
  docs_quality_score: number;
  architecture_relevance_score: number;
  noise_risk_score: number;
  freshness_score: number;
}

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const authResult = await authenticateWithRateLimit(req, "source-discovery-agent");
    if (authResult instanceof Response) return authResult;
    const { user, serviceClient } = authResult;

    const body = await req.json();
    const validation = validateSchema(body, REQUEST_SCHEMA);
    if (!validation.valid) {
      await logValidationFailure(serviceClient, {
        actor_id: user.id,
        function_name: "source-discovery-agent",
        errors: validation.errors,
      });
      return jsonResponse({ error: "Validation failed", details: validation.errors }, 400, req);
    }

    const { action, organization_id: orgId, topic, candidate_id, rejection_reason, run_id } = body;

    // Verify org membership
    const { data: membership } = await serviceClient
      .from("organization_members")
      .select("id")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return errorResponse("Access denied", 403, req);
    }

    // Get blocked domains for this org
    const { data: blockedDomains } = await serviceClient
      .from("source_discovery_blocked_domains")
      .select("domain_pattern")
      .eq("organization_id", orgId);

    const allBlocked = [
      ...DEFAULT_BLOCKED_PATTERNS,
      ...(blockedDomains || []).map((d: any) => d.domain_pattern),
    ];

    switch (action) {
      case "discover_sources":
        return await discoverSources(serviceClient, orgId, user.id, topic || "", allBlocked, req);
      case "discover_repos":
        return await discoverRepos(serviceClient, orgId, user.id, topic || "", allBlocked, req);
      case "score_candidates":
        return await scoreCandidates(serviceClient, orgId, run_id, req);
      case "approve_candidate":
        return await approveCandidate(serviceClient, orgId, user.id, candidate_id, req);
      case "reject_candidate":
        return await rejectCandidate(serviceClient, orgId, user.id, candidate_id, rejection_reason, req);
      case "get_candidates":
        return await getCandidates(serviceClient, orgId, run_id, req);
      default:
        return errorResponse("Unknown action", 400, req);
    }
  } catch (err: any) {
    console.error("Source discovery error:", err);
    return errorResponse(err.message || "Internal error", 500, req);
  }
});

// ─── Discover Official Sources ───

async function discoverSources(
  db: any, orgId: string, userId: string, topic: string, blockedDomains: string[], req: Request
) {
  if (!topic) return errorResponse("topic is required for discover_sources", 400, req);

  // Create run record
  const { data: run, error: runErr } = await db
    .from("source_discovery_runs")
    .insert({
      organization_id: orgId,
      discovery_type: "official_sources",
      query_topic: topic,
      status: "in_progress",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (runErr) throw runErr;

  const config = getAIConfig();
  const knownDomains = OFFICIAL_DOMAINS[topic.toLowerCase()] || [];

  const systemPrompt = `You are an expert source discovery agent for a software intelligence system.
Your task is to identify OFFICIAL, HIGH-TRUST documentation and reference sources for a given technology topic.

RULES:
- Only return official documentation sites, official vendor pages, and authoritative references.
- Prefer .org, .dev, .io domains from known organizations.
- NEVER include blog aggregators, SEO-optimized tutorial sites, or community opinion posts.
- Blocked domains: ${blockedDomains.join(", ")}
- For each source, assess: docs quality, architecture relevance, noise risk, freshness.
- Return JSON array.`;

  const userPrompt = `Discover the top official documentation and reference sources for: "${topic}"

Known official domains for this topic: ${knownDomains.join(", ") || "none known"}

Return a JSON array of objects with these fields:
- source_url: full URL
- source_name: human-readable name
- source_type: one of "documentation", "api_reference", "specification", "official_guide", "vendor_site"
- official_domain_match: boolean (is this from the official/canonical domain?)
- docs_quality_score: 0-1
- architecture_relevance_score: 0-1
- noise_risk_score: 0-1 (higher = more noise risk)
- freshness_score: 0-1

Return ONLY the JSON array, no other text.`;

  const result = await callAI(config.key, systemPrompt, userPrompt, true);
  let sources: DiscoveredSource[] = [];
  try {
    const parsed = JSON.parse(result.content);
    sources = Array.isArray(parsed) ? parsed : [];
  } catch {
    sources = [];
  }

  // Filter blocked domains
  sources = sources.filter((s) => {
    const url = s.source_url?.toLowerCase() || "";
    return !blockedDomains.some((b) => url.includes(b));
  });

  // Deduplicate against existing candidates and canon_sources
  const candidates = [];
  for (const src of sources) {
    const urlHash = await hashUrl(src.source_url);
    const { data: existing } = await db
      .from("source_discovery_candidates")
      .select("id")
      .eq("organization_id", orgId)
      .eq("url_hash", urlHash)
      .limit(1);

    if (existing && existing.length > 0) continue;

    // Also check canon_sources
    const { data: existingSource } = await db
      .from("canon_sources")
      .select("id")
      .eq("organization_id", orgId)
      .eq("source_url", src.source_url)
      .limit(1);

    if (existingSource && existingSource.length > 0) continue;

    const compositeScore = computeTrustScore(src);

    candidates.push({
      organization_id: orgId,
      run_id: run.id,
      source_url: src.source_url,
      source_name: src.source_name,
      source_type: src.source_type || "documentation",
      discovery_method: "ai_search",
      official_domain_match: src.official_domain_match || false,
      official_org_match: false,
      github_verified_org: false,
      docs_quality_score: src.docs_quality_score || 0,
      architecture_relevance_score: src.architecture_relevance_score || 0,
      noise_risk_score: src.noise_risk_score || 0,
      freshness_score: src.freshness_score || 0,
      composite_trust_score: compositeScore,
      pipeline_stage: compositeScore >= 0.7 ? "scored" : "discovered",
      url_hash: urlHash,
    });
  }

  if (candidates.length > 0) {
    await db.from("source_discovery_candidates").insert(candidates);
  }

  await db.from("source_discovery_runs").update({
    status: "completed",
    completed_at: new Date().toISOString(),
    candidates_found: candidates.length,
  }).eq("id", run.id);

  await logSecurityAudit(db, {
    organization_id: orgId,
    actor_id: userId,
    function_name: "source-discovery-agent",
    action: "discover_sources",
    context: { topic, candidates_found: candidates.length },
    outcome: "success",
  });

  return jsonResponse({
    run_id: run.id,
    topic,
    candidates_found: candidates.length,
    candidates,
  }, 200, req);
}

// ─── Discover GitHub Repos ───

async function discoverRepos(
  db: any, orgId: string, userId: string, topic: string, blockedDomains: string[], req: Request
) {
  if (!topic) return errorResponse("topic is required for discover_repos", 400, req);

  const { data: run } = await db
    .from("source_discovery_runs")
    .insert({
      organization_id: orgId,
      discovery_type: "github_repos",
      query_topic: topic,
      status: "in_progress",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  const config = getAIConfig();

  const systemPrompt = `You are a GitHub repository discovery agent for a software architecture intelligence system.
Your task is to find OFFICIAL and HIGH-QUALITY GitHub repositories for a given technology topic.

RULES:
- Prioritize official organization repos (e.g., facebook/react, vercel/next.js)
- Include well-maintained, high-star, architecture-relevant repos
- For each repo, estimate: stars, is it from the official org, docs quality, architecture relevance
- NEVER include toy projects, tutorials, or unmaintained forks
- Return JSON array`;

  const userPrompt = `Find the top official and high-quality GitHub repositories for: "${topic}"

Return a JSON array with:
- source_url: full GitHub URL (https://github.com/org/repo)
- source_name: "org/repo" format
- official_org_match: boolean (is this the official/canonical repo?)
- github_verified_org: boolean (is the org verified on GitHub?)
- repo_stars: estimated star count
- docs_quality_score: 0-1
- architecture_relevance_score: 0-1
- noise_risk_score: 0-1
- freshness_score: 0-1

Return ONLY the JSON array.`;

  const result = await callAI(config.key, systemPrompt, userPrompt, true);
  let repos: any[] = [];
  try {
    repos = JSON.parse(result.content);
    if (!Array.isArray(repos)) repos = [];
  } catch {
    repos = [];
  }

  const candidates = [];
  for (const repo of repos) {
    const urlHash = await hashUrl(repo.source_url);
    const { data: existing } = await db
      .from("source_discovery_candidates")
      .select("id")
      .eq("organization_id", orgId)
      .eq("url_hash", urlHash)
      .limit(1);

    if (existing && existing.length > 0) continue;

    const compositeScore = computeTrustScore({
      ...repo,
      official_domain_match: false,
      source_type: "github_repo",
    });

    candidates.push({
      organization_id: orgId,
      run_id: run.id,
      source_url: repo.source_url,
      source_name: repo.source_name,
      source_type: "github_repo",
      discovery_method: "ai_search",
      official_domain_match: false,
      official_org_match: repo.official_org_match || false,
      github_verified_org: repo.github_verified_org || false,
      repo_stars: repo.repo_stars || null,
      docs_quality_score: repo.docs_quality_score || 0,
      architecture_relevance_score: repo.architecture_relevance_score || 0,
      noise_risk_score: repo.noise_risk_score || 0,
      freshness_score: repo.freshness_score || 0,
      composite_trust_score: compositeScore,
      pipeline_stage: compositeScore >= 0.7 ? "scored" : "discovered",
      url_hash: urlHash,
    });
  }

  if (candidates.length > 0) {
    await db.from("source_discovery_candidates").insert(candidates);
  }

  await db.from("source_discovery_runs").update({
    status: "completed",
    completed_at: new Date().toISOString(),
    candidates_found: candidates.length,
  }).eq("id", run.id);

  return jsonResponse({
    run_id: run.id,
    topic,
    candidates_found: candidates.length,
    candidates,
  }, 200, req);
}

// ─── Score Candidates ───

async function scoreCandidates(db: any, orgId: string, runId: string | undefined, req: Request) {
  let query = db
    .from("source_discovery_candidates")
    .select("*")
    .eq("organization_id", orgId)
    .eq("pipeline_stage", "discovered");

  if (runId) query = query.eq("run_id", runId);

  const { data: candidates, error } = await query.limit(50);
  if (error) throw error;

  let scored = 0;
  for (const c of candidates || []) {
    const compositeScore = computeTrustScore(c);
    await db.from("source_discovery_candidates").update({
      composite_trust_score: compositeScore,
      pipeline_stage: "scored",
      updated_at: new Date().toISOString(),
    }).eq("id", c.id);
    scored++;
  }

  return jsonResponse({ scored }, 200, req);
}

// ─── Approve Candidate → Promote to canon_sources ───

async function approveCandidate(db: any, orgId: string, userId: string, candidateId: string, req: Request) {
  if (!candidateId) return errorResponse("candidate_id required", 400, req);

  const { data: candidate, error } = await db
    .from("source_discovery_candidates")
    .select("*")
    .eq("id", candidateId)
    .eq("organization_id", orgId)
    .single();

  if (error || !candidate) return errorResponse("Candidate not found", 404, req);
  if (candidate.review_status === "approved") return errorResponse("Already approved", 400, req);

  // Create canon_source entry
  const sourceType = candidate.source_type === "github_repo" ? "repository" : "documentation";
  const { data: newSource, error: srcErr } = await db
    .from("canon_sources")
    .insert({
      organization_id: orgId,
      source_name: candidate.source_name,
      source_url: candidate.source_url,
      source_type: sourceType,
      trust_level: candidate.composite_trust_score >= 0.8 ? "verified" : "community",
      status: "active",
      created_by: userId,
      source_notes: `Discovered via Source Discovery Agent. Trust score: ${candidate.composite_trust_score.toFixed(2)}`,
      ingestion_lifecycle_state: "discovered",
    })
    .select("id")
    .single();

  if (srcErr) throw srcErr;

  // Update candidate
  await db.from("source_discovery_candidates").update({
    review_status: "approved",
    reviewed_by: userId,
    pipeline_stage: "approved",
    promoted_source_id: newSource.id,
    updated_at: new Date().toISOString(),
  }).eq("id", candidateId);

  // Update run stats
  if (candidate.run_id) {
    await db.rpc("increment_field", {
      table_name: "source_discovery_runs",
      field_name: "candidates_approved",
      row_id: candidate.run_id,
    }).catch(() => {
      // Fallback: direct update
      db.from("source_discovery_runs")
        .update({ candidates_approved: (candidate.candidates_approved || 0) + 1 })
        .eq("id", candidate.run_id);
    });
  }

  return jsonResponse({
    approved: true,
    candidate_id: candidateId,
    source_id: newSource.id,
  }, 200, req);
}

// ─── Reject Candidate ───

async function rejectCandidate(
  db: any, orgId: string, userId: string, candidateId: string, reason: string | undefined, req: Request
) {
  if (!candidateId) return errorResponse("candidate_id required", 400, req);

  const { error } = await db.from("source_discovery_candidates").update({
    review_status: "rejected",
    reviewed_by: userId,
    rejection_reason: reason || "Rejected by reviewer",
    pipeline_stage: "rejected",
    updated_at: new Date().toISOString(),
  }).eq("id", candidateId).eq("organization_id", orgId);

  if (error) throw error;

  return jsonResponse({ rejected: true, candidate_id: candidateId }, 200, req);
}

// ─── Get Candidates ───

async function getCandidates(db: any, orgId: string, runId: string | undefined, req: Request) {
  let query = db
    .from("source_discovery_candidates")
    .select("*")
    .eq("organization_id", orgId)
    .order("composite_trust_score", { ascending: false });

  if (runId) query = query.eq("run_id", runId);

  const { data, error } = await query.limit(100);
  if (error) throw error;

  return jsonResponse({ candidates: data || [] }, 200, req);
}

// ─── Trust Score Computation ───

function computeTrustScore(source: any): number {
  const weights = {
    official_domain: 0.20,
    official_org: 0.15,
    github_verified: 0.10,
    docs_quality: 0.15,
    architecture_relevance: 0.20,
    noise_risk: 0.10,  // inverted
    freshness: 0.10,
  };

  let score = 0;
  score += (source.official_domain_match ? 1 : 0) * weights.official_domain;
  score += (source.official_org_match ? 1 : 0) * weights.official_org;
  score += (source.github_verified_org ? 1 : 0) * weights.github_verified;
  score += (source.docs_quality_score || 0) * weights.docs_quality;
  score += (source.architecture_relevance_score || 0) * weights.architecture_relevance;
  score += (1 - (source.noise_risk_score || 0)) * weights.noise_risk; // invert noise
  score += (source.freshness_score || 0) * weights.freshness;

  return Math.round(score * 100) / 100;
}

// ─── URL Hashing ───

async function hashUrl(url: string): Promise<string> {
  const normalized = (url || "").toLowerCase().replace(/\/+$/, "").replace(/^https?:\/\//, "");
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
