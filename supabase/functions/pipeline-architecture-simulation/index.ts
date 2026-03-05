// Layer 2.5 — Architecture Simulation Engine
// Simulates and validates the architecture model BEFORE code generation.
// Detects structural problems, circular dependencies, missing files,
// and dependency conflicts — auto-repairing the plan when possible.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { generateBrainContext, upsertNode, addEdge, recordDecision } from "../_shared/brain-helpers.ts";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

interface SimNode {
  id: string;
  type: "frontend" | "backend" | "database" | "auth" | "api" | "module" | "config" | "external" | "storage";
  name: string;
  files: string[];
  required: boolean;
}

interface SimEdge {
  from: string;
  to: string;
  type: "imports" | "calls" | "stores" | "configures" | "authenticates";
}

interface SimulationModel {
  nodes: SimNode[];
  edges: SimEdge[];
}

interface ValidationIssue {
  severity: "error" | "warning";
  category: "entrypoint" | "circular_dependency" | "disconnected_module" | "missing_config" | "dependency_conflict" | "missing_file" | "structural";
  description: string;
  affected_files: string[];
  auto_fix?: string;
}

interface SimulationResult {
  model: SimulationModel;
  issues: ValidationIssue[];
  predictions: string[];
  auto_repairs: string[];
  passed: boolean;
  score: number; // 0-100
}

// ═══════════════════════════════════════════════
// STEP 1 — BUILD ARCHITECTURE GRAPH MODEL
// ═══════════════════════════════════════════════

function buildSimulationModel(dp: Record<string, any>): SimulationModel {
  const nodes: SimNode[] = [];
  const edges: SimEdge[] = [];
  const nodeIds = new Set<string>();

  const addNode = (node: SimNode) => {
    if (!nodeIds.has(node.id)) {
      nodeIds.add(node.id);
      nodes.push(node);
    }
  };

  // Extract from system architecture
  const sysArch = dp.system_architecture || {};
  const stack = sysArch.stack || {};

  // Frontend node
  if (stack.frontend) {
    addNode({
      id: "frontend",
      type: "frontend",
      name: `Frontend (${stack.frontend.framework || "React"})`,
      files: ["src/main.tsx", "src/App.tsx", "index.html", "vite.config.ts", "tsconfig.json", "package.json"],
      required: true,
    });
  }

  // Backend node
  if (stack.backend) {
    addNode({
      id: "backend",
      type: "backend",
      name: `Backend (${stack.backend.platform || "Supabase"})`,
      files: [],
      required: true,
    });
    edges.push({ from: "frontend", to: "backend", type: "calls" });
  }

  // Database node
  if (stack.database) {
    addNode({
      id: "database",
      type: "database",
      name: `Database (${stack.database.provider || "PostgreSQL"})`,
      files: [],
      required: true,
    });
    if (nodeIds.has("backend")) {
      edges.push({ from: "backend", to: "database", type: "stores" });
    }
  }

  // Auth node
  if (stack.auth) {
    addNode({
      id: "auth",
      type: "auth",
      name: `Auth (${stack.auth.provider || "Supabase Auth"})`,
      files: [],
      required: true,
    });
    edges.push({ from: "frontend", to: "auth", type: "authenticates" });
    if (nodeIds.has("backend")) {
      edges.push({ from: "backend", to: "auth", type: "authenticates" });
    }
  }

  // Storage node
  if (stack.storage) {
    addNode({
      id: "storage",
      type: "storage",
      name: `Storage (${stack.storage.provider || "Supabase Storage"})`,
      files: [],
      required: false,
    });
  }

  // Edge functions from API architecture
  const apiArch = dp.api_architecture || {};
  const edgeFns = (apiArch.edge_functions as any[]) || [];
  for (const fn of edgeFns.slice(0, 20)) {
    const fnId = `edge_fn_${fn.name}`;
    addNode({
      id: fnId,
      type: "api",
      name: `Edge Function: ${fn.name}`,
      files: [`supabase/functions/${fn.name}/index.ts`],
      required: false,
    });
    if (nodeIds.has("backend")) {
      edges.push({ from: fnId, to: "database", type: "stores" });
    }
    edges.push({ from: "frontend", to: fnId, type: "calls" });
  }

  // Data model tables as config nodes
  const dataArch = dp.data_architecture || {};
  const tables = (dataArch.tables as any[]) || [];
  for (const t of tables.slice(0, 30)) {
    const tId = `table_${t.name}`;
    addNode({
      id: tId,
      type: "database",
      name: `Table: ${t.name}`,
      files: [],
      required: true,
    });
    if (nodeIds.has("database")) {
      edges.push({ from: "database", to: tId, type: "stores" });
    }
  }

  // Dependency graph nodes
  const depGraph = dp.dependency_graph || {};
  const depNodes = (depGraph.dependency_graph?.nodes as any[]) || [];
  for (const dn of depNodes.slice(0, 40)) {
    const dnId = `dep_${dn.id}`;
    if (!nodeIds.has(dnId)) {
      addNode({
        id: dnId,
        type: "module",
        name: dn.id,
        files: [dn.id],
        required: dn.layer === "infra" || dn.layer === "data",
      });
    }
  }

  // Config files
  addNode({
    id: "config_package",
    type: "config",
    name: "package.json",
    files: ["package.json"],
    required: true,
  });
  addNode({
    id: "config_vite",
    type: "config",
    name: "vite.config.ts",
    files: ["vite.config.ts"],
    required: true,
  });
  addNode({
    id: "config_ts",
    type: "config",
    name: "tsconfig.json",
    files: ["tsconfig.json"],
    required: true,
  });

  return { nodes, edges };
}

