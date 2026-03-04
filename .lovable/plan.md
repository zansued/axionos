

## Organização por Iniciativa

Concordo totalmente. Conforme o sistema cresce, stories, artefatos e cards de kanban sem contexto de iniciativa se tornam ruído. A proposta é adicionar um **filtro global por iniciativa** nas páginas de Execução (Stories), Validação (Artifacts) e Kanban.

### Estado Atual

- **Stories**: query busca todas as stories do usuário sem filtro por `initiative_id` (coluna já existe na tabela)
- **Artifacts (agent_outputs)**: filtra por `organization_id` mas não por iniciativa (não tem coluna `initiative_id` direta, mas tem `subtask_id` que conecta via story)
- **Kanban**: busca todas as stories sem filtro
- **agent_outputs**: não tem `initiative_id` direto, mas os dados são gerados no contexto de iniciativas via pipeline

### Plano

#### 1. Componente de filtro por iniciativa (compartilhado)
Criar um componente `InitiativeFilter` com um `Select` que lista as iniciativas da organização. Será reutilizado em Stories, Artifacts e Kanban.

#### 2. Stories (Execução) - Filtrar por `initiative_id`
- A coluna `initiative_id` já existe na tabela `stories`
- Adicionar o `InitiativeFilter` no header da página
- Filtrar a query com `.eq("initiative_id", selectedInitiativeId)` quando selecionado
- Opção "Todas" como padrão para não quebrar o fluxo atual

#### 3. Kanban - Mesmo filtro
- Kanban já usa a mesma query de stories
- Aplicar o mesmo filtro por `initiative_id`

#### 4. Artifacts (Validação) - Filtrar via relacionamento
- `agent_outputs` não tem `initiative_id` direto, mas os subtasks e stories têm
- Duas opções:
  - **A) Adicionar coluna `initiative_id` em `agent_outputs`** (mais limpo para queries)
  - **B) Filtrar via join** (sem migration, mas query mais complexa)
- Recomendo **opção A**: adicionar `initiative_id` nullable em `agent_outputs` via migration e popular no pipeline

#### 5. Código Gerado - Já filtra por iniciativa (ok)

### Alterações Técnicas

| Arquivo | Mudança |
|---|---|
| `src/components/InitiativeFilter.tsx` | Novo componente Select reutilizável |
| `src/pages/Stories.tsx` | Adicionar filtro, ajustar query |
| `src/pages/Kanban.tsx` | Adicionar filtro, ajustar query |
| `src/pages/Artifacts.tsx` | Adicionar filtro, ajustar query |
| Migration SQL | Adicionar `initiative_id` em `agent_outputs` (nullable, FK) |
| `supabase/functions/run-initiative-pipeline/index.ts` | Popular `initiative_id` ao criar outputs |

### Comportamento

- Filtro aparece no header de cada página, ao lado do título
- Valor padrão: "Todas as iniciativas"
- Ao selecionar uma, todas as queries filtram por ela
- Opcional futuro: persistir seleção no localStorage ou contexto global

