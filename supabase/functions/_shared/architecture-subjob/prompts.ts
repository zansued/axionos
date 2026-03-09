/**
 * Architecture Subjob Prompts
 * Centralized prompt definitions for each architecture agent.
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
    system: `Você é o Data Architect Agent — especialista em modelagem de dados e banco de dados. Use a arquitetura de sistema definida anteriormente. Retorne APENAS JSON válido, sem markdown e sem texto extra. Seja objetivo e compacto.`,
    user: `${projectContext}

REQUISITOS (compactos): ${requirementsData}
ARQUITETURA DE SISTEMA (resumo): ${systemArchJson}

Modele o banco de dados de forma enxuta, priorizando MVP e escalabilidade inicial:
{
  "tables": [
    {
      "name": "string",
      "description": "string",
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
    {"from_table": "string", "from_column": "string", "to_table": "string", "to_column": "string", "type": "one-to-one|one-to-many|many-to-many", "on_delete": "CASCADE|SET NULL|RESTRICT"}
  ],
  "enums": [{"name": "string", "values": ["string"]}],
  "migration_strategy": "string"
}

Limites obrigatórios:
- máximo 10 tabelas
- máximo 12 colunas por tabela
- máximo 20 policies RLS no total
- descrições curtas (1 linha)`,
  };
}

export function apiArchitectPrompt(projectContext: string, requirementsData: string, systemArchJson: string): { system: string; user: string } {
  return {
    system: `Você é o API Architect Agent — especialista em design de APIs. Defina os contratos de API completos baseados na arquitetura. Retorne APENAS JSON válido.`,
    user: `${projectContext}

ARQUITETURA DE SISTEMA: ${systemArchJson}
REQUISITOS: ${requirementsData}

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
  "edge_functions": [{"name": "string", "description": "string", "trigger": "HTTP|Webhook|Cron", "auth": true}],
  "realtime_channels": [{"name": "string", "table": "string", "events": ["INSERT|UPDATE|DELETE"]}]
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
