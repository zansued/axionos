// Layer 2 — Technical Architecture
// Orchestrates: System Architect → Data Architect → API Architect → Dependency Planner
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { generateBrainContext, upsertNode, addEdge, recordDecision } from "../_shared/brain-helpers.ts";

interface AgentOutput {
  role: string;
  model: string;
  tokens: number;
  costUsd: number;
  durationMs: number;
  result: Record<string, unknown>;
}

async function runAgent(
  apiKey: string,
  role: string,
  systemPrompt: string,
  userPrompt: string,
  usePro = false,
): Promise<AgentOutput> {
  const aiResult = await callAI(apiKey, systemPrompt, userPrompt, true, 3, usePro);
  const result = JSON.parse(aiResult.content);
  return { role, model: aiResult.model, tokens: aiResult.tokens, costUsd: aiResult.costUsd, durationMs: aiResult.durationMs, result };
}

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-architecture");
  if (result instanceof Response) return result;
  const { user, initiative, ctx, serviceClient, apiKey } = result;

  const dp = initiative.discovery_payload || {};
  const jobId = await createJob(ctx, "architecture", {
    title: initiative.title,
    complexity: initiative.complexity,
    suggested_stack: initiative.suggested_stack,
  });
  await updateInitiative(ctx, { stage_status: "architecting" });
  await pipelineLog(ctx, "pipeline_architecture_start", "Camada 2 — Arquitetura Técnica iniciada (4 agentes)");

  try {
    // Brain context from previous layers
    const brainContext = await generateBrainContext(ctx);
    const brainBlock = brainContext ? `\n\n${brainContext}` : "";

    const projectContext = `Projeto: ${initiative.title}
Ideia refinada: ${initiative.refined_idea || initiative.description || ""}
Complexidade: ${initiative.complexity || "medium"}
Stack sugerida: ${initiative.suggested_stack || "React + Supabase"}
MVP: ${initiative.mvp_scope || "A definir"}
Público-alvo: ${initiative.target_user || "A definir"}${brainBlock}`;

    const requirementsData = dp.requirements ? JSON.stringify(dp.requirements, null, 2) : "Não disponível";
    const productArchData = dp.product_architecture ? JSON.stringify(dp.product_architecture, null, 2) : "Não disponível";

    // ──── Agent 5: System Architect ────
    await pipelineLog(ctx, "agent_system_architect_start", "🏛️ System Architect definindo stack e estrutura...");
    const systemArch = await runAgent(
      apiKey,
      "system_architect",
      `Você é o System Architect Agent — especialista em arquitetura de sistemas. Define stack, camadas e estrutura do projeto. Retorne APENAS JSON válido.`,
      `${projectContext}

REQUISITOS: ${requirementsData}
ARQUITETURA DE PRODUTO: ${productArchData}

Defina a arquitetura técnica do sistema:
{
  "stack": {
    "frontend": {"framework": "string", "language": "string", "styling": "string", "state_management": "string", "routing": "string"},
    "backend": {"type": "string (BaaS|API|serverless)", "platform": "string", "language": "string"},
    "database": {"type": "string", "provider": "string"},
    "auth": {"method": "string", "provider": "string"},
    "storage": {"provider": "string", "use_cases": ["string"]},
    "hosting": {"frontend": "string", "backend": "string"},
    "ci_cd": "string"
  },
  "layers": [
    {"name": "string", "responsibility": "string", "technologies": ["string"]}
  ],
  "project_structure": {
    "root_dirs": ["src/", "public/", "supabase/"],
    "src_structure": {
      "pages": "Páginas/rotas da aplicação",
      "components": "Componentes reutilizáveis",
      "hooks": "Custom hooks",
      "contexts": "Context providers",
      "services": "Serviços e API clients",
      "utils": "Utilitários",
      "types": "Tipos TypeScript"
    }
  },
  "architecture_patterns": ["string (ex: MVC, Clean Architecture, Feature-based)"],
  "scalability_considerations": ["string"],
  "security_measures": ["string"],
  "justification": "Por que essa stack é a melhor escolha para este projeto"
}`,
      true,
    );

    await serviceClient.from("agent_outputs").insert({
      organization_id: ctx.organizationId, initiative_id: ctx.initiativeId,
      type: "analysis", status: "approved",
      summary: `System Architect: ${systemArch.result.stack ? JSON.stringify((systemArch.result.stack as any).frontend?.framework) : ""}`.slice(0, 200),
      raw_output: { agent: "system_architect", layer: 2, ...systemArch.result },
      model_used: systemArch.model, tokens_used: systemArch.tokens, cost_estimate: systemArch.costUsd,
    });

    // ──── Agent 6: Data Architect ────
    await pipelineLog(ctx, "agent_data_architect_start", "🗃️ Data Architect modelando banco de dados...");
    const dataArch = await runAgent(
      apiKey,
      "data_architect",
      `Você é o Data Architect Agent — especialista em modelagem de dados e banco de dados. Use a arquitetura de sistema definida anteriormente. Retorne APENAS JSON válido.`,
      `${projectContext}

REQUISITOS: ${requirementsData}
ARQUITETURA DE SISTEMA: ${JSON.stringify(systemArch.result, null, 2)}

Modele o banco de dados completo:
{
  "tables": [
    {
      "name": "string",
      "description": "string",
      "columns": [
        {"name": "string", "type": "string (uuid|text|integer|boolean|timestamp|jsonb|etc)", "nullable": false, "default": "string|null", "description": "string"}
      ],
      "primary_key": "string",
      "indexes": [{"columns": ["string"], "unique": false, "name": "string"}],
      "rls_policies": [
        {"name": "string", "command": "SELECT|INSERT|UPDATE|DELETE|ALL", "using": "string (SQL expression)", "with_check": "string|null"}
      ]
    }
  ],
  "relationships": [
    {"from_table": "string", "from_column": "string", "to_table": "string", "to_column": "string", "type": "one-to-one|one-to-many|many-to-many", "on_delete": "CASCADE|SET NULL|RESTRICT"}
  ],
  "enums": [
    {"name": "string", "values": ["string"]}
  ],
  "functions": [
    {"name": "string", "description": "string", "returns": "string", "security": "definer|invoker"}
  ],
  "storage_buckets": [
    {"name": "string", "public": false, "file_types": ["string"], "max_size_mb": 10}
  ],
  "migration_strategy": "Estratégia de migração e seed data"
}`,
      true,
    );

    await serviceClient.from("agent_outputs").insert({
      organization_id: ctx.organizationId, initiative_id: ctx.initiativeId,
      type: "analysis", status: "approved",
      summary: `Data Architect: ${(dataArch.result.tables as any[])?.length || 0} tabelas, ${(dataArch.result.relationships as any[])?.length || 0} relacionamentos`,
      raw_output: { agent: "data_architect", layer: 2, ...dataArch.result },
      model_used: dataArch.model, tokens_used: dataArch.tokens, cost_estimate: dataArch.costUsd,
    });

    // ──── Agent 7: API Architect ────
    await pipelineLog(ctx, "agent_api_architect_start", "🔌 API Architect definindo contratos...");
    const apiArch = await runAgent(
      apiKey,
      "api_architect",
      `Você é o API Architect Agent — especialista em design de APIs. Defina os contratos de API completos baseados na arquitetura e dados. Retorne APENAS JSON válido.`,
      `${projectContext}

ARQUITETURA DE SISTEMA: ${JSON.stringify(systemArch.result, null, 2)}
MODELO DE DADOS: ${JSON.stringify(dataArch.result, null, 2)}

Defina os contratos de API:
{
  "api_style": "REST|GraphQL|RPC",
  "base_url": "string",
  "auth_strategy": {"type": "JWT|API Key|OAuth", "header": "string", "flow": "string"},
  "endpoints": [
    {
      "method": "GET|POST|PUT|PATCH|DELETE",
      "path": "string",
      "description": "string",
      "auth_required": true,
      "request_body": {"type": "object", "properties": {}},
      "response": {"status": 200, "body": {"type": "object", "properties": {}}},
      "errors": [{"status": 400, "description": "string"}],
      "rate_limit": "string|null"
    }
  ],
  "edge_functions": [
    {"name": "string", "description": "string", "trigger": "HTTP|Webhook|Cron", "auth": true}
  ],
  "realtime_channels": [
    {"name": "string", "table": "string", "events": ["INSERT|UPDATE|DELETE"], "filter": "string|null"}
  ],
  "webhooks": [
    {"event": "string", "url": "string", "payload": {}}
  ],
  "versioning_strategy": "URL path|Header|Query param"
}`,
    );

    await serviceClient.from("agent_outputs").insert({
      organization_id: ctx.organizationId, initiative_id: ctx.initiativeId,
      type: "analysis", status: "approved",
      summary: `API Architect: ${(apiArch.result.endpoints as any[])?.length || 0} endpoints, ${(apiArch.result.edge_functions as any[])?.length || 0} edge functions`,
      raw_output: { agent: "api_architect", layer: 2, ...apiArch.result },
      model_used: apiArch.model, tokens_used: apiArch.tokens, cost_estimate: apiArch.costUsd,
    });

    // ──── Agent 8: Dependency Planner ────
    await pipelineLog(ctx, "agent_dependency_planner_start", "🔗 Dependency Planner criando grafo de dependências...");
    const depPlanner = await runAgent(
      apiKey,
      "dependency_planner",
      `Você é o Dependency Planner Agent — especialista em análise de dependências e ordem de geração. Crie o grafo de dependências do projeto. Retorne APENAS JSON válido.`,
      `${projectContext}

ARQUITETURA DE SISTEMA: ${JSON.stringify(systemArch.result, null, 2)}
MODELO DE DADOS: ${JSON.stringify(dataArch.result, null, 2)}
CONTRATOS DE API: ${JSON.stringify(apiArch.result, null, 2)}

Crie o grafo de dependências para geração de código:
{
  "dependency_graph": {
    "nodes": [
      {"id": "string (file path or module)", "type": "config|schema|type|service|hook|component|page|test", "layer": "infra|data|service|ui|test", "description": "string"}
    ],
    "edges": [
      {"from": "string (node id)", "to": "string (node id)", "type": "imports|extends|uses|configures"}
    ]
  },
  "generation_order": [
    {"phase": 1, "label": "Infraestrutura", "files": ["string"], "parallel": true},
    {"phase": 2, "label": "Schema & Types", "files": ["string"], "parallel": true},
    {"phase": 3, "label": "Services & Hooks", "files": ["string"], "parallel": false},
    {"phase": 4, "label": "Components", "files": ["string"], "parallel": true},
    {"phase": 5, "label": "Pages & Routes", "files": ["string"], "parallel": false},
    {"phase": 6, "label": "Tests & Validation", "files": ["string"], "parallel": true}
  ],
  "npm_dependencies": [
    {"package": "string", "version": "string", "dev": false, "justification": "string"}
  ],
  "critical_path": ["string (file paths in execution order)"],
  "risk_areas": [
    {"area": "string", "risk": "low|medium|high", "mitigation": "string"}
  ],
  "estimated_files_count": 0,
  "estimated_generation_phases": 0
}`,
      true,
    );

    await serviceClient.from("agent_outputs").insert({
      organization_id: ctx.organizationId, initiative_id: ctx.initiativeId,
      type: "analysis", status: "approved",
      summary: `Dependency Planner: ${(depPlanner.result.dependency_graph as any)?.nodes?.length || 0} nós, ${(depPlanner.result.generation_order as any[])?.length || 0} fases`,
      raw_output: { agent: "dependency_planner", layer: 2, ...depPlanner.result },
      model_used: depPlanner.model, tokens_used: depPlanner.tokens, cost_estimate: depPlanner.costUsd,
    });

    // ──── Write to Project Brain ────
    try {
      // Record tables as nodes
      const tables = (dataArch.result.tables as any[]) || [];
      const tableNodeIds: Record<string, string> = {};
      for (const t of tables.slice(0, 30)) {
        const nodeId = await upsertNode(ctx, { node_type: "table", name: t.name, metadata: { columns: t.columns?.length, description: t.description, source: "architecture" }, status: "planned" });
        tableNodeIds[t.name] = nodeId;
      }
      // Record relationships as edges
      const rels = (dataArch.result.relationships as any[]) || [];
      for (const rel of rels.slice(0, 50)) {
        const fromId = tableNodeIds[rel.from_table];
        const toId = tableNodeIds[rel.to_table];
        if (fromId && toId) await addEdge(ctx, { source_node_id: fromId, target_node_id: toId, relation_type: "stores_in_table", metadata: { type: rel.type, on_delete: rel.on_delete } });
      }
      // Record API endpoints as nodes
      const endpoints = (apiArch.result.endpoints as any[]) || [];
      for (const ep of endpoints.slice(0, 30)) {
        await upsertNode(ctx, { node_type: "api", name: `${ep.method} ${ep.path}`, metadata: { description: ep.description, auth_required: ep.auth_required, source: "architecture" }, status: "planned" });
      }
      // Record edge functions as nodes
      const edgeFns = (apiArch.result.edge_functions as any[]) || [];
      for (const fn of edgeFns.slice(0, 20)) {
        await upsertNode(ctx, { node_type: "edge_function", name: fn.name, metadata: { description: fn.description, trigger: fn.trigger, source: "architecture" }, status: "planned" });
      }
      // Record architecture decisions
      for (const pattern of ((systemArch.result.architecture_patterns as string[]) || []).slice(0, 5)) {
        await recordDecision(ctx, `Padrão: ${pattern}`, "Definido pelo System Architect", "medium", "architecture");
      }
      if (systemArch.result.justification) {
        await recordDecision(ctx, `Stack justification: ${(systemArch.result.justification as string).slice(0, 200)}`, "System Architect", "high", "architecture");
      }
    } catch (e) { console.error("Brain write error (architecture):", e); }

    // ──── Consolidate ────
    const totalTokens = systemArch.tokens + dataArch.tokens + apiArch.tokens + depPlanner.tokens;
    const totalCost = systemArch.costUsd + dataArch.costUsd + apiArch.costUsd + depPlanner.costUsd;

    // Save architecture content
    const archContent = [
      "# Arquitetura Técnica\n",
      `## Stack\n${JSON.stringify(systemArch.result.stack, null, 2)}\n`,
      `## Padrões\n${(systemArch.result.architecture_patterns as string[])?.join(", ") || ""}\n`,
      `## Banco de Dados\n${(dataArch.result.tables as any[])?.map((t: any) => `- ${t.name}: ${t.description}`).join("\n") || ""}\n`,
      `## API\n${(apiArch.result.endpoints as any[])?.map((e: any) => `- ${e.method} ${e.path}: ${e.description}`).join("\n") || ""}\n`,
    ].join("\n");

    await updateInitiative(ctx, {
      stage_status: "architected",
      architecture_content: archContent.slice(0, 2000),
      suggested_stack: (systemArch.result.justification as string)?.slice(0, 200) || initiative.suggested_stack,
      discovery_payload: {
        ...dp,
        system_architecture: systemArch.result,
        data_architecture: dataArch.result,
        api_architecture: apiArch.result,
        dependency_graph: depPlanner.result,
        layer2_agents_used: ["system_architect", "data_architect", "api_architect", "dependency_planner"],
        layer2_total_tokens: totalTokens,
        layer2_total_cost_usd: totalCost,
      },
    });

    // Add Layer 2 agents to squad
    const { data: existingSquad } = await serviceClient
      .from("squads").select("id")
      .eq("initiative_id", ctx.initiativeId)
      .order("created_at", { ascending: false })
      .limit(1).single();

    const squadId = existingSquad?.id;
    if (squadId) {
      const layer2Roles = [
        { name: "System Architect", role: "system_architect", desc: "Define stack, camadas e estrutura do projeto" },
        { name: "Data Architect", role: "data_architect", desc: "Modela banco de dados, tabelas, RLS e relacionamentos" },
        { name: "API Architect", role: "api_architect", desc: "Define contratos de API, endpoints e integrações" },
        { name: "Dependency Planner", role: "dependency_planner", desc: "Cria grafo de dependências e ordem de geração" },
      ];
      for (const ag of layer2Roles) {
        const { data: agent } = await serviceClient.from("agents").insert({
          user_id: user.id, name: ag.name, role: ag.role as any,
          description: ag.desc, organization_id: ctx.organizationId,
          workspace_id: initiative.workspace_id, status: "active",
        }).select("id").single();
        if (agent) {
          await serviceClient.from("squad_members").insert({ squad_id: squadId, agent_id: agent.id, role_in_squad: ag.role });
        }
      }
    }

    if (jobId) await completeJob(ctx, jobId, {
      system_architecture: systemArch.result,
      data_architecture: dataArch.result,
      api_architecture: apiArch.result,
      dependency_graph: depPlanner.result,
      total_tokens: totalTokens,
      total_cost_usd: totalCost,
    }, { model: systemArch.model, costUsd: totalCost, durationMs: systemArch.durationMs + dataArch.durationMs + apiArch.durationMs + depPlanner.durationMs });

    await pipelineLog(ctx, "pipeline_architecture_complete",
      `Camada 2 concluída: 4 agentes, ${totalTokens} tokens, $${totalCost.toFixed(4)}`,
      { tokens: totalTokens, cost_usd: totalCost }
    );

    // ── Trigger Architecture Simulation (next stage) ──
    await pipelineLog(ctx, "pipeline_architecture_simulation_queued",
      "🌀 Architecture Simulation queued as next stage");

    return jsonResponse({
      success: true,
      agents_executed: 4,
      layers_completed: [2],
      next_stage: "architecture_simulation",
      system_architecture: systemArch.result,
      data_architecture: dataArch.result,
      api_architecture: apiArch.result,
      dependency_graph: depPlanner.result,
      total_tokens: totalTokens,
      total_cost_usd: totalCost,
      job_id: jobId,
    });
  } catch (e) {
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    await updateInitiative(ctx, { stage_status: "architecture_ready" });
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
