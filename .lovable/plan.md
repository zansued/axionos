

## Diagnóstico

O screenshot mostra que **Data Architect** e **API Architect** falharam por timeout (45s), o que bloqueou Dependency Planner e Synthesis. O System Architect levou 41.8s — quase no limite. O problema tem duas causas:

1. **Timeout de 45s por subjob é apertado** — chamadas AI complexas (especialmente via DeepSeek ou Lovable Gateway) facilmente excedem esse limite
2. **Risco de timeout global do Deno** (~150s) — System (42s) + Data+API paralelo (45s) + Dependencies (45s) = 132s, sem margem

## Plano de Correção

### 1. Aumentar timeouts dos subjobs

Em `supabase/functions/_shared/architecture-subjob/types.ts`:
- `architecture.system`: 45s → **90s**
- `architecture.data`: 45s → **90s**  
- `architecture.api`: 45s → **90s**
- `architecture.dependencies`: 45s → **60s**
- `architecture.synthesis`: 20s → **10s** (determinístico, não precisa de mais)

### 2. Comprimir prompts dos agentes de arquitetura

Em `supabase/functions/_shared/architecture-subjob/prompts.ts`:
- Reduzir verbosidade dos prompts (remover campos opcionais, simplificar schemas JSON pedidos)
- Data Architect: remover `storage_buckets` e `functions` do schema exigido (podem ser derivados depois)
- API Architect: remover `webhooks` e `versioning_strategy` do output exigido
- Isso reduz tokens de entrada e saída, acelerando as respostas

### 3. Usar modelos mais rápidos para agentes paralelos

Em `supabase/functions/_shared/architecture-subjob/types.ts`:
- `architecture.data`: `usePro: true` → `usePro: false` (usar modelo rápido, não precisa de premium para modelagem de dados)
- `architecture.api`: já é `false` ✓

### 4. Limpar orphaned jobs no pipeline-architecture

Em `supabase/functions/pipeline-architecture/index.ts`:
- Aumentar o cleanup de stuck subjobs de 60s → 120s para alinhar com novos timeouts

### 5. Adicionar retry automático no primeiro timeout

Em `pipeline-architecture/index.ts`, no catch do timeout:
- Se `attempt_number < max_attempts`, marcar como `retryable` em vez de `failed_timeout` na primeira falha
- Re-enfileirar o subjob para a próxima wave automaticamente (sem intervenção manual)

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/_shared/architecture-subjob/types.ts` | Timeouts aumentados, `usePro` ajustado |
| `supabase/functions/_shared/architecture-subjob/prompts.ts` | Prompts comprimidos |
| `supabase/functions/pipeline-architecture/index.ts` | Auto-retry no timeout, cleanup alinhado |

### Resultado esperado

- Janela de execução por subjob: 90s (2x o atual)
- Prompts menores = respostas mais rápidas
- Primeiro timeout faz auto-retry, não falha imediata
- Modelo rápido para Data Architect reduz latência

