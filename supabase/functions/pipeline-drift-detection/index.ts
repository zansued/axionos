import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import {
  pipelineLog, updateInitiative, createJob, completeJob, failJob
} from "../_shared/pipeline-helpers.ts";
import {
  getBrainNodes, getBrainEdges, getDecisions, recordError,
  upsertPreventionRule, generateBrainContext
} from "../_shared/brain-helpers.ts";

/**
 * Architectural Drift Detection
 *
 * Compares generated code against the architecture stored in the Project Brain.
 * Detects violations: wrong layer dependencies, missing boundaries, unexpected imports.
 *
 * Expected layer hierarchy (configurable per project):
 *   pages → components → hooks → services → data/types
 *
 * Violations trigger errors in project_errors and optionally dispatch fix agents.
 */

interface DriftViolation {
  file: string;
  violation_type: "wrong_dependency" | "missing_layer" | "boundary_violation" | "circular_dependency" | "pattern_violation";
  severity: "error" | "warning";
  message: string;
  expected: string;
  actual: string;
  suggestion: string;
}

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-drift-detection");
  if (result instanceof Response) return result;
  const { initiative, ctx, serviceClient, apiKey } = result;

  const jobId = await createJob(ctx, "drift_detection", {
    initiative_id: ctx.initiativeId,
    mode: "architectural_drift",
  });

  await pipelineLog(ctx, "drift_detection_start",
    "Architectural Drift Detection: analyzing code against Project Brain architecture...");

  try {
    // ── 1. Load Project Brain architecture graph ──
    const [brainNodes, brainEdges, decisions] = await Promise.all([
      getBrainNodes(ctx),
      getBrainEdges(ctx),
      getDecisions(ctx, "architecture"),
    ]);

    if (brainNodes.length === 0) {
      throw new Error("Project Brain is empty — run architecture stage first");
    }

    // ── 2. Load all generated code from subtasks ──
    const { data: stories } = await serviceClient
      .from("stories").select("id").eq("initiative_id", ctx.initiativeId);
    if (!stories?.length) throw new Error("No stories found");

    const storyIds = stories.map((s: any) => s.id);
    const { data: phases } = await serviceClient
      .from("story_phases").select("id").in("story_id", storyIds);
    const phaseIds = (phases || []).map((p: any) => p.id);
    const { data: subtasks } = await serviceClient
      .from("story_subtasks")
      .select("id, file_path, file_type, output")
      .in("phase_id", phaseIds);

    const virtualFS: Record<string, string> = {};
    for (const st of (subtasks || [])) {
      if (st.file_path && st.output) {
        virtualFS[st.file_path] = st.output;
      }
    }

    const fileCount = Object.keys(virtualFS).length;
    if (fileCount === 0) throw new Error("No generated files found");

    // ── 3. Build architecture map from Brain ──
    const nodeById: Record<string, any> = {};
    for (const n of brainNodes) nodeById[n.id] = n;

    const architectureMap = buildArchitectureMap(brainNodes, brainEdges, nodeById);
    const actualDependencies = extractActualDependencies(virtualFS);

    let totalTokens = 0, totalCost = 0;
    const allViolations: DriftViolation[] = [];

    // ── 4. Rule-based drift detection (fast, no AI) ──
    const ruleViolations = detectRuleBasedDrift(actualDependencies, virtualFS);
    allViolations.push(...ruleViolations);

    // ── 5. AI-powered drift analysis (deeper) ──
    const brainContext = architectureMap.summary;
    const depsContext = Object.entries(actualDependencies)
      .map(([file, imports]) => `${file}: ${imports.join(", ")}`)
      .join("\n");

    const decisionsContext = decisions.slice(0, 10)
      .map((d: any) => `- [${d.category}] ${d.decision} (reason: ${d.reason})`)
      .join("\n");

    const aiResult = await callAI(apiKey,
      `You are an Architectural Drift Detector for an AI Software Factory.

Compare the ACTUAL code dependencies against the PLANNED architecture from the Project Brain.

## Layer Hierarchy (violations if reversed):
pages → components → hooks → services → data/types/utils
edge_functions → _shared helpers

## Violation Types:
1. **wrong_dependency**: A module imports from a layer it should NOT depend on
   - e.g., a service importing a React component
   - e.g., a hook importing a page component
   - e.g., a data/type file importing a component
2. **missing_layer**: A planned module/layer exists in architecture but no code was generated
3. **boundary_violation**: Code crosses module boundaries not defined in architecture edges
4. **circular_dependency**: Circular import chains detected
5. **pattern_violation**: Code doesn't follow architectural decisions (e.g., state management pattern)

## IMPORTANT:
- Only flag REAL violations, not style preferences
- Infrastructure imports (react, npm packages) are NOT violations
- Shared types/utils can be imported by any layer
- Test files can import anything

Return ONLY JSON:
{
  "violations": [
    {
      "file": "src/...",
      "violation_type": "wrong_dependency|missing_layer|boundary_violation|circular_dependency|pattern_violation",
      "severity": "error|warning",
      "message": "Description of the violation",
      "expected": "What the architecture dictates",
      "actual": "What the code actually does",
      "suggestion": "How to fix"
    }
  ],
  "drift_score": 0-100,
  "summary": "...",
  "healthy_patterns": ["list of correctly implemented architectural patterns"]
}`,
      `## Planned Architecture (Project Brain):
${brainContext}

## Architectural Decisions:
${decisionsContext || "None recorded"}

## Brain Nodes (${brainNodes.length}):
${brainNodes.slice(0, 50).map((n: any) =>
  `- [${n.node_type}] ${n.name} → ${n.file_path || "no path"} (${n.status})`
).join("\n")}

## Brain Edges (${brainEdges.length} dependencies):
${brainEdges.slice(0, 60).map((e: any) => {
  const src = nodeById[e.source_node_id];
  const tgt = nodeById[e.target_node_id];
  return `- ${src?.name || "?"} → [${e.relation_type}] → ${tgt?.name || "?"}`;
}).join("\n")}

## Actual Code Dependencies (${Object.keys(actualDependencies).length} files):
${depsContext}

## All Generated Files (${fileCount}):
${Object.keys(virtualFS).join("\n")}`,
      true
    );
    totalTokens += aiResult.tokens;
    totalCost += aiResult.costUsd;

    try {
      const parsed = JSON.parse(aiResult.content);
      for (const v of (parsed.violations || [])) {
        // Avoid duplicates from rule-based detection
        const isDuplicate = allViolations.some(
          existing => existing.file === v.file && existing.message === v.message
        );
        if (!isDuplicate) {
          allViolations.push({
            file: v.file,
            violation_type: v.violation_type || "boundary_violation",
            severity: v.severity || "warning",
            message: v.message,
            expected: v.expected || "",
            actual: v.actual || "",
            suggestion: v.suggestion || "",
          });
        }
      }
    } catch (e) {
      console.error("Failed to parse AI drift analysis:", e);
    }

    // ── 6. Record violations in project_errors ──
    const errors = allViolations.filter(v => v.severity === "error");
    const warnings = allViolations.filter(v => v.severity === "warning");

    for (const violation of errors.slice(0, 20)) {
      await recordError(
        ctx,
        `[DRIFT] ${violation.message}`,
        "architecture_drift",
        violation.file,
        `Expected: ${violation.expected}. Actual: ${violation.actual}`,
        violation.suggestion
      );
    }

    // ── 7. Generate prevention rules from violations ──
    for (const violation of errors.slice(0, 10)) {
      await upsertPreventionRule(
        ctx,
        `architecture_drift:${violation.violation_type}:${violation.file}`,
        `${violation.suggestion} (Expected: ${violation.expected})`,
        "initiative"
      );
    }

    // ── 8. Update initiative with drift results ──
    const execProgress = (initiative.execution_progress || {}) as any;
    const driftScore = errors.length === 0 ? 0 : Math.min(100, errors.length * 15 + warnings.length * 5);

    await updateInitiative(ctx, {
      execution_progress: {
        ...execProgress,
        drift_detection: {
          violations: allViolations.slice(0, 50),
          errors_count: errors.length,
          warnings_count: warnings.length,
          drift_score: driftScore,
          detected_at: new Date().toISOString(),
          total_files_analyzed: fileCount,
        },
      },
    });

    const passed = errors.length === 0;

    if (jobId) await completeJob(ctx, jobId, {
      passed,
      drift_score: driftScore,
      violations_count: allViolations.length,
      errors_count: errors.length,
      warnings_count: warnings.length,
      files_analyzed: fileCount,
    }, { model: "google/gemini-2.5-flash", costUsd: totalCost, durationMs: 0 });

    await pipelineLog(ctx, "drift_detection_complete",
      `Drift Detection: ${fileCount} files, ${errors.length} errors, ${warnings.length} warnings, drift score: ${driftScore}%${passed ? " ✅" : " ⚠️"}`,
      { total_tokens: totalTokens, cost_usd: totalCost, passed, drift_score: driftScore });

    return jsonResponse({
      success: true,
      passed,
      drift_score: driftScore,
      violations: allViolations.slice(0, 50),
      errors_count: errors.length,
      warnings_count: warnings.length,
      files_analyzed: fileCount,
      job_id: jobId,
    });
  } catch (e) {
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});

