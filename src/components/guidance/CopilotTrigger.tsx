/**
 * CopilotTrigger — Entry point button for the Contextual Copilot Drawer
 *
 * Compact, non-intrusive button placed beside page headers.
 * Mode-aware: reflects Product Copilot vs Workspace Copilot vs Governance Mentor Mode.
 */

import { Compass, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { CopilotSubmode } from "@/lib/guidance/types";

interface CopilotTriggerProps {
  onClick: () => void;
  /** Compact icon-only mode */
  compact?: boolean;
  /** Copilot submode for role-aware label */
  submode?: CopilotSubmode;
}

export function CopilotTrigger({ onClick, compact, submode }: CopilotTriggerProps) {
  const { locale } = useI18n();
  const lang = locale === "pt-BR" ? "pt" : "en";

  // Derive label and icon based on submode
  const isGovernanceMentor = submode === "governance_mentor";
  const Icon = isGovernanceMentor ? Shield : Compass;

  let label: string;
  let tooltipText: string;

  if (submode === "product_copilot") {
    label = lang === "pt" ? "Copilot" : "Copilot";
    tooltipText = lang === "pt" ? "Abrir Copilot de Produto" : "Open Product Copilot";
  } else if (submode === "workspace_copilot") {
    label = lang === "pt" ? "Copilot" : "Copilot";
    tooltipText = lang === "pt" ? "Abrir Copilot do Workspace" : "Open Workspace Copilot";
  } else if (submode === "governance_mentor") {
    label = lang === "pt" ? "Mentor" : "Mentor";
    tooltipText = lang === "pt" ? "Abrir Mentor Mode de Governança" : "Open Governance Mentor Mode";
  } else {
    label = lang === "pt" ? "Guia" : "Guide";
    tooltipText = lang === "pt" ? "Abrir guia contextual" : "Open contextual guide";
  }

  if (compact) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={onClick}
            >
              <Compass className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">{locale === "pt-BR" ? "Abrir guia contextual" : "Open contextual guide"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 gap-1.5 text-xs"
      onClick={onClick}
    >
      <Compass className="h-3 w-3" />
      {label}
    </Button>
  );
}
