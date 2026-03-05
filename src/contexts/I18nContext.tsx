import React, { createContext, useContext, useState, useCallback } from "react";

export type Locale = "pt-BR" | "en-US";

const translations = {
  "pt-BR": {
    // Sidebar
    "nav.dashboard": "Dashboard",
    "nav.initiatives": "Iniciativas",
    "nav.squads": "Squads",
    "nav.execution": "Execução",
    "nav.validation": "Validação",
    "nav.code": "Código",
    "nav.workspace": "Workspace",
    "nav.kanban": "Kanban",
    "nav.audit": "Auditoria",
    "nav.observability": "Observabilidade",
    "nav.connections": "Conexões",
    "nav.org": "Organização",
    "nav.billing": "Billing & Usage",
    "nav.notifications": "Notificações",
    "nav.guide": "Guia",
    "nav.logout": "Sair",
    "nav.pipeline": "Pipeline",
    "nav.governance": "Governança",
    "nav.lightMode": "Modo Claro",
    "nav.darkMode": "Modo Escuro",
    // Initiatives
    "initiatives.title": "Iniciativas",
    "initiatives.subtitle": "Da ideia ao software — pipeline governado com aprovação humana",
    "initiatives.new": "Nova Iniciativa",
    "initiatives.selectPrompt": "Selecione uma iniciativa para ver o pipeline",
    "initiatives.created": "Iniciativa criada!",
    "initiatives.deleted": "Iniciativa excluída",
    "initiatives.deletedDesc": "Todos os dados associados foram removidos.",
    "initiatives.deleteError": "Erro ao excluir",
    "initiatives.templatePicker": "Escolha um template ou comece do zero",
    "initiatives.fromScratch": "Criar do zero",
    "initiatives.whatBuild": "O que você quer construir?",
    "initiatives.descLabel": "Descrição",
    "initiatives.optional": "opcional",
    "initiatives.refUrl": "URL de Referência",
    "initiatives.refUrlHint": "A IA irá analisar este site e usar como referência no Discovery e Planning.",
    "initiatives.create": "Criar Iniciativa",
    // Templates
    "template.simple": "Simples",
    "template.medium": "Médio",
    "template.complex": "Complexo",
    "template.lowRisk": "Risco baixo",
    "template.medRisk": "Risco médio",
    // Common
    "common.error": "Erro",
    "common.or": "ou",
    "common.export": "Exportar",
    "common.exportCSV": "Exportar CSV",
    "common.exportPDF": "Exportar PDF",
    "common.noData": "Nenhum dado disponível",
    "common.language": "Idioma",
    // Dashboard
    "dashboard.title": "Dashboard Estratégico",
    "dashboard.subtitle": "Visão consolidada do pipeline de iniciativas",
    // Keyboard
    "shortcuts.title": "Atalhos de Teclado",
    "shortcuts.navigation": "Navegação",
    "shortcuts.actions": "Ações",
    "shortcuts.goToDashboard": "Ir para Dashboard",
    "shortcuts.goToInitiatives": "Ir para Iniciativas",
    "shortcuts.goToKanban": "Ir para Kanban",
    "shortcuts.goToCode": "Ir para Código",
    "shortcuts.newInitiative": "Nova Iniciativa",
    "shortcuts.toggleTheme": "Alternar Tema",
    "shortcuts.showShortcuts": "Mostrar Atalhos",
    // Notifications
    "notifications.title": "Pipeline",
    "notifications.running": "estágio(s) em execução",
    "notifications.empty": "Nenhuma notificação ainda",
  },
  "en-US": {
    // Sidebar
    "nav.dashboard": "Dashboard",
    "nav.initiatives": "Initiatives",
    "nav.squads": "Squads",
    "nav.execution": "Execution",
    "nav.validation": "Validation",
    "nav.code": "Code",
    "nav.workspace": "Workspace",
    "nav.kanban": "Kanban",
    "nav.audit": "Audit",
    "nav.observability": "Observability",
    "nav.connections": "Connections",
    "nav.org": "Organization",
    "nav.billing": "Billing & Usage",
    "nav.notifications": "Notifications",
    "nav.guide": "Guide",
    "nav.logout": "Sign Out",
    "nav.pipeline": "Pipeline",
    "nav.governance": "Governance",
    "nav.lightMode": "Light Mode",
    "nav.darkMode": "Dark Mode",
    // Initiatives
    "initiatives.title": "Initiatives",
    "initiatives.subtitle": "From idea to software — governed pipeline with human approval",
    "initiatives.new": "New Initiative",
    "initiatives.selectPrompt": "Select an initiative to see the pipeline",
    "initiatives.created": "Initiative created!",
    "initiatives.deleted": "Initiative deleted",
    "initiatives.deletedDesc": "All associated data has been removed.",
    "initiatives.deleteError": "Error deleting",
    "initiatives.templatePicker": "Choose a template or start from scratch",
    "initiatives.fromScratch": "Start from scratch",
    "initiatives.whatBuild": "What do you want to build?",
    "initiatives.descLabel": "Description",
    "initiatives.optional": "optional",
    "initiatives.refUrl": "Reference URL",
    "initiatives.refUrlHint": "AI will analyze this site and use it as a reference in Discovery and Planning.",
    "initiatives.create": "Create Initiative",
    // Templates
    "template.simple": "Simple",
    "template.medium": "Medium",
    "template.complex": "Complex",
    "template.lowRisk": "Low risk",
    "template.medRisk": "Medium risk",
    // Common
    "common.error": "Error",
    "common.or": "or",
    "common.export": "Export",
    "common.exportCSV": "Export CSV",
    "common.exportPDF": "Export PDF",
    "common.noData": "No data available",
    "common.language": "Language",
    // Dashboard
    "dashboard.title": "Strategic Dashboard",
    "dashboard.subtitle": "Consolidated view of the initiative pipeline",
    // Keyboard
    "shortcuts.title": "Keyboard Shortcuts",
    "shortcuts.navigation": "Navigation",
    "shortcuts.actions": "Actions",
    "shortcuts.goToDashboard": "Go to Dashboard",
    "shortcuts.goToInitiatives": "Go to Initiatives",
    "shortcuts.goToKanban": "Go to Kanban",
    "shortcuts.goToCode": "Go to Code",
    "shortcuts.newInitiative": "New Initiative",
    "shortcuts.toggleTheme": "Toggle Theme",
    "shortcuts.showShortcuts": "Show Shortcuts",
    // Notifications
    "notifications.title": "Pipeline",
    "notifications.running": "stage(s) running",
    "notifications.empty": "No notifications yet",
  },
} as const;

type TranslationKey = keyof typeof translations["pt-BR"];

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "pt-BR",
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem("app-locale");
    return (saved === "en-US" ? "en-US" : "pt-BR") as Locale;
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("app-locale", l);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[locale]?.[key] ?? translations["pt-BR"][key] ?? key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