// ── Helpers ──

function buildArchitectureMap(
  nodes: any[],
  edges: any[],
  nodeById: Record<string, any>
) {
  const byType: Record<string, any[]> = {};
  for (const n of nodes) {
    (byType[n.node_type] ||= []).push(n);
  }

  const lines: string[] = [];
  for (const [type, items] of Object.entries(byType)) {
    lines.push(`### ${type}s (${items.length})`);
    for (const item of items.slice(0, 20)) {
      lines.push(`- ${item.name} → ${item.file_path || "?"}`);
    }
  }

  const edgeLines = edges.slice(0, 40).map((e: any) => {
    const src = nodeById[e.source_node_id];
    const tgt = nodeById[e.target_node_id];
    return `${src?.file_path || src?.name || "?"} → [${e.relation_type}] → ${tgt?.file_path || tgt?.name || "?"}`;
  });

  return {
    summary: `## Architecture Map\n${lines.join("\n")}\n\n## Dependencies\n${edgeLines.join("\n")}`,
    byType,
  };
}

/** Extract actual import dependencies from generated code */
function extractActualDependencies(
  virtualFS: Record<string, string>
): Record<string, string[]> {
  const importRegex = /(?:import\s+(?:[\w{}\s,*]+)\s+from\s+["'])([^"']+)["']/g;
  const dynamicImportRegex = /import\(\s*["']([^"']+)["']\s*\)/g;
  const result: Record<string, string[]> = {};

  for (const [path, content] of Object.entries(virtualFS)) {
    const imports: string[] = [];
    const code = content.slice(0, 8000);
    let match;

    importRegex.lastIndex = 0;
    while ((match = importRegex.exec(code)) !== null) imports.push(match[1]);
    dynamicImportRegex.lastIndex = 0;
    while ((match = dynamicImportRegex.exec(code)) !== null) imports.push(match[1]);

    if (imports.length > 0) result[path] = imports;
  }

  return result;
}

/** Rule-based drift detection (no AI needed) */
function detectRuleBasedDrift(
  deps: Record<string, string[]>,
  virtualFS: Record<string, string>
): DriftViolation[] {
  const violations: DriftViolation[] = [];

  // Layer classification
  const getLayer = (path: string): string => {
    if (path.includes("/pages/")) return "page";
    if (path.includes("/components/")) return "component";
    if (path.includes("/hooks/")) return "hook";
    if (path.includes("/services/") || path.includes("/api/")) return "service";
    if (path.includes("/types/") || path.includes("/interfaces/")) return "type";
    if (path.includes("/utils/") || path.includes("/lib/")) return "util";
    if (path.includes("/contexts/")) return "context";
    if (path.includes("/data/") || path.includes("/store/")) return "data";
    return "other";
  };

  // Forbidden dependency directions (lower layers should NOT import higher layers)
  const layerOrder: Record<string, number> = {
    page: 5,
    component: 4,
    context: 3,
    hook: 3,
    service: 2,
    data: 1,
    util: 0,
    type: 0,
    other: 0,
  };

  for (const [file, imports] of Object.entries(deps)) {
    const sourceLayer = getLayer(file);
    const sourceOrder = layerOrder[sourceLayer] ?? 0;

    for (const imp of imports) {
      // Skip external packages and relative non-src imports
      if (!imp.startsWith(".") && !imp.startsWith("@/") && !imp.startsWith("src/")) continue;

      // Resolve import to approximate path
      let resolvedPath = imp;
      if (imp.startsWith("@/")) resolvedPath = `src/${imp.slice(2)}`;

      const targetLayer = getLayer(resolvedPath);
      const targetOrder = layerOrder[targetLayer] ?? 0;

      // Service importing a component → violation
      if (sourceOrder < targetOrder && sourceLayer !== "other" && targetLayer !== "other") {
        // Special case: contexts can import hooks (common pattern)
        if (sourceLayer === "context" && targetLayer === "hook") continue;
        // Hooks can import components for render functions (less common but valid)
        if (sourceLayer === "hook" && targetLayer === "component") continue;

        violations.push({
          file,
          violation_type: "wrong_dependency",
          severity: "error",
          message: `${sourceLayer} layer imports from ${targetLayer} layer: "${imp}"`,
          expected: `${sourceLayer}s should not depend on ${targetLayer}s (dependency inversion)`,
          actual: `${file} imports ${imp}`,
          suggestion: `Move shared logic to a lower layer (hooks/services/utils) or invert the dependency`,
        });
      }
    }
  }

  return violations;
}
