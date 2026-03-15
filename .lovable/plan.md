
Objetivo: eliminar o 429 no `skill-extraction-engine` sem abrir risco de abuso, e parar o “blank screen” causado por falha repetida da query inicial.

1) Diagnóstico confirmado
- O limite efetivo ainda está em 30/h para `skill-extraction-engine` (consulta em `ai_rate_limits` mostrou 30 requests/h e bloqueio).
- No código atual, o rate limit é aplicado por função inteira (`authenticateWithRateLimit(req, "skill-extraction-engine")`), então ações de leitura (status/listagens) consomem a mesma cota de ações pesadas (extração/review/auto-bind).
- Resultado: uso normal da UI estoura cota rápido.

2) Ajuste de arquitetura de limite (backend)
- Em `supabase/functions/skill-extraction-engine/index.ts`:
  - Trocar fluxo para:
    - `authenticate(req)` (sem limiter acoplado),
    - parse do `action`,
    - escolher escopo de rate limit por tipo de ação,
    - chamar `checkRateLimit(user.id, scope)`.
  - Escopos:
    - leitura: `extraction_status`, `list_reviewable`, `review_history`, `list_bindings`, `skill_context_for_agent`
    - escrita/pesado: `extract_skills`, `review_skill`, `batch_review`, `ai_review_batch`, `bind_capability`, `auto_bind`
  - Se bloqueado: retornar 429 com mensagem amigável (mantendo PT-BR).

3) Ajuste de cotas (shared)
- Em `supabase/functions/_shared/rate-limit.ts`:
  - Adicionar:
    - `skill-extraction-engine-read` (alto, ex.: 2400/h)
    - `skill-extraction-engine-write` (controlado, ex.: 240/h)
  - Manter também `skill-extraction-engine` com valor alto (ex.: 600/h) por compatibilidade temporária, evitando regressão em chamadas antigas.

4) Redução de chamadas redundantes na UI
- Em `SkillReviewTab` e `SkillExtractionTab`:
  - Configurar `retry` para não repetir em 429 (evita multiplicar consumo).
  - Mapear erro via `getUserFriendlyError` para impedir mensagem bruta e reduzir impacto visual.
- Isso não substitui o fix do backend, mas melhora estabilidade.

5) Validação pós-implementação
- Fluxo manual:
  - Abrir Hub > Skills > Extração/Revisão/Bindings e navegar entre abas por alguns minutos.
  - Rodar `extraction_status`, `list_reviewable`, `ai_review_batch`.
- Verificações:
  - Não ocorrer 429 em uso normal.
  - Tela não fica em branco quando houver erro.
  - Em `ai_rate_limits`, novos registros aparecem em `skill-extraction-engine-read` e `skill-extraction-engine-write` (não concentrados no escopo único antigo).

Detalhes técnicos (resumo)
- Causa raiz: limiter muito “grosseiro” (por função única), não por ação.
- Correção robusta: separar read/write no próprio `skill-extraction-engine`, como já feito no padrão do `canon-learning`.
- Benefício: leitura frequente da UI deixa de competir com operações custosas de escrita/IA.
