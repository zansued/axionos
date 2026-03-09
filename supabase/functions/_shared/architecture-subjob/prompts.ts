/**
 * Architecture Subjob Prompts
 * Centralized prompt definitions for each architecture agent.
 * v4: Ultra-compact prompts with strict token budgets and output caps.
 */

export function systemArchitectPrompt(projectContext: string, requirementsData: string, productArchData: string): { system: string; user: string } {
  return {
    system: `System Architect. Return ONLY valid JSON. No markdown, no prose.`,
    user: `${projectContext}

REQ: ${requirementsData}
PRODUCT_ARCH: ${productArchData}

Return JSON:
{
  "stack": {
    "frontend": {"framework": "str", "language": "str", "styling": "str", "state_management": "str", "routing": "str"},
    "backend": {"type": "BaaS|API|serverless", "platform": "str", "language": "str"},
    "database": {"type": "str", "provider": "str"},
    "auth": {"method": "str", "provider": "str"},
    "storage": {"provider": "str", "use_cases": ["str"]},
    "hosting": {"frontend": "str", "backend": "str"},
    "ci_cd": "str"
  },
  "layers": [{"name": "str", "responsibility": "str", "technologies": ["str"]}],
  "project_structure": {
    "root_dirs": ["src/","public/","supabase/"],
    "src_structure": {"pages":"str","components":"str","hooks":"str","contexts":"str","services":"str","utils":"str","types":"str"}
  },
  "architecture_patterns": ["str"],
  "scalability_considerations": ["str"],
  "security_measures": ["str"],
  "justification": "one sentence"
}`,
  };
}

export function dataArchitectPrompt(projectContext: string, requirementsData: string, systemArchJson: string): { system: string; user: string } {
  return {
    system: `Data Architect. Return ONLY valid JSON. No prose. MVP only.`,
    user: `CTX: ${projectContext}
ARCH: ${systemArchJson}
REQ: ${requirementsData}

MVP database. HARD LIMITS:
- Max 5 tables, max 6 cols each
- Max 4 relationships
- Max 6 RLS policies total
- No indexes unless critical
- No explanations

JSON:
{
  "tables": [{"name":"str","description":"<10 words","columns":[{"name":"str","type":"str","nullable":false,"default":"str|null"}],"primary_key":"str","indexes":[],"rls_policies":[{"name":"str","command":"SELECT|INSERT|UPDATE|DELETE","using":"str","with_check":"str|null"}]}],
  "relationships": [{"from_table":"str","from_column":"str","to_table":"str","to_column":"str","type":"one-to-many","on_delete":"CASCADE|SET NULL"}],
  "enums": [{"name":"str","values":["str"]}],
  "migration_strategy": "<10 words"
}`,
  };
}

export function apiArchitectPrompt(projectContext: string, requirementsData: string, systemArchJson: string): { system: string; user: string } {
  return {
    system: `API Architect. Return ONLY valid JSON. No prose. MVP only.`,
    user: `CTX: ${projectContext}
ARCH: ${systemArchJson}
REQ: ${requirementsData}

MVP API. HARD LIMITS:
- Max 6 endpoints
- Max 3 edge functions
- Max 2 realtime channels
- No nested schemas
- No explanations

JSON:
{
  "api_style":"REST",
  "base_url":"/api/v1",
  "auth_strategy":{"type":"JWT","header":"Authorization","flow":"supabase_auth"},
  "endpoints":[{"method":"GET|POST|PUT|DELETE","path":"str","description":"<10 words","auth_required":true,"request_body":{},"response":{"status":200},"errors":[{"status":400,"description":"str"}]}],
  "edge_functions":[{"name":"str","description":"<10 words","trigger":"HTTP","auth":true}],
  "realtime_channels":[{"name":"str","table":"str","events":["INSERT"]}]
}`,
  };
}

export function dependencyPlannerPrompt(
  projectContext: string,
  intermediateSummary: string,
): { system: string; user: string } {
  return {
    system: `Dependency Planner. Return ONLY valid JSON. No prose.`,
    user: `CTX: ${projectContext}
SUMMARY: ${intermediateSummary}

Plan code generation dependencies. HARD LIMITS:
- Max 12 nodes, 12 edges
- Max 3 phases
- Max 6 npm deps
- Max 2 risk areas

JSON:
{
  "dependency_graph":{"nodes":[{"id":"str","type":"config|schema|type|service|hook|component|page","layer":"infra|data|service|ui"}],"edges":[{"from":"str","to":"str","type":"imports|uses|configures"}]},
  "generation_order":[{"phase":1,"label":"str","files":["str"],"parallel":true}],
  "npm_dependencies":[{"package":"str","version":"str","dev":false}],
  "critical_path":["str"],
  "risk_areas":[{"area":"str","risk":"low|medium|high","mitigation":"<10 words"}],
  "estimated_files_count":0,
  "estimated_generation_phases":0
}`,
  };
}
