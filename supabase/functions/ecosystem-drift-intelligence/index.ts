// Ecosystem Drift Intelligence — monitors dependency ecosystems for drift,
// deprecation, breaking changes, and uses Firecrawl for ecosystem research.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { upsertNode, recordError } from "../_shared/brain-helpers.ts";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

interface DependencySnapshot {
  package: string;
  current_version: string;
  latest_version: string;
  deprecated: boolean;
  deprecated_message?: string;
  peer_dependencies: Record<string, string>;
  engines: Record<string, string>;
  last_publish_date: string;
  last_checked: string;
}

interface DriftEvent {
  package: string;
  drift_type: "major_update" | "deprecated" | "peer_change" | "engine_change" | "abandoned";
  risk_level: "low" | "medium" | "high" | "critical";
  description: string;
}

interface EcosystemResearch {
  package: string;
  compatibility_notes: string;
  migration_advice?: string;
  replacement_library?: string;
  confidence_score: number;
}

interface DriftReport {
  packages_checked: number;
  major_updates: number;
  deprecated_packages: number;
  compatibility_risks: number;
  abandoned_packages: number;
  ecosystem_health_score: number;
  drift_events: DriftEvent[];
  snapshots: DependencySnapshot[];
  research: EcosystemResearch[];
  prevention_rules: string[];
}

// ═══════════════════════════════════════════════
// NPM REGISTRY
// ═══════════════════════════════════════════════

async function fetchNpmMeta(pkg: string): Promise<{
  latest: string;
  deprecated: boolean;
  deprecated_message?: string;
  peers: Record<string, string>;
  engines: Record<string, string>;
  last_publish: string;
} | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const latest = data["dist-tags"]?.latest || "0.0.0";
    const latestMeta = data.versions?.[latest] || {};
    const time = data.time || {};
    return {
      latest,
      deprecated: !!latestMeta.deprecated || !!data.deprecated,
      deprecated_message: latestMeta.deprecated || data.deprecated || undefined,
      peers: latestMeta.peerDependencies || {},
      engines: latestMeta.engines || {},
      last_publish: time[latest] || time.modified || "",
    };
  } catch {
    return null;
  }
}

function extractMajor(v: string): number | null {
  const m = v.replace(/^[\^~>=<\s]+/, "").match(/^(\d+)/);
  return m ? parseInt(m[1]) : null;
}

function isAbandoned(lastPublish: string): boolean {
  if (!lastPublish) return false;
  return (Date.now() - new Date(lastPublish).getTime()) > 24 * 30 * 24 * 60 * 60 * 1000;
}

// ═══════════════════════════════════════════════
// FIRECRAWL RESEARCH
// ═══════════════════════════════════════════════

