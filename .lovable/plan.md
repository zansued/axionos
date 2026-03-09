

## Diagnóstico

O bloco `define` no `vite.config.ts` está **sobrescrevendo** as variáveis de ambiente que o Lovable injeta automaticamente no build de produção. Quando `loadEnv` roda no contexto de publicação e não encontra o `.env`, `JSON.stringify(undefined)` retorna `undefined` literal — e o Supabase client recebe `undefined` como URL, causando o crash.

A ironia: essa configuração foi adicionada para resolver um problema transiente de preview, mas agora quebra o domínio publicado.

## Plano

### 1. Remover o bloco `define` do `vite.config.ts`
- Remover as linhas `define`, `loadEnv` import e a variável `env`
- O Vite já injeta automaticamente variáveis `VITE_*` do ambiente — não precisa de intervenção manual

### 2. Resultado esperado
O `vite.config.ts` voltará ao formato padrão, e o build publicado usará as variáveis injetadas pelo Lovable Cloud corretamente.

```text
vite.config.ts (antes)
─────────────────────
import { loadEnv } from "vite"
const env = loadEnv(...)
define: {
  'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
  ...
}

vite.config.ts (depois)
──────────────────────
// Sem define, sem loadEnv
// Vite injeta VITE_* automaticamente
```

Após aplicar, será necessário republicar o app para o domínio.

