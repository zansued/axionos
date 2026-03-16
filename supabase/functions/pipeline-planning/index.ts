// Layer 3 — Development Planning (Background Processing)
// Orchestrates: Task Planner → Story Generator → File Planner
// Uses EdgeRuntime.waitUntil() to avoid timeout on long AI generations.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { generateBrainContext, upsertNode, addEdge } from "../_shared/brain-helpers.ts";

interface AgentOutput {
  role: string;
  model: string;
  tokens: number;
  costUsd: number;
  durationMs: number;
  result: Record<string, unknown>;
}

async function runAgent(
  apiKey: string, role: string, systemPrompt: string, userPrompt: string, usePro = false,
): Promise<AgentOutput> {
  const aiResult = await callAI(apiKey, systemPrompt, userPrompt, true, 3, usePro);
  const result = JSON.parse(aiResult.content);
  return { role, model: aiResult.model, tokens: aiResult.tokens, costUsd: aiResult.costUsd, durationMs: aiResult.durationMs, result };
}

// ── Normalization helpers ──
// DeepSeek sometimes returns variant key names or nested objects instead of arrays.

function normalizeTaskGraph(result: Record<string, unknown>): Record<string, unknown> {
  // Accept "tasks" as alias for "task_graph"
  if (!Array.isArray(result.task_graph) && Array.isArray(result.tasks)) {
    result.task_graph = result.tasks;
  }
  // Accept "phases" as alias for "execution_phases"
  if (!Array.isArray(result.execution_phases) && Array.isArray(result.phases)) {
    result.execution_phases = result.phases;
  }
  return result;
}