// ═══════════════════════════════════════════════
// STEP 2 — STRUCTURAL VALIDATION
// ═══════════════════════════════════════════════

function validateStructure(model: SimulationModel, dp: Record<string, any>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check required entrypoint files for React apps
  const frontendNode = model.nodes.find(n => n.id === "frontend");
  if (frontendNode) {
    const requiredFiles = ["src/main.tsx", "src/App.tsx", "index.html", "vite.config.ts", "package.json"];
    const depGraph = dp.dependency_graph?.dependency_graph || {};
    const generatedFiles = new Set<string>(
      ((depGraph.nodes as any[]) || []).map((n: any) => n.id)
    );

    for (const file of requiredFiles) {
      // Check if the file appears in the dependency graph
      const found = generatedFiles.has(file) ||
        Array.from(generatedFiles).some(f => f.endsWith(`/${file}`) || f === `./${file}`);
      if (!found) {
        issues.push({
          severity: "error",
          category: "missing_file",
          description: `Required React entrypoint file "${file}" is not in the generation plan`,
          affected_files: [file],
          auto_fix: `Add "${file}" to the generation plan with standard React/Vite content`,
        });
      }
    }
  }

  // Check for disconnected modules (nodes with no edges)
  const connectedNodes = new Set<string>();
  for (const edge of model.edges) {
    connectedNodes.add(edge.from);
    connectedNodes.add(edge.to);
  }
  for (const node of model.nodes) {
    if (node.required && !connectedNodes.has(node.id) && node.type !== "config") {
      issues.push({
        severity: "warning",
        category: "disconnected_module",
        description: `Required module "${node.name}" has no connections to other modules`,
        affected_files: node.files,
      });
    }
  }

  // Check for circular dependencies
  const adjacency: Record<string, string[]> = {};
  for (const edge of model.edges) {
    if (!adjacency[edge.from]) adjacency[edge.from] = [];
    adjacency[edge.from].push(edge.to);
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recStack.add(node);
    for (const neighbor of (adjacency[node] || [])) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path, neighbor]);
      } else if (recStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart >= 0) {
          cycles.push(path.slice(cycleStart));
        } else {
          cycles.push([...path, neighbor]);
        }
      }
    }
    recStack.delete(node);
  }

  for (const node of model.nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id, [node.id]);
    }
  }

  for (const cycle of cycles.slice(0, 5)) {
    issues.push({
      severity: "error",
      category: "circular_dependency",
      description: `Circular dependency detected: ${cycle.join(" → ")}`,
      affected_files: cycle,
      auto_fix: "Break the cycle by introducing an interface/abstraction layer",
    });
  }

  // Check config files
  const configNodes = model.nodes.filter(n => n.type === "config");
  if (!configNodes.find(n => n.id === "config_package")) {
    issues.push({
      severity: "error",
      category: "missing_config",
      description: "package.json is missing from the architecture plan",
      affected_files: ["package.json"],
      auto_fix: "Generate package.json with required dependencies",
    });
  }

  return issues;
}