async function researchPackage(pkg: string, driftType: string): Promise<EcosystemResearch> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) {
    return { package: pkg, compatibility_notes: "Firecrawl not configured", confidence_score: 0.2 };
  }

  const queries = [
    `${pkg} ${driftType === "deprecated" ? "deprecated alternative replacement" : "breaking change migration guide"}`,
    `${pkg} npm compatibility ${new Date().getFullYear()}`,
  ];

  let content = "";
  for (const q of queries) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, limit: 3, scrapeOptions: { formats: ["markdown"] } }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        for (const r of data.data || []) {
          if (r.markdown) content += r.markdown.slice(0, 400) + "\n---\n";
        }
      }
    } catch { /* continue */ }
  }

  const lower = content.toLowerCase();
  const replacementMatch = lower.match(/(?:use|switch to|migrate to|replaced by|alternative[:\s]+)\s*[`"']?(\w[\w-]*\w)[`"']?/i);
  const migrationMatch = lower.match(/migration guide|upgrade guide|breaking changes/i);

  return {
    package: pkg,
    compatibility_notes: content ? content.slice(0, 300) : `No ecosystem data for ${pkg}`,
    migration_advice: migrationMatch ? "Migration guide available — check package docs" : undefined,
    replacement_library: replacementMatch?.[1] || undefined,
    confidence_score: content.length > 100 ? 0.85 : 0.35,
  };
}

// ═══════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════

serve(async (req) => {
  const result = await bootstrapPipeline(req, "ecosystem-drift-intelligence");
  if (result instanceof Response) return result;
  const { initiative, ctx, serviceClient } = result;

  const jobId = await createJob(ctx, "ecosystem_drift_intelligence", { initiativeId: ctx.initiativeId });
  const startTime = Date.now();

  try {
    // ── 1. Load package.json from Brain ──
    const { data: pkgNode } = await serviceClient
      .from("project_brain_nodes")
      .select("metadata")
      .eq("initiative_id", ctx.initiativeId)
      .in("node_type", ["file", "bootstrap", "scaffold", "dependency_report"])
      .or("file_path.eq.package.json,name.eq.package.json")
      .maybeSingle();

    const pkgMeta = (pkgNode?.metadata || {}) as any;
    const deps: Record<string, string> = { ...(pkgMeta.dependencies || {}), ...(pkgMeta.devDependencies || {}) };

    if (Object.keys(deps).length === 0) {
      if (jobId) await completeJob(ctx, jobId, { skipped: true, reason: "no_dependencies" }, { durationMs: Date.now() - startTime });
      return jsonResponse({ success: true, skipped: true, reason: "No dependencies found in package.json" });
    }

    // ── 2. Load previous snapshots ──
    const { data: prevNode } = await serviceClient
      .from("project_brain_nodes")
      .select("metadata")
      .eq("initiative_id", ctx.initiativeId)
      .eq("node_type", "dependency_snapshot")
      .maybeSingle();

    const prevSnapshots: Record<string, DependencySnapshot> = {};
    if (prevNode?.metadata) {
      for (const s of (prevNode.metadata as any).snapshots || []) {
        prevSnapshots[s.package] = s;
      }
    }

    // ── 3. Query registry and build snapshots ──
    const snapshots: DependencySnapshot[] = [];
    const driftEvents: DriftEvent[] = [];
    const researchTargets: Array<{ pkg: string; type: string }> = [];

    for (const [pkg, currentRange] of Object.entries(deps)) {
      const meta = await fetchNpmMeta(pkg);
      if (!meta) continue;

      const snapshot: DependencySnapshot = {
        package: pkg,
        current_version: currentRange,
        latest_version: meta.latest,
        deprecated: meta.deprecated,
        deprecated_message: meta.deprecated_message,
        peer_dependencies: meta.peers,
        engines: meta.engines,
        last_publish_date: meta.last_publish,
        last_checked: new Date().toISOString(),
      };
      snapshots.push(snapshot);

      const currentMajor = extractMajor(currentRange);
      const latestMajor = extractMajor(meta.latest);

      // Detect drift: major version change
      if (currentMajor !== null && latestMajor !== null && latestMajor > currentMajor) {
        const risk = latestMajor - currentMajor >= 2 ? "high" : "medium";
        driftEvents.push({
          package: pkg,
          drift_type: "major_update",
          risk_level: risk,
          description: `Major update: ${currentRange} → ${meta.latest} (${latestMajor - currentMajor} major versions behind)`,
        });
        researchTargets.push({ pkg, type: "major_update" });
      }

      // Detect drift: deprecated
      if (meta.deprecated) {
        driftEvents.push({
          package: pkg,
          drift_type: "deprecated",
          risk_level: "high",
          description: meta.deprecated_message || `${pkg} is deprecated`,
        });
        researchTargets.push({ pkg, type: "deprecated" });
      }

      // Detect drift: abandoned
      if (!meta.deprecated && isAbandoned(meta.last_publish)) {
        driftEvents.push({
          package: pkg,
          drift_type: "abandoned",
          risk_level: "medium",
          description: `${pkg} last published ${meta.last_publish?.split("T")[0] || "unknown"} (>24 months)`,
        });
        researchTargets.push({ pkg, type: "abandoned" });
      }

      // Detect drift: peer dependency changes vs previous snapshot
      const prev = prevSnapshots[pkg];
      if (prev) {
        const prevPeers = Object.keys(prev.peer_dependencies || {}).sort().join(",");
        const newPeers = Object.keys(meta.peers).sort().join(",");
        if (prevPeers !== newPeers && newPeers) {
          driftEvents.push({
            package: pkg,
            drift_type: "peer_change",
            risk_level: "medium",
            description: `Peer dependencies changed: ${newPeers}`,
          });
        }

        // Engine changes
        const prevEngine = prev.engines?.node || "";
        const newEngine = meta.engines?.node || "";
        if (prevEngine !== newEngine && newEngine) {
          driftEvents.push({
            package: pkg,
            drift_type: "engine_change",
            risk_level: "low",
            description: `Engine requirement changed: ${prevEngine || "none"} → ${newEngine}`,
          });
        }
      }
    }

    // ── 4. Firecrawl research for high-risk drifts ──
    const researchResults: EcosystemResearch[] = [];
    const uniqueTargets = [...new Map(researchTargets.map(t => [t.pkg, t])).values()];
    for (const target of uniqueTargets.slice(0, 5)) {
      const research = await researchPackage(target.pkg, target.type);
      researchResults.push(research);
    }

    // ── 5. Generate prevention rules ──
    const preventionRules: string[] = [];
    for (const evt of driftEvents.filter(e => e.risk_level === "high" || e.risk_level === "critical")) {
      const research = researchResults.find(r => r.package === evt.package);
      if (research?.replacement_library) {
        preventionRules.push(`Avoid "${evt.package}", use "${research.replacement_library}" instead`);
      } else if (evt.drift_type === "deprecated") {
        preventionRules.push(`Avoid "${evt.package}" — deprecated`);
      }
    }

    // Persist prevention rules in DB
    for (const rule of preventionRules.slice(0, 10)) {
      const pkg = rule.match(/Avoid "([^"]+)"/)?.[1] || "";
      await serviceClient.from("project_prevention_rules").upsert({
        initiative_id: ctx.initiativeId,
        organization_id: ctx.organizationId,
        error_pattern: `import.*${pkg}`,
        prevention_rule: rule,
        scope: "initiative",
        confidence_score: 0.85,
        times_triggered: 1,
        last_triggered_at: new Date().toISOString(),
      }, { onConflict: "initiative_id,error_pattern" }).select();
    }

    // ── 6. Calculate ecosystem health score ──
    const total = snapshots.length || 1;
    const majorUpdates = driftEvents.filter(e => e.drift_type === "major_update").length;
    const deprecatedPkgs = driftEvents.filter(e => e.drift_type === "deprecated").length;
    const abandonedPkgs = driftEvents.filter(e => e.drift_type === "abandoned").length;
    const compatRisks = driftEvents.filter(e => ["peer_change", "engine_change"].includes(e.drift_type)).length;

    const healthScore = Math.max(0, Math.min(1,
      1 - (deprecatedPkgs * 0.2 + majorUpdates * 0.1 + abandonedPkgs * 0.08 + compatRisks * 0.05) / Math.max(total, 1)
    ));

    const report: DriftReport = {
      packages_checked: snapshots.length,
      major_updates: majorUpdates,
      deprecated_packages: deprecatedPkgs,
      compatibility_risks: compatRisks,
      abandoned_packages: abandonedPkgs,
      ecosystem_health_score: Math.round(healthScore * 100) / 100,
      drift_events: driftEvents,
      snapshots,
      research: researchResults,
      prevention_rules: preventionRules,
    };

    // ── 7. Persist in Project Brain ──
    await upsertNode(ctx, {
      name: "dependency_snapshot",
      file_path: "dependency_snapshot.json",
      node_type: "dependency_snapshot",
      status: "generated",
      metadata: { snapshots, generated_at: new Date().toISOString() },
    });

    await upsertNode(ctx, {
      name: "ecosystem_drift_report",
      file_path: "ecosystem_drift_report.json",
      node_type: "ecosystem_drift_report",
      status: "generated",
      metadata: {
        ...report,
        snapshots: undefined, // stored separately
        generated_at: new Date().toISOString(),
      },
    });

    // Record high-risk drifts as project errors
    for (const evt of driftEvents.filter(e => e.risk_level === "high" || e.risk_level === "critical").slice(0, 20)) {
      await recordError(ctx, evt.description, `ecosystem_drift_${evt.drift_type}`, "package.json", evt.description);
    }

    await pipelineLog(ctx, "ecosystem_drift_complete",
      `Ecosystem Drift: ${snapshots.length} checked, ${driftEvents.length} events, score ${report.ecosystem_health_score}`,
      { summary: { ...report, snapshots: undefined, drift_events: driftEvents.slice(0, 5) } }
    );

    const durationMs = Date.now() - startTime;
    if (jobId) {
      await completeJob(ctx, jobId, {
        packages_checked: report.packages_checked,
        drift_events: driftEvents.length,
        health_score: report.ecosystem_health_score,
        researched: researchResults.length,
        prevention_rules: preventionRules.length,
      }, { durationMs });
    }

    return jsonResponse({
      success: true,
      packages_checked: report.packages_checked,
      major_updates: report.major_updates,
      deprecated_packages: report.deprecated_packages,
      compatibility_risks: report.compatibility_risks,
      abandoned_packages: report.abandoned_packages,
      ecosystem_health_score: report.ecosystem_health_score,
      drift_events: driftEvents.length,
      researched_packages: researchResults.length,
      prevention_rules: preventionRules,
      research_results: researchResults,
    });
  } catch (e) {
    console.error("ecosystem-drift-intelligence error:", e);
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
