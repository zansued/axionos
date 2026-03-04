

## Sistemas Full-Stack no AxionOS

### Situação Atual

Atualmente o AxionOS gera **apenas frontend**: Vite + React + TypeScript + Tailwind CSS + shadcn/ui. Isso está hardcoded em vários pontos:
- **Planning stage** (linha ~405): stack fixa "Vite + React + TypeScript + Tailwind CSS + shadcn/ui"
- **Architecture prompt** (linha ~422): stack "obrigatoriamente" frontend
- **Stories prompt** (linha ~429-542): subtasks geram apenas arquivos `.tsx`, `.ts`, `.css`, `.json`
- **Execution stage**: prompts de Dev focam em componentes React

Ou seja, os sistemas gerados **não têm banco de dados, API, autenticação, nem lógica de servidor**.

### Proposta: Suporte a Backend com Supabase

A forma mais natural de adicionar backend é gerar projetos que usem **Supabase** (o mesmo stack do próprio AxionOS), pois:
- Não precisa de servidor separado (BaaS)
- SDK JavaScript funciona direto no frontend React
- Suporta: banco de dados (Postgres), autenticação, storage, edge functions, RLS

### Plano de Implementação

#### 1. Expandir o Planning para detectar necessidade de backend
No prompt de PRD e Arquitetura, a IA deve identificar se o projeto precisa de:
- Banco de dados (CRUD, persistência)
- Autenticação (login, signup)
- Storage (upload de arquivos)
- APIs externas

#### 2. Adicionar novos `file_type` para backend
Expandir os tipos de subtask:
- `schema` → arquivos SQL de criação de tabelas (ex: `supabase/schema.sql`)
- `migration` → migrações de banco
- `edge_function` → funções serverless (ex: `supabase/functions/api-name/index.ts`)
- `auth_config` → configuração de autenticação
- `seed` → dados iniciais do banco

#### 3. Atualizar os prompts do Planning stage
- O prompt de Arquitetura passa a incluir seção "Modelo de Dados (SQL)" e "Edge Functions"
- O prompt de Stories gera subtasks com `file_type: "schema"`, `"edge_function"`, etc.
- Adicionar uma story obrigatória "Backend Setup" (quando detectado) com:
  - Schema SQL do banco
  - Configuração de RLS
  - Client Supabase (`src/lib/supabase.ts`)
  - Hooks de autenticação

#### 4. Atualizar os prompts do Execution stage
- Novos system prompts especializados para o Dev quando `file_type` é `schema`, `edge_function`, etc.
- O Architect recebe contexto sobre o schema para manter consistência entre frontend e backend
- Gerar `supabase/` folder com estrutura real

#### 5. Gerar `.env.example` e README com instruções
- Projeto gerado inclui instruções de setup do Supabase
- `.env.example` com variáveis necessárias

### Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `supabase/functions/run-initiative-pipeline/index.ts` | Expandir prompts de Planning (PRD, Arquitetura, Stories) para incluir backend. Novos prompts de Execution para schemas e edge functions. |
| `src/components/initiatives/InitiativeCodePreview.tsx` | Renderizar arquivos SQL e edge functions com syntax highlighting adequado |

### Escopo da Mudança

A alteração é concentrada no `run-initiative-pipeline/index.ts` (~2200 linhas), especificamente nos prompts das fases Planning (~linhas 400-545) e Execution (~linhas 760-1190). O resto da infraestrutura (stories, subtasks, agent_outputs) já suporta qualquer tipo de arquivo.

