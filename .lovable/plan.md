

## Diagnóstico

O problema de layout (sidebar flutuando, espaço vazio) tem **uma causa raiz**: existem **dois padrões de layout** coexistindo no projeto:

1. **Padrão canônico** (`AppShell`/`AppLayout`): Usa o wrapper centralizado com `SidebarProvider` + `AppSidebar` + `Topbar` + `ContextPanel`. ~66 páginas usam esse.

2. **Padrão inline** (legado): ~36 páginas importam `SidebarProvider` e `AppSidebar` diretamente e montam o layout manualmente, cada uma com variações diferentes de `className`, causando inconsistências visuais.

A página atual (`/system-health` → `SystemHealthDashboard`) usa o padrão inline, sem `Topbar`, sem `ContextPanel`, e com estrutura flex ligeiramente diferente.

Além disso, o arquivo `src/App.css` ainda existe com `#root { max-width: 1280px; margin: 0 auto; padding: 2rem; }` — um boilerplate do Vite. Embora não esteja importado em nenhum arquivo, sua presença é desnecessária e pode confundir.

## Plano

### 1. Deletar `src/App.css`
Remover o boilerplate Vite não utilizado.

### 2. Migrar `SystemHealthDashboard` para `AppShell`
Substituir o layout inline por `<AppShell>`, removendo imports de `SidebarProvider` e `AppSidebar`.

### 3. Migrar as demais páginas com layout inline para `AppShell`
As ~35 páginas restantes que usam `SidebarProvider` diretamente serão convertidas para `<AppShell>` ou `<AppLayout>`. Isso inclui:
- `CanonGovernanceDashboard`
- `ImprovementBenchmarks`
- `AgentDebates`
- `RuntimeValidationHarness`
- `PilotMarketplace`
- `AutonomyPostureDashboard`
- `AgentRouting`
- `ResearchSandbox`
- `ResearchPatterns`
- E todas as demais encontradas na busca (~36 total)

Cada página será simplificada de:
```tsx
<SidebarProvider>
  <div className="flex min-h-screen w-full">
    <AppSidebar />
    <main className="flex-1 p-6">...</main>
  </div>
</SidebarProvider>
```
Para:
```tsx
<AppShell>
  <div className="space-y-6">...</div>
</AppShell>
```

Isso garante que **todas as páginas** usem o mesmo layout com sidebar, topbar e proporções corretas — eliminando o problema de sidebar desproporcional.

### Resultado esperado
- Sidebar consistente em todas as telas
- Topbar presente em todas as páginas autenticadas
- Sem espaço vazio ou flutuação
- Layout unificado e manutenível

