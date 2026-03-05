// Layer 3.7 — Dependency Intelligence Engine
// Validates external dependencies against npm registry, detects peer dep issues,
// version conflicts, deprecated packages, and uses Firecrawl for ecosystem research.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { upsertNode, recordError } from "../_shared/brain-helpers.ts";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

interface DepIssue {
  type: string;
  package: string;
  detail: string;
  severity: "error" | "warning" | "info";
  suggested_fix?: string;
}

interface NpmRegistryMeta {
  latest_version: string;
  peer_dependencies: Record<string, string>;
  engines: Record<string, string>;
  deprecated: boolean;
  deprecated_message?: string;
  last_publish_date: string;
}

interface DepHealthReport {
  total_dependencies: number;
  missing_dependencies: number;
  peer_dependency_issues: number;
  version_conflicts: number;
  deprecated_libraries: number;
  runtime_incompatibilities: number;
  abandoned_libraries: number;
  dependency_health_score: number;
  issues: DepIssue[];
  auto_repairs: string[];
  research_results: ResearchResult[];
}

interface ResearchResult {
  package: string;
  status: string;
  recommended_replacement?: string;
  compatibility_notes?: string;
  confidence_score: number;
}

// ═══════════════════════════════════════════════
// NPM REGISTRY HELPERS
// ═══════════════════════════════════════════════

async function fetchNpmMeta(packageName: string): Promise<NpmRegistryMeta | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const distTags = data["dist-tags"] || {};
    const latestVersion = distTags.latest || "0.0.0";
    const latestMeta = data.versions?.[latestVersion] || {};
    const timeData = data.time || {};

    return {
      latest_version: latestVersion,
      peer_dependencies: latestMeta.peerDependencies || {},
      engines: latestMeta.engines || {},
      deprecated: !!latestMeta.deprecated || !!data.deprecated,
      deprecated_message: latestMeta.deprecated || data.deprecated || undefined,
      last_publish_date: timeData[latestVersion] || timeData.modified || "",
    };
  } catch {
    return null;
  }
}

