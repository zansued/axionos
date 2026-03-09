/**
 * CopilotTrigger — Entry point button for the Contextual Copilot Drawer
 *
 * Compact, non-intrusive button placed beside page headers.
 */

import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CopilotTriggerProps {
  onClick: () => void;
  /** Compact icon-only mode */
  compact?: boolean;
}

export function CopilotTrigger({ onClick, compact }: CopilotTriggerProps) {
  const { locale } = useI18n();
  const label = locale === "pt-BR" ? "Guia" : "Guide";

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
