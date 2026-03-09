import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { enforceUsageLimits } from "../_shared/usage-limit-enforcer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEPLOY_VERCEL_CONFIG = {
  framework: "vite",
  installCommand: "rm -f package-lock.json && npm install --include=dev",
  buildCommand: "npm run build",
  outputDirectory: "dist",
  rewrites: [{ source: "/(.*)", destination: "/index.html" }],
};
const DEPLOY_VERCEL_JSON = JSON.stringify(DEPLOY_VERCEL_CONFIG, null, 2);

async function callAI(apiKey: string, systemPrompt: string, userPrompt: string, jsonMode = false, maxRetries = 3) {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
  
  // Provider priority: OpenAI > DeepSeek > Lovable Gateway (no Gemini)
  const useOpenAI = !!OPENAI_API_KEY;
  const useDeepSeek = !useOpenAI && !!DEEPSEEK_API_KEY;
  const aiUrl = useOpenAI
    ? "https://api.openai.com/v1/chat/completions"
    : useDeepSeek
    ? "https://api.deepseek.com/v1/chat/completions"
    : "https://ai.gateway.lovable.dev/v1/chat/completions";
  const aiKey = useOpenAI ? OPENAI_API_KEY : useDeepSeek ? DEEPSEEK_API_KEY : apiKey;
  const aiModel = useOpenAI ? "gpt-4o-mini" : useDeepSeek ? "deepseek-chat" : "openai/gpt-5-nano";

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const start = Date.now();
      const body: any = {
        model: aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      };
      if (jsonMode) body.response_format = { type: "json_object" };

      const resp = await fetch(aiUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (resp.status === 429 || resp.status >= 500) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 15000) + Math.random() * 1000;
        console.warn(`AI ${resp.status}, retry ${attempt + 1}/${maxRetries} after ${Math.round(backoffMs)}ms`);
        await new Promise(r => setTimeout(r, backoffMs));
        lastError = new Error(`AI error ${resp.status}`);
        continue;
      }

      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`AI error ${resp.status}: ${t}`);
      }
      const data = await resp.json();
      const durationMs = Date.now() - start;
      const tokens = data.usage?.total_tokens || 0;
      // OpenAI gpt-4o-mini pricing: ~$0.15/1M input + $0.60/1M output, rough avg ~$0.40/1M
      const costUsd = useOpenAI ? tokens * 0.0000004 : tokens * 0.000001;
      return { content: data.choices?.[0]?.message?.content || "", tokens, durationMs, costUsd, model: aiModel };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < maxRetries - 1) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 15000) + Math.random() * 1000;
        console.warn(`callAI error, retry ${attempt + 1}/${maxRetries} after ${Math.round(backoffMs)}ms:`, lastError.message);
        await new Promise(r => setTimeout(r, backoffMs));
      }
    }
  }
  throw lastError || new Error("callAI failed after retries");
}

