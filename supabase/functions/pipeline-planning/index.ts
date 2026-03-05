import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-planning");
  if (result instanceof Response) return result;
  const { user, initiative, ctx, serviceClient, apiKey } = result;

  const dp = initiative.discovery_payload || {};
  const jobId = await createJob(ctx, "planning", { title: initiative.title });
  await updateInitiative(ctx, { stage_status: "planning" });
  await pipelineLog(ctx, "pipeline_planning_start", "Iniciando formalização técnica com geração de código...");

  try {
    const context = `Projeto: ${initiative.title}
Ideia refinada: ${dp.refined_idea || initiative.refined_idea || ""}
Modelo de Negócio: ${dp.business_model || initiative.business_model || "N/A"}
MVP: ${dp.mvp_scope || initiative.mvp_scope || "N/A"}
Stack Frontend: Vite + React + TypeScript + Tailwind CSS + shadcn/ui
Stack Backend (quando necessário): Supabase (Postgres, Auth, Edge Functions, Storage, RLS)
Visão Estratégica: ${dp.strategic_vision || "N/A"}
${dp.reference_url ? `URL de Referência: ${dp.reference_url}` : ""}
${dp.reference_scraped ? "NOTA: O conteúdo do site de referência foi analisado durante o Discovery. Use as conclusões do Discovery para guiar o planejamento." : ""}`;

    // Step 1: PRD
    const prdResult = await callAI(
      apiKey,
      `Você é um Product Manager sênior. Crie um PRD detalhado e executável em português brasileiro usando markdown.

IMPORTANTE: Analise se o projeto necessita de backend (banco de dados, autenticação, APIs, storage de arquivos). Se sim, inclua isso explicitamente nos requisitos. A maioria dos projetos reais precisa de persistência de dados.`,
      `${context}\n\nCrie um PRD completo incluindo:\n## Visão Geral\n## Problema a Resolver\n## Personas e Casos de Uso\n## Requisitos Funcionais\n## Requisitos Não-Funcionais (incluir requisitos de backend se aplicável)\n## Necessidades de Backend\nAnalise e liste: banco de dados (tabelas/entidades), autenticação (login/signup), storage (uploads), APIs/integrações externas. Se o projeto NÃO precisa de backend, justifique.\n## Critérios de Aceite\n## Dependências Técnicas\n## Métricas de Sucesso\n## Riscos e Mitigações`
    );
    await updateInitiative(ctx, { prd_content: prdResult.content });

    // Step 2: Architecture
    const archResult = await callAI(
      apiKey,
      `Você é um Arquiteto de Software sênior. Crie um documento de arquitetura técnica baseado no PRD.

Stack Frontend OBRIGATÓRIA: Vite + React + TypeScript + Tailwind CSS + shadcn/ui
Stack Backend (quando o PRD indicar necessidade): Supabase
- Banco de dados: PostgreSQL via Supabase (tabelas no schema public)
- Autenticação: Supabase Auth (email/password, OAuth)
- Edge Functions: Deno/TypeScript (para lógica de servidor, APIs externas)
- Storage: Supabase Storage (para uploads de arquivos)
- Segurança: Row Level Security (RLS) obrigatória em todas as tabelas

REGRA OBRIGATÓRIA DE NOMENCLATURA DE TABELAS:
- Todas as tabelas DEVEM ter um prefixo curto derivado do nome do projeto (ex: projeto "TaskFlow" → prefixo "tf_", projeto "MedAgenda" → prefixo "ma_")
- Use CREATE TABLE IF NOT EXISTS para idempotência
- Exemplos: tf_users, tf_tasks, tf_categories, ma_patients, ma_appointments
- O prefixo deve ser consistente em TODAS as tabelas do projeto
- Defina o prefixo escolhido no início do documento de arquitetura
- Client SDK: @supabase/supabase-js

Use markdown.`,
      `PRD:\n${prdResult.content.slice(0, 6000)}\n\nCrie a arquitetura incluindo:\n## Stack Tecnológica Final\n(Frontend + Backend se necessário)\n## Estrutura de Diretórios do Projeto\n(Incluir pasta supabase/ se houver backend)\n## Componentes Principais (com file paths)\n## Modelo de Dados (SQL)\nSe o projeto precisa de banco, defina as tabelas SQL com CREATE TABLE, tipos, constraints e políticas RLS.\n## Edge Functions\nSe o projeto precisa de APIs ou lógica de servidor, liste as edge functions necessárias.\n## Autenticação\nSe o projeto precisa de auth, defina o fluxo (signup, login, proteção de rotas).\n## APIs e Contratos\n## Roteamento (React Router)\n## Segurança (RLS, validação)\n## Plano de Deploy`
    );
    await updateInitiative(ctx, { architecture_content: archResult.content });

    // Step 3: Generate code-aware stories with file paths
    const storiesResult = await callAI(
      apiKey,
      `Você é um Product Manager e Arquiteto sênior especializado em projetos Full-Stack com Vite + React + TypeScript + Tailwind + Supabase.
Gere user stories executáveis onde CADA SUBTASK corresponde a UM ARQUIVO de código real.
Retorne APENAS JSON válido.

IMPORTANTE:
- Cada subtask DEVE ter um file_path (caminho do arquivo no projeto)
- Cada subtask DEVE ter um file_type (tipo do arquivo)
- A primeira story DEVE ser "Scaffold do Projeto" com os arquivos base
- file_type para FRONTEND: scaffold, component, page, style, config, hook, util, test, type
- file_type para BACKEND: schema, migration, edge_function, auth_config, seed, supabase_client
- Subtasks de scaffold incluem: package.json, vite.config.ts, tsconfig.json, tailwind.config.ts, index.html, src/main.tsx, src/App.tsx, src/index.css, vercel.json, public/_redirects
- vercel.json DEVE conter: { "framework": "vite", "installCommand": "rm -f package-lock.json && npm install --include=dev", "buildCommand": "npm run build", "outputDirectory": "dist", "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
- public/_redirects DEVE conter: /* /index.html 200  (para Netlify)
- Use paths relativos ao root do projeto (ex: src/components/Header.tsx)

BACKEND COM SUPABASE (quando o PRD/Arquitetura indicar necessidade):
- Se o projeto precisa de banco de dados, CRIE uma story "Backend Setup" LOGO APÓS o Scaffold
- REGRA DE PREFIXO: Todas as tabelas DEVEM ter prefixo curto do projeto (ex: "tf_" para TaskFlow). Use CREATE TABLE IF NOT EXISTS.`,
      `Projeto: ${initiative.title}

PRD (resumo):
${prdResult.content.slice(0, 3000)}

Arquitetura (resumo):
${archResult.content.slice(0, 3000)}

Gere as stories no formato JSON. A PRIMEIRA story obrigatoriamente deve ser o scaffold do projeto base.

JSON esperado:
{
  "stories": [
    {
      "title": "Scaffold do Projeto",
      "description": "Configuração inicial do projeto Vite + React + TypeScript + Tailwind",
      "priority": "critical",
      "phases": [
        {
          "name": "Configuração Base",
          "subtasks": [
            {
              "description": "Criar package.json com dependências",
              "file_path": "package.json",
              "file_type": "config"
            }
          ]
        }
      ]
    }
  ]
}

Gere entre 3-8 stories cobrindo TODO o MVP. Cada subtask = 1 arquivo.`,
      true
    );
    const { stories } = JSON.parse(storiesResult.content);

    const createdStories: any[] = [];
    let totalSubtasks = 0;
    let scaffoldFiles = 0;

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

        if (phaseData) {
          const subtasks = phase.subtasks || [];
          for (let si = 0; si < subtasks.length; si++) {
            const st = subtasks[si];
            const isObject = typeof st === "object" && st !== null;
            const description = isObject ? st.description : st;
            const filePath = isObject ? st.file_path : null;
            const fileType = isObject ? st.file_type : null;

            await serviceClient.from("story_subtasks").insert({
              phase_id: phaseData.id, description, sort_order: si,
              file_path: filePath || null, file_type: fileType || null,
            });

            totalSubtasks++;
            if (filePath) storyFiles.push(filePath);
            if (fileType === "scaffold" || fileType === "config") scaffoldFiles++;
          }
        }
      }
      createdStories.push({ id: storyData.id, title: story.title, files: storyFiles });
    }

    await updateInitiative(ctx, { stage_status: "planned" });
    const totalTokens = prdResult.tokens + archResult.tokens + storiesResult.tokens;
    const totalCost = prdResult.costUsd + archResult.costUsd + storiesResult.costUsd;
    if (jobId) await completeJob(ctx, jobId, {
      stories_count: createdStories.length, total_subtasks: totalSubtasks, scaffold_files: scaffoldFiles, total_tokens: totalTokens,
    }, { model: "google/gemini-2.5-flash", costUsd: totalCost, durationMs: prdResult.durationMs + archResult.durationMs + storiesResult.durationMs });
    await pipelineLog(ctx, "pipeline_planning_complete", `Planning completo: ${createdStories.length} stories, ${totalSubtasks} subtasks (${scaffoldFiles} scaffold)`, { totalTokens, cost_usd: totalCost });

    return jsonResponse({
      success: true, stories: createdStories, total_subtasks: totalSubtasks,
      scaffold_files: scaffoldFiles, tokens: totalTokens, job_id: jobId,
    });
  } catch (e) {
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    await updateInitiative(ctx, { stage_status: "squad_formed" });
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