function isAbandoned(lastPublish: string): boolean {
  if (!lastPublish) return false;
  const publishDate = new Date(lastPublish);
  const monthsAgo = (Date.now() - publishDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  return monthsAgo > 24;
}

// ═══════════════════════════════════════════════
// SEMVER HELPERS
// ═══════════════════════════════════════════════

function extractMajor(versionRange: string): number | null {
  const match = versionRange.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

function checkVersionConflict(
  pkg: string,
  requiredRange: string,
  peerRange: string
): DepIssue | null {
  const reqMajor = extractMajor(requiredRange);
  const peerMajor = extractMajor(peerRange);

  if (reqMajor !== null && peerMajor !== null && reqMajor !== peerMajor) {
    return {
      type: "dependency_version_conflict",
      package: pkg,
      detail: `Version conflict: installed range "${requiredRange}" vs peer requirement "${peerRange}"`,
      severity: "error",
      suggested_fix: `Use version ^${peerMajor}.0.0 to satisfy peer dependency`,
    };
  }
  return null;
}

// ═══════════════════════════════════════════════
// FIRECRAWL RESEARCH AGENT
// ═══════════════════════════════════════════════

async function researchDependency(
  packageName: string,
  reason: string,
): Promise<ResearchResult> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) {
    return {
      package: packageName,
      status: "research_skipped",
      compatibility_notes: "Firecrawl not configured",
      confidence_score: 0.3,
    };
  }

  const queries = [
    `${packageName} npm deprecated alternative`,
    `${packageName} replacement library 2024 2025`,
  ];

  let combinedContent = "";

  for (const query of queries) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          limit: 3,
          scrapeOptions: { formats: ["markdown"] },
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        const data = await res.json();
        const results = data.data || [];
        for (const r of results) {
          if (r.markdown) {
            combinedContent += r.markdown.slice(0, 500) + "\n---\n";
          }
        }
      }
    } catch {
      // Continue with partial data
    }
  }

  // Simple heuristic extraction from research content
  const lower = combinedContent.toLowerCase();
  const isDeprecated = lower.includes("deprecated") || lower.includes("no longer maintained") || lower.includes("archived");
  const replacementMatch = lower.match(/(?:use|switch to|migrate to|replaced by|alternative[:\s]+)\s*[`"']?(\w[\w-]*\w)[`"']?/i);

  return {
    package: packageName,
    status: isDeprecated ? "deprecated" : "active",
    recommended_replacement: replacementMatch?.[1] || undefined,
    compatibility_notes: combinedContent
      ? combinedContent.slice(0, 300)
      : `No ecosystem data found for ${packageName}`,
    confidence_score: combinedContent.length > 100 ? 0.85 : 0.4,
  };
}

// ═══════════════════════════════════════════════
// REGISTRY CACHE
// ═══════════════════════════════════════════════

async function getCachedOrFetchMeta(
  serviceClient: ReturnType<typeof createClient>,
  orgId: string,
  initId: string,
  packageName: string,
): Promise<NpmRegistryMeta | null> {
  // Check cache (valid for 24h)
  const { data: cached } = await serviceClient
    .from("project_brain_nodes")
    .select("metadata, updated_at")
    .eq("initiative_id", initId)
    .eq("node_type", "dependency_cache")
    .eq("name", `dep_cache:${packageName}`)
    .maybeSingle();

  if (cached?.metadata) {
    const age = Date.now() - new Date(cached.updated_at).getTime();
    if (age < 24 * 60 * 60 * 1000) {
      return cached.metadata as unknown as NpmRegistryMeta;
    }
  }

  // Fetch from registry
  const meta = await fetchNpmMeta(packageName);
  if (meta) {
    // Cache in brain nodes
    await serviceClient.from("project_brain_nodes").upsert(
      {
        initiative_id: initId,
        organization_id: orgId,
        name: `dep_cache:${packageName}`,
        file_path: `dependency_cache/${packageName}.json`,
        node_type: "dependency_cache",
        status: "generated",
        metadata: meta as any,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "initiative_id,file_path" }
    );
  }

  return meta;
}

// ═══════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-dependency-intelligence");
  if (result instanceof Response) return result;
  const { initiative, ctx, serviceClient } = result;

  const jobId = await createJob(ctx, "dependency_intelligence", { initiativeId: ctx.initiativeId });
  const startTime = Date.now();

  try {
    await updateInitiative(ctx, { stage_status: "analyzing_dependencies" });

    // ── 1. Load Module Graph Report ──
    const { data: graphNode } = await serviceClient
      .from("project_brain_nodes")
      .select("metadata")
      .eq("initiative_id", ctx.initiativeId)
      .eq("node_type", "module_graph_report")
      .maybeSingle();

    // ── 2. Load package.json from Brain ──
    const { data: pkgNode } = await serviceClient
      .from("project_brain_nodes")
      .select("metadata")
      .eq("initiative_id", ctx.initiativeId)
      .in("node_type", ["file", "bootstrap", "scaffold"])
      .or("file_path.eq.package.json,name.eq.package.json")
      .maybeSingle();

    const pkgMeta = (pkgNode?.metadata || {}) as any;
    const declaredDeps: Record<string, string> = {
      ...(pkgMeta.dependencies || {}),
      ...(pkgMeta.devDependencies || {}),
    };

    // ── 3. Collect external package imports from graph ──
    const graphMeta = (graphNode?.metadata || {}) as any;
    const graphEdges: Array<{ from: string; to: string; type: string }> = graphMeta.graph?.edges || [];
    const packageImports = new Set<string>();

    for (const edge of graphEdges) {
      if (edge.type === "package") {
        packageImports.add(edge.to);
      }
    }

    // Also scan brain nodes for any additional imports
    const { data: sourceNodes } = await serviceClient
      .from("project_brain_nodes")
      .select("metadata, file_path")
      .eq("initiative_id", ctx.initiativeId)
      .in("node_type", ["file", "component", "hook", "service", "page", "util"]);

    for (const node of sourceNodes || []) {
      const content = (node.metadata as any)?.content || "";
      const importMatches = content.matchAll(/import\s+(?:[\w*{}\s,]+)\s+from\s+["']([^"'./][^"']*)["']/g);
      for (const m of importMatches) {
        const pkg = m[1].startsWith("@") ? m[1].split("/").slice(0, 2).join("/") : m[1].split("/")[0];
        packageImports.add(pkg);
      }
    }

    // ── 4. Analyze each dependency ──
    const issues: DepIssue[] = [];
    const autoRepairs: string[] = [];
    const researchTargets: Array<{ name: string; reason: string }> = [];
    const registryCache: Record<string, NpmRegistryMeta> = {};

    let missingCount = 0;
    let peerIssues = 0;
    let versionConflicts = 0;
    let deprecatedCount = 0;
    let abandonedCount = 0;
    let runtimeIncompat = 0;

    // Built-in / virtual packages to skip
    const SKIP_PACKAGES = new Set([
      "react", "react-dom", "react-dom/client", "react/jsx-runtime",
      "vite", "typescript",
    ]);

    for (const pkg of packageImports) {
      // 4a. Check if declared
      if (!declaredDeps[pkg] && !SKIP_PACKAGES.has(pkg)) {
        missingCount++;
        issues.push({
          type: "missing_dependency_error",
          package: pkg,
          detail: `Package "${pkg}" is imported but not in package.json`,
          severity: "error",
        });

        // Auto-repair: fetch latest version
        const meta = await getCachedOrFetchMeta(serviceClient, ctx.organizationId, ctx.initiativeId, pkg);
        if (meta) {
          registryCache[pkg] = meta;
          autoRepairs.push(`Add "${pkg}": "^${meta.latest_version}" to dependencies`);
        } else {
          researchTargets.push({ name: pkg, reason: "unknown_package" });
        }
        continue;
      }

      // 4b. Fetch registry metadata
      const meta = await getCachedOrFetchMeta(serviceClient, ctx.organizationId, ctx.initiativeId, pkg);
      if (!meta) continue;
      registryCache[pkg] = meta;

      // 4c. Check deprecated
      if (meta.deprecated) {
        deprecatedCount++;
        issues.push({
          type: "deprecated_dependency",
          package: pkg,
          detail: meta.deprecated_message || `${pkg} is deprecated`,
          severity: "warning",
        });
        researchTargets.push({ name: pkg, reason: "deprecated" });
      }

      // 4d. Check abandoned
      if (!meta.deprecated && isAbandoned(meta.last_publish_date)) {
        abandonedCount++;
        issues.push({
          type: "possible_abandoned_dependency",
          package: pkg,
          detail: `${pkg} last published on ${meta.last_publish_date?.split("T")[0] || "unknown"}`,
          severity: "warning",
        });
        researchTargets.push({ name: pkg, reason: "abandoned" });
      }

      // 4e. Check peer dependencies
      for (const [peerPkg, peerRange] of Object.entries(meta.peer_dependencies)) {
        if (!declaredDeps[peerPkg] && !SKIP_PACKAGES.has(peerPkg)) {
          peerIssues++;
          issues.push({
            type: "peer_dependency_error",
            package: pkg,
            detail: `${pkg} requires peer "${peerPkg}@${peerRange}" which is missing`,
            severity: "error",
            suggested_fix: `Add "${peerPkg}": "${peerRange}" to dependencies`,
          });
          autoRepairs.push(`Add peer dep "${peerPkg}": "${peerRange}"`);
        } else if (declaredDeps[peerPkg]) {
          const conflict = checkVersionConflict(peerPkg, declaredDeps[peerPkg], peerRange as string);
          if (conflict) {
            versionConflicts++;
            issues.push(conflict);
          }
        }
      }

      // 4f. Check engines compatibility
      if (meta.engines?.node) {
        const requiredNode = extractMajor(meta.engines.node);
        // Assume project targets Node 18+
        if (requiredNode && requiredNode > 20) {
          runtimeIncompat++;
          issues.push({
            type: "runtime_incompatibility_error",
            package: pkg,
            detail: `${pkg} requires Node ${meta.engines.node}, project targets Node 18-20`,
            severity: "error",
          });
        }
      }
    }

    // ── 5. Firecrawl Research for flagged packages ──
    const researchResults: ResearchResult[] = [];
    const uniqueTargets = [...new Map(researchTargets.map(t => [t.name, t])).values()];

    for (const target of uniqueTargets.slice(0, 5)) {
      const research = await researchDependency(target.name, target.reason);
      researchResults.push(research);

      if (research.recommended_replacement) {
        autoRepairs.push(`Consider replacing "${target.name}" with "${research.recommended_replacement}"`);
      }
    }

    // ── 6. Calculate health score ──
    const totalDeps = packageImports.size || 1;
    const errorCount = missingCount + peerIssues + versionConflicts + runtimeIncompat;
    const warningCount = deprecatedCount + abandonedCount;
    const healthScore = Math.max(0, Math.min(1,
      1 - (errorCount * 0.15 + warningCount * 0.05) / Math.max(totalDeps, 1)
    ));

    const report: DepHealthReport = {
      total_dependencies: packageImports.size,
      missing_dependencies: missingCount,
      peer_dependency_issues: peerIssues,
      version_conflicts: versionConflicts,
      deprecated_libraries: deprecatedCount,
      runtime_incompatibilities: runtimeIncompat,
      abandoned_libraries: abandonedCount,
      dependency_health_score: Math.round(healthScore * 100) / 100,
      issues,
      auto_repairs: autoRepairs,
      research_results: researchResults,
    };

    // ── 7. Persist report in Project Brain ──
    await upsertNode(ctx, {
      name: "dependency_report",
      file_path: "dependency_report.json",
      node_type: "dependency_report",
      status: "generated",
      metadata: {
        ...report,
        generated_at: new Date().toISOString(),
      },
    });

    // Persist research results
    if (researchResults.length > 0) {
      await upsertNode(ctx, {
        name: "dependency_research",
        file_path: "dependency_research.json",
        node_type: "dependency_research",
        status: "generated",
        metadata: {
          results: researchResults,
          generated_at: new Date().toISOString(),
        },
      });
    }

    // ── 8. Record errors in project_errors ──
    for (const issue of issues.filter(i => i.severity === "error").slice(0, 30)) {
      await recordError(
        ctx,
        issue.detail,
        issue.type,
        "package.json",
        `Dependency intelligence: ${issue.type}`,
        issue.suggested_fix || `Fix ${issue.type} for ${issue.package}`
      );
    }

    // ── 9. Update initiative ──
    const passed = healthScore >= 0.75;
    await updateInitiative(ctx, {
      stage_status: "dependencies_analyzed",
      execution_progress: {
        ...(initiative.execution_progress || {}),
        dependency_intelligence: {
          total_dependencies: report.total_dependencies,
          missing: report.missing_dependencies,
          peer_issues: report.peer_dependency_issues,
          conflicts: report.version_conflicts,
          deprecated: report.deprecated_libraries,
          abandoned: report.abandoned_libraries,
          health_score: report.dependency_health_score,
          repairs: autoRepairs.length,
          researched: researchResults.length,
          passed,
        },
      },
    });

    await pipelineLog(ctx, "dependency_intelligence_complete",
      `Deps: ${report.total_dependencies} total, ${errorCount} errors, ${warningCount} warnings, score ${report.dependency_health_score}`,
      { report: { ...report, issues: issues.slice(0, 10) } }
    );

    const durationMs = Date.now() - startTime;
    if (jobId) {
      await completeJob(ctx, jobId, {
        ...report,
        issues: issues.length,
        passed,
      }, { durationMs });
    }

    return jsonResponse({
      success: true,
      total_dependencies: report.total_dependencies,
      missing_dependencies: report.missing_dependencies,
      peer_dependency_issues: report.peer_dependency_issues,
      version_conflicts: report.version_conflicts,
      deprecated_libraries: report.deprecated_libraries,
      abandoned_libraries: report.abandoned_libraries,
      dependency_health_score: report.dependency_health_score,
      auto_repairs: autoRepairs.length,
      researched_packages: researchResults.length,
      research_results: researchResults,
      passed,
    });
  } catch (e) {
    console.error("dependency-intelligence error:", e);
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    await updateInitiative(ctx, { stage_status: "modules_simulated" }); // rollback
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
