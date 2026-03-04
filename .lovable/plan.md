

## Botão de Deploy Automático no Agente Revisor

### Objetivo
Adicionar um botão "Deploy Automático" no dialog do Agente Revisor que aparece **após a revisão ser concluída com sucesso** (quando `reviewResult` existe com correções). Esse botão vai disparar o estágio `publish` do pipeline, re-publicando os arquivos corrigidos no GitHub (o que automaticamente aciona o deploy no Vercel).

### Alterações

**Arquivo: `src/components/initiatives/InitiativeCodePreview.tsx`**

1. Adicionar estado `isDeploying` para controlar o loading do botão de deploy.
2. Adicionar ícones `Rocket` e `GitBranch` aos imports do lucide-react.
3. Criar função `handleDeployAfterReview` que:
   - Busca as `git_connections` da organização para obter o token GitHub, owner, repo e branch.
   - Chama o pipeline com `stage: "publish"` e os parâmetros de GitHub.
   - Mostra toast de sucesso/erro.
4. Renderizar o botão "Fazer Deploy" no dialog, ao lado do botão "Fechar", **apenas quando `reviewResult` existe e tem correções** (`reviewResult.files_modified > 0`).
   - Se não houver conexão Git configurada, mostrar mensagem informando que é necessário publicar primeiro pela tela de iniciativas.

### Fluxo do Usuário
1. Usuário descreve o problema → clica "Revisar e Corrigir"
2. Agente analisa e corrige os arquivos
3. Resultado aparece com diagnóstico e lista de arquivos corrigidos
4. Novo botão **"Fazer Deploy"** (com ícone Rocket) aparece no footer
5. Ao clicar, re-publica no GitHub automaticamente → Vercel detecta e faz deploy

### Detalhes Técnicos
- Reutiliza a mesma chamada ao `run-initiative-pipeline` com `stage: "publish"` que já existe no `InitiativeDetail.tsx`.
- Precisa buscar as credenciais Git da organização (`git_connections` table) para montar os `publishParams`.
- Componente precisa receber ou buscar as conexões Git disponíveis (a prop `organizationId` já existe).

