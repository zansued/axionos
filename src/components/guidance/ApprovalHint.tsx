/**
 * ApprovalHint — Risk / approval posture indicator
 *
 * Shows a compact hint about the approval requirements of an area or action.
 */

import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import type { ApprovalPosture } from "@/lib/guidance/types";

interface ApprovalHintProps {
  posture: ApprovalPosture;
  hint?: { pt: string; en: string };
}

const CONFIG: Record<ApprovalPosture, { icon: typeof Shield; className: string; label: { pt: string; en: string } }> = {
  none: {
    icon: Shield,
    className: "text-muted-foreground",
    label: { pt: "Sem aprovação necessária", en: "No approval needed" },
  },
  optional: {
    icon: ShieldCheck,
    className: "text-info",
    label: { pt: "Aprovação opcional", en: "Optional approval" },
  },
  recommended: {
    icon: ShieldAlert,
    className: "text-warning",
    label: { pt: "Aprovação recomendada", en: "Approval recommended" },
  },
  required: {
    icon: ShieldAlert,
    className: "text-destructive",
    label: { pt: "Aprovação obrigatória", en: "Approval required" },
  },
};

export function ApprovalHint({ posture, hint }: ApprovalHintProps) {
  const { locale } = useI18n();
  const lang = locale === "pt-BR" ? "pt" : "en";

  if (posture === "none") return null;

  const config = CONFIG[posture];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1.5 text-xs ${config.className}`}>
      <Icon className="h-3 w-3 shrink-0" />
      <span>{hint ? hint[lang] : config.label[lang]}</span>
    </div>
  );
}
