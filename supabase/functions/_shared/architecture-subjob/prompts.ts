/**
 * Architecture Subjob Prompts
 * Centralized prompt definitions for each architecture agent.
 * v3: MVP-scoped outputs with hard limits for Data/API to prevent timeouts.
 */

export function systemArchitectPrompt(projectContext: string, requirementsData: string, productArchData: string): { system: string; user: string } {
  return {
    system: `Você é o System Architect Agent — especialista em arquitetura de sistemas. Define stack, camadas e estrutura do projeto. Retorne APENAS JSON válido.`,
    user: `${projectContext}

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
  "architecture_patterns": ["string"],
  "scalability_considerations": ["string"],
  "security_measures": ["string"],
  "justification": "Por que essa stack é a melhor escolha para este projeto"
}`,
  };
}

export function dataArchitectPrompt(projectContext: string, requirementsData: string, systemArchJson: string): { system: string; user: string } {
  return {
    system: `You are a Data Architect Agent. Return ONLY valid JSON. Be extremely concise. No markdown, no explanation, no comments. MVP scope only.`,
    user: `PROJECT: ${projectContext}

SYSTEM ARCHITECTURE (summary): ${systemArchJson}
REQUIREMENTS (compact): ${requirementsData}

Design the MVP database. HARD LIMITS — do NOT exceed:
- Maximum 6 tables
- Maximum 8 columns per table
- Maximum 6 relationships
- Maximum 8 RLS policies total
- No narrative text — only structured JSON

Return this exact JSON shape:
{
  "tables": [
    {
      "name": "string",
      "description": "one short sentence",
      "columns": [
        {"name": "string", "type": "string", "nullable": false, "default": "string|null"}
      ],
      "primary_key": "string",
      "indexes": [{"columns": ["string"], "unique": false}],
      "rls_policies": [
        {"name": "string", "command": "SELECT|INSERT|UPDATE|DELETE|ALL", "using": "string", "with_check": "string|null"}
      ]
    }
  ],
  "relationships": [
    {"from_table": "string", "from_column": "string", "to_table": "string", "to_column": "string", "type": "one-to-many", "on_delete": "CASCADE|SET NULL"}
  ],
  "enums": [{"name": "string", "values": ["string"]}],
  "migration_strategy": "one sentence"
}`,
  };
}

export function apiArchitectPrompt(projectContext: string, requirementsData: string, systemArchJson: string): { system: string; user: string } {
  return {
    system: `You are an API Architect Agent. Return ONLY valid JSON. Be extremely concise. No markdown, no explanation, no comments. MVP scope only.`,
    user: `PROJECT: ${projectContext}

SYSTEM ARCHITECTURE (summary): ${systemArchJson}
REQUIREMENTS (compact): ${requirementsData}

Design the MVP API contracts. HARD LIMITS — do NOT exceed:
- Maximum 8 endpoints
- Maximum 4 edge functions
- Maximum 2 realtime channels
- No narrative text — only structured JSON
- Keep request_body and response minimal (just key property names, no nested schemas)

Return this exact JSON shape:
{
  "api_style": "REST",
  "base_url": "/api/v1",
  "auth_strategy": {"type": "JWT", "header": "Authorization", "flow": "supabase_auth"},
  "endpoints": [
    {
      "method": "GET|POST|PUT|DELETE",
      "path": "string",
      "description": "one short sentence",
      "auth_required": true,
      "request_body": {},
      "response": {"status": 200},
      "errors": [{"status": 400, "description": "string"}]
    }
  ],
  "edge_functions": [{"name": "string", "description": "one sentence", "trigger": "HTTP", "auth": true}],
  "realtime_channels": [{"name": "string", "table": "string", "events": ["INSERT"]}]
}`,
  };
}

export function dependencyPlannerPrompt(
  projectContext: string,
  systemArchJson: string,
  dataArchJson: string,
  apiArchJson: string,
): { system: string; user: string } {
  return {
    system: `Você é o Dependency Planner Agent — especialista em análise de dependências e ordem de geração. Crie o grafo de dependências do projeto. Retorne APENAS JSON válido.`,
    user: `${projectContext}

ARQUITETURA DE SISTEMA: ${systemArchJson}
MODELO DE DADOS: ${dataArchJson}
CONTRATOS DE API: ${apiArchJson}

Crie o grafo de dependências para geração de código:
{
  "dependency_graph": {
    "nodes": [
      {"id": "string (file path or module)", "type": "config|schema|type|service|hook|component|page|test", "layer": "infra|data|service|ui|test", "description": "string"}
    ],
    "edges": [
      {"from": "string", "to": "string", "type": "imports|extends|uses|configures"}
    ]
  },
  "generation_order": [
    {"phase": 1, "label": "Infraestrutura", "files": ["string"], "parallel": true}
  ],
  "npm_dependencies": [
    {"package": "string", "version": "string", "dev": false, "justification": "string"}
  ],
  "critical_path": ["string"],
  "risk_areas": [
    {"area": "string", "risk": "low|medium|high", "mitigation": "string"}
  ],
  "estimated_files_count": 0,
  "estimated_generation_phases": 0
}`,
  };
}
