/**
 * usePageGuidance — Role-aware guidance hook
 *
 * Returns the guidance contract for a page only if the current user's
 * role has access to that surface. Returns null when the guidance
 * should be hidden from the current role.
 */

import { useMemo } from "react";
import { useRoleBasedExperience } from "@/hooks/useRoleBasedExperience";
import { useI18n } from "@/contexts/I18nContext";
import { getGuidanceForPage } from "@/lib/guidance/contracts";
import type { PageGuidanceContract, GuidanceSurface } from "@/lib/guidance/types";

/** Which surfaces each canonical role can see guidance for */
const ROLE_SURFACE_ACCESS: Record<string, GuidanceSurface[]> = {
  end_user:          ["product"],
  operator:          ["product", "workspace"],
  tenant_owner:      ["product", "workspace"],
  platform_reviewer: ["product", "workspace", "platform"],
  platform_admin:    ["product", "workspace", "platform"],
};

/** Role-specific "why now" dynamic hints */
const ROLE_WHY_NOW: Record<string, Record<string, { pt: string; en: string }>> = {
  end_user: {
    dashboard: {
      pt: "Verifique rapidamente o progresso das suas iniciativas.",
      en: "Quickly check your initiative progress.",
    },
    onboarding: {
      pt: "Complete o onboarding para criar sua primeira iniciativa.",
      en: "Complete onboarding to create your first initiative.",
    },
  },
  operator: {
    adoption: {
      pt: "Algumas iniciativas mostram engajamento baixo — vale revisar.",
      en: "Some initiatives show low engagement — worth reviewing.",
    },
    candidates: {
      pt: "Há propostas pendentes de revisão humana.",
      en: "There are proposals pending human review.",
    },
    evidence: {
      pt: "Novos sinais operacionais foram coletados recentemente.",
      en: "New operational signals were recently collected.",
    },
    benchmarks: {
      pt: "Candidatos aguardam benchmarking para decisão de promoção.",
      en: "Candidates are awaiting benchmarking for promotion decisions.",
    },
  },
  tenant_owner: {
    extensions: {
      pt: "Gerencie extensões do workspace com controle de governança.",
      en: "Manage workspace extensions with governance control.",
    },
  },
  platform_admin: {
    observability: {
      pt: "Monitore a saúde operacional da plataforma em tempo real.",
      en: "Monitor platform operational health in real time.",
    },
    routing: {
      pt: "Roteamento afeta custo, confiança e comportamento de fallback.",
      en: "Routing affects cost, confidence, and fallback behavior.",
    },
    "capability-governance": {
      pt: "Mudanças em políticas de agentes requerem revisão administrativa.",
      en: "Changes to agent policies require administrative review.",
    },
    audit: {
      pt: "Rastreie decisões e eventos do sistema para compliance.",
      en: "Trace system decisions and events for compliance.",
    },
    "platform-extensions": {
      pt: "Extensões de plataforma pendentes podem exigir aprovação.",
      en: "Pending platform extensions may require approval.",
    },
  },
};

export function usePageGuidance(pageKey: string) {
  const { canonicalRole } = useRoleBasedExperience();
  const { locale } = useI18n();
  const lang = locale === "pt-BR" ? "pt" : "en";

  return useMemo(() => {
    const guidance = getGuidanceForPage(pageKey);
    if (!guidance) return { guidance: null, whyNow: undefined, whyNowText: undefined };

    // Check if the current role can see guidance for this surface
    const allowedSurfaces = ROLE_SURFACE_ACCESS[canonicalRole] ?? ROLE_SURFACE_ACCESS.end_user;
    if (!allowedSurfaces.includes(guidance.surface)) {
      return { guidance: null, whyNow: undefined, whyNowText: undefined };
    }

    // Get role-specific "why now" hint
    const roleHints = ROLE_WHY_NOW[canonicalRole];
    const whyNow = roleHints?.[pageKey];
    const whyNowText = whyNow?.[lang];

    return { guidance, whyNow, whyNowText };
  }, [pageKey, canonicalRole, lang]);
}