// ═══════════════════════════════════════════════
// STEP 3 — DEPENDENCY VALIDATION
// ═══════════════════════════════════════════════

function validateDependencies(dp: Record<string, any>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const depGraph = dp.dependency_graph || {};
  const npmDeps = (depGraph.npm_dependencies as any[]) || [];

  const depNames = npmDeps.map((d: any) => d.package?.toLowerCase());

  // React + Vite: must have @vitejs/plugin-react or @vitejs/plugin-react-swc
  const sysArch = dp.system_architecture || {};
  const framework = sysArch.stack?.frontend?.framework?.toLowerCase() || "";
  if (framework.includes("react")) {
    const hasVitePlugin = depNames.some((d: string) =>
      d?.includes("@vitejs/plugin-react")
    );
    if (!hasVitePlugin) {
      issues.push({
        severity: "error",
        category: "dependency_conflict",
        description: "React project requires @vitejs/plugin-react or @vitejs/plugin-react-swc",
        affected_files: ["package.json", "vite.config.ts"],
        auto_fix: "Add @vitejs/plugin-react-swc to dependencies",
      });
    }

    // Must have react-dom
    const hasReactDom = depNames.some((d: string) => d === "react-dom");
    if (!hasReactDom) {
      issues.push({
        severity: "error",
        category: "dependency_conflict",
        description: "React project requires react-dom package",
        affected_files: ["package.json"],
        auto_fix: "Add react-dom to dependencies",
      });
    }
  }

  // TypeScript project: must have typescript
  const language = sysArch.stack?.frontend?.language?.toLowerCase() || "";
  if (language.includes("typescript")) {
    const hasTs = depNames.some((d: string) => d === "typescript");
    if (!hasTs) {
      issues.push({
        severity: "warning",
        category: "dependency_conflict",
        description: "TypeScript project should include typescript as a dev dependency",
        affected_files: ["package.json"],
        auto_fix: "Add typescript to devDependencies",
      });
    }
  }

  // Check for known conflict patterns
  const conflictPatterns = [
    { a: "tailwindcss", b: "bootstrap", msg: "tailwindcss and bootstrap may conflict in styling" },
    { a: "react-router-dom", b: "next", msg: "react-router-dom and Next.js routing conflict" },
  ];
  for (const cp of conflictPatterns) {
    if (depNames.includes(cp.a) && depNames.includes(cp.b)) {
      issues.push({
        severity: "warning",
        category: "dependency_conflict",
        description: cp.msg,
        affected_files: ["package.json"],
      });
    }
  }

  return issues;
}

// ═══════════════════════════════════════════════
// STEP 4 — FAILURE PREDICTION (AI-ASSISTED)
// ═══════════════════════════════════════════════

