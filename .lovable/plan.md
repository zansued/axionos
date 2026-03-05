

## Diagnóstico

O erro no Vercel indica que o `vite.config.ts` **no repositório GitHub** importa `@vitejs/plugin-react` (sem `-swc`), mas o `package.json` lista `@vitejs/plugin-react-swc`. Ou seja, o arquivo no GitHub está desatualizado em relação ao que temos aqui no Lovable.

Este é o mesmo problema de sincronização dos commits anteriores: as alterações feitas no Lovable não estão chegando ao GitHub.

## Plano

1. **Verificar sincronização Git** — Confirmar que o repositório GitHub está recebendo os commits do Lovable. Se não estiver, o usuário precisa fazer push manual ou reconectar o repositório.

2. **Correção manual no GitHub (se necessário)** — O usuário deve garantir que o `vite.config.ts` no GitHub contenha:
   ```ts
   import react from "@vitejs/plugin-react-swc";
   ```
   E **não**:
   ```ts
   import react from "@vitejs/plugin-react";
   ```

3. **Alternativa: forçar instalação no Vercel** — Atualizar o `installCommand` no `vercel.json` para instalar explicitamente o plugin correto:
   ```json
   "installCommand": "rm -f package-lock.json && npm install --include=dev"
   ```
   Isso já está feito, mas só funciona se o `vite.config.ts` no repo importar o pacote correto.

## Ação recomendada

O problema raiz é que o **repositório GitHub não está sincronizado** com o Lovable. As opções são:

- **Opção A**: No GitHub, edite manualmente o `vite.config.ts` e substitua `@vitejs/plugin-react` por `@vitejs/plugin-react-swc`.
- **Opção B**: Verifique a conexão Git do projeto Lovable (Settings → GitHub) e force um push/sync para que todos os arquivos atualizados cheguem ao repositório.

Sem resolver a sincronização, toda correção feita aqui não terá efeito no deploy do Vercel.

