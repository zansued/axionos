/**
 * NextBestAction — Contextual next-step recommendation
 *
 * Compact inline banner suggesting the next best action in context.
 */

import { ArrowRight, Zap } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/components/ui/button";

interface NextBestActionProps {
  action: { pt: string; en: string };
  onAction?: () => void;
  /** Optional urgency indicator */
  urgent?: boolean;
}

export function NextBestAction({ action, onAction, urgent }: NextBestActionProps) {
  const { locale } = useI18n();
  const lang = locale === "pt-BR" ? "pt" : "en";

  return (
    <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs border ${
      urgent
        ? "bg-warning/5 border-warning/20 text-warning"
        : "bg-muted/50 border-border text-muted-foreground"
    }`}>
      <Zap className="h-3 w-3 shrink-0" />
      <span className="flex-1">
        <span className="font-medium mr-1">
          {lang === "pt" ? "Próxima ação:" : "Next action:"}
        </span>
        {action[lang]}
      </span>
      {onAction && (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-2 text-xs"
          onClick={onAction}
        >
          <ArrowRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