async function predictFailures(
  apiKey: string,
  dp: Record<string, any>,
  structuralIssues: ValidationIssue[],
  depIssues: ValidationIssue[],
  brainContext: string
): Promise<{ predictions: string[]; additional_issues: ValidationIssue[] }> {
  const prompt = `You are the Architecture Simulation Engine for AxionOS — an autonomous software factory.

Given the following architecture plan and detected issues, predict potential build failures and suggest preventive fixes.

ARCHITECTURE SUMMARY:
Stack: ${JSON.stringify(dp.system_architecture?.stack || {}, null, 2)}
Tables: ${(dp.data_architecture?.tables as any[])?.map((t: any) => t.name).join(", ") || "none"}
Endpoints: ${(dp.api_architecture?.endpoints as any[])?.length || 0}
Edge Functions: ${(dp.api_architecture?.edge_functions as any[])?.length || 0}
Files planned: ${(dp.dependency_graph?.dependency_graph?.nodes as any[])?.length || 0}

DETECTED ISSUES:
${[...structuralIssues, ...depIssues].map(i => `- [${i.severity}] ${i.description}`).join("\n") || "None"}

${brainContext ? `BRAIN CONTEXT:\n${brainContext}` : ""}

Return ONLY valid JSON:
{
  "predictions": ["string — predicted failure scenarios"],
  "additional_issues": [
    {
      "severity": "error|warning",
      "category": "entrypoint|missing_file|dependency_conflict|structural",
      "description": "what could fail",
      "affected_files": ["file paths"],
      "auto_fix": "how to prevent it"
    }
  ],
  "confidence_score": 0.0-1.0
}`;

  try {
    const result = await callAI(apiKey, "You are a build failure prediction engine. Return ONLY valid JSON.", prompt, true, 2, false);
    const parsed = JSON.parse(result.content);
    return {
      predictions: parsed.predictions || [],
      additional_issues: (parsed.additional_issues || []).map((i: any) => ({
        severity: i.severity || "warning",
        category: i.category || "structural",
        description: i.description || "",
        affected_files: i.affected_files || [],
        auto_fix: i.auto_fix,
      })),
    };
  } catch (e) {
    console.error("AI prediction failed:", e);
    return { predictions: [], additional_issues: [] };
  }
}

// ═══════════════════════════════════════════════
// STEP 5 — AUTO-REPAIR
// ═══════════════════════════════════════════════

function autoRepairArchitecture(
  dp: Record<string, any>,
  allIssues: ValidationIssue[]
): { repairs: string[]; updatedDp: Record<string, any> } {
  const repairs: string[] = [];
  const updatedDp = JSON.parse(JSON.stringify(dp)); // deep clone

  const depGraph = updatedDp.dependency_graph || {};
  const depNodes = depGraph.dependency_graph?.nodes || [];
  const npmDeps = depGraph.npm_dependencies || [];
  const genOrder = depGraph.generation_order || [];
  const existingFileIds = new Set(depNodes.map((n: any) => n.id));

  for (const issue of allIssues) {
    if (!issue.auto_fix) continue;

    if (issue.category === "missing_file") {
      for (const file of issue.affected_files) {
        if (!existingFileIds.has(file)) {
          // Add file to dependency graph
          let fileType = "config";
          if (file.endsWith(".tsx") || file.endsWith(".jsx")) fileType = "component";
          if (file === "src/main.tsx") fileType = "config"; // entrypoint
          const layer = file.startsWith("src/") ? "ui" : "infra";

          depNodes.push({
            id: file,
            type: fileType,
            layer,
            description: `Auto-added by Architecture Simulation: ${issue.auto_fix}`,
          });
          existingFileIds.add(file);

          // Add to generation order phase 1 (infra) or phase 4 (components)
          const targetPhase = layer === "infra" ? 0 : 3;
          if (genOrder[targetPhase]) {
            genOrder[targetPhase].files.push(file);
          }

          repairs.push(`Added "${file}" to generation plan: ${issue.auto_fix}`);
        }
      }
    }

    if (issue.category === "dependency_conflict" && issue.auto_fix?.includes("Add")) {
      const depMatch = issue.auto_fix.match(/Add\s+(\S+)/);
      if (depMatch) {
        const pkg = depMatch[1];
        const alreadyExists = npmDeps.some((d: any) => d.package === pkg);
        if (!alreadyExists) {
          npmDeps.push({
            package: pkg,
            version: "latest",
            dev: pkg === "typescript",
            justification: `Auto-added by Architecture Simulation: ${issue.description}`,
          });
          repairs.push(`Added dependency "${pkg}": ${issue.auto_fix}`);
        }
      }
    }
  }

  // Ensure critical files always exist
  const criticalFiles = [
    { file: "src/main.tsx", type: "config", layer: "infra" },
    { file: "src/App.tsx", type: "component", layer: "ui" },
    { file: "index.html", type: "config", layer: "infra" },
    { file: "package.json", type: "config", layer: "infra" },
    { file: "vite.config.ts", type: "config", layer: "infra" },
    { file: "tsconfig.json", type: "config", layer: "infra" },
  ];

  for (const cf of criticalFiles) {
    if (!existingFileIds.has(cf.file)) {
      depNodes.push({ id: cf.file, type: cf.type, layer: cf.layer, description: `Critical file ensured by simulation` });
      existingFileIds.add(cf.file);
      if (genOrder[0]) genOrder[0].files.push(cf.file);
      repairs.push(`Ensured critical file "${cf.file}" is in the generation plan`);
    }
  }

  // Write back
  if (!updatedDp.dependency_graph) updatedDp.dependency_graph = {};
  if (!updatedDp.dependency_graph.dependency_graph) updatedDp.dependency_graph.dependency_graph = {};
  updatedDp.dependency_graph.dependency_graph.nodes = depNodes;
  updatedDp.dependency_graph.npm_dependencies = npmDeps;
  updatedDp.dependency_graph.generation_order = genOrder;

  return { repairs, updatedDp };
}

