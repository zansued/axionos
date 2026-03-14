# AxionOS — Plano de Execução

> **Current Sprint:** 206 (Mineração de Padrões no Cron) — ✅ Complete
> **Next Sprint:** 207 — Recalibração de Confiança Automática
> Execution: **Sprint-based**

---

## Strategic Directive

AxionOS completou 202 sprints em todos os blocos de Foundation até AR. O sistema opera como um organismo adaptativo governado com segurança reforçada.

**O foco agora é:**

1. Eliminar lacunas operacionais no Canon Intelligence Hub
2. Ativar subsistemas que existem no código mas não têm dados
3. Construir superfícies de decisão humana onde faltam

---

## Strategic Principle

> **Governance before autonomy.**
> **Autonomy earned through evidence, bounded, and reversible.**
> **No autonomous architecture mutation.**

---

## Completed Blocks Summary

| Block Range | Sprints | Name | Status |
|-------------|---------|------|--------|
| Foundation–Z | 1–122 | Core Platform through Runtime Sovereignty | ✅ Complete |
| AA | 123–126 | Runtime Proof & Adaptive Governance | ✅ Complete |
| AB | 127–130 | Learning Canonization | ✅ Complete |
| AC | 131–134 | Adaptive Coordination | ✅ Complete |
| AD | 135–138 | Adaptive Operational Organism | ✅ Complete |
| AE | 139–142 | Axion Action Engine | ✅ Complete |
| AF | 143–146 | Security Surface | ✅ Complete |
| AG | 147–154 | Adoption Intelligence & Product Experience | ✅ Complete |
| AH | 155–163 | Governance Decision Lifecycle | ✅ Complete |
| AI | 164–171 | Repository Intelligence & Institutional Learning | ✅ Complete |
| AJ | 172–179 | Self-Improving Architecture Engine | ✅ Complete |
| AK | 180–181 | Knowledge Provenance & Trust-Weighted Intelligence | ✅ Complete |
| AL | 182–183 | Knowledge Renewal & Revalidation Engine | ✅ Complete |
| AM | 184 | Canon Intelligence Hub Restructuring & Skills Layer | ✅ Complete |
| AN | 185 | Execution Architecture Evolution | ✅ Complete |
| AO | 186–192 | Self-Improving Canon Pipeline | ✅ Complete |
| AP | 193–200 | Security Hardening & Canon Integrity | ✅ Complete |
| AQ | 201 | Operational Adjustments — pipeline unification, lifecycle normalization | ✅ Complete |
| AR | 202 | Review Authority Consolidation — single review authority, daily cron | ✅ Complete |
| AS-203 | 203 | Human Review UI for Canon Candidates | ✅ Complete |
| AS-204 | 204 | Repo Trust in Daily Cron Pipeline | ✅ Complete |
| AS-205 | 205 | Operational Learning Signal Producers | ✅ Complete |
| AS-206 | 206 | Pattern Mining in Daily Cron Pipeline | ✅ Complete |

---

## Known Operational Gaps (Canonical Honesty)

| Area | Status | Gap |
|------|--------|-----|
| **Human Review UI** | ✅ Resolved | Sprint 203: Dedicated steward UI with AI scores, approve/reject/review flows, batch actions, and audit trail. |
| **Operational Learning** | ✅ Resolved | Sprint 205: 4 edge functions instrumented as signal producers. Sprint 206: Pattern mining automates candidate generation from signals. |
| **Repo Trust** | ✅ Resolved | Sprint 204: Trust evaluation integrated into daily cron. Updates `repo_trust_scores` and `pattern_weight_factors` automatically. |
| **Confidence Recalibration** | ⚠️ Planned | Sprint 207: Automatic recalibration not yet implemented. |

---

## Block AS — Canon Intelligence Hub: Ativação Operacional Completa

**Sprints 203–207** | Status: **in progress (203–206 complete)**

### Sprint 203 — Tela de Revisão Humana de Candidatos Canon ✅
**Priority: High** | **Status: Complete**

- Cria página/tab dedicada no Canon Intelligence Hub para stewards
- Lista candidatos com `internal_validation_status = 'needs_review'`
- Mostra scores da IA (quality, novelty, relevance, clarity) e razão
- Botões: Aprovar → Promover | Rejeitar | Pedir Revisão (com notas)
- Log de auditoria para cada decisão humana

**Deliverables:**
- `HumanReviewTab.tsx` + `useHumanReview.ts`
- Integração com `canon-review-engine`

---

### Sprint 204 — Repo Trust no Pipeline Automático ✅
**Priority: High** | **Status: Complete**

- Inclui `evaluate_sources` e `weight_patterns` no cron diário
- Atualiza `canon-scheduled-pipeline/index.ts`
- Logs de auditoria com métricas de trust

**Deliverables:**
- `canon-scheduled-pipeline` atualizado com fase de trust
- Repo Trust mostra dados reais após 24h

---

### Sprint 205 — Ativação de Producers de Sinais Operacionais ✅
**Priority: Medium** | **Status: Complete**

- Instrumenta 4+ edge functions para emitir `operational_learning_signals`:
  - `canon-review-engine` → review_batch_completed
  - `canon-scheduled-pipeline` → scheduled_pipeline_completed
  - `skill-extraction-engine` → skills_extracted
  - `pipeline-execution-worker` → execution_completed

**Deliverables:**
- 4+ producers ativos
- Operational Learning mostra sinais > 0

---

### Sprint 206 — Mineração de Padrões Operacionais no Cron
**Priority: Medium** | **Dependency: Sprint 205**

- Inclui mineração de padrões no cron diário
- Padrões confirmados (≥3 ocorrências, confiança ≥ 0.6) geram candidatos ao cânone
- Candidatos entram no pipeline normal (review → promote)

---

### Sprint 207 — Recalibração de Confiança Automática
**Priority: Low** | **Dependency: Sprint 204**

- Inclui `recalibrate_confidence` no cron semanal
- Entradas com confiança degradada sinalizadas para revisão humana
- Atualiza `confidence_recalibration_log`

---

## Sprint Execution Map

```
Sprint 203 ──── Tela de Revisão Humana          ← PRIORITY 1
Sprint 204 ──── Repo Trust no Cron              ← PRIORITY 1 (parallel)
Sprint 205 ──── Producers de Sinais Operacionais ← PRIORITY 2
Sprint 206 ──── Mineração de Padrões no Cron    ← depends on 205
Sprint 207 ──── Recalibração de Confiança Auto  ← depends on 204
```

---

## Out of Scope for Block AS

- Skill-to-Capability binding (KX-3) → Future block
- Knowledge Visual Mesh (KX-7) → Future block
- End-to-end initiative execution → Depends on execution infrastructure
- Copilot integration with Canon Hub → Future refinement

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui |
| State | TanStack React Query + React Context |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions, RLS) |
| AI Engine | DeepSeek (economy) + OpenAI GPT-5-mini (high-confidence) + Lovable AI Gateway |
| Git | GitHub API v3 (Tree API for atomic commits) |
| Deploy | Vercel/Netlify auto-generated configs |