function flattenFileTree(tree: unknown, prefix = ""): { path: string; type: string; layer: string; description: string; story_ref: string; exports: string[]; imports_from: string[] }[] {
  if (Array.isArray(tree)) return tree; // Already correct format
  if (!tree || typeof tree !== "object") return [];

  // It's a nested directory object — flatten it to array
  const files: any[] = [];
  for (const [key, value] of Object.entries(tree as Record<string, unknown>)) {
    const fullPath = prefix ? `${prefix}${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const strVal = String(value);
      // Check if it's a leaf (file status like "generated", "published", "planned")
      if (typeof value === "string") {
        files.push({ path: fullPath, type: "file", layer: "unknown", description: `${value}`, story_ref: "", exports: [], imports_from: [] });
      } else {
        // Recurse into subdirectory
        files.push(...flattenFileTree(value, fullPath.endsWith("/") ? fullPath : `${fullPath}/`));
      }
    } else if (typeof value === "string") {
      files.push({ path: fullPath, type: "file", layer: "unknown", description: value, story_ref: "", exports: [], imports_from: [] });
    }
  }
  return files;
}

function normalizeFilePlanner(result: Record<string, unknown>): Record<string, unknown> {
  const raw = result.file_tree;
  if (raw && !Array.isArray(raw)) {
    // Nested object format — flatten it
    const flatFiles = flattenFileTree(raw);
    result.file_tree = flatFiles;
    if (!result.total_files || result.total_files === 0) {
      result.total_files = flatFiles.length;
    }
  }
  // Also check validation might be missing
  if (!result.validation) {
    result.validation = { completeness_score: (result.file_tree as any[])?.length > 0 ? 70 : 0, issues: [] };
  }
  return result;
}

// Declare EdgeRuntime for Deno edge environment
declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-planning");
  if (result instanceof Response) return result;
  const { user, initiative, ctx, serviceClient, apiKey } = result;

  const jobId = await createJob(ctx, "planning", { title: initiative.title });
  await updateInitiative(ctx, { stage_status: "planning" });

  // Return immediately, process in background
  const backgroundWork = async () => {
    try {
      await pipelineLog(ctx, "pipeline_planning_start", "Camada 3 — Planejamento de Desenvolvimento iniciado (3 agentes)");

      const dp = initiative.discovery_payload || {};
      const brainContext = await generateBrainContext(ctx);
      const brainBlock = brainContext ? `\n\n${brainContext}` : "";

      const projectContext = `Projeto: ${initiative.title}
Ideia: ${initiative.refined_idea || initiative.description || ""}
MVP: ${initiative.mvp_scope || dp.mvp_definition || "N/A"}
Stack: ${initiative.suggested_stack || "Vite + React + TypeScript + Tailwind + Supabase"}
Complexidade: ${initiative.complexity || "medium"}${brainBlock}`;

      const requirementsData = dp.requirements ? JSON.stringify(dp.requirements, null, 2).slice(0, 4000) : "N/A";
      const productArchData = dp.product_architecture ? JSON.stringify(dp.product_architecture, null, 2).slice(0, 3000) : "N/A";
      const systemArchData = dp.system_architecture ? JSON.stringify(dp.system_architecture, null, 2).slice(0, 3000) : "N/A";
      const dataArchData = dp.data_architecture ? JSON.stringify(dp.data_architecture, null, 2).slice(0, 3000) : "N/A";
      const apiArchData = dp.api_architecture ? JSON.stringify(dp.api_architecture, null, 2).slice(0, 2000) : "N/A";
      const depGraphData = dp.dependency_graph ? JSON.stringify(dp.dependency_graph, null, 2).slice(0, 2000) : "N/A";

      // ──── Agent 9: Task Planner ────
      await pipelineLog(ctx, "agent_task_planner_start", "📋 Task Planner transformando arquitetura em tarefas...");
      const taskPlanner = await runAgent(
        apiKey,
        "task_planner",
        `Você é o Task Planner Agent — especialista em decomposição de projetos em tarefas executáveis. Transforme a arquitetura e requisitos em um grafo de tarefas ordenado. Retorne APENAS JSON válido.`,
        `${projectContext}

REQUISITOS: ${requirementsData}
ARQUITETURA DE PRODUTO: ${productArchData}
ARQUITETURA DE SISTEMA: ${systemArchData}
MODELO DE DADOS: ${dataArchData}
GRAFO DE DEPENDÊNCIAS: ${depGraphData}

Crie o grafo de tarefas:
{
  "task_graph": [
    {
      "id": "T-001",
      "title": "string (ex: Setup do projeto, Auth Service, Dashboard Page)",
      "description": "string",
      "type": "infrastructure|backend|service|component|page|integration|test",
      "priority": "critical|high|medium|low",
      "estimated_hours": 0,
      "dependencies": ["T-xxx"],
      "module": "string (módulo do sistema)",
      "acceptance_criteria": ["string"]
    }
  ],
  "execution_phases": [
    {"phase": 1, "label": "Infraestrutura & Config", "tasks": ["T-001"]},
    {"phase": 2, "label": "Backend & Schema", "tasks": ["T-002"]},
    {"phase": 3, "label": "Serviços & Hooks", "tasks": ["T-003"]},
    {"phase": 4, "label": "Componentes UI", "tasks": ["T-004"]},
    {"phase": 5, "label": "Páginas & Rotas", "tasks": ["T-005"]},
    {"phase": 6, "label": "Integração & Testes", "tasks": ["T-006"]}
  ],
  "total_estimated_hours": 0,
  "critical_path": ["T-001", "T-002"],
  "parallelizable_groups": [["T-003", "T-004"]]
}`,
        true,
      );

      // Normalize variant key names from AI
      normalizeTaskGraph(taskPlanner.result);

      await serviceClient.from("agent_outputs").insert({
        organization_id: ctx.organizationId, initiative_id: ctx.initiativeId,
        type: "analysis", status: "approved",
        summary: `Task Planner: ${(taskPlanner.result.task_graph as any[])?.length || 0} tarefas, ${(taskPlanner.result.execution_phases as any[])?.length || 0} fases`,
        raw_output: { agent: "task_planner", layer: 3, ...taskPlanner.result },
        model_used: taskPlanner.model, tokens_used: taskPlanner.tokens, cost_estimate: taskPlanner.costUsd,
      });

      // ──── Agent 10: Story Generator ────
      await pipelineLog(ctx, "agent_story_generator_start", "📖 Story Generator criando histórias executáveis...");
      const storyGen = await runAgent(
        apiKey,
        "story_generator",
        `Você é o Story Generator Agent — transforma tarefas em user stories com subtasks detalhadas para geração de código.
Cada subtask deve corresponder a UM arquivo de código real.

Stack Frontend: Vite + React + TypeScript + Tailwind CSS + shadcn/ui
Stack Backend: Supabase (PostgreSQL, Auth, Edge Functions, Storage, RLS)

REGRAS:
- file_type frontend: scaffold, component, page, style, config, hook, util, test, type, service
- file_type backend: schema, migration, edge_function, auth_config, seed, supabase_client
- A PRIMEIRA story DEVE ser "Scaffold do Projeto"
- Use paths relativos ao root (ex: src/components/Header.tsx)
- vercel.json: { "framework": "vite", "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
Retorne APENAS JSON válido.`,
        `${projectContext}

TASK GRAPH: ${JSON.stringify(taskPlanner.result, null, 2)}
MODELO DE DADOS: ${dataArchData}
API: ${apiArchData}

Gere stories executáveis:
{
  "stories": [
    {
      "title": "string",
      "description": "string",
      "priority": "critical|high|medium|low",
      "task_refs": ["T-001"],
      "phases": [
        {
          "name": "string",
          "subtasks": [
            {
              "description": "string (o que o arquivo faz)",
              "file_path": "string (caminho do arquivo)",
              "file_type": "string (tipo do arquivo)",
              "dependencies": ["file_path de arquivos que este depende"]
            }
          ]
        }
      ]
    }
  ],
  "total_files": 0,
  "backend_files": 0,
  "frontend_files": 0
}

Gere 3-10 stories cobrindo TODO o MVP. Cada subtask = 1 arquivo.`,
        true,
      );

      // Normalize story total_files — count from stories if missing
      if (!storyGen.result.total_files || storyGen.result.total_files === 0) {
        const storiesArr = (storyGen.result.stories as any[]) || [];
        let count = 0;
        for (const s of storiesArr) {
          for (const p of (s.phases || [])) { count += (p.subtasks || []).length; }
        }
        if (count > 0) storyGen.result.total_files = count;
      }

      await serviceClient.from("agent_outputs").insert({
        organization_id: ctx.organizationId, initiative_id: ctx.initiativeId,
        type: "analysis", status: "approved",
        summary: `Story Generator: ${(storyGen.result.stories as any[])?.length || 0} stories, ${storyGen.result.total_files || 0} arquivos`,
        raw_output: { agent: "story_generator", layer: 3, ...storyGen.result },
        model_used: storyGen.model, tokens_used: storyGen.tokens, cost_estimate: storyGen.costUsd,
      });

      // ──── Agent 11: File Planner ────
      await pipelineLog(ctx, "agent_file_planner_start", "🗂️ File Planner definindo árvore de arquivos final...");
      const filePlanner = await runAgent(
        apiKey,
        "file_planner",
        `Você é o File Planner Agent — define a árvore de arquivos final do projeto, validando completude e consistência. Retorne APENAS JSON válido.`,
        `${projectContext}

STORIES: ${JSON.stringify(storyGen.result, null, 2)}
ARQUITETURA DE SISTEMA: ${systemArchData}
MODELO DE DADOS: ${dataArchData}

Valide e defina a árvore completa de arquivos:
{
  "file_tree": [
    {
      "path": "string (ex: src/components/Header.tsx)",
      "type": "config|schema|type|service|hook|component|page|test|style|migration|edge_function|util",
      "layer": "infra|data|service|ui|test",
      "story_ref": "string (título da story que cria este arquivo)",
      "description": "string (responsabilidade do arquivo)",
      "exports": ["string (exports principais)"],
      "imports_from": ["string (paths de arquivos dos quais importa)"]
    }
  ],
  "directory_structure": {
    "src/": {"pages/": {}, "components/": {}, "hooks/": {}, "contexts/": {}, "services/": {}, "types/": {}, "utils/": {}, "lib/": {}},
    "supabase/": {"functions/": {}, "migrations/": {}},
    "public/": {}
  },
  "validation": {
    "orphan_files": ["arquivos sem referência"],
    "missing_imports": ["imports referenciados mas não criados"],
    "circular_dependencies": ["pares com dependência circular"],
    "completeness_score": 0,
    "issues": ["problemas encontrados"]
  },
  "generation_order": ["path em ordem de geração"],
  "total_files": 0
}`,
      );

      // Normalize file tree (may be nested object instead of array)
      normalizeFilePlanner(filePlanner.result);

      await serviceClient.from("agent_outputs").insert({
        organization_id: ctx.organizationId, initiative_id: ctx.initiativeId,
        type: "analysis", status: "approved",
        summary: `File Planner: ${(filePlanner.result.file_tree as any[])?.length || 0} arquivos, score: ${(filePlanner.result.validation as any)?.completeness_score || 0}`,
        raw_output: { agent: "file_planner", layer: 3, ...filePlanner.result },
        model_used: filePlanner.model, tokens_used: filePlanner.tokens, cost_estimate: filePlanner.costUsd,
      });

      // ──── Write planned files to Project Brain ────
      try {
        const fileTree = (filePlanner.result.file_tree as any[]) || [];
        const nodeIds: Record<string, string> = {};
        for (const f of fileTree.slice(0, 100)) {
          const nodeType = f.type === "page" ? "page" : f.type === "hook" ? "hook" : f.type === "service" ? "service" : f.type === "component" ? "component" : f.type === "type" ? "type" : f.type === "edge_function" ? "edge_function" : "file";
          const nodeId = await upsertNode(ctx, { node_type: nodeType as any, name: f.path.split("/").pop() || f.path, file_path: f.path, metadata: { layer: f.layer, description: f.description, exports: f.exports, source: "planning" }, status: "planned" });
          nodeIds[f.path] = nodeId;
        }
        for (const f of fileTree.slice(0, 100)) {
          const fromId = nodeIds[f.path];
          if (!fromId) continue;
          for (const imp of (f.imports_from || []).slice(0, 10)) {
            const toId = nodeIds[imp];
            if (toId) await addEdge(ctx, { source_node_id: fromId, target_node_id: toId, relation_type: "imports" });
          }
        }
      } catch (e) { console.error("Brain write error (planning):", e); }

      // ──── Persist stories to database ────
      const stories = (storyGen.result.stories as any[]) || [];
      const createdStories: any[] = [];
      let totalSubtasks = 0;
      let scaffoldFiles = 0;

      // Only delete old stories if we actually generated new ones — prevents data loss on AI failures
      if (stories.length > 0) {
        const { data: oldStories } = await serviceClient.from("stories").select("id").eq("initiative_id", ctx.initiativeId);
        if (oldStories?.length) {
          for (const s of oldStories) {
            await serviceClient.from("story_phases").delete().eq("story_id", s.id);
          }
          await serviceClient.from("stories").delete().eq("initiative_id", ctx.initiativeId);
        }
      } else {
        console.warn("[pipeline-planning] Story generator returned 0 stories — keeping existing stories");
      }

      for (const story of stories) {
        const { data: storyData } = await serviceClient.from("stories").insert({
          user_id: user.id, title: story.title, description: story.description,
          priority: story.priority || "medium", status: "todo",
          organization_id: ctx.organizationId,
          workspace_id: initiative.workspace_id, initiative_id: ctx.initiativeId,
        }).select("id").single();
        if (!storyData) continue;

        const storyFiles: string[] = [];
        for (let pi = 0; pi < (story.phases || []).length; pi++) {
          const phase = story.phases[pi];
          const { data: phaseData } = await serviceClient.from("story_phases").insert({
            story_id: storyData.id, name: phase.name, sort_order: pi,
          }).select("id").single();
          if (!phaseData) continue;

          for (let si = 0; si < (phase.subtasks || []).length; si++) {
            const st = phase.subtasks[si];
            const isObj = typeof st === "object" && st !== null;
            const description = isObj ? st.description : st;
            const filePath = isObj ? st.file_path : null;
            const fileType = isObj ? st.file_type : null;

            await serviceClient.from("story_subtasks").insert({
              phase_id: phaseData.id, description, sort_order: si,
              file_path: filePath || null, file_type: fileType || null,
            });
            totalSubtasks++;
            if (filePath) storyFiles.push(filePath);
            if (fileType === "scaffold" || fileType === "config") scaffoldFiles++;
          }
        }
        createdStories.push({ id: storyData.id, title: story.title, files: storyFiles });
      }

      // Generate PRD content
      const prdContent = [
        `# PRD — ${initiative.title}\n`,
        dp.vision?.problem_statement ? `## Problema\n${dp.vision.problem_statement}\n` : "",
        dp.vision?.value_proposition ? `## Proposta de Valor\n${dp.vision.value_proposition}\n` : "",
        dp.product_architecture?.prd?.executive_summary ? `## Resumo Executivo\n${dp.product_architecture.prd.executive_summary}\n` : "",
        dp.product_architecture?.prd?.solution_overview ? `## Solução\n${dp.product_architecture.prd.solution_overview}\n` : "",
        dp.requirements?.functional_requirements ? `## Requisitos Funcionais\n${(dp.requirements.functional_requirements as any[]).map((r: any) => `- [${r.id}] ${r.title}: ${r.description}`).join("\n")}\n` : "",
      ].filter(Boolean).join("\n");

      const totalTokens = taskPlanner.tokens + storyGen.tokens + filePlanner.tokens;
      const totalCost = taskPlanner.costUsd + storyGen.costUsd + filePlanner.costUsd;

      await updateInitiative(ctx, {
        stage_status: "planned",
        prd_content: prdContent.slice(0, 5000) || initiative.prd_content,
        discovery_payload: {
          ...dp,
          task_graph: taskPlanner.result,
          stories_plan: storyGen.result,
          file_tree: filePlanner.result,
          layer3_agents_used: ["task_planner", "story_generator", "file_planner"],
          layer3_total_tokens: totalTokens,
          layer3_total_cost_usd: totalCost,
        },
      });

      // Add Layer 3 agents to squad
      const { data: squad } = await serviceClient.from("squads").select("id")
        .eq("initiative_id", ctx.initiativeId).order("created_at", { ascending: false }).limit(1).single();
      if (squad) {
        const layer3Roles = [
          { name: "Task Planner", role: "task_planner", desc: "Decompõe arquitetura em tarefas executáveis com dependências" },
          { name: "Story Generator", role: "story_generator", desc: "Transforma tarefas em user stories com subtasks por arquivo" },
          { name: "File Planner", role: "file_planner", desc: "Define e valida a árvore completa de arquivos do projeto" },
        ];
        for (const ag of layer3Roles) {
          const { data: agent } = await serviceClient.from("agents").insert({
            user_id: user.id, name: ag.name, role: ag.role as any,
            description: ag.desc, organization_id: ctx.organizationId,
            workspace_id: initiative.workspace_id, status: "active",
          }).select("id").single();
          if (agent) await serviceClient.from("squad_members").insert({ squad_id: squad.id, agent_id: agent.id, role_in_squad: ag.role });
        }
      }

      if (jobId) await completeJob(ctx, jobId, {
        task_graph: taskPlanner.result, stories: storyGen.result, file_tree: filePlanner.result,
        stories_created: createdStories.length, total_subtasks: totalSubtasks,
        total_tokens: totalTokens, total_cost_usd: totalCost,
      }, { model: taskPlanner.model, costUsd: totalCost, durationMs: taskPlanner.durationMs + storyGen.durationMs + filePlanner.durationMs });

      await pipelineLog(ctx, "pipeline_planning_complete",
        `Camada 3 concluída: 3 agentes, ${createdStories.length} stories, ${totalSubtasks} subtasks, ${totalTokens} tokens`,
        { tokens: totalTokens, cost_usd: totalCost }
      );
    } catch (e) {
      console.error("Background planning error:", e);
      if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
      await updateInitiative(ctx, { stage_status: "planning_ready" });
    }
  };

  // Schedule background work and return immediately
  EdgeRuntime.waitUntil(backgroundWork());

  return jsonResponse({
    success: true,
    status: "processing",
    message: "Planning started in background. Monitor progress via job status.",
    job_id: jobId,
  });
});
