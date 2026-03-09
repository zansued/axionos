/**
 * GuidanceTooltip — Contextual micro-help
 *
 * Wraps any element with a tooltip that provides contextual explanation.
 * Uses the canonical design tokens and shadcn tooltip.
 */

import { ReactNode } from "react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useI18n } from "@/contexts/I18nContext";
import { HelpCircle } from "lucide-react";

interface GuidanceTooltipProps {
  /** Bilingual label */
  label: { pt: string; en: string };
  /** Bilingual description */
  description: { pt: string; en: string };
  children?: ReactNode;
  /** Show inline help icon instead of wrapping children */
  inline?: boolean;
  side?: "top" | "bottom" | "left" | "right";
}

export function GuidanceTooltip({ label, description, children, inline, side = "top" }: GuidanceTooltipProps) {
  const { locale } = useI18n();
  const lang = locale === "pt-BR" ? "pt" : "en";

  const trigger = inline ? (
    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help inline-block ml-1" />
  ) : (
    children
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <p className="text-xs font-medium mb-0.5">{label[lang]}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{description[lang]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