// ═══════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-architecture-simulation");
  if (result instanceof Response) return result;
  const { user, initiative, ctx, serviceClient, apiKey } = result;

  const dp = initiative.discovery_payload || {};
  const jobId = await createJob(ctx, "architecture_simulation", {
    title: initiative.title,
    complexity: initiative.complexity,
  });
  await updateInitiative(ctx, { stage_status: "simulating_architecture" });
  await pipelineLog(ctx, "architecture_simulation_start", "🌀 Architecture Simulation Engine — Iniciando simulação da arquitetura");

  try {
    const brainContext = await generateBrainContext(ctx);
    const brainBlock = brainContext || "";

    // ── STEP 1: Build simulation model ──
    await pipelineLog(ctx, "simulation_model_build", "📐 Construindo modelo de simulação (grafo dirigido)...");
    const model = buildSimulationModel(dp);
    await pipelineLog(ctx, "simulation_model_built",
      `📐 Modelo: ${model.nodes.length} nós, ${model.edges.length} arestas`);

    // ── STEP 2: Structural validation ──
    await pipelineLog(ctx, "simulation_structural_start", "🔍 Validação estrutural...");
    const structuralIssues = validateStructure(model, dp);

    // ── STEP 3: Dependency validation ──
    await pipelineLog(ctx, "simulation_dependency_start", "📦 Validação de dependências...");
    const depIssues = validateDependencies(dp);

    // ── STEP 4: AI failure prediction ──
    await pipelineLog(ctx, "simulation_prediction_start", "🔮 Predição de falhas (IA)...");
    const { predictions, additional_issues } = await predictFailures(
      apiKey, dp, structuralIssues, depIssues, brainBlock
    );

    const allIssues = [...structuralIssues, ...depIssues, ...additional_issues];
    const errors = allIssues.filter(i => i.severity === "error");
    const warnings = allIssues.filter(i => i.severity === "warning");

    await pipelineLog(ctx, "simulation_issues_found",
      `🔍 Resultado: ${errors.length} erros, ${warnings.length} avisos, ${predictions.length} predições`,
      { errors: errors.length, warnings: warnings.length, predictions: predictions.length });

    // ── STEP 5: Auto-repair ──
    let repairs: string[] = [];
    let finalDp = dp;

    if (allIssues.some(i => i.auto_fix)) {
      await pipelineLog(ctx, "simulation_autorepair_start", "🔧 Auto-reparando arquitetura...");
      const repairResult = autoRepairArchitecture(dp, allIssues);
      repairs = repairResult.repairs;
      finalDp = repairResult.updatedDp;

      if (repairs.length > 0) {
        await pipelineLog(ctx, "simulation_autorepair_done",
          `🔧 ${repairs.length} reparos aplicados automaticamente`,
          { repairs });
      }
    }

    // ── Score calculation ──
    const errorPenalty = errors.length * 15;
    const warningPenalty = warnings.length * 5;
    const repairBonus = repairs.length * 10;
    const score = Math.max(0, Math.min(100, 100 - errorPenalty - warningPenalty + repairBonus));
    const passed = errors.filter(e => !e.auto_fix).length === 0; // pass if all errors have fixes

    // ── Write to Project Brain ──
    try {
      // Record simulation model nodes
      for (const node of model.nodes.slice(0, 20)) {
        await upsertNode(ctx, {
          node_type: "simulation_node",
          name: `sim:${node.id}`,
          metadata: { type: node.type, name: node.name, files: node.files, source: "architecture_simulation" },
          status: "planned",
        });
      }

      // Record simulation decisions
      if (repairs.length > 0) {
        await recordDecision(ctx,
          `Architecture Simulation: ${repairs.length} auto-repairs applied`,
          repairs.join("; "),
          "high",
          "architecture"
        );
      }

      if (predictions.length > 0) {
        await recordDecision(ctx,
          `Failure predictions: ${predictions.slice(0, 3).join("; ")}`,
          "Generated by Architecture Simulation Engine",
          "medium",
          "architecture"
        );
      }
    } catch (e) {
      console.error("Brain write error (simulation):", e);
    }

    // ── Save results ──
    await serviceClient.from("agent_outputs").insert({
      organization_id: ctx.organizationId,
      initiative_id: ctx.initiativeId,
      type: "analysis",
      status: "approved",
      summary: `Architecture Simulation: score ${score}/100, ${errors.length} errors, ${warnings.length} warnings, ${repairs.length} repairs`,
      raw_output: {
        agent: "architecture_simulation_engine",
        layer: "2.5",
        model: { nodes_count: model.nodes.length, edges_count: model.edges.length },
        issues: allIssues,
        predictions,
        repairs,
        score,
        passed,
      },
      model_used: "deterministic+ai",
      tokens_used: 0,
      cost_estimate: 0,
    });

    // Update initiative with repaired discovery payload
    await updateInitiative(ctx, {
      stage_status: "architecture_simulated",
      discovery_payload: {
        ...finalDp,
        architecture_simulation: {
          model_nodes: model.nodes.length,
          model_edges: model.edges.length,
          errors: errors.length,
          warnings: warnings.length,
          predictions_count: predictions.length,
          repairs_count: repairs.length,
          score,
          passed,
          issues: allIssues.slice(0, 20),
          predictions: predictions.slice(0, 10),
          repairs,
        },
      },
    });

    if (jobId) await completeJob(ctx, jobId, {
      score,
      passed,
      nodes: model.nodes.length,
      edges: model.edges.length,
      errors: errors.length,
      warnings: warnings.length,
      repairs: repairs.length,
      predictions: predictions.length,
    }, { model: "deterministic+ai", costUsd: 0, durationMs: 0 });

    await pipelineLog(ctx, "architecture_simulation_complete",
      `🌀 Simulação concluída: score ${score}/100, ${passed ? "APROVADO ✅" : "REPROVADO ❌"} (${errors.length} erros, ${repairs.length} reparos)`,
      { score, passed, errors: errors.length, repairs: repairs.length });

    return jsonResponse({
      success: true,
      passed,
      score,
      model_nodes: model.nodes.length,
      model_edges: model.edges.length,
      errors_count: errors.length,
      warnings_count: warnings.length,
      predictions,
      repairs,
      next_stage: "preventive_validation",
    });

  } catch (e) {
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    await updateInitiative(ctx, { stage_status: "architected" });
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