function pickAgent(description: string, agentsByRole: Record<string, any>, fallback: any) {
  const lower = description.toLowerCase();
  if (/arquitetura|design|padr[ãa]o|diagrama|componente/i.test(lower) && agentsByRole["architect"]) return agentsByRole["architect"];
  if (/teste|qa|qualidade|validar|cenário/i.test(lower) && agentsByRole["qa"]) return agentsByRole["qa"];
  if (/deploy|ci\/cd|infra|docker|pipeline/i.test(lower) && agentsByRole["devops"]) return agentsByRole["devops"];
  if (/ux|interface|usabilidade|layout|wireframe/i.test(lower) && agentsByRole["ux_expert"]) return agentsByRole["ux_expert"];
  if (/requisito|análise|negócio|stakeholder/i.test(lower) && agentsByRole["analyst"]) return agentsByRole["analyst"];
  if (/história|prioridade|backlog|aceite/i.test(lower) && agentsByRole["po"]) return agentsByRole["po"];
  if (/sprint|cerimônia|impedimento|equipe/i.test(lower) && agentsByRole["sm"]) return agentsByRole["sm"];
  if (/código|implementar|api|endpoint|função|banco/i.test(lower) && agentsByRole["dev"]) return agentsByRole["dev"];
  return fallback;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { allowed } = await checkRateLimit(user.id, "run-initiative-pipeline");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reqBody = await req.json();
    const { initiativeId, stage, comment, github_token, owner, repo, base_branch, modification } = reqBody;
    if (!initiativeId || !stage) throw new Error("initiativeId and stage are required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { data: initiative, error: initErr } = await serviceClient
      .from("initiatives").select("*").eq("id", initiativeId).single();
    if (initErr || !initiative) throw new Error("Initiative not found");

    // ── Usage limit enforcement ──
    const usageCheck = await enforceUsageLimits(serviceClient, initiative.organization_id);
    if (!usageCheck.allowed) {
      await serviceClient.from("audit_logs").insert({
        user_id: user.id, action: "usage_limit_blocked", category: "billing",
        entity_type: "initiatives", entity_id: initiativeId,
        message: usageCheck.reason || "Usage limit exceeded", severity: "warning",
        organization_id: initiative.organization_id,
        metadata: { error_code: usageCheck.error_code, current: usageCheck.current, limits: usageCheck.limits },
      });
      return new Response(JSON.stringify({
        error: usageCheck.reason, error_code: usageCheck.error_code,
        current: usageCheck.current, limits: usageCheck.limits,
      }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const log = async (action: string, message: string, meta: any = {}) => {
      await serviceClient.from("audit_logs").insert({
        user_id: user.id, action, category: "pipeline", entity_type: "initiatives",
        entity_id: initiativeId, message, severity: "info",
        organization_id: initiative.organization_id, metadata: meta,
      });
    };

    const updateInit = async (fields: any) => {
      await serviceClient.from("initiatives").update(fields).eq("id", initiativeId);
    };

    const createJob = async (jobStage: string, inputs: any) => {
      const { data } = await serviceClient.from("initiative_jobs").insert({
        initiative_id: initiativeId, stage: jobStage, status: "running", inputs, user_id: user.id,
      }).select("id").single();
      return data?.id;
    };

    const completeJob = async (jobId: string, outputs: any, result: any) => {
      await serviceClient.from("initiative_jobs").update({
        status: "success", outputs, model: result.model, cost_usd: result.costUsd,
        duration_ms: result.durationMs, completed_at: new Date().toISOString(),
      }).eq("id", jobId);
    };

    const failJob = async (jobId: string, error: string) => {
      await serviceClient.from("initiative_jobs").update({
        status: "failed", error, completed_at: new Date().toISOString(),
      }).eq("id", jobId);
    };

    // ========== STAGE 1: DISCOVERY ==========
    if (stage === "discovery") {
      const jobId = await createJob("discovery", { title: initiative.title, description: initiative.description, reference_url: initiative.reference_url });
      await updateInit({ stage_status: "discovering" });
      await log("pipeline_discovery_start", "Iniciando descoberta inteligente...");

      try {
        // Scrape reference URL if provided
        let referenceContent = "";
        if (initiative.reference_url) {
          // Prefer self-hosted Firecrawl, fallback to cloud
          const selfHostedUrl = Deno.env.get("FIRECRAWL_SELF_HOSTED_URL");
          const selfHostedKey = Deno.env.get("FIRECRAWL_SELF_HOSTED_KEY");
          const cloudKey = Deno.env.get("FIRECRAWL_API_KEY");

          const firecrawlBaseUrl = selfHostedUrl || "https://api.firecrawl.dev";
          const firecrawlApiKey = selfHostedUrl ? selfHostedKey : cloudKey;

          if (firecrawlApiKey) {
            try {
              console.log("Scraping reference URL:", initiative.reference_url, "via", selfHostedUrl ? "self-hosted" : "cloud");
              const scrapeResp = await fetch(`${firecrawlBaseUrl}/v1/scrape`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${firecrawlApiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  url: initiative.reference_url,
                  formats: ["markdown"],
                  onlyMainContent: true,
                }),
              });
              if (scrapeResp.ok) {
                const scrapeData = await scrapeResp.json();
                const md = scrapeData?.data?.markdown || scrapeData?.markdown || "";
                referenceContent = md.slice(0, 8000);
                console.log(`Scraped ${referenceContent.length} chars from reference URL`);
              } else {
                console.warn("Firecrawl scrape failed:", scrapeResp.status);
              }
            } catch (scrapeErr) {
              console.warn("Firecrawl scrape error:", scrapeErr);
            }
          }
        }

        const referenceBlock = referenceContent
          ? `\n\nSITE DE REFERÊNCIA (${initiative.reference_url}):\n---\n${referenceContent}\n---\nUse este site como inspiração e referência para a análise. Identifique funcionalidades, estrutura, público-alvo e modelo de negócio com base no conteúdo do site.`
          : "";

        // Build enriched context from initiative_brief if available
        const brief = initiative.initiative_brief as Record<string, any> | null;
        const briefBlock = brief
          ? `\n\nINITIATIVE BRIEF (structured input):\n${JSON.stringify(brief, null, 2)}\n\nUse this structured brief as the PRIMARY source of truth. It contains validated product type, target users, core features, integrations, and complexity estimate.`
          : "";

        const result = await callAI(
          LOVABLE_API_KEY,
          `Você é um consultor de produto e estratégia sênior. Analise a ideia do usuário e produza uma descoberta inteligente completa. Retorne APENAS JSON válido.${brief ? " Uma initiative_brief estruturada foi fornecida — use-a como fonte primária e enriqueça a análise com base nela." : ""}`,
          `Ideia do usuário: "${initiative.title}"
${initiative.description ? `Descrição: ${initiative.description}` : ""}${briefBlock}${referenceBlock}

Produza uma análise completa no seguinte formato JSON:
{
  "refined_idea": "Versão refinada e expandida da ideia original (2-3 parágrafos)",
  "business_model": "Modelo de negócio sugerido com justificativa",
  "mvp_scope": "Definição clara do MVP",
  "complexity": "low|medium|high|critical",
  "risk_level": "low|medium|high|critical",
  "suggested_stack": "Stack tecnológica sugerida",
  "strategic_vision": "Visão estratégica em 3 horizontes",
  "market_analysis": "Análise de mercado e concorrentes",
  "feasibility_analysis": "Análise de viabilidade técnica e de negócio",
  "target_user": "Público-alvo principal",
  "initial_estimate": {
    "effort_weeks": 0,
    "team_size": 0,
    "estimated_stories": 0,
    "complexity_score": 0
  }
}`,
          true
        );

        const discovery = JSON.parse(result.content);
        await updateInit({
          stage_status: "discovered",
          idea_raw: initiative.description || initiative.title,
          refined_idea: discovery.refined_idea?.slice(0, 500),
          business_model: discovery.business_model?.slice(0, 300),
          mvp_scope: discovery.mvp_scope?.slice(0, 300),
          complexity: discovery.complexity,
          risk_level: discovery.risk_level,
          target_user: discovery.target_user,
          discovery_payload: { ...discovery, reference_url: initiative.reference_url, reference_scraped: !!referenceContent, has_initiative_brief: !!brief },
        });

        if (jobId) await completeJob(jobId, discovery, result);
        await log("pipeline_discovery_complete", "Descoberta inteligente concluída", { tokens: result.tokens, cost_usd: result.costUsd, reference_scraped: !!referenceContent });

        return new Response(JSON.stringify({ success: true, discovery, tokens: result.tokens, job_id: jobId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        if (jobId) await failJob(jobId, e instanceof Error ? e.message : "Unknown error");
        await updateInit({ stage_status: "draft" });
        throw e;
      }
    }

    // ========== STAGE 2: SQUAD FORMATION ==========
    if (stage === "squad_formation") {
      const dp = initiative.discovery_payload || {};
      const jobId = await createJob("squad_formation", { complexity: initiative.complexity, refined_idea: initiative.refined_idea });
      await updateInit({ stage_status: "forming_squad" });
      await log("pipeline_squad_start", "Formando squad de agentes...");

      try {
        // Cleanup old squads for this initiative (re-run scenario)
        const { data: oldSquads } = await serviceClient
          .from("squads")
          .select("id")
          .eq("initiative_id", initiativeId);

        if (oldSquads && oldSquads.length > 0) {
          for (const sq of oldSquads) {
            await serviceClient.from("squad_members").delete().eq("squad_id", sq.id);
          }
          await serviceClient.from("squads").delete().eq("initiative_id", initiativeId);
          console.log(`Cleaned up ${oldSquads.length} old squad(s) for re-run`);
        }

        const context = `Projeto: ${initiative.title}
Ideia refinada: ${dp.refined_idea || initiative.refined_idea || initiative.description || ""}
Complexidade: ${initiative.complexity}
Stack sugerida: ${dp.suggested_stack || "A definir"}
MVP: ${dp.mvp_scope || initiative.mvp_scope || "A definir"}`;

        const result = await callAI(
          LOVABLE_API_KEY,
          `Você é um especialista em montagem de equipes de IA para desenvolvimento de software. Monte o squad ideal com papéis DIVERSIFICADOS.

REGRA CRÍTICA: O campo "role" de cada agente DEVE ser EXATAMENTE um destes valores (copie literalmente):
- "analyst" (analista de requisitos/negócios)
- "pm" (product manager)
- "architect" (arquiteto de software)
- "sm" (scrum master)
- "po" (product owner)  
- "dev" (desenvolvedor)
- "qa" (quality assurance / tester)
- "devops" (infraestrutura / deploy)
- "ux_expert" (designer UX/UI)

NÃO invente roles. NÃO use "developer", "frontend", "backend", "engineer", "designer". Use APENAS os valores exatos acima.
Um squad bem formado TEM papéis diferentes (architect, dev, qa, pm, etc). NÃO coloque todos como "dev".
Retorne APENAS JSON válido.`,
          `${context}

Monte um squad DIVERSIFICADO com papéis complementares. Todo squad PRECISA ter no mínimo: 1 architect, 1 dev, 1 qa.
Para projetos simples: 3-4 agentes. Médios: 5-6. Complexos: 6-8.

IMPORTANTE: use os roles EXATOS: analyst, pm, architect, sm, po, dev, qa, devops, ux_expert.

JSON: {"agents": [{"name": "string (nome humano)", "role": "string (EXATO do enum)", "description": "string", "justification": "string"}], "squad_strategy": "string"}`,
          true
        );

        const parsed = JSON.parse(result.content);
        const agents = parsed.agents || [];
        const squad_strategy = parsed.squad_strategy || "";

        // Validate AI returned agents
        if (!Array.isArray(agents) || agents.length === 0) {
          throw new Error("A IA não retornou agentes válidos. Tente novamente.");
        }

        const { data: squad } = await serviceClient.from("squads").insert({
          initiative_id: initiativeId,
          name: `Squad ${initiative.title.slice(0, 30)}`,
          auto_generated: true,
          organization_id: initiative.organization_id,
        }).select().single();

        // Normalize AI role names to valid enum values
        const validRoles = ["analyst", "pm", "architect", "sm", "po", "dev", "qa", "devops", "ux_expert", "aios_master", "aios_orchestrator"];
        const roleAliases: Record<string, string> = {
          developer: "dev", backend: "dev", frontend: "dev", fullstack: "dev", engineer: "dev",
          "software engineer": "dev", "full-stack": "dev", "back-end": "dev", "front-end": "dev",
          product_manager: "pm", "product manager": "pm", product_owner: "po", "product owner": "po",
          scrum_master: "sm", "scrum master": "sm", "tech lead": "architect", "tech_lead": "architect",
          designer: "ux_expert", ux: "ux_expert", ui: "ux_expert", "ux/ui": "ux_expert", "ui/ux": "ux_expert",
          "ux designer": "ux_expert", "ui designer": "ux_expert",
          tester: "qa", quality: "qa", "quality assurance": "qa", testing: "qa",
          infrastructure: "devops", ops: "devops", "dev ops": "devops", sre: "devops",
          analysis: "analyst", business_analyst: "analyst", "business analyst": "analyst",
          master: "sm", orchestrator: "aios_orchestrator",
        };
        const normalizeRole = (r: string) => {
          const lower = (r || "").toLowerCase().trim();
          if (validRoles.includes(lower)) return lower;
          return roleAliases[lower] || "dev";
        };

        const createdAgents = [];
        const failedAgents = [];
        for (const ag of agents) {
          if (!ag.name) {
            failedAgents.push(ag);
            continue;
          }
          const normalizedRole = normalizeRole(ag.role);
          const { data: agentData, error: agentErr } = await serviceClient.from("agents").insert({
            user_id: user.id, name: ag.name, role: normalizedRole,
            description: `${ag.description || ""}\n\nJustificativa: ${ag.justification || ""}`,
            organization_id: initiative.organization_id,
            workspace_id: initiative.workspace_id, status: "active",
          }).select("id, name, role").single();

          if (agentErr) {
            console.error("Failed to create agent:", ag.name, "role:", ag.role, "->", normalizedRole, "error:", agentErr.message);
            failedAgents.push({ ...ag, normalizedRole, error: agentErr.message });
            continue;
          }

          if (agentData && squad) {
            await serviceClient.from("squad_members").insert({
              squad_id: squad.id, agent_id: agentData.id, role_in_squad: normalizedRole,
            });
            createdAgents.push(agentData);
          }
        }

        if (createdAgents.length === 0) {
          // All agents failed - rollback
          if (squad) await serviceClient.from("squads").delete().eq("id", squad.id);
          throw new Error(`Nenhum agente foi criado com sucesso. ${failedAgents.length} falha(s). Tente novamente.`);
        }

        await updateInit({ stage_status: "squad_formed" });
        if (jobId) await completeJob(jobId, { agents: createdAgents, squad_id: squad?.id, strategy: squad_strategy, failed: failedAgents }, result);
        await log("pipeline_squad_complete", `Squad formado: ${createdAgents.length} agentes (${failedAgents.length} falhas)`, { tokens: result.tokens, cost_usd: result.costUsd });

        return new Response(JSON.stringify({
          success: true, squad_id: squad?.id, agents: createdAgents,
          strategy: squad_strategy, tokens: result.tokens, job_id: jobId,
          failed_agents: failedAgents.length,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        if (jobId) await failJob(jobId, e instanceof Error ? e.message : "Unknown error");
        await updateInit({ stage_status: "squad_ready" });
        throw e;
      }
    }

    // ========== STAGE 3: PLANNING (Code-Aware) ==========
    if (stage === "planning") {
      const dp = initiative.discovery_payload || {};
      const jobId = await createJob("planning", { title: initiative.title });
      await updateInit({ stage_status: "planning" });
      await log("pipeline_planning_start", "Iniciando formalização técnica com geração de código...");

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
          LOVABLE_API_KEY,
          `Você é um Product Manager sênior. Crie um PRD detalhado e executável em português brasileiro usando markdown.

IMPORTANTE: Analise se o projeto necessita de backend (banco de dados, autenticação, APIs, storage de arquivos). Se sim, inclua isso explicitamente nos requisitos. A maioria dos projetos reais precisa de persistência de dados.`,
          `${context}\n\nCrie um PRD completo incluindo:\n## Visão Geral\n## Problema a Resolver\n## Personas e Casos de Uso\n## Requisitos Funcionais\n## Requisitos Não-Funcionais (incluir requisitos de backend se aplicável)\n## Necessidades de Backend\nAnalise e liste: banco de dados (tabelas/entidades), autenticação (login/signup), storage (uploads), APIs/integrações externas. Se o projeto NÃO precisa de backend, justifique.\n## Critérios de Aceite\n## Dependências Técnicas\n## Métricas de Sucesso\n## Riscos e Mitigações`
        );
        await updateInit({ prd_content: prdResult.content });

        // Step 2: Architecture
        const archResult = await callAI(
          LOVABLE_API_KEY,
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
        await updateInit({ architecture_content: archResult.content });

        // Step 3: Generate code-aware stories with file paths
        const storiesResult = await callAI(
          LOVABLE_API_KEY,
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
- Se o projeto precisa de banco de dados, CRIE uma story "Backend Setup" LOGO APÓS o Scaffold com:
  - supabase/schema.sql (file_type: "schema") - CREATE TABLE IF NOT EXISTS com RLS policies
  - supabase/seed.sql (file_type: "seed") - dados iniciais se necessário
  - src/lib/supabase.ts (file_type: "supabase_client") - client SDK config
  - src/hooks/useAuth.tsx (file_type: "hook") - hook de autenticação se necessário
  - src/contexts/AuthContext.tsx (file_type: "component") - contexto de auth se necessário
  - .env.example (file_type: "config") - variáveis de ambiente necessárias
- Se precisa de Edge Functions (APIs, webhooks, lógica de servidor):
  - supabase/functions/<nome>/index.ts (file_type: "edge_function")
- REGRA DE PREFIXO: Todas as tabelas DEVEM ter prefixo curto do projeto (ex: "tf_" para TaskFlow). Use CREATE TABLE IF NOT EXISTS.
- Arquivo de schema SQL deve incluir:
  - CREATE TABLE statements
  - ALTER TABLE ... ENABLE ROW LEVEL SECURITY
  - CREATE POLICY statements
  - Triggers se necessário
- O client Supabase (src/lib/supabase.ts) deve usar createClient com URL e anon key do .env`,
          `Projeto: ${initiative.title}

PRD (resumo):
${prdResult.content.slice(0, 3000)}

Arquitetura (resumo):
${archResult.content.slice(0, 3000)}

Gere as stories no formato JSON. A PRIMEIRA story obrigatoriamente deve ser o scaffold do projeto base.
Se o PRD/Arquitetura indicar necessidade de backend, a SEGUNDA story deve ser "Backend Setup" com schema SQL, client Supabase e hooks de auth.

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
              "description": "Criar package.json com dependências (incluir @supabase/supabase-js se backend)",
              "file_path": "package.json",
              "file_type": "config"
            },
            {
              "description": "Criar configuração do Vite",
              "file_path": "vite.config.ts",
              "file_type": "config"
            },
            {
              "description": "Criar tsconfig.json",
              "file_path": "tsconfig.json",
              "file_type": "config"
            },
            {
              "description": "Criar configuração do Tailwind",
              "file_path": "tailwind.config.ts",
              "file_type": "config"
            },
            {
              "description": "Criar postcss.config.js",
              "file_path": "postcss.config.js",
              "file_type": "config"
            },
            {
              "description": "Criar index.html com meta tags",
              "file_path": "index.html",
              "file_type": "scaffold"
            },
            {
              "description": "Criar ponto de entrada da aplicação",
              "file_path": "src/main.tsx",
              "file_type": "scaffold"
            },
            {
              "description": "Criar componente App com roteamento",
              "file_path": "src/App.tsx",
              "file_type": "scaffold"
            },
            {
              "description": "Criar estilos globais e design tokens",
              "file_path": "src/index.css",
              "file_type": "style"
            },
            {
              "description": "Criar vercel.json com rewrites para SPA routing",
              "file_path": "vercel.json",
              "file_type": "config"
            },
            {
              "description": "Criar _redirects para Netlify SPA routing",
              "file_path": "public/_redirects",
              "file_type": "config"
            }
          ]
        }
      ]
    },
    {
      "title": "Backend Setup (Supabase)",
      "description": "Configuração do backend: schema SQL, RLS, client SDK e autenticação",
      "priority": "critical",
      "phases": [
        {
          "name": "Banco de Dados",
          "subtasks": [
            {
              "description": "Criar schema SQL completo com tabelas, RLS policies e triggers",
              "file_path": "supabase/schema.sql",
              "file_type": "schema"
            },
            {
              "description": "Criar .env.example com variáveis Supabase",
              "file_path": ".env.example",
              "file_type": "config"
            }
          ]
        },
        {
          "name": "Client e Auth",
          "subtasks": [
            {
              "description": "Criar client Supabase com createClient e tipagem",
              "file_path": "src/lib/supabase.ts",
              "file_type": "supabase_client"
            },
            {
              "description": "Criar hook de autenticação useAuth",
              "file_path": "src/hooks/useAuth.tsx",
              "file_type": "hook"
            }
          ]
        }
      ]
    },
    {
      "title": "Nome da Feature",
      "description": "Descrição da feature",
      "priority": "high",
      "phases": [
        {
          "name": "Componentes",
          "subtasks": [
            {
              "description": "Descrição detalhada do que o componente deve fazer, props, comportamento",
              "file_path": "src/components/NomeComponente.tsx",
              "file_type": "component"
            }
          ]
        }
      ]
    }
  ]
}

NOTA: A story "Backend Setup" só deve ser incluída se o PRD/Arquitetura indicar necessidade de banco de dados, autenticação ou APIs. Se o projeto for puramente frontend (landing page estática, portfolio, etc), omita essa story.

Gere entre 3-8 stories cobrindo TODO o MVP. Cada subtask = 1 arquivo.`,
          true
        );
        const { stories } = JSON.parse(storiesResult.content);

        const createdStories = [];
        let totalSubtasks = 0;
        let scaffoldFiles = 0;

        for (const story of stories) {
          const { data: storyData } = await serviceClient.from("stories").insert({
            user_id: user.id, title: story.title, description: story.description,
            priority: story.priority || "medium", status: "todo",
            organization_id: initiative.organization_id,
            workspace_id: initiative.workspace_id, initiative_id: initiativeId,
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
                // Support both old format (string) and new format (object with file_path)
                const isObject = typeof st === "object" && st !== null;
                const description = isObject ? st.description : st;
                const filePath = isObject ? st.file_path : null;
                const fileType = isObject ? st.file_type : null;

                await serviceClient.from("story_subtasks").insert({
                  phase_id: phaseData.id,
                  description,
                  sort_order: si,
                  file_path: filePath || null,
                  file_type: fileType || null,
                });

                totalSubtasks++;
                if (filePath) storyFiles.push(filePath);
                if (fileType === "scaffold" || fileType === "config") scaffoldFiles++;
              }
            }
          }
          createdStories.push({ id: storyData.id, title: story.title, files: storyFiles });
        }

        await updateInit({ stage_status: "planned" });
        const totalTokens = prdResult.tokens + archResult.tokens + storiesResult.tokens;
        const totalCost = prdResult.costUsd + archResult.costUsd + storiesResult.costUsd;
        if (jobId) await completeJob(jobId, {
          stories_count: createdStories.length,
          total_subtasks: totalSubtasks,
          scaffold_files: scaffoldFiles,
          total_tokens: totalTokens,
        }, { model: aiModel, costUsd: totalCost, durationMs: prdResult.durationMs + archResult.durationMs + storiesResult.durationMs });
        await log("pipeline_planning_complete", `Planning completo: ${createdStories.length} stories, ${totalSubtasks} subtasks (${scaffoldFiles} scaffold)`, { totalTokens, cost_usd: totalCost });

        return new Response(JSON.stringify({
          success: true, stories: createdStories, total_subtasks: totalSubtasks,
          scaffold_files: scaffoldFiles, tokens: totalTokens, job_id: jobId,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        if (jobId) await failJob(jobId, e instanceof Error ? e.message : "Unknown error");
        await updateInit({ stage_status: "squad_formed" });
        throw e;
      }
    }

    // ========== APPROVE STAGE ==========
    if (stage === "approve") {
      const currentStatus = initiative.stage_status;

      const approvalMap: Record<string, { field: string; nextStatus: string }> = {
        discovered: { field: "approved_at_discovery", nextStatus: "squad_ready" },
        squad_formed: { field: "approved_at_squad", nextStatus: "planning_ready" },
        planned: { field: "approved_at_planning", nextStatus: "in_progress" },
        ready_to_publish: { field: "approved_at_planning", nextStatus: "published" },
      };

      const approval = approvalMap[currentStatus];
      if (!approval) {
        // If already in a terminal/advanced state, just return success
        const terminalStates = ["published", "completed", "archived", "in_progress"];
        if (terminalStates.includes(currentStatus)) {
          return new Response(JSON.stringify({ success: true, new_status: currentStatus, message: "Already approved/advanced" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`Cannot approve at status: ${currentStatus}`);
      }

      await updateInit({
        stage_status: approval.nextStatus,
        [approval.field]: new Date().toISOString(),
      });
      await log("pipeline_stage_approved", `Stage aprovado: ${currentStatus} → ${approval.nextStatus}`);

      return new Response(JSON.stringify({ success: true, new_status: approval.nextStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== REJECT / SOLICITAR AJUSTES ==========
    if (stage === "reject") {
      if (!comment || comment.trim().length < 10) {
        return new Response(JSON.stringify({ error: "Comentário obrigatório (mínimo 10 caracteres) para solicitar ajustes." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const currentStatus = initiative.stage_status;

      // Rollback map: which status to go back to, and what stage label
      const rollbackMap: Record<string, { rollbackTo: string; stageLabel: string }> = {
        discovered: { rollbackTo: "draft", stageLabel: "discovery" },
        squad_formed: { rollbackTo: "squad_ready", stageLabel: "squad_formation" },
        planned: { rollbackTo: "planning_ready", stageLabel: "planning" },
        in_progress: { rollbackTo: "planned", stageLabel: "execution" },
        validating: { rollbackTo: "in_progress", stageLabel: "validation" },
        ready_to_publish: { rollbackTo: "validating", stageLabel: "publish" },
      };

      const rollback = rollbackMap[currentStatus];
      if (!rollback) {
        return new Response(JSON.stringify({ error: `Não é possível solicitar ajustes no status: ${currentStatus}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create rework job for traceability
      const jobId = await createJob("rework", {
        previous_status: currentStatus,
        rollback_to: rollback.rollbackTo,
        stage_affected: rollback.stageLabel,
        comment: comment.trim(),
      });

      // Rollback initiative status
      await updateInit({ stage_status: rollback.rollbackTo });

      // Mark related artifacts as needing revision (if execution was done)
      if (["in_progress", "validating"].includes(currentStatus)) {
        // Find stories for this initiative
        const { data: stories } = await serviceClient.from("stories")
          .select("id").eq("initiative_id", initiativeId);
        
        if (stories && stories.length > 0) {
          const storyIds = stories.map((s: any) => s.id);
          
          // Find subtask IDs through phases
          const { data: phases } = await serviceClient.from("story_phases")
            .select("id").in("story_id", storyIds);
          
          if (phases && phases.length > 0) {
            const phaseIds = phases.map((p: any) => p.id);
            
            const { data: subtasks } = await serviceClient.from("story_subtasks")
              .select("id").in("phase_id", phaseIds).eq("status", "completed");
            
            if (subtasks && subtasks.length > 0) {
              const subtaskIds = subtasks.map((st: any) => st.id);
              
              // Mark related agent_outputs as rejected (needs_revision)
              await serviceClient.from("agent_outputs")
                .update({ status: "rejected" })
                .in("subtask_id", subtaskIds)
                .eq("organization_id", initiative.organization_id);

              // Reset subtasks to pending for re-execution
              await serviceClient.from("story_subtasks")
                .update({ status: "pending", output: null, executed_at: null, executed_by_agent_id: null })
                .in("phase_id", phaseIds);

              // Reset phases to pending
              await serviceClient.from("story_phases")
                .update({ status: "pending" })
                .in("story_id", storyIds);

              // Reset stories to todo
              await serviceClient.from("stories")
                .update({ status: "todo" })
                .in("id", storyIds);
            }
          }
        }
      }

      if (jobId) {
        await serviceClient.from("initiative_jobs").update({
          status: "success",
          outputs: { action: "rework_requested", comment: comment.trim(), rollback_to: rollback.rollbackTo },
          completed_at: new Date().toISOString(),
        }).eq("id", jobId);
      }

      await log("pipeline_stage_rejected", `Ajustes solicitados em ${rollback.stageLabel}: ${comment.trim().slice(0, 200)}`, {
        previous_status: currentStatus,
        rollback_to: rollback.rollbackTo,
        comment: comment.trim(),
      });

      return new Response(JSON.stringify({
        success: true,
        action: "rework_requested",
        previous_status: currentStatus,
        new_status: rollback.rollbackTo,
        job_id: jobId,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ========== STAGE 4: EXECUTION (Chain-of-Agents: Architect → Dev → QA) ==========
    if (stage === "execution") {
      const masterJobId = await createJob("execution", { initiative_id: initiativeId });
      const updateFields: any = { stage_status: "in_progress" };
      if (initiative.stage_status === "planned" && !initiative.approved_at_planning) {
        updateFields.approved_at_planning = new Date().toISOString();
      }
      await updateInit(updateFields);
      await log("pipeline_execution_start", "Iniciando execução Chain-of-Agents (Architect → Dev → QA)...");

      // Helper to record agent_message
      const recordMessage = async (storyId: string | null, subtaskId: string | null, fromAgent: any, toAgent: any, content: string, msgType: string, iteration: number, tokens = 0, model = "") => {
        await serviceClient.from("agent_messages").insert({
          initiative_id: initiativeId,
          story_id: storyId,
          subtask_id: subtaskId,
          from_agent_id: fromAgent?.id || null,
          to_agent_id: toAgent?.id || null,
          role_from: fromAgent?.role || "system",
          role_to: toAgent?.role || "system",
          content,
          message_type: msgType,
          iteration,
          tokens_used: tokens,
          model_used: model,
          stage: "execution",
        });
      };

      try {
        const { data: stories } = await serviceClient.from("stories")
          .select("id, title, description")
          .eq("initiative_id", initiativeId)
          .in("status", ["todo", "in_progress"]);

        if (!stories || stories.length === 0) throw new Error("Nenhuma story encontrada para execução");

        const { data: squads } = await serviceClient.from("squads")
          .select("id, squad_members(agent_id, role_in_squad, agents(id, name, role, description, exclusive_authorities))")
          .eq("initiative_id", initiativeId);

        const squadMembers = squads?.[0]?.squad_members || [];
        if (squadMembers.length === 0) throw new Error("Nenhum agente no squad para executar");

        const agentsByRole: Record<string, any> = {};
        for (const sm of squadMembers) agentsByRole[sm.role_in_squad] = sm.agents;
        const architectAgent = agentsByRole["architect"];
        const devAgent = agentsByRole["dev"];
        const qaAgent = agentsByRole["qa"];
        const defaultAgent = devAgent || architectAgent || squadMembers[0]?.agents;
        const hasChain = !!architectAgent && !!devAgent && !!qaAgent;

        // Fetch Supabase connection for this org (if any)
        let supabaseConnInfo = "";
        const { data: sbConns } = await serviceClient
          .from("supabase_connections")
          .select("supabase_url, supabase_anon_key, label")
          .eq("organization_id", initiative.organization_id)
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(1);
        const sbConn = sbConns?.[0];
        if (sbConn) {
          supabaseConnInfo = `\n\n## Conexão Supabase Configurada:\n- URL: ${sbConn.supabase_url}\n- Anon Key: ${sbConn.supabase_anon_key}\nUse estes valores REAIS nos arquivos .env.example e src/lib/supabase.ts (como defaults ou valores comentados).`;
          console.log(`[SUPABASE_CONN] Using connection "${sbConn.label}" for execution context`);
        }

        // Collect ALL subtasks with file_path
        const allProjectFiles: { file_path: string; description: string }[] = [];
        for (const story of stories) {
          const { data: phases } = await serviceClient.from("story_phases")
            .select("id, story_subtasks(file_path, description)")
            .eq("story_id", story.id);
          for (const phase of (phases || [])) {
            for (const st of (phase.story_subtasks || [])) {
              if (st.file_path) allProjectFiles.push({ file_path: st.file_path, description: st.description });
            }
          }
        }
        const projectStructure = allProjectFiles.map(f => `- ${f.file_path}: ${f.description}`).join("\n");

        // Fetch agent memories and org knowledge base for context injection
        let memoryContext = "";
        try {
          // Get relevant agent memories from previous initiatives
          const { data: memories } = await serviceClient
            .from("agent_memory")
            .select("key, value, memory_type, relevance_score")
            .eq("organization_id", initiative.organization_id)
            .order("relevance_score", { ascending: false })
            .limit(15);

          // Get org knowledge base (ADRs, patterns)
          const { data: kbEntries } = await serviceClient
            .from("org_knowledge_base")
            .select("title, content, category, tags")
            .eq("organization_id", initiative.organization_id)
            .order("created_at", { ascending: false })
            .limit(10);

          const memoryLines = (memories || []).map(m => `- [${m.memory_type}] ${m.key}: ${m.value}`);
          const kbLines = (kbEntries || []).map(k => `- [${k.category}] ${k.title}: ${k.content.slice(0, 200)}`);

          if (memoryLines.length > 0 || kbLines.length > 0) {
            memoryContext = `\n\n## Memória Organizacional (lições aprendidas de projetos anteriores):\n`;
            if (memoryLines.length > 0) memoryContext += `### Lições dos Agentes:\n${memoryLines.join("\n")}\n`;
            if (kbLines.length > 0) memoryContext += `### Base de Conhecimento:\n${kbLines.join("\n")}\n`;
            memoryContext += `\nUse essas lições para evitar erros passados e seguir os padrões da organização.\n`;
            console.log(`[MEMORY] Injected ${memoryLines.length} memories + ${kbLines.length} KB entries into context`);
          }
        } catch (memErr) {
          console.warn("[MEMORY] Failed to fetch memories:", memErr);
        }

        let totalTokens = 0, totalCost = 0, executedCount = 0, failedCount = 0, codeFilesGenerated = 0;
        const generatedFiles: Record<string, string> = {};
        const MAX_QA_ITERATIONS = 2;

        // Sanitize package.json: fix common AI mistakes (invalid package names, wrong versions)
        const INVALID_PACKAGES = new Set([
          "shadcn/ui", "shadcn-ui", "@shadcn/ui", "shadcn", "tailwindcss-animate/latest",
          "radix-ui", "@radix/ui", "lucide", "framer", "next-themes/latest",
        ]);
        const PACKAGE_RENAMES: Record<string, string | null> = {
          "shadcn/ui": null, // remove entirely — installed via npx
          "shadcn-ui": null,
          "@shadcn/ui": null,
          "shadcn": null,
          "radix-ui": null,
          "@radix/ui": null,
          "lucide": "lucide-react",
          "@vitejs/plugin-react": "@vitejs/plugin-react-swc",
        };
        const sanitizePackageJson = (content: string): string => {
          try {
            const pkg = JSON.parse(content);
            
            // Fix dependencies/devDependencies names
            for (const depKey of ["dependencies", "devDependencies"]) {
              const deps = pkg[depKey];
              if (!deps || typeof deps !== "object") continue;
              for (const [name, ver] of Object.entries(deps)) {
                if (INVALID_PACKAGES.has(name) || name in PACKAGE_RENAMES) {
                  const replacement = PACKAGE_RENAMES[name];
                  delete deps[name];
                  if (replacement) deps[replacement] = ver;
                  console.log(`[SANITIZE] package.json: removed "${name}"${replacement ? ` → "${replacement}"` : ""}`);
                  continue;
                }
                if (/[^a-zA-Z0-9@/_.-]/.test(name)) {
                  delete deps[name];
                  console.log(`[SANITIZE] package.json: removed invalid "${name}"`);
                }
              }
            }

            // Ensure ESM + scripts
            pkg.type = "module";
            if (!pkg.scripts) pkg.scripts = {};
            pkg.scripts.dev = "vite";
            pkg.scripts.build = "vite build";
            pkg.scripts.preview = "vite preview";

            // Ensure base deps
            const ensureDep = (name: string, version: string) => {
              if (!pkg.dependencies) pkg.dependencies = {};
              if (!pkg.dependencies[name] && !pkg.devDependencies?.[name]) {
                pkg.dependencies[name] = version;
              }
            };
            const forceDevDep = (name: string, version: string) => {
              if (!pkg.devDependencies) pkg.devDependencies = {};
              pkg.devDependencies[name] = version;
              if (pkg.dependencies?.[name]) delete pkg.dependencies[name];
            };

            ensureDep("react", "^18.3.1");
            ensureDep("react-dom", "^18.3.1");
            ensureDep("react-router-dom", "^6.30.0");
            ensureDep("lucide-react", "^0.462.0");
            ensureDep("tailwind-merge", "^2.6.0");
            ensureDep("clsx", "^2.1.1");
            ensureDep("class-variance-authority", "^0.7.1");

            // Force compatible Vite toolchain (prevents ERESOLVE)
            forceDevDep("vite", "^5.4.19");
            forceDevDep("@vitejs/plugin-react-swc", "^3.11.0");
            if (pkg.devDependencies?.["@vitejs/plugin-react"]) delete pkg.devDependencies["@vitejs/plugin-react"];
            if (pkg.dependencies?.["@vitejs/plugin-react"]) delete pkg.dependencies["@vitejs/plugin-react"];

            forceDevDep("typescript", "^5.8.3");
            forceDevDep("tailwindcss", "^3.4.17");
            forceDevDep("autoprefixer", "^10.4.21");
            forceDevDep("postcss", "^8.5.6");
            forceDevDep("@types/react", "^18.3.23");
            forceDevDep("@types/react-dom", "^18.3.7");

            return JSON.stringify(pkg, null, 2);
          } catch {
            return content; // If can't parse, return as-is
          }
        };

        // Deterministic overrides for deploy-critical files (never trust AI for these)
        const DETERMINISTIC_FILES: Record<string, string> = {
          "vercel.json": DEPLOY_VERCEL_JSON,
          "public/_redirects": "/* /index.html 200",
          "netlify.toml": "[build]\n  command = \"npm run build\"\n  publish = \"dist\"\n\n[[redirects]]\n  from = \"/*\"\n  to = \"/index.html\"\n  status = 200",
          "postcss.config.js": `export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n};`,
          "tailwind.config.js": `/** @type {import('tailwindcss').Config} */\nexport default {\n  content: [\n    "./index.html",\n    "./src/**/*.{js,ts,jsx,tsx}",\n  ],\n  theme: {\n    extend: {},\n  },\n  plugins: [],\n};`,
          "tsconfig.node.json": JSON.stringify({
            compilerOptions: {
              composite: true, target: "ES2022", lib: ["ES2023"], module: "ESNext",
              skipLibCheck: true, moduleResolution: "bundler", allowImportingTsExtensions: true,
              isolatedModules: true, moduleDetection: "force", strict: true,
              noUnusedLocals: false, noUnusedParameters: false, noFallthroughCasesInSwitch: true,
            },
            include: ["vite.config.ts"],
          }, null, 2),
          "tsconfig.json": JSON.stringify({
            compilerOptions: {
              target: "ES2020", useDefineForClassFields: true, lib: ["ES2020", "DOM", "DOM.Iterable"],
              module: "ESNext", skipLibCheck: true, moduleResolution: "bundler",
              allowImportingTsExtensions: true, resolveJsonModule: true, isolatedModules: true,
              noEmit: true, jsx: "react-jsx", strict: false,
              noUnusedLocals: false, noUnusedParameters: false, paths: { "@/*": ["./src/*"] },
            },
            include: ["src"],
            references: [{ path: "./tsconfig.node.json" }],
          }, null, 2),
          "tsconfig.app.json": JSON.stringify({
            compilerOptions: {
              target: "ES2020", useDefineForClassFields: true, lib: ["ES2020", "DOM", "DOM.Iterable"],
              module: "ESNext", skipLibCheck: true, moduleResolution: "bundler",
              allowImportingTsExtensions: true, resolveJsonModule: true, isolatedModules: true,
              noEmit: true, jsx: "react-jsx", strict: false,
              noUnusedLocals: false, noUnusedParameters: false, paths: { "@/*": ["./src/*"] },
            },
            include: ["src"],
          }, null, 2),
          "vite.config.ts": `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react-swc";\nimport path from "path";\n\nexport default defineConfig({\n  plugins: [react()],\n  resolve: {\n    alias: {\n      "@": path.resolve(__dirname, "./src"),\n    },\n  },\n});`,
          ".env.example": sbConn
            ? `VITE_SUPABASE_URL=${sbConn.supabase_url}\nVITE_SUPABASE_ANON_KEY=${sbConn.supabase_anon_key}`
            : `VITE_SUPABASE_URL=https://your-project.supabase.co\nVITE_SUPABASE_ANON_KEY=your-anon-key`,
          "src/lib/supabase.ts": `import { createClient } from '@supabase/supabase-js';\n\nconst supabaseUrl = import.meta.env.VITE_SUPABASE_URL;\nconst supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;\n\nif (!supabaseUrl || !supabaseAnonKey) {\n  throw new Error('Missing Supabase environment variables. Check .env file.');\n}\n\nexport const supabase = createClient(supabaseUrl, supabaseAnonKey);`,
        };

        // Post-processors: apply after AI generates but before saving
        const POST_PROCESSORS: Record<string, (content: string) => string> = {
          "package.json": sanitizePackageJson,
        };

        // Count total pending subtasks for progress tracking
        let totalSubtasks = 0;
        for (const story of stories) {
          const { data: phases } = await serviceClient.from("story_phases")
            .select("id, story_subtasks(id, status)")
            .eq("story_id", story.id);
          for (const phase of (phases || [])) {
            totalSubtasks += (phase.story_subtasks || []).filter((st: any) => st.status === "pending").length;
          }
        }

        // Helper to update real-time progress
        const updateProgress = async (current: number, currentFile?: string, currentAgent?: string) => {
          await serviceClient.from("initiatives").update({
            execution_progress: {
              current, total: totalSubtasks,
              percent: totalSubtasks > 0 ? Math.round((current / totalSubtasks) * 100) : 0,
              executed: executedCount, failed: failedCount,
              code_files: codeFilesGenerated, tokens: totalTokens, cost_usd: totalCost,
              current_file: currentFile || null, current_agent: currentAgent || null,
              chain_of_agents: hasChain, started_at: new Date().toISOString(),
              status: "running",
            },
          }).eq("id", initiativeId);
        };

        await updateProgress(0);

        for (const story of stories) {
          await serviceClient.from("stories").update({ status: "in_progress" }).eq("id", story.id);

          const { data: phases } = await serviceClient.from("story_phases")
            .select("id, name, sort_order, story_subtasks(id, description, status, sort_order, file_path, file_type)")
            .eq("story_id", story.id)
            .order("sort_order");

          if (!phases) continue;

          for (const phase of phases) {
            await serviceClient.from("story_phases").update({ status: "in_progress" }).eq("id", phase.id);

            const subtasks = (phase.story_subtasks || [])
              .filter((st: any) => st.status === "pending")
              .sort((a: any, b: any) => a.sort_order - b.sort_order);

            // Parallelization: split subtasks into independent (config/scaffold) and sequential (code/components)
            const PARALLEL_FILE_TYPES = new Set(["config", "scaffold", "style"]);
            const parallelSubtasks = subtasks.filter((st: any) => st.file_type && PARALLEL_FILE_TYPES.has(st.file_type));
            const sequentialSubtasks = subtasks.filter((st: any) => !st.file_type || !PARALLEL_FILE_TYPES.has(st.file_type));

            // Helper to execute a single subtask (extracted for reuse in parallel/sequential)
            const executeOneSubtask = async (subtask: any) => {
              const hasFilePath = !!subtask.file_path;

              const subtaskJobId = await createJob("execution", {
                subtask_id: subtask.id, story_title: story.title, phase_name: phase.name,
                subtask_description: subtask.description, file_path: subtask.file_path || null,
                chain_of_agents: hasChain && hasFilePath,
              });

              await serviceClient.from("story_subtasks").update({
                status: "in_progress", executed_by_agent_id: (devAgent || defaultAgent).id,
              }).eq("id", subtask.id);

              try {
                if (hasFilePath && hasChain) {
                  // ===== CHAIN-OF-AGENTS: Architect → Dev → QA =====
                  const ext = subtask.file_path.split(".").pop() || "ts";
                  const langMap: Record<string, string> = { tsx: "TypeScript React (TSX)", ts: "TypeScript", css: "CSS", json: "JSON", js: "JavaScript", html: "HTML", sql: "SQL (PostgreSQL)" };
                  const language = langMap[ext] || "TypeScript";
                  const isBackendFile = ["schema", "migration", "edge_function", "seed", "supabase_client", "auth_config"].includes(subtask.file_type || "");

                  const contextFiles = Object.entries(generatedFiles);
                  let contextStr = "";
                  for (const [fp, content] of contextFiles) {
                    const entry = `\n--- ${fp} ---\n${content.slice(0, 800)}\n`;
                    if (contextStr.length + entry.length > 6000) break;
                    contextStr += entry;
                  }

                  const baseContext = `## Projeto: ${initiative.title}\n## Descrição: ${initiative.description || initiative.refined_idea || ""}\n\n## Estrutura do projeto:\n${projectStructure}\n\n## Arquivos já gerados:\n${contextStr || "(nenhum ainda)"}\n\n## Arquivo: ${subtask.file_path}\n## Tipo: ${subtask.file_type || "code"}\n## Linguagem: ${language}\n## Tarefa: ${subtask.description}\n\n${initiative.prd_content ? `## PRD:\n${initiative.prd_content.slice(0, 1200)}` : ""}\n${initiative.architecture_content ? `## Arquitetura:\n${initiative.architecture_content.slice(0, 1200)}` : ""}${supabaseConnInfo}${memoryContext}`;

                  // --- Step 1: ARCHITECT defines technical structure ---
                  const archResult = await callAI(
                    LOVABLE_API_KEY,
                    `Você é o Architect "${architectAgent.name}" no AxionOS. Sua função é analisar a tarefa e definir a estrutura técnica ANTES do Dev implementar.\n\nProduz uma especificação técnica concisa incluindo:\n1. Decisões arquiteturais para este arquivo\n2. Interfaces/tipos necessários\n3. Dependências e imports\n4. Padrões a seguir\n5. Edge cases a considerar\n\nSeja direto e técnico. Responda em pt-BR.`,
                    baseContext
                  );
                  await recordMessage(story.id, subtask.id, architectAgent, devAgent, archResult.content, "handoff", 1, archResult.tokens, archResult.model);
                  totalTokens += archResult.tokens; totalCost += archResult.costUsd;

                  // --- Step 2: DEV generates code using Architect's spec ---
                  const backendRules = isBackendFile ? `
REGRAS PARA ARQUIVOS BACKEND (Supabase):
- Para file_type "schema" (.sql): Gere CREATE TABLE IF NOT EXISTS, ALTER TABLE ENABLE RLS, CREATE POLICY. Use UUID como PK com gen_random_uuid(). Adicione created_at/updated_at com defaults.
- REGRA OBRIGATÓRIA: Todas as tabelas DEVEM ter um prefixo curto derivado do nome do projeto (ex: projeto "TaskFlow" → tf_users, tf_tasks). Use sempre CREATE TABLE IF NOT EXISTS para idempotência.
- Para file_type "edge_function": Gere uma Edge Function Deno/TypeScript com CORS headers, validação de auth, e lógica de negócio. Use imports de "https://deno.land/std@0.168.0/" e "https://esm.sh/@supabase/supabase-js@2".
- Para file_type "supabase_client": Gere um client usando createClient do @supabase/supabase-js com URL e anon key de import.meta.env.
- Para file_type "seed": Gere INSERT statements para dados iniciais. Use os nomes de tabela COM prefixo.
- Para file_type "auth_config": Gere configuração de autenticação.
- Para .env.example: Liste VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.` : "";

                  const devResult = await callAI(
                    LOVABLE_API_KEY,
                    `Você é o Dev "${devAgent.name}" no AxionOS. Você recebeu a especificação técnica do Architect abaixo. Implemente o código COMPLETO e FUNCIONAL.\n\nREGRAS:\n- Retorne APENAS o conteúdo do arquivo, sem markdown, sem \`\`\`, sem explicações.\n- Código COMPLETO e FUNCIONAL.\n- Siga EXATAMENTE a especificação do Architect.\n- Use componentes shadcn/ui e Tailwind CSS para frontend.\n- Siga as melhores práticas de ${language}.\n${backendRules}\n\nREGRAS PARA package.json:\n- NÃO inclua "shadcn/ui", "shadcn-ui", "@shadcn/ui" ou "shadcn" como dependência. Componentes shadcn/ui são copiados localmente, não são pacotes npm.\n- NÃO inclua "@radix/ui" ou "radix-ui". Use pacotes individuais como "@radix-ui/react-dialog".\n- Use "lucide-react" (não "lucide").\n- SEMPRE inclua "type": "module" no package.json.\n- SEMPRE inclua @vitejs/plugin-react-swc, typescript, tailwindcss, autoprefixer, postcss em devDependencies.\n- NÃO use @vitejs/plugin-react.\n\nARQUIVOS DE DEPLOY (conteúdo EXATO se o arquivo for um destes):\n- vercel.json: {"framework":"vite","installCommand":"rm -f package-lock.json && npm install --include=dev","buildCommand":"npm run build","outputDirectory":"dist","rewrites":[{"source":"/(.*)", "destination":"/index.html"}]}\n- public/_redirects: /* /index.html 200\n- index.html: NÃO use href="/" em tags link/canonical.`,
                    `${baseContext}\n\n## Especificação do Architect:\n${archResult.content}`
                  );
                  let codeContent = devResult.content.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();
                  await recordMessage(story.id, subtask.id, devAgent, qaAgent, codeContent, "handoff", 1, devResult.tokens, devResult.model);
                  totalTokens += devResult.tokens; totalCost += devResult.costUsd;

                  // --- Step 3: QA reviews the code ---
                  let qaApproved = false;
                  for (let iteration = 1; iteration <= MAX_QA_ITERATIONS; iteration++) {
                    const qaResult = await callAI(
                      LOVABLE_API_KEY,
                      `Você é o QA "${qaAgent.name}" no AxionOS. Revise o código do Dev abaixo. Retorne APENAS JSON válido.\n\n{"approved": true/false, "issues": ["lista de problemas encontrados"], "suggestions": ["lista de melhorias"], "score": 0-100}`,
                      `## Arquivo: ${subtask.file_path}\n## Especificação do Architect:\n${archResult.content.slice(0, 2000)}\n\n## Código do Dev:\n${codeContent.slice(0, 8000)}`,
                      true
                    );
                    totalTokens += qaResult.tokens; totalCost += qaResult.costUsd;

                    let qaFeedback: any;
                    try { qaFeedback = JSON.parse(qaResult.content); } catch { qaFeedback = { approved: true, issues: [], score: 70 }; }

                    await recordMessage(story.id, subtask.id, qaAgent, devAgent, qaResult.content, "review", iteration, qaResult.tokens, qaResult.model);

                    if (qaFeedback.approved || qaFeedback.score >= 80 || iteration >= MAX_QA_ITERATIONS) {
                      qaApproved = true;
                      break;
                    }

                    // Dev fixes based on QA feedback
                    const fixResult = await callAI(
                      LOVABLE_API_KEY,
                      `Você é o Dev "${devAgent.name}". O QA encontrou problemas no seu código. Corrija TODOS os issues abaixo e retorne APENAS o código corrigido completo, sem markdown, sem explicações.`,
                      `## Arquivo: ${subtask.file_path}\n\n## Código atual:\n${codeContent.slice(0, 8000)}\n\n## Feedback do QA:\n${JSON.stringify(qaFeedback.issues)}\n\n## Sugestões:\n${JSON.stringify(qaFeedback.suggestions)}\n\nRetorne o código COMPLETO corrigido.`
                    );
                    codeContent = fixResult.content.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();
                    await recordMessage(story.id, subtask.id, devAgent, qaAgent, codeContent, "fix", iteration + 1, fixResult.tokens, fixResult.model);
                    totalTokens += fixResult.tokens; totalCost += fixResult.costUsd;
                  }

                  // Override deploy-critical files with deterministic content
                  if (DETERMINISTIC_FILES[subtask.file_path]) {
                    codeContent = DETERMINISTIC_FILES[subtask.file_path];
                    console.log(`[DETERMINISTIC] Overriding AI output for ${subtask.file_path}`);
                  }
                  // Post-process (e.g., sanitize package.json)
                  if (POST_PROCESSORS[subtask.file_path]) {
                    codeContent = POST_PROCESSORS[subtask.file_path](codeContent);
                  }

                  // Save final output
                  generatedFiles[subtask.file_path] = codeContent;
                  await serviceClient.from("story_subtasks").update({
                    output: codeContent, status: "completed", executed_at: new Date().toISOString(),
                  }).eq("id", subtask.id);

                  const { data: artifact } = await serviceClient.from("agent_outputs").insert({
                    organization_id: initiative.organization_id,
                    workspace_id: initiative.workspace_id || null,
                    initiative_id: initiativeId,
                    agent_id: devAgent.id, subtask_id: subtask.id,
                    type: "code", status: qaApproved ? "draft" : "pending_review",
                    summary: `${subtask.file_path} — ${subtask.description.slice(0, 150)}`,
                    raw_output: { file_path: subtask.file_path, file_type: subtask.file_type, language: ext, content: codeContent, chain_of_agents: true },
                    model_used: aiModel, prompt_used: subtask.description,
                    tokens_used: totalTokens, cost_estimate: totalCost,
                  }).select("id").single();

                  if (artifact?.id) {
                    await serviceClient.from("code_artifacts").insert({
                      output_id: artifact.id,
                      files_affected: [{ path: subtask.file_path, type: subtask.file_type, language: ext }],
                      build_status: "pending", test_status: "pending",
                    });
                  }

                  if (subtaskJobId) await completeJob(subtaskJobId, {
                    artifact_id: artifact?.id, file_path: subtask.file_path,
                    chain_of_agents: true, qa_approved: qaApproved,
                  }, { model: "google/gemini-2.5-flash", costUsd: totalCost, durationMs: 0 });

                  codeFilesGenerated++;
                } else if (hasFilePath) {
                  // ===== SINGLE AGENT CODE MODE (no chain) =====
                  const ext = subtask.file_path.split(".").pop() || "ts";
                  const langMap: Record<string, string> = { tsx: "TypeScript React (TSX)", ts: "TypeScript", css: "CSS", json: "JSON", js: "JavaScript", html: "HTML", sql: "SQL (PostgreSQL)" };
                  const language = langMap[ext] || "TypeScript";
                  const assignedAgent = devAgent || defaultAgent;
                  const isBackendFileSingle = ["schema", "migration", "edge_function", "seed", "supabase_client", "auth_config"].includes(subtask.file_type || "");

                  const contextFiles = Object.entries(generatedFiles);
                  let contextStr = "";
                  for (const [fp, content] of contextFiles) {
                    const entry = `\n--- ${fp} ---\n${content.slice(0, 800)}\n`;
                    if (contextStr.length + entry.length > 6000) break;
                    contextStr += entry;
                  }

                  const singleBackendRules = isBackendFileSingle ? `
REGRAS PARA ARQUIVOS BACKEND (Supabase):
- Para file_type "schema" (.sql): Gere CREATE TABLE IF NOT EXISTS, ALTER TABLE ENABLE RLS, CREATE POLICY. Use UUID como PK com gen_random_uuid(). Adicione created_at/updated_at.
- REGRA OBRIGATÓRIA: Todas as tabelas DEVEM ter um prefixo curto derivado do nome do projeto (ex: projeto "TaskFlow" → tf_users, tf_tasks). Use sempre CREATE TABLE IF NOT EXISTS para idempotência.
- Para file_type "edge_function": Gere Edge Function Deno/TypeScript com CORS headers e validação de auth. Use "https://deno.land/std@0.168.0/" e "https://esm.sh/@supabase/supabase-js@2".
- Para file_type "supabase_client": Use createClient com import.meta.env.VITE_SUPABASE_URL e import.meta.env.VITE_SUPABASE_ANON_KEY.
- Para file_type "seed": Gere INSERT statements. Use os nomes de tabela COM prefixo.
- Para .env.example: Liste VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.` : "";

                  const result = await callAI(
                    LOVABLE_API_KEY,
                    `Você é um desenvolvedor expert em Full-Stack com Vite + React + TypeScript + Tailwind CSS + Supabase.\nVocê está gerando o arquivo "${subtask.file_path}".\n\nREGRAS:\n- Retorne APENAS o conteúdo do arquivo, sem markdown, sem \`\`\`, sem explicações.\n- Código COMPLETO e FUNCIONAL.\n- Use componentes shadcn/ui e Tailwind CSS (para frontend).\n- Siga as melhores práticas de ${language}.\n${singleBackendRules}\n\nREGRAS PARA package.json:\n- NÃO inclua "shadcn/ui", "shadcn-ui", "@shadcn/ui" ou "shadcn" como dependência. Componentes shadcn/ui são copiados localmente, não são pacotes npm.\n- NÃO inclua "@radix/ui" ou "radix-ui". Use pacotes individuais como "@radix-ui/react-dialog".\n- Use "lucide-react" (não "lucide").\n- SEMPRE inclua "type": "module" no package.json.\n- SEMPRE inclua @vitejs/plugin-react-swc, typescript, tailwindcss, autoprefixer, postcss em devDependencies.\n- NÃO use @vitejs/plugin-react.\n\nARQUIVOS DE DEPLOY (conteúdo EXATO se o arquivo for um destes):\n- vercel.json: {"framework":"vite","installCommand":"rm -f package-lock.json && npm install --include=dev","buildCommand":"npm run build","outputDirectory":"dist","rewrites":[{"source":"/(.*)", "destination":"/index.html"}]}\n- public/_redirects: /* /index.html 200\n- index.html: NÃO use href="/" em tags link/canonical.`,
                    `## Projeto: ${initiative.title}\n## Descrição: ${initiative.description || initiative.refined_idea || ""}\n\n## Estrutura do projeto:\n${projectStructure}\n\n## Arquivos já gerados:\n${contextStr || "(nenhum)"}\n\n## Arquivo: ${subtask.file_path}\n## Tipo: ${subtask.file_type || "code"}\n## Tarefa: ${subtask.description}\n\n${initiative.prd_content ? `## PRD:\n${initiative.prd_content.slice(0, 1500)}` : ""}\n${initiative.architecture_content ? `## Arquitetura:\n${initiative.architecture_content.slice(0, 1500)}` : ""}${supabaseConnInfo}${memoryContext}\n\nGere o conteúdo COMPLETO do arquivo. Retorne APENAS o código.`
                  );

                  let codeContent = result.content.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();
                  
                  // Override deploy-critical files with deterministic content
                  if (DETERMINISTIC_FILES[subtask.file_path]) {
                    codeContent = DETERMINISTIC_FILES[subtask.file_path];
                    console.log(`[DETERMINISTIC] Overriding AI output for ${subtask.file_path}`);
                  }
                  // Post-process (e.g., sanitize package.json)
                  if (POST_PROCESSORS[subtask.file_path]) {
                    codeContent = POST_PROCESSORS[subtask.file_path](codeContent);
                  }
                  
                  generatedFiles[subtask.file_path] = codeContent;

                  await serviceClient.from("story_subtasks").update({
                    output: codeContent, status: "completed", executed_at: new Date().toISOString(),
                  }).eq("id", subtask.id);

                  const { data: artifact } = await serviceClient.from("agent_outputs").insert({
                    organization_id: initiative.organization_id, workspace_id: initiative.workspace_id || null,
                    initiative_id: initiativeId,
                    agent_id: assignedAgent.id, subtask_id: subtask.id, type: "code", status: "draft",
                    summary: `${subtask.file_path} — ${subtask.description.slice(0, 150)}`,
                    raw_output: { file_path: subtask.file_path, file_type: subtask.file_type, language: ext, content: codeContent },
                    model_used: result.model, prompt_used: subtask.description,
                    tokens_used: result.tokens, cost_estimate: result.costUsd,
                  }).select("id").single();

                  if (artifact?.id) {
                    await serviceClient.from("code_artifacts").insert({
                      output_id: artifact.id,
                      files_affected: [{ path: subtask.file_path, type: subtask.file_type, language: ext }],
                      build_status: "pending", test_status: "pending",
                    });
                  }

                  if (subtaskJobId) await completeJob(subtaskJobId, { artifact_id: artifact?.id, file_path: subtask.file_path, tokens: result.tokens }, result);
                  totalTokens += result.tokens; totalCost += result.costUsd;
                  codeFilesGenerated++;
                } else {
                  // ===== TEXT MODE (non-code subtasks) =====
                  const assignedAgent = pickAgent(subtask.description, agentsByRole, defaultAgent);
                  const result = await callAI(
                    LOVABLE_API_KEY,
                    `Você é o agente "${assignedAgent.name}" (${assignedAgent.role}) no AxionOS.\n${assignedAgent.description || ""}\nExecute a subtask abaixo com maestria. Responda em pt-BR.`,
                    `## Story: ${story.title}\n## Fase: ${phase.name}\n## Subtask: ${subtask.description}\n\nProduza o output completo.`
                  );

                  await serviceClient.from("story_subtasks").update({
                    output: result.content, status: "completed", executed_at: new Date().toISOString(),
                  }).eq("id", subtask.id);

                  const outputType = assignedAgent.role === "architect" ? "decision" : ["dev", "devops"].includes(assignedAgent.role) ? "code" : ["analyst", "po", "pm"].includes(assignedAgent.role) ? "content" : "analysis";

                  const { data: artifact } = await serviceClient.from("agent_outputs").insert({
                    organization_id: initiative.organization_id, workspace_id: initiative.workspace_id || null,
                    initiative_id: initiativeId,
                    agent_id: assignedAgent.id, subtask_id: subtask.id, type: outputType, status: "draft",
                    summary: subtask.description?.slice(0, 200), raw_output: { text: result.content },
                    model_used: result.model, prompt_used: subtask.description,
                    tokens_used: result.tokens, cost_estimate: result.costUsd,
                  }).select("id").single();

                  if (subtaskJobId) await completeJob(subtaskJobId, { artifact_id: artifact?.id, tokens: result.tokens }, result);
                  totalTokens += result.tokens; totalCost += result.costUsd;
                }

                executedCount++;
                await updateProgress(executedCount + failedCount, subtask.file_path);
              } catch (subtaskErr) {
                await serviceClient.from("story_subtasks").update({ status: "failed" }).eq("id", subtask.id);
                if (subtaskJobId) await failJob(subtaskJobId, subtaskErr instanceof Error ? subtaskErr.message : "Unknown");
                failedCount++;
                await updateProgress(executedCount + failedCount);
                console.error(`Subtask ${subtask.id} failed:`, subtaskErr);
              }
            }; // end executeOneSubtask

            // Execute independent subtasks in parallel (batches of 3)
            const PARALLEL_BATCH = 3;
            if (parallelSubtasks.length > 0) {
              console.log(`[PARALLEL] Executing ${parallelSubtasks.length} independent subtasks (config/scaffold/style)`);
              for (let bi = 0; bi < parallelSubtasks.length; bi += PARALLEL_BATCH) {
                const batch = parallelSubtasks.slice(bi, bi + PARALLEL_BATCH);
                await Promise.all(batch.map(st => executeOneSubtask(st)));
              }
            }

            // Execute dependent subtasks sequentially
            for (const subtask of sequentialSubtasks) {
              await executeOneSubtask(subtask);
            }

            const { count: pendingCount } = await serviceClient.from("story_subtasks")
              .select("*", { count: "exact", head: true })
              .eq("phase_id", phase.id).neq("status", "completed");
            if (pendingCount === 0) await serviceClient.from("story_phases").update({ status: "completed" }).eq("id", phase.id);
          }

          const { count: pendingPhases } = await serviceClient.from("story_phases")
            .select("*", { count: "exact", head: true })
            .eq("story_id", story.id).neq("status", "completed");
          if (pendingPhases === 0) await serviceClient.from("stories").update({ status: "done" }).eq("id", story.id);
        }

        // Mark progress as complete
        await serviceClient.from("initiatives").update({
          stage_status: "validating",
          execution_progress: {
            current: totalSubtasks, total: totalSubtasks, percent: 100,
            executed: executedCount, failed: failedCount,
            code_files: codeFilesGenerated, tokens: totalTokens, cost_usd: totalCost,
            chain_of_agents: hasChain, status: "completed",
            completed_at: new Date().toISOString(),
          },
        }).eq("id", initiativeId);
        if (masterJobId) await completeJob(masterJobId, {
          executed: executedCount, failed: failedCount,
          code_files: codeFilesGenerated, total_tokens: totalTokens,
          chain_of_agents: hasChain,
        }, { model: "google/gemini-2.5-flash", costUsd: totalCost, durationMs: 0 });

        await log("pipeline_execution_complete", `Execução Chain-of-Agents concluída: ${executedCount} subtasks (${codeFilesGenerated} arquivos), ${failedCount} falhas`, {
          total_tokens: totalTokens, cost_usd: totalCost, code_files: codeFilesGenerated, chain_of_agents: hasChain,
        });

        // === MEMORY EXTRACTION: Learn from this execution ===
        try {
          const memoryResult = await callAI(
            LOVABLE_API_KEY,
            `Você é um sistema de memória organizacional. Analise a execução de um projeto e extraia lições aprendidas, padrões úteis e decisões arquiteturais que devem ser lembradas para projetos futuros.\n\nRetorne APENAS JSON válido.`,
            `Projeto: "${initiative.title}"\nDescrição: ${initiative.description || initiative.refined_idea || ""}\nStack: ${initiative.suggested_stack || "React + Vite + TypeScript"}\nArquivos gerados: ${Object.keys(generatedFiles).join(", ")}\nSubtasks executadas: ${executedCount}, falhas: ${failedCount}\n\nExtraia 3-5 lições aprendidas no formato JSON:\n{"memories": [{"key": "nome_curto_da_lição", "value": "descrição da lição (max 200 chars)", "type": "lesson_learned|pattern|architectural_decision|best_practice"}]}`,
            true
          );

          const memParsed = JSON.parse(memoryResult.content);
          const newMemories = memParsed.memories || [];
          
          // Save memories for each agent in the squad
          const agentIds = squadMembers.map((sm: any) => sm.agents?.id).filter(Boolean);
          for (const mem of newMemories.slice(0, 5)) {
            for (const agentId of agentIds) {
              await serviceClient.from("agent_memory").insert({
                agent_id: agentId,
                organization_id: initiative.organization_id,
                initiative_id: initiativeId,
                memory_type: mem.type || "lesson_learned",
                key: (mem.key || "unknown").slice(0, 200),
                value: (mem.value || "").slice(0, 500),
                scope: "organization",
                relevance_score: 0.8,
              });
            }
          }

          // Save architectural decisions to org knowledge base
          const archDecisions = newMemories.filter((m: any) => m.type === "architectural_decision");
          for (const dec of archDecisions) {
            await serviceClient.from("org_knowledge_base").insert({
              organization_id: initiative.organization_id,
              category: "architectural_decision",
              title: dec.key,
              content: dec.value,
              source_initiative_id: initiativeId,
              tags: [initiative.suggested_stack || "general"].filter(Boolean),
            });
          }

          console.log(`[MEMORY] Extracted ${newMemories.length} memories, ${archDecisions.length} ADRs from execution`);
        } catch (memErr) {
          console.warn("[MEMORY] Failed to extract memories:", memErr);
        }

        return new Response(JSON.stringify({
          success: true, executed: executedCount, failed: failedCount,
          code_files: codeFilesGenerated, chain_of_agents: hasChain,
          tokens: totalTokens, cost_usd: totalCost, job_id: masterJobId,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        if (masterJobId) await failJob(masterJobId, e instanceof Error ? e.message : "Unknown error");
        throw e;
      }
    }

    // ========== STAGE 5: VALIDATION ==========
    if (stage === "validation") {
      const jobId = await createJob("validation", { initiative_id: initiativeId, mode: "batched" });

      // Mark stale validation jobs as failed to avoid permanent "running" state after timeout/redeploy
      if (jobId) {
        await serviceClient.from("initiative_jobs").update({
          status: "failed",
          error: "Execução interrompida antes de finalizar (timeout/redeploy).",
          completed_at: new Date().toISOString(),
        })
          .eq("initiative_id", initiativeId)
          .eq("stage", "validation")
          .eq("status", "running")
          .neq("id", jobId);
      }

      await log("pipeline_validation_start", "Iniciando validação de qualidade dos artefatos...");

      try {
        // Fetch all artifacts for this initiative's subtasks
        const { data: stories } = await serviceClient.from("stories")
          .select("id").eq("initiative_id", initiativeId);

        if (!stories || stories.length === 0) throw new Error("Nenhuma story encontrada");

        const storyIds = stories.map((s: any) => s.id);
        const { data: phases } = await serviceClient.from("story_phases")
          .select("id").in("story_id", storyIds);

        const phaseIds = (phases || []).map((p: any) => p.id);
        const { data: subtasks } = await serviceClient.from("story_subtasks")
          .select("id").in("phase_id", phaseIds);

        const subtaskIds = (subtasks || []).map((st: any) => st.id);

        const { data: artifacts } = await serviceClient.from("agent_outputs")
          .select("id, type, summary, raw_output, agent_id, tokens_used, model_used, status, subtask_id, cost_estimate, agents(name, role)")
          .in("subtask_id", subtaskIds.length > 0 ? subtaskIds : ["00000000-0000-0000-0000-000000000000"])
          .eq("organization_id", initiative.organization_id);

        if (!artifacts || artifacts.length === 0) throw new Error("Nenhum artefato encontrado para validar");

        // Batch mode: only process a subset each run to avoid edge runtime timeout
        const artifactsToValidate = artifacts.filter((artifact: any) => artifact.status !== "approved");
        const VALIDATION_BATCH_SIZE = 8;
        const artifactsBatch = artifactsToValidate.slice(0, VALIDATION_BATCH_SIZE);

        if (artifactsToValidate.length === 0) {
          await updateInit({ stage_status: "ready_to_publish" });
          if (jobId) {
            await completeJob(jobId, {
              artifacts_validated: artifacts.length,
              passed: artifacts.length,
              failed: 0,
              reworked: 0,
              auto_approved: 0,
              auto_rejected: 0,
              warnings: 0,
              remaining_to_validate: 0,
              batch_incomplete: false,
              overall_pass: true,
              skipped: "all_already_approved",
            }, { model: "google/gemini-2.5-flash", costUsd: 0, durationMs: 0 });
          }

          return new Response(JSON.stringify({
            success: true,
            artifacts_validated: artifacts.length,
            passed: artifacts.length,
            failed: 0,
            reworked: 0,
            auto_approved: 0,
            auto_rejected: 0,
            warnings: 0,
            remaining_to_validate: 0,
            batch_incomplete: false,
            overall_pass: true,
            job_id: jobId,
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        let totalTokens = 0;
        let totalCost = 0;
        let passCount = 0;
        let failCount = 0;
        let reworkedCount = 0;
        let autoApprovedCount = 0;
        let autoRejectedCount = 0;
        const validationResults: any[] = [];
        const MAX_REWORK_ATTEMPTS = 2;
        const APPROVAL_THRESHOLD = 70;
        const REWORK_THRESHOLD = 50;

        // Fetch squad for cross-review (Architect validates code artifacts)
        let architectAgentForReview: any = null;
        const { data: squadsForReview } = await serviceClient.from("squads")
          .select("id, squad_members(role_in_squad, agents(id, name, role))")
          .eq("initiative_id", initiativeId)
          .limit(1);
        if (squadsForReview?.[0]?.squad_members) {
          const archMember = squadsForReview[0].squad_members.find((sm: any) => sm.role_in_squad === "architect");
          architectAgentForReview = archMember?.agents || null;
        }

        for (const artifact of artifactsBatch) {
          let currentOutput = artifact.raw_output;
          let currentArtifactId = artifact.id;
          let finalValidation: any = null;
          let reworkAttempts = 0;

          // === Validation + Auto-Rework Loop ===
          for (let attempt = 0; attempt <= MAX_REWORK_ATTEMPTS; attempt++) {
            const artifactText = typeof currentOutput === "object"
              ? (currentOutput as any)?.text || (currentOutput as any)?.content || JSON.stringify(currentOutput)
              : String(currentOutput);

            const validationStart = Date.now();
            const result = await callAI(
              LOVABLE_API_KEY,
              `Você é um revisor de qualidade sênior do AxionOS. Analise o artefato e avalie sua qualidade.
Retorne APENAS JSON válido. Seja rigoroso mas justo.`,
              `## Artefato para validação
- **Tipo**: ${artifact.type}
- **Agente**: ${(artifact as any).agents?.name || "?"} (${(artifact as any).agents?.role || "?"})
- **Resumo**: ${artifact.summary || "N/A"}
${attempt > 0 ? `\n- **Tentativa de retrabalho**: ${attempt}/${MAX_REWORK_ATTEMPTS}` : ""}

## Conteúdo do artefato
${artifactText.slice(0, 5000)}

## Avalie nos critérios (0-100 cada):
{
  "scores": { "completeness": 0, "technical_quality": 0, "clarity": 0, "best_practices": 0, "actionability": 0 },
  "overall_score": 0,
  "result": "pass|fail|warning",
  "issues": ["problemas"],
  "suggestions": ["melhorias"],
  "summary": "resumo 1-2 frases",
  "verdict": "approve|reject|request_changes"
}

Regras de decisão:
- overall_score >= ${APPROVAL_THRESHOLD} → result="pass", verdict="approve"
- overall_score ${REWORK_THRESHOLD}-${APPROVAL_THRESHOLD - 1} → result="warning", verdict="request_changes"
- overall_score < ${REWORK_THRESHOLD} → result="fail", verdict="reject"`,
              true
            );

            let validation: any;
            try {
              validation = JSON.parse(result.content);
            } catch {
              validation = { overall_score: 50, result: "warning", verdict: "request_changes", summary: "Falha ao parsear validação", issues: [], suggestions: [], scores: {} };
            }

            const validationDuration = Date.now() - validationStart;
            totalTokens += result.tokens;
            totalCost += result.costUsd;

            // Record validation run
            await serviceClient.from("validation_runs").insert({
              artifact_id: currentArtifactId,
              type: attempt > 0 ? "ai_quality_review_post_rework" : "ai_quality_review",
              result: validation.result || "warning",
              logs: JSON.stringify({
                scores: validation.scores,
                overall_score: validation.overall_score,
                issues: validation.issues,
                suggestions: validation.suggestions,
                summary: validation.summary,
                verdict: validation.verdict,
                attempt: attempt,
              }),
              duration: validationDuration,
            });

            // Record AI analysis as review
            await serviceClient.from("artifact_reviews").insert({
              output_id: currentArtifactId,
              reviewer_id: user.id,
              action: "ai_analysis",
              previous_status: artifact.status,
              new_status: artifact.status,
              comment: JSON.stringify(validation),
            });

            finalValidation = validation;
            const score = validation.overall_score || 0;

            // === CROSS-REVIEW: Architect validates architectural decisions for code artifacts ===
            if (score >= APPROVAL_THRESHOLD && artifact.type === "code" && architectAgentForReview) {
              try {
                const archCrossReview = await callAI(
                  LOVABLE_API_KEY,
                  `Você é o Architect "${architectAgentForReview.name}" no AxionOS. Faça uma CROSS-REVIEW arquitetural deste artefato de código.
Avalie APENAS aspectos arquiteturais: padrões de projeto, separação de responsabilidades, escalabilidade, naming conventions, integração com o ecossistema.
Retorne APENAS JSON: {"arch_approved": true/false, "arch_score": 0-100, "arch_issues": ["lista"], "arch_notes": "observações"}`,
                  `## Artefato: ${artifact.summary || "código"}
## Conteúdo:
${artifactText.slice(0, 4000)}`,
                  true
                );

                totalTokens += archCrossReview.tokens;
                totalCost += archCrossReview.costUsd;

                let archFeedback: any;
                try { archFeedback = JSON.parse(archCrossReview.content); } catch { archFeedback = { arch_approved: true, arch_score: 80, arch_issues: [], arch_notes: "" }; }

                // Record architectural cross-review
                await serviceClient.from("validation_runs").insert({
                  artifact_id: currentArtifactId,
                  type: "architect_cross_review",
                  result: archFeedback.arch_approved ? "pass" : "warning",
                  logs: JSON.stringify(archFeedback),
                  duration: archCrossReview.durationMs,
                });

                await serviceClient.from("artifact_reviews").insert({
                  output_id: currentArtifactId,
                  reviewer_id: user.id,
                  action: "architect_cross_review",
                  previous_status: artifact.status,
                  new_status: artifact.status,
                  comment: JSON.stringify(archFeedback),
                });

                // If Architect disapproves and score is low, downgrade to warning
                if (!archFeedback.arch_approved && (archFeedback.arch_score || 0) < 60) {
                  validation.overall_score = Math.round((score + (archFeedback.arch_score || 50)) / 2);
                  validation.issues = [...(validation.issues || []), ...(archFeedback.arch_issues || [])];
                  validation.arch_cross_review = archFeedback;
                  finalValidation = validation;
                  // Don't approve yet — let it fall through to rework
                  if (validation.overall_score < APPROVAL_THRESHOLD) {
                    if (attempt < MAX_REWORK_ATTEMPTS) {
                      // Continue to rework
                    } else {
                      // Escalate
                      await serviceClient.from("agent_outputs")
                        .update({ status: "pending_review" })
                        .eq("id", currentArtifactId);
                      failCount++;
                      break;
                    }
                    continue;
                  }
                }
              } catch (archErr) {
                console.warn("Architect cross-review failed, continuing with QA result:", archErr);
              }
            }

            // === AUTO-APPROVE: score >= threshold ===
            if (score >= APPROVAL_THRESHOLD) {
              await serviceClient.from("agent_outputs")
                .update({ status: "approved" })
                .eq("id", currentArtifactId);

              await serviceClient.from("artifact_reviews").insert({
                output_id: currentArtifactId,
                reviewer_id: user.id,
                action: "auto_approved",
                previous_status: artifact.status,
                new_status: "approved",
                comment: `Aprovado automaticamente pela IA. Score: ${score}/100. Confiança alta. ${attempt > 0 ? `Aprovado após ${attempt} retrabalho(s).` : "Aprovado na primeira análise."}`,
              });

              passCount++;
              autoApprovedCount++;
              await log("artifact_auto_approved", `Artefato ${artifact.summary?.slice(0, 50)} aprovado automaticamente (score ${score})`, { artifact_id: currentArtifactId, score, attempt });
              break;
            }

            // === AUTO-REJECT: score < rework threshold ===
            if (score < REWORK_THRESHOLD) {
              await serviceClient.from("agent_outputs")
                .update({ status: "rejected" })
                .eq("id", currentArtifactId);

              await serviceClient.from("artifact_reviews").insert({
                output_id: currentArtifactId,
                reviewer_id: user.id,
                action: "auto_rejected",
                previous_status: artifact.status,
                new_status: "rejected",
                comment: `Rejeitado automaticamente pela IA. Score: ${score}/100. Problemas graves: ${(validation.issues || []).join("; ")}`,
              });

              failCount++;
              autoRejectedCount++;
              await log("artifact_auto_rejected", `Artefato ${artifact.summary?.slice(0, 50)} rejeitado (score ${score})`, { artifact_id: currentArtifactId, score });
              break;
            }

            // === AUTO-REWORK: score between thresholds, still has attempts ===
            if (attempt < MAX_REWORK_ATTEMPTS) {
              reworkAttempts++;
              reworkedCount++;

              const feedbackForRework = [
                ...(validation.issues || []).map((i: string) => `Problema: ${i}`),
                ...(validation.suggestions || []).map((s: string) => `Sugestão: ${s}`),
              ].join("\n");

              const reworkResult = await callAI(
                LOVABLE_API_KEY,
                `Você é o agente "${(artifact as any).agents?.name || "Dev"}" (${(artifact as any).agents?.role || "dev"}).
Está fazendo RETRABALHO de um artefato que recebeu score ${score}/100 na validação automática.
Corrija TODOS os problemas e incorpore as sugestões. Retorne o output COMPLETO e corrigido.`,
                `## Output Atual
\`\`\`
${artifactText.slice(0, 6000)}
\`\`\`

## Feedback da Validação (score: ${score}/100)
${feedbackForRework}

## Resumo da Validação
${validation.summary}

Retorne o output COMPLETO corrigido. Sem markdown wrapping, sem explicações extras.`
              );

              const newOutput = reworkResult.content.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();
              totalTokens += reworkResult.tokens;
              totalCost += reworkResult.costUsd;

              // Update artifact with reworked content
              currentOutput = artifact.type === "code"
                ? { ...(typeof artifact.raw_output === "object" ? artifact.raw_output : {}), content: newOutput, text: newOutput }
                : { text: newOutput };

              await serviceClient.from("agent_outputs").update({
                raw_output: currentOutput,
                tokens_used: (artifact.tokens_used || 0) + reworkResult.tokens,
                cost_estimate: Number(artifact.cost_estimate || 0) + reworkResult.costUsd,
                updated_at: new Date().toISOString(),
              }).eq("id", currentArtifactId);

              // Update subtask output if linked
              if (artifact.subtask_id) {
                await serviceClient.from("story_subtasks").update({
                  output: newOutput,
                  executed_at: new Date().toISOString(),
                }).eq("id", artifact.subtask_id);
              }

              await serviceClient.from("artifact_reviews").insert({
                output_id: currentArtifactId,
                reviewer_id: user.id,
                action: "auto_rework",
                previous_status: artifact.status,
                new_status: "draft",
                comment: JSON.stringify({
                  iteration: attempt + 1,
                  previous_score: score,
                  trigger: "validation_gate",
                  feedback_summary: feedbackForRework.slice(0, 500),
                }),
              });

              await log("artifact_auto_reworked", `Artefato ${artifact.summary?.slice(0, 50)} retrabalhado automaticamente (score ${score} → tentativa ${attempt + 1})`, {
                artifact_id: currentArtifactId, score, attempt: attempt + 1,
              });

              // Loop continues to re-validate...
            } else {
              // Max rework attempts reached, escalate to human
              await serviceClient.from("agent_outputs")
                .update({ status: "pending_review" })
                .eq("id", currentArtifactId);

              await serviceClient.from("artifact_reviews").insert({
                output_id: currentArtifactId,
                reviewer_id: user.id,
                action: "escalated_to_human",
                previous_status: artifact.status,
                new_status: "pending_review",
                comment: `Escalado para revisão humana após ${MAX_REWORK_ATTEMPTS} retrabalhos automáticos. Último score: ${score}/100. Issues: ${(validation.issues || []).join("; ")}`,
              });

              await log("artifact_escalated", `Artefato ${artifact.summary?.slice(0, 50)} escalado para revisão humana (score ${score}, ${MAX_REWORK_ATTEMPTS} tentativas)`, {
                artifact_id: currentArtifactId, score,
              });
              break;
            }
          }

          validationResults.push({
            artifact_id: currentArtifactId,
            type: artifact.type,
            agent: (artifact as any).agents?.name,
            score: finalValidation?.overall_score || 0,
            result: finalValidation?.result || "warning",
            verdict: finalValidation?.verdict || "request_changes",
            summary: finalValidation?.summary,
            rework_attempts: reworkAttempts,
            arch_cross_review: finalValidation?.arch_cross_review || null,
            final_status:
              finalValidation?.verdict === "approve"
                ? "approved"
                : finalValidation?.verdict === "reject"
                  ? "rejected"
                  : "pending_review",
          });
        }

        // Recalculate final status based on all artifacts after batch processing
        const { data: artifactsAfter } = await serviceClient.from("agent_outputs")
          .select("id, status")
          .in("subtask_id", subtaskIds.length > 0 ? subtaskIds : ["00000000-0000-0000-0000-000000000000"])
          .eq("organization_id", initiative.organization_id);

        const artifactsFinal = artifactsAfter || artifacts;
        const artifactsTotal = artifactsFinal.length;
        const approvedCountFinal = artifactsFinal.filter((a: any) => a.status === "approved").length;
        const rejectedCountFinal = artifactsFinal.filter((a: any) => a.status === "rejected").length;
        const pendingReviewCountFinal = artifactsFinal.filter((a: any) => a.status === "pending_review").length;
        const remainingToValidate = Math.max(artifactsTotal - approvedCountFinal, 0);
        const batchIncomplete = artifactsToValidate.length > artifactsBatch.length;

        const overallPass = artifactsTotal > 0 && approvedCountFinal === artifactsTotal;
        const nextStatus = overallPass ? "ready_to_publish" : "validating";

        await updateInit({ stage_status: nextStatus });

        if (jobId) await completeJob(jobId, {
          artifacts_validated: artifactsTotal,
          processed_in_batch: artifactsBatch.length,
          passed: approvedCountFinal,
          failed: rejectedCountFinal,
          pending_review: pendingReviewCountFinal,
          reworked: reworkedCount,
          auto_approved: autoApprovedCount,
          auto_rejected: autoRejectedCount,
          warnings: pendingReviewCountFinal,
          results: validationResults,
          remaining_to_validate: remainingToValidate,
          batch_incomplete: batchIncomplete,
          overall_pass: overallPass,
        }, { model: "google/gemini-2.5-flash", costUsd: totalCost, durationMs: 0 });

        await log("pipeline_validation_complete",
          `Validação em lote concluída: ${artifactsBatch.length} processados, ${remainingToValidate} pendentes para aprovação, ${rejectedCountFinal} rejeitados`, {
          total_tokens: totalTokens,
          cost_usd: totalCost,
          overall_pass: overallPass,
          batch_incomplete: batchIncomplete,
          remaining_to_validate: remainingToValidate,
          auto_approved: autoApprovedCount,
          reworked: reworkedCount,
          auto_rejected: autoRejectedCount,
        });

        return new Response(JSON.stringify({
          success: true,
          artifacts_validated: artifactsTotal,
          processed_in_batch: artifactsBatch.length,
          passed: approvedCountFinal,
          failed: rejectedCountFinal,
          pending_review: pendingReviewCountFinal,
          reworked: reworkedCount,
          auto_approved: autoApprovedCount,
          auto_rejected: autoRejectedCount,
          remaining_to_validate: remainingToValidate,
          batch_incomplete: batchIncomplete,
          overall_pass: overallPass,
          results: validationResults,
          tokens: totalTokens,
          cost_usd: totalCost,
          job_id: jobId,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        if (jobId) await failJob(jobId, e instanceof Error ? e.message : "Unknown error");
        throw e;
      }
    }

    // ========== STAGE 6: PUBLISH (create NEW repo, commit artifacts, open PR or push to main) ==========
    if (stage === "publish") {
      let resolvedGithubToken = github_token;
      let resolvedOwner = owner;
      let resolvedRepo = repo;
      let resolvedBaseBranch = base_branch || "main";

      // Fallback to active Git connection when publish params are not explicitly provided
      if (!resolvedGithubToken || !resolvedOwner) {
        const { data: gitConns } = await serviceClient
          .from("git_connections")
          .select("github_token, repo_owner, repo_name, default_branch")
          .eq("organization_id", initiative.organization_id)
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(1);

        const fallbackConn = gitConns?.[0];
        if (fallbackConn) {
          resolvedGithubToken = resolvedGithubToken || fallbackConn.github_token;
          resolvedOwner = resolvedOwner || fallbackConn.repo_owner;
          resolvedRepo = resolvedRepo || fallbackConn.repo_name;
          resolvedBaseBranch = base_branch || fallbackConn.default_branch || "main";
        }
      }

      if (!resolvedGithubToken || !resolvedOwner) {
        return new Response(JSON.stringify({ error: "github_token e owner são obrigatórios para publicar. Configure uma conexão Git ativa ou informe os parâmetros no request." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate a slug for the new repo name
      const repoSlug = (resolvedRepo || initiative.title)
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50) || `axion-${initiativeId.slice(0, 8)}`;

      const jobId = await createJob("publish", { owner: resolvedOwner, repo: repoSlug, base_branch: resolvedBaseBranch });
      await log("pipeline_publish_start", "Criando novo repositório e publicando artefatos...");

      const ghHeaders = {
        Authorization: `Bearer ${resolvedGithubToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      };
      const GITHUB_API = "https://api.github.com";

      // Publish directly to base branch (no branch/PR)

      try {
        // 1. CREATE NEW REPOSITORY via GitHub API
        let actualOwner = resolvedOwner;
        let actualRepo = repoSlug;
        let repoHtmlUrl: string;

        // Check if creating under an org or user
        let createUrl = `${GITHUB_API}/user/repos`;
        const createBody: any = {
          name: repoSlug,
          description: `${initiative.title} — Gerado pelo AxionOS`,
          private: false,
          auto_init: true,
        };

        // Check if owner is an org
        const orgCheck = await fetch(`${GITHUB_API}/orgs/${resolvedOwner}`, { headers: ghHeaders });
        if (orgCheck.ok) {
          createUrl = `${GITHUB_API}/orgs/${resolvedOwner}/repos`;
        }

        const createRepoResp = await fetch(createUrl, {
          method: "POST",
          headers: ghHeaders,
          body: JSON.stringify(createBody),
        });

        if (createRepoResp.ok) {
          const repoData = await createRepoResp.json();
          actualOwner = repoData.owner?.login || resolvedOwner;
          actualRepo = repoData.name || repoSlug;
          repoHtmlUrl = repoData.html_url;
          console.log(`Created new repo: ${actualOwner}/${actualRepo}`);
        } else {
          const errData = await createRepoResp.json();
          // If repo already exists, use it
          if (errData.errors?.[0]?.message?.includes("name already exists")) {
            console.log(`Repo ${resolvedOwner}/${repoSlug} already exists, using it`);
            repoHtmlUrl = `https://github.com/${resolvedOwner}/${repoSlug}`;
          } else {
            throw new Error(`Falha ao criar repositório: ${errData.message}`);
          }
        }

        // Wait a moment for GitHub to initialize the repo
        await new Promise(r => setTimeout(r, 2000));

        // 2. Get base branch SHA
        const baseBranch = resolvedBaseBranch;
        let baseSha: string;
        const refResp = await fetch(`${GITHUB_API}/repos/${actualOwner}/${actualRepo}/git/ref/heads/${baseBranch}`, { headers: ghHeaders });
        if (!refResp.ok) {
          throw new Error(`Branch base '${baseBranch}' não encontrada no novo repositório. Tente novamente.`);
        }
        const refData = await refResp.json();
        baseSha = refData.object.sha;

        // Commits go directly to main

        // 3. Collect all artifacts WITH their subtask file_path
        const { data: stories } = await serviceClient.from("stories")
          .select("id, title").eq("initiative_id", initiativeId);
        const storyIds = (stories || []).map((s: any) => s.id);

        const { data: phases } = await serviceClient.from("story_phases")
          .select("id").in("story_id", storyIds);
        const phaseIds = (phases || []).map((p: any) => p.id);

        const { data: subtasks } = await serviceClient.from("story_subtasks")
          .select("id, description, file_path, file_type").in("phase_id", phaseIds);
        
        // Build a map of subtask_id -> file_path for quick lookup
        const subtaskFileMap = new Map<string, { file_path: string | null; file_type: string | null; description: string }>();
        for (const st of (subtasks || [])) {
          subtaskFileMap.set(st.id, { file_path: st.file_path, file_type: st.file_type, description: st.description });
        }
        const subtaskIds = (subtasks || []).map((st: any) => st.id);

        const { data: artifacts } = await serviceClient.from("agent_outputs")
          .select("id, type, summary, raw_output, subtask_id, agents(name, role)")
          .in("subtask_id", subtaskIds)
          .eq("organization_id", initiative.organization_id);

        if (!artifacts || artifacts.length === 0) throw new Error("Nenhum artefato encontrado para publicar");

        // === AI: Generate semantic commit messages in batch ===
        const fileList = artifacts.map((art: any, i: number) => {
          const si = art.subtask_id ? subtaskFileMap.get(art.subtask_id) : null;
          const fp = (art.raw_output as any)?.file_path || si?.file_path || `artifact-${i}`;
          return `${i}. ${fp} (${si?.file_type || art.type}) — ${si?.description || art.summary || fp}`;
        });

        const commitMsgResult = await callAI(
          LOVABLE_API_KEY,
          `Você gera commit messages seguindo Conventional Commits (feat:, fix:, chore:, docs:, style:, refactor:, test:).
Regras: max 72 chars por mensagem, imperativo, em inglês, sem ponto final.
Retorne APENAS um JSON array de strings, uma mensagem por arquivo na mesma ordem.`,
          `Arquivos para commit (na ordem):\n${fileList.join("\n")}\n\nRetorne JSON: ["feat: add header component", ...]`,
          true
        );

        let commitMessages: string[] = [];
        try {
          const parsed = JSON.parse(commitMsgResult.content);
          commitMessages = Array.isArray(parsed) ? parsed : (parsed.messages || parsed.commits || []);
        } catch { commitMessages = []; }

        // ===== BUILD HEALTH REPORT: comprehensive checklist before push =====
        interface HealthCheck {
          id: string;
          category: "package.json" | "vite.config.ts" | "vercel.json" | "tsconfig" | "general";
          label: string;
          status: "pass" | "fail" | "warn" | "fixed";
          detail?: string;
        }

        const buildHealthReport = (artifacts: any[], subtaskFileMap: Map<string, any>) => {
          const checks: HealthCheck[] = [];
          const issues: string[] = [];

          // Collect file contents from artifacts
          const fileMap: Record<string, { content: string; artRef: any }> = {};
          for (const art of artifacts) {
            const si = art.subtask_id ? subtaskFileMap.get(art.subtask_id) : null;
            const fp = (art.raw_output as any)?.file_path || si?.file_path;
            if (!fp) continue;
            const raw = art.raw_output as any;
            let content = raw?.content || raw?.text || (typeof raw === "string" ? raw : "");
            // If raw_output is the actual JSON object (e.g. package.json stored as object), stringify it
            if (!content && raw && typeof raw === "object" && !Array.isArray(raw) && raw.file_path === undefined) {
              // Check if this looks like a package.json object (has name or dependencies)
              if (raw.name || raw.dependencies || raw.devDependencies || raw.scripts) {
                content = JSON.stringify(raw, null, 2);
              }
            }
            if (content) fileMap[fp] = { content, artRef: raw };
          }

          // ---- package.json checks ----
          const pkgEntry = fileMap["package.json"];
          if (!pkgEntry) {
            checks.push({ id: "pkg-exists", category: "package.json", label: "Arquivo package.json presente", status: "fail", detail: "Nenhum package.json encontrado nos artefatos" });
          } else {
            checks.push({ id: "pkg-exists", category: "package.json", label: "Arquivo package.json presente", status: "pass" });
            try {
              // Try to parse, and if it fails try to sanitize common issues first
              let pkgContent = pkgEntry.content;
              let pkg: any;
              try {
                pkg = JSON.parse(pkgContent);
              } catch {
                // Try stripping code fences or extra whitespace
                pkgContent = pkgContent.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();
                try {
                  pkg = JSON.parse(pkgContent);
                } catch {
                  // Last resort: treat as warning, pipeline will inject deterministic package.json
                  checks.push({ id: "pkg-parse", category: "package.json", label: "JSON válido", status: "warn", detail: "Não foi possível parsear — será injetado pelo pipeline" });
                  throw new Error("skip");
                }
              }
              checks.push({ id: "pkg-parse", category: "package.json", label: "JSON válido", status: "pass" });
              const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

              // Check type: module
              if (pkg.type === "module") {
                checks.push({ id: "pkg-esm", category: "package.json", label: "type: \"module\" configurado", status: "pass" });
              } else {
                pkg.type = "module";
                checks.push({ id: "pkg-esm", category: "package.json", label: "type: \"module\" configurado", status: "fixed", detail: "Adicionado automaticamente" });
                issues.push("Added type: module");
              }

              // Check vite version
              const viteVer = allDeps["vite"];
              if (!viteVer) {
                checks.push({ id: "pkg-vite", category: "package.json", label: "Vite presente nas dependências", status: "fail", detail: "Vite não encontrado" });
              } else if (/\^[1-4]\./.test(viteVer)) {
                checks.push({ id: "pkg-vite", category: "package.json", label: "Vite versão ≥ 5.x", status: "fixed", detail: `${viteVer} → ^5.4.19` });
                if (pkg.devDependencies) pkg.devDependencies["vite"] = "^5.4.19";
                if (pkg.dependencies?.["vite"]) { delete pkg.dependencies["vite"]; pkg.devDependencies = pkg.devDependencies || {}; pkg.devDependencies["vite"] = "^5.4.19"; }
                issues.push(`Fixed vite version: ${viteVer} → ^5.4.19`);
              } else {
                checks.push({ id: "pkg-vite", category: "package.json", label: "Vite versão ≥ 5.x", status: "pass", detail: viteVer });
              }

              // Check plugin-react-swc
              if (allDeps["@vitejs/plugin-react"] && !allDeps["@vitejs/plugin-react-swc"]) {
                checks.push({ id: "pkg-swc", category: "package.json", label: "Usa @vitejs/plugin-react-swc", status: "fixed", detail: "Substituído plugin-react por plugin-react-swc" });
                if (pkg.devDependencies?.["@vitejs/plugin-react"]) delete pkg.devDependencies["@vitejs/plugin-react"];
                if (pkg.dependencies?.["@vitejs/plugin-react"]) delete pkg.dependencies["@vitejs/plugin-react"];
                pkg.devDependencies = pkg.devDependencies || {};
                pkg.devDependencies["@vitejs/plugin-react-swc"] = "^3.11.0";
                issues.push("Replaced @vitejs/plugin-react with -swc");
              } else if (allDeps["@vitejs/plugin-react-swc"]) {
                checks.push({ id: "pkg-swc", category: "package.json", label: "Usa @vitejs/plugin-react-swc", status: "pass" });
              } else {
                checks.push({ id: "pkg-swc", category: "package.json", label: "Usa @vitejs/plugin-react-swc", status: "warn", detail: "Plugin não encontrado" });
              }

              // Check banned packages
              const banned = ["shadcn/ui", "shadcn-ui", "@shadcn/ui", "shadcn", "radix-ui", "@radix/ui"];
              let foundBanned = false;
              for (const depKey of ["dependencies", "devDependencies"]) {
                const deps = pkg[depKey];
                if (!deps) continue;
                for (const b of banned) {
                  if (deps[b]) { foundBanned = true; delete deps[b]; issues.push(`Removed banned: ${b}`); }
                }
                for (const name of Object.keys(deps)) {
                  if (/[^a-zA-Z0-9@/_.-]/.test(name)) {
                    foundBanned = true; delete deps[name]; issues.push(`Removed invalid: ${name}`);
                  }
                }
              }
              checks.push({ id: "pkg-banned", category: "package.json", label: "Sem pacotes inválidos/banidos", status: foundBanned ? "fixed" : "pass" });

              // Check build script
              if (pkg.scripts?.build?.includes("tsc &&")) {
                pkg.scripts.build = "vite build";
                checks.push({ id: "pkg-build", category: "package.json", label: "Script build limpo (sem tsc &&)", status: "fixed" });
                issues.push("Fixed build script");
              } else if (pkg.scripts?.build) {
                checks.push({ id: "pkg-build", category: "package.json", label: "Script build limpo (sem tsc &&)", status: "pass" });
              } else {
                checks.push({ id: "pkg-build", category: "package.json", label: "Script build presente", status: "fail" });
              }

              // Check required deps
              const requiredDeps = ["react", "react-dom"];
              for (const rd of requiredDeps) {
                checks.push({ id: `pkg-dep-${rd}`, category: "package.json", label: `Dependência ${rd} presente`, status: allDeps[rd] ? "pass" : "warn", detail: allDeps[rd] || "ausente" });
              }

              // Write back
              if (issues.length > 0) {
                const fixed = JSON.stringify(pkg, null, 2);
                if (pkgEntry.artRef?.content !== undefined) pkgEntry.artRef.content = fixed;
                else if (pkgEntry.artRef?.text !== undefined) pkgEntry.artRef.text = fixed;
              }
            } catch (e) {
              // Only add fail if we haven't already added a warn for parse issues
              if (e instanceof Error && e.message === "skip") { /* already handled */ }
              else { checks.push({ id: "pkg-parse", category: "package.json", label: "JSON válido", status: "warn", detail: "Erro ao processar — será injetado pelo pipeline" }); }
            }
          }

          // ---- vite.config.ts checks ----
          const viteEntry = fileMap["vite.config.ts"];
          if (!viteEntry) {
            checks.push({ id: "vite-exists", category: "vite.config.ts", label: "Arquivo vite.config.ts presente", status: "warn", detail: "Será injetado pelo pipeline" });
          } else {
            checks.push({ id: "vite-exists", category: "vite.config.ts", label: "Arquivo vite.config.ts presente", status: "pass" });
            if (viteEntry.content.includes("@vitejs/plugin-react-swc")) {
              checks.push({ id: "vite-swc", category: "vite.config.ts", label: "Importa plugin-react-swc", status: "pass" });
            } else if (viteEntry.content.includes("@vitejs/plugin-react")) {
              checks.push({ id: "vite-swc", category: "vite.config.ts", label: "Importa plugin-react-swc", status: "fixed", detail: "Corrigido import para -swc" });
              const fixed = viteEntry.content.replace(/@vitejs\/plugin-react"/g, '@vitejs/plugin-react-swc"').replace(/@vitejs\/plugin-react'/g, "@vitejs/plugin-react-swc'");
              if (viteEntry.artRef?.content !== undefined) viteEntry.artRef.content = fixed;
              else if (viteEntry.artRef?.text !== undefined) viteEntry.artRef.text = fixed;
              issues.push("Fixed vite.config.ts plugin import");
            }
            // Check for path alias
            checks.push({ id: "vite-alias", category: "vite.config.ts", label: "Alias @ configurado", status: viteEntry.content.includes("alias") ? "pass" : "warn", detail: viteEntry.content.includes("alias") ? undefined : "Sem alias @ — imports relativos podem quebrar" });
          }

          // ---- vercel.json checks ----
          const vercelEntry = fileMap["vercel.json"];
          checks.push({ id: "vercel-exists", category: "vercel.json", label: "Arquivo vercel.json presente", status: vercelEntry ? "pass" : "pass", detail: vercelEntry ? undefined : "Será injetado pelo pipeline" });
          if (vercelEntry) {
            try {
              const vc = JSON.parse(vercelEntry.content);
              checks.push({ id: "vercel-framework", category: "vercel.json", label: "Framework = vite", status: vc.framework === "vite" ? "pass" : "warn", detail: vc.framework || "não definido" });
              checks.push({ id: "vercel-install", category: "vercel.json", label: "installCommand inclui --include=dev", status: vc.installCommand?.includes("--include=dev") ? "pass" : "warn" });
              checks.push({ id: "vercel-output", category: "vercel.json", label: "outputDirectory = dist", status: vc.outputDirectory === "dist" ? "pass" : "warn", detail: vc.outputDirectory || "não definido" });
              checks.push({ id: "vercel-rewrites", category: "vercel.json", label: "Rewrite SPA configurado", status: vc.rewrites?.length > 0 ? "pass" : "warn" });
            } catch { checks.push({ id: "vercel-parse", category: "vercel.json", label: "JSON válido", status: "fail" }); }
          }

          // ---- General checks ----
          checks.push({ id: "gen-tsconfig-node", category: "tsconfig", label: "tsconfig.node.json (composite: true)", status: "pass", detail: "Injetado pelo pipeline" });

          const passCount = checks.filter(c => c.status === "pass").length;
          const fixedCount = checks.filter(c => c.status === "fixed").length;
          const warnCount = checks.filter(c => c.status === "warn").length;
          const failCount = checks.filter(c => c.status === "fail").length;
          const score = Math.round(((passCount + fixedCount) / checks.length) * 100);

          if (issues.length > 0) {
            console.log(`[BUILD-HEALTH] Fixed ${issues.length} issues:`, issues);
          }

          return {
            checks,
            summary: { total: checks.length, pass: passCount, fixed: fixedCount, warn: warnCount, fail: failCount, score },
            issues,
          };
        };

        const healthReport = buildHealthReport(artifacts, subtaskFileMap);
        if (healthReport.issues.length > 0) {
          await log("pre_publish_validation", `Build Health: score ${healthReport.summary.score}%, corrigidos ${healthReport.summary.fixed} problemas`, { health_report: healthReport });
        } else {
          await log("pre_publish_validation", `Build Health: score ${healthReport.summary.score}% — tudo ok`, { health_report: healthReport });
        }

        // Block publish if critical failures remain after auto-fix
        if (healthReport.summary.fail > 0) {
          const failChecks = healthReport.checks.filter(c => c.status === "fail").map(c => c.label).join(", ");
          await log("pre_publish_blocked", `Publicação bloqueada: ${healthReport.summary.fail} check(s) críticos falharam: ${failChecks}`);
          if (jobId) await completeJob(jobId, { health_report: healthReport, blocked: true }, { model: "none", costUsd: 0, durationMs: 0 });
          return new Response(JSON.stringify({
            success: false,
            blocked: true,
            health_report: healthReport,
            message: `Publicação bloqueada: ${failChecks}`,
          }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 4. Commit each artifact with semantic commit messages
        const committedFiles: string[] = [];
        const skippedFiles: string[] = [];

        for (let i = 0; i < artifacts.length; i++) {
          const art = artifacts[i];
          const rawOutput = art.raw_output as any;
          
          // Get file_path: priority is raw_output.file_path > subtask.file_path > fallback
          const subtaskInfo = art.subtask_id ? subtaskFileMap.get(art.subtask_id) : null;
          const filePath = rawOutput?.file_path || subtaskInfo?.file_path || null;
          
          // Extract content: for code artifacts, use raw_output.content; otherwise raw_output.text
          let fileContent: string;
          if (rawOutput?.content) {
            fileContent = rawOutput.content;
          } else if (rawOutput?.text) {
            fileContent = rawOutput.text;
          } else if (typeof rawOutput === "string") {
            fileContent = rawOutput;
          } else {
            fileContent = JSON.stringify(rawOutput, null, 2);
          }

          // If no file_path, use legacy fallback path
          let commitPath: string;
          if (filePath) {
            commitPath = filePath;
          } else {
            const safeTitle = (art.summary || `artifact-${i}`).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60);
            const ext = art.type === "code" ? "ts" : "md";
            commitPath = `axion-outputs/${art.type}/${safeTitle}.${ext}`;
            // For non-code artifacts without file_path, wrap in markdown
            if (art.type !== "code") {
              fileContent = `# ${art.summary || "Artifact"}\n\n**Agente**: ${(art as any).agents?.name || "?"} (${(art as any).agents?.role || "?"})\n**Tipo**: ${art.type}\n\n---\n\n${fileContent}`;
            }
          }

          // Use AI-generated commit message or fallback
          const commitMsg = commitMessages[i] || `feat: add ${commitPath.split("/").pop()}`;

          const commitResp = await fetch(`${GITHUB_API}/repos/${actualOwner}/${actualRepo}/contents/${commitPath}`, {
            method: "PUT", headers: ghHeaders,
            body: JSON.stringify({
              message: commitMsg,
              content: btoa(unescape(encodeURIComponent(fileContent))),
              branch: baseBranch,
            }),
          });
          if (commitResp.ok) {
            committedFiles.push(commitPath);
          } else {
            const errText = await commitResp.text();
            console.error(`Failed to commit ${commitPath}:`, errText);
            skippedFiles.push(commitPath);
          }
        }

        // Generate README.md automatically
        const hasBackend = committedFiles.some(f => f.includes("supabase") || f.endsWith(".sql") || f.includes("edge_function"));
        const { data: sbConnsForReadme } = await serviceClient
          .from("supabase_connections")
          .select("supabase_url, label")
          .eq("organization_id", initiative.organization_id)
          .eq("status", "active")
          .limit(1);
        const sbConnReadme = sbConnsForReadme?.[0];

        const readmeResult = await callAI(
          LOVABLE_API_KEY,
          `Você gera README.md profissionais para projetos open-source. Retorne APENAS o conteúdo markdown, sem code fences.`,
          `Gere um README.md para o projeto "${initiative.title}".
Descrição: ${initiative.description || initiative.refined_idea || ""}
Stack: Vite + React + TypeScript + Tailwind CSS${hasBackend ? " + Supabase" : ""}
Arquivos: ${committedFiles.slice(0, 30).join(", ")}
${sbConnReadme ? `Supabase URL: ${sbConnReadme.supabase_url}` : ""}

Inclua:
1. Título e descrição
2. Stack tecnológica (badges)
3. Pré-requisitos (Node.js, npm)
4. Instruções de instalação (git clone, npm install, npm run dev)
${hasBackend ? `5. Setup do Supabase:
   - Copiar .env.example para .env
   - Preencher VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
   - Executar migrations SQL no dashboard do Supabase` : ""}
6. Scripts disponíveis (dev, build, preview)
7. Deploy (Vercel com um clique)
8. Licença MIT
9. Rodapé "Gerado pelo AxionOS"

Seja conciso e profissional.`
        );

        let readmeContent = readmeResult.content.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();

        // Commit README.md (update if exists from auto_init)
        try {
          let readmeSha: string | undefined;
          const readmeCheck = await fetch(`${GITHUB_API}/repos/${actualOwner}/${actualRepo}/contents/README.md?ref=${baseBranch}`, { headers: ghHeaders });
          if (readmeCheck.ok) {
            const readmeData = await readmeCheck.json();
            readmeSha = readmeData?.sha;
          }
          const readmeResp = await fetch(`${GITHUB_API}/repos/${actualOwner}/${actualRepo}/contents/README.md`, {
            method: "PUT", headers: ghHeaders,
            body: JSON.stringify({
              message: "docs: add project README",
              content: btoa(unescape(encodeURIComponent(readmeContent))),
              branch: baseBranch,
              ...(readmeSha ? { sha: readmeSha } : {}),
            }),
          });
          if (readmeResp.ok) committedFiles.push("README.md");
        } catch (e) { console.error("Failed to commit README.md:", e); }

        // Ensure deploy-critical root files always exist in published repos
        const requiredPublishFiles: Record<string, string> = {
          "tsconfig.node.json": JSON.stringify({
            compilerOptions: {
              composite: true,
              target: "ES2022",
              lib: ["ES2023"],
              module: "ESNext",
              skipLibCheck: true,
              moduleResolution: "bundler",
              allowImportingTsExtensions: true,
              isolatedModules: true,
              moduleDetection: "force",
              strict: true,
              noUnusedLocals: false,
              noUnusedParameters: false,
              noFallthroughCasesInSwitch: true,
            },
            include: ["vite.config.ts"],
          }, null, 2),
          "vercel.json": DEPLOY_VERCEL_JSON,
          "public/_redirects": "/* /index.html 200",
          "netlify.toml": "[build]\n  command = \"npm run build\"\n  publish = \"dist\"\n\n[[redirects]]\n  from = \"/*\"\n  to = \"/index.html\"\n  status = 200",
          "postcss.config.js": `export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n};`,
        };

        for (const [requiredPath, requiredContent] of Object.entries(requiredPublishFiles)) {
          try {
            // Check if file already exists to include sha on update
            let existingSha: string | undefined;
            const existingResp = await fetch(`${GITHUB_API}/repos/${actualOwner}/${actualRepo}/contents/${requiredPath}?ref=${baseBranch}`, {
              headers: ghHeaders,
            });
            if (existingResp.ok) {
              const existingData = await existingResp.json();
              existingSha = existingData?.sha;
            }

            const ensureResp = await fetch(`${GITHUB_API}/repos/${actualOwner}/${actualRepo}/contents/${requiredPath}`, {
              method: "PUT",
              headers: ghHeaders,
              body: JSON.stringify({
                message: `chore: ensure ${requiredPath}`,
                content: btoa(unescape(encodeURIComponent(requiredContent))),
                branch: baseBranch,
                ...(existingSha ? { sha: existingSha } : {}),
              }),
            });

            if (ensureResp.ok) {
              if (!committedFiles.includes(requiredPath)) committedFiles.push(requiredPath);
            } else {
              const errText = await ensureResp.text();
              console.error(`Failed to ensure ${requiredPath}:`, errText);
              if (!skippedFiles.includes(requiredPath)) skippedFiles.push(requiredPath);
            }
          } catch (e) {
            console.error(`Error ensuring ${requiredPath}:`, e);
            if (!skippedFiles.includes(requiredPath)) skippedFiles.push(requiredPath);
          }
        }

        if (committedFiles.length === 0) throw new Error("Nenhum arquivo foi commitado com sucesso");

        await updateInit({ stage_status: "published" });

        const totalAiTokens = (commitMsgResult.tokens || 0);
        const totalAiCost = (commitMsgResult.costUsd || 0);

        if (jobId) await completeJob(jobId, {
          branch: baseBranch,
          files_committed: committedFiles.length,
          owner: actualOwner,
          repo: actualRepo,
          repo_url: `https://github.com/${actualOwner}/${actualRepo}`,
          ai_generated: { branch: baseBranch, commit_count: commitMessages.length },
          health_report: healthReport,
        }, { model: "google/gemini-2.5-flash", costUsd: totalAiCost, durationMs: 0 });

        await log("pipeline_publish_complete", `Publicação concluída: ${committedFiles.length} arquivos direto na branch ${baseBranch} em ${actualOwner}/${actualRepo}`, {
          branch: baseBranch, ai_tokens: totalAiTokens, repo: `${actualOwner}/${actualRepo}`,
        });

        return new Response(JSON.stringify({
          success: true,
          branch: baseBranch,
          files_committed: committedFiles.length,
          skipped_files: skippedFiles,
          owner: actualOwner,
          repo: actualRepo,
          repo_url: `https://github.com/${actualOwner}/${actualRepo}`,
          job_id: jobId,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        if (jobId) await failJob(jobId, e instanceof Error ? e.message : "Unknown error");
        throw e;
      }
    }

    // ========== FAST MODIFY (modify + republish) ==========
    if (stage === "fast_modify") {
      if (!modification?.file_path || !modification?.prompt) {
        throw new Error("modification.file_path and modification.prompt are required");
      }

      let jobId: string | null = null;
      try {
        jobId = await createJob("fast_modify", { file_path: modification.file_path, prompt: modification.prompt });

        // 1. Use AI to modify the file
        const modifyResult = await callAI(
          LOVABLE_API_KEY,
          `You are an expert developer. You will receive a source code file and a modification request.
Return ONLY the complete modified file content. Do not add explanations, markdown fences, or comments about changes.
Just output the raw modified code.`,
          `File: ${modification.file_path}\n\nCurrent content:\n\`\`\`\n${modification.file_content}\n\`\`\`\n\nModification requested: ${modification.prompt}`,
        );

        const modifiedContent = modifyResult.content.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();

        // 2. Update the subtask output in the database
        const { data: subtasks } = await serviceClient
          .from("story_subtasks")
          .select("id, file_path, phase_id")
          .eq("file_path", modification.file_path)
          .eq("status", "completed");

        // Filter subtasks belonging to this initiative
        let targetSubtask: any = null;
        if (subtasks?.length) {
          for (const st of subtasks) {
            const { data: phase } = await serviceClient.from("story_phases").select("story_id").eq("id", st.phase_id).single();
            if (phase) {
              const { data: story } = await serviceClient.from("stories").select("initiative_id").eq("id", phase.story_id).single();
              if (story?.initiative_id === initiativeId) {
                targetSubtask = st;
                break;
              }
            }
          }
        }

        if (targetSubtask) {
          await serviceClient.from("story_subtasks").update({
            output: modifiedContent,
            executed_at: new Date().toISOString(),
          }).eq("id", targetSubtask.id);
        }

        // 3. Auto-republish to GitHub if git connection exists
        let prUrl: string | null = null;
        let filesCommitted = 0;

        const { data: gitConns } = await serviceClient
          .from("git_connections")
          .select("*")
          .eq("organization_id", initiative.organization_id)
          .eq("status", "active")
          .limit(1);

        const gitConn = gitConns?.[0];
        if (gitConn?.github_token) {
          const ghHeaders = {
            Authorization: `Bearer ${gitConn.github_token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          };
          const ghOwner = gitConn.repo_owner;
          const ghRepo = gitConn.repo_name;
          const GITHUB_API = "https://api.github.com";

          // Find or create branch
          const branchName = `fix/${initiative.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-patch`;
          
          // Get default branch SHA
          const baseBranch = gitConn.default_branch || "main";
          const refResp = await fetch(`${GITHUB_API}/repos/${ghOwner}/${ghRepo}/git/ref/heads/${baseBranch}`, { headers: ghHeaders });
          
          if (refResp.ok) {
            const refData = await refResp.json();
            const baseSha = refData.object.sha;

            // Try to create branch (ignore error if exists)
            await fetch(`${GITHUB_API}/repos/${ghOwner}/${ghRepo}/git/refs`, {
              method: "POST",
              headers: ghHeaders,
              body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
            });

            // Get existing file SHA if it exists
            let fileSha: string | undefined;
            const existingFile = await fetch(`${GITHUB_API}/repos/${ghOwner}/${ghRepo}/contents/${modification.file_path}?ref=${branchName}`, { headers: ghHeaders });
            if (existingFile.ok) {
              const fileData = await existingFile.json();
              fileSha = fileData.sha;
            }

            // Commit the modified file
            const commitBody: any = {
              message: `fix: ${modification.prompt.slice(0, 72)}`,
              content: btoa(unescape(encodeURIComponent(modifiedContent))),
              branch: branchName,
            };
            if (fileSha) commitBody.sha = fileSha;

            const commitResp = await fetch(`${GITHUB_API}/repos/${ghOwner}/${ghRepo}/contents/${modification.file_path}`, {
              method: "PUT",
              headers: ghHeaders,
              body: JSON.stringify(commitBody),
            });

            if (commitResp.ok) {
              filesCommitted = 1;

              // Check if PR already exists for this branch
              const prsResp = await fetch(`${GITHUB_API}/repos/${ghOwner}/${ghRepo}/pulls?head=${ghOwner}:${branchName}&state=open`, { headers: ghHeaders });
              const existingPrs = prsResp.ok ? await prsResp.json() : [];

              if (existingPrs.length > 0) {
                prUrl = existingPrs[0].html_url;
              } else {
                // Create new PR
                const prResp = await fetch(`${GITHUB_API}/repos/${ghOwner}/${ghRepo}/pulls`, {
                  method: "POST",
                  headers: ghHeaders,
                  body: JSON.stringify({
                    title: `fix: ${modification.prompt.slice(0, 72)}`,
                    head: branchName,
                    base: baseBranch,
                    body: `## Modificação via AxionOS\n\n**Arquivo:** \`${modification.file_path}\`\n\n**Prompt:** ${modification.prompt}\n\n---\n*Modificação automática fast-track*`,
                  }),
                });
                if (prResp.ok) {
                  const prData = await prResp.json();
                  prUrl = prData.html_url;
                }
              }
            }
          }
        }

        if (jobId) await completeJob(jobId, {
          file_path: modification.file_path,
          files_modified: 1,
          files_committed: filesCommitted,
          pr_url: prUrl,
          tokens: modifyResult.tokens,
        }, { model: modifyResult.model, costUsd: modifyResult.costUsd, durationMs: modifyResult.durationMs });

        await log("fast_modify", `Fast modify: ${modification.file_path}`, { pr_url: prUrl });

        return new Response(JSON.stringify({
          success: true,
          files_modified: 1,
          files_committed: filesCommitted,
          pr_url: prUrl,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        if (jobId) await failJob(jobId, e instanceof Error ? e.message : "Unknown error");
        throw e;
      }
    }

    // ========== FULL REVIEW (AI reviews entire project and fixes multiple files) ==========
    if (stage === "full_review") {
      const reviewPrompt = modification?.prompt;
      if (!reviewPrompt) {
        throw new Error("modification.prompt is required for full_review");
      }

      let jobId: string | null = null;
      try {
        jobId = await createJob("full_review", { prompt: reviewPrompt });

        // 1. Gather ALL code files from this initiative
        const { data: stories } = await serviceClient
          .from("stories").select("id").eq("initiative_id", initiativeId);
        
        if (!stories?.length) throw new Error("Nenhuma story encontrada para esta iniciativa");

        const storyIds = stories.map(s => s.id);
        const { data: phases } = await serviceClient
          .from("story_phases").select("id").in("story_id", storyIds);
        
        if (!phases?.length) throw new Error("Nenhuma phase encontrada");

        const phaseIds = phases.map(p => p.id);
        const { data: subtasks } = await serviceClient
          .from("story_subtasks")
          .select("id, description, file_path, output, status, phase_id")
          .in("phase_id", phaseIds)
          .eq("status", "completed")
          .not("output", "is", null);

        if (!subtasks?.length) throw new Error("Nenhum arquivo gerado encontrado");

        // Build full project context
        const projectContext = subtasks
          .filter(st => st.file_path && st.output)
          .map(st => `=== FILE: ${st.file_path} ===\n${st.output}`)
          .join("\n\n");

        const totalFiles = subtasks.filter(st => st.file_path && st.output).length;

        // 2. Ask AI to analyze the full project and return fixes
        const reviewResult = await callAI(
          LOVABLE_API_KEY,
          `You are an expert full-stack developer performing a code review of an entire project.
The user will describe a problem they encountered (e.g., deploy errors, 404 pages, missing configs, broken functionality).

Your job:
1. Analyze ALL project files provided
2. Identify which files need to be modified or created to fix the problem
3. Return a JSON object with the fixes

IMPORTANT RULES:
- Return ONLY valid JSON, no markdown fences
- Each fix must contain the COMPLETE file content (not just the diff)
- For new files that need to be created, include them with is_new: true
- Focus on the root cause, not symptoms

Return format:
{
  "diagnosis": "Brief explanation of what's wrong",
  "fixes": [
    {
      "file_path": "path/to/file.ts",
      "reason": "Why this file needs changes",
      "content": "COMPLETE new file content here",
      "is_new": false
    }
  ]
}`,
          `PROBLEM REPORTED:\n${reviewPrompt}\n\nPROJECT FILES (${totalFiles} files):\n\n${projectContext}`,
          true,
        );

        let reviewData: any;
        const parseJsonSafe = (raw: string) => {
          let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
          const jsonStart = cleaned.search(/[\{\[]/);
          const jsonEnd = cleaned.lastIndexOf('}');
          if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found");
          cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
          try { return JSON.parse(cleaned); } catch {
            cleaned = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, " ");
            return JSON.parse(cleaned);
          }
        };
        try {
          reviewData = parseJsonSafe(reviewResult.content);
        } catch (parseErr) {
          console.error("JSON parse failed:", parseErr, "Raw content (first 500):", reviewResult.content.slice(0, 500));
          throw new Error("AI não retornou JSON válido na análise");
        }

        const fixes = Array.isArray(reviewData.fixes) ? reviewData.fixes : [];
        const needsViteDeployHotfix = /vite:\s*command not found|command\s+"vite build"\s+exited\s+with\s+127/i.test(reviewPrompt);

        // Enforce deterministic Vercel config on review fixes
        for (const fix of fixes) {
          if (fix?.file_path === "vercel.json") {
            fix.content = DEPLOY_VERCEL_JSON;
            fix.reason = fix.reason || "Garantir build Vite com devDependencies no ambiente de deploy";
          }
        }

        // Auto-add vercel.json hotfix when user reports missing vite in build logs
        if (needsViteDeployHotfix && !fixes.some((f: any) => f?.file_path === "vercel.json")) {
          fixes.push({
            file_path: "vercel.json",
            reason: "Corrigir deploy: instalar devDependencies para disponibilizar o binário do Vite",
            content: DEPLOY_VERCEL_JSON,
            is_new: true,
          });
        }

        const diagnosis = reviewData.diagnosis || "Análise concluída";
        let filesModified = 0;
        let filesCommitted = 0;
        let prUrl: string | null = null;

        // 3. Apply fixes to subtasks in database
        for (const fix of fixes) {
          if (!fix.file_path || !fix.content) continue;

          // Find matching subtask
          const matchingSubtask = subtasks.find(st => st.file_path === fix.file_path);
          
          if (matchingSubtask) {
            await serviceClient.from("story_subtasks").update({
              output: fix.content,
              executed_at: new Date().toISOString(),
            }).eq("id", matchingSubtask.id);
            filesModified++;
          } else if (fix.is_new) {
            // Create a new subtask for new files
            const firstPhaseId = phaseIds[0];
            await serviceClient.from("story_subtasks").insert({
              phase_id: firstPhaseId,
              description: `[Auto-fix] ${fix.reason || fix.file_path}`,
              file_path: fix.file_path,
              file_type: fix.file_path.endsWith(".json") ? "config" : "other",
              output: fix.content,
              status: "completed",
              executed_at: new Date().toISOString(),
            });
            filesModified++;
          }
        }

        // 4. Auto-republish ALL fixed files to GitHub
        const { data: gitConns } = await serviceClient
          .from("git_connections")
          .select("*")
          .eq("organization_id", initiative.organization_id)
          .eq("status", "active")
          .limit(1);

        const gitConn = gitConns?.[0];
        if (gitConn?.github_token && fixes.length > 0) {
          const ghHeaders = {
            Authorization: `Bearer ${gitConn.github_token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          };
          const ghOwner = gitConn.repo_owner;
          const ghRepo = gitConn.repo_name;
          const GITHUB_API = "https://api.github.com";
          const branchName = `fix/${initiative.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-review`;
          const baseBranch = gitConn.default_branch || "main";

          const refResp = await fetch(`${GITHUB_API}/repos/${ghOwner}/${ghRepo}/git/ref/heads/${baseBranch}`, { headers: ghHeaders });
          
          if (refResp.ok) {
            const refData = await refResp.json();
            const baseSha = refData.object.sha;

            // Create branch
            await fetch(`${GITHUB_API}/repos/${ghOwner}/${ghRepo}/git/refs`, {
              method: "POST",
              headers: ghHeaders,
              body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
            });

            // Commit each fixed file
            for (const fix of fixes) {
              if (!fix.file_path || !fix.content) continue;

              let fileSha: string | undefined;
              const existingFile = await fetch(`${GITHUB_API}/repos/${ghOwner}/${ghRepo}/contents/${fix.file_path}?ref=${branchName}`, { headers: ghHeaders });
              if (existingFile.ok) {
                const fileData = await existingFile.json();
                fileSha = fileData.sha;
              }

              const commitBody: any = {
                message: `fix(review): ${fix.reason?.slice(0, 72) || fix.file_path}`,
                content: btoa(unescape(encodeURIComponent(fix.content))),
                branch: branchName,
              };
              if (fileSha) commitBody.sha = fileSha;

              const commitResp = await fetch(`${GITHUB_API}/repos/${ghOwner}/${ghRepo}/contents/${fix.file_path}`, {
                method: "PUT",
                headers: ghHeaders,
                body: JSON.stringify(commitBody),
              });

              if (commitResp.ok) filesCommitted++;
            }

            // Create or find PR
            const prsResp = await fetch(`${GITHUB_API}/repos/${ghOwner}/${ghRepo}/pulls?head=${ghOwner}:${branchName}&state=open`, { headers: ghHeaders });
            const existingPrs = prsResp.ok ? await prsResp.json() : [];

            if (existingPrs.length > 0) {
              prUrl = existingPrs[0].html_url;
            } else {
              const prResp = await fetch(`${GITHUB_API}/repos/${ghOwner}/${ghRepo}/pulls`, {
                method: "POST",
                headers: ghHeaders,
                body: JSON.stringify({
                  title: `fix(review): ${reviewPrompt.slice(0, 72)}`,
                  head: branchName,
                  base: baseBranch,
                  body: `## Revisão Completa via AxionOS\n\n**Problema:** ${reviewPrompt}\n\n**Diagnóstico:** ${diagnosis}\n\n**Arquivos corrigidos:** ${filesModified}\n\n---\n*Revisão automática do projeto inteiro*`,
                }),
              });
              if (prResp.ok) {
                const prData = await prResp.json();
                prUrl = prData.html_url;
              }
            }
          }
        }

        if (jobId) await completeJob(jobId, {
          diagnosis,
          files_analyzed: totalFiles,
          files_modified: filesModified,
          files_committed: filesCommitted,
          pr_url: prUrl,
          fixes: fixes.map((f: any) => ({ file_path: f.file_path, reason: f.reason, is_new: f.is_new })),
          tokens: reviewResult.tokens,
        }, { model: reviewResult.model, costUsd: reviewResult.costUsd, durationMs: reviewResult.durationMs });

        await log("full_review", `Full review: ${filesModified} files fixed`, { pr_url: prUrl, diagnosis });

        return new Response(JSON.stringify({
          success: true,
          diagnosis,
          files_analyzed: totalFiles,
          files_modified: filesModified,
          files_committed: filesCommitted,
          pr_url: prUrl,
          fixes: fixes.map((f: any) => ({ file_path: f.file_path, reason: f.reason, is_new: f.is_new })),
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        if (jobId) await failJob(jobId, e instanceof Error ? e.message : "Unknown error");
        throw e;
      }
    }

    throw new Error(`Stage inválido: ${stage}. Use: discovery, squad_formation, planning, approve, reject, execution, validation, publish, fast_modify, full_review`);
  } catch (e) {
    console.error("run-initiative-pipeline error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
