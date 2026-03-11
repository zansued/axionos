/**
 * PageIntroCard — Contextual Guidance MVP 1
 *
 * Lightweight, dismissible card shown at the top of major areas.
 * Displays: what the area is, who it's for, next best action,
 * and approval/risk hints when applicable.
 */

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ArrowRight, ShieldCheck, Info, Sparkles } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import type { PageGuidanceContract, ApprovalPosture } from "@/lib/guidance/types";
import { motion, AnimatePresence } from "framer-motion";

interface PageIntroCardProps {
  guidance: PageGuidanceContract;
  /** Optional dynamic "why now" message */
  whyNow?: string;
  /** Compact mode — less detail */
  compact?: boolean;
}

const APPROVAL_COLORS: Record<ApprovalPosture, string> = {
  none: "",
  optional: "bg-info/10 text-info border-info/20",
  recommended: "bg-warning/10 text-warning border-warning/20",
  required: "bg-destructive/10 text-destructive border-destructive/20",
};

const APPROVAL_LABELS: Record<ApprovalPosture, { pt: string; en: string }> = {
  none: { pt: "", en: "" },
  optional: { pt: "Aprovação opcional", en: "Optional approval" },
  recommended: { pt: "Aprovação recomendada", en: "Approval recommended" },
  required: { pt: "Aprovação obrigatória", en: "Approval required" },
};

const SURFACE_COLORS: Record<string, string> = {
  product: "border-l-[hsl(var(--surface-product))]",
  workspace: "border-l-[hsl(var(--surface-workspace))]",
  platform: "border-l-[hsl(var(--surface-platform))]",
};

export function PageIntroCard({ guidance, whyNow, compact }: PageIntroCardProps) {
  const { locale } = useI18n();
  const lang = locale === "pt-BR" ? "pt" : "en";

  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(`guidance-dismissed-${guidance.key}`) === "1";
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(`guidance-dismissed-${guidance.key}`, "1");
    } catch { /* noop */ }
  };

  if (dismissed) return null;

  const surfaceBorder = SURFACE_COLORS[guidance.surface] || "";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        <Card className={`border-l-4 ${surfaceBorder} bg-card/80 backdrop-blur-sm`}>
          <CardContent className={compact ? "py-4 px-5" : "py-5 px-6"}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-2">
                {/* Header */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Sparkles className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {lang === "pt" ? "Guia Contextual" : "Contextual Guide"}
                  </span>
                  {guidance.approvalPosture !== "none" && (
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${APPROVAL_COLORS[guidance.approvalPosture]}`}>
                      <ShieldCheck className="h-2.5 w-2.5 mr-1" />
                      {APPROVAL_LABELS[guidance.approvalPosture][lang]}
                    </Badge>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {guidance.description[lang]}
                </p>

                {/* Why now */}
                {whyNow && (
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2.5 py-1.5">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{whyNow}</span>
                  </div>
                )}

                {!compact && (
                  <>
                    {/* Audience */}
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">{lang === "pt" ? "Para:" : "For:"}</span>{" "}
                      {guidance.audience[lang]}
                    </p>

                    {/* Next step */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <span>
                        <span className="font-medium">
                          {lang === "pt" ? "Próximo passo:" : "Next step:"}
                        </span>{" "}
                        {guidance.nextStep[lang]}
                      </span>
                    </div>

                    {/* Approval hint */}
                    {guidance.approvalHint && (
                      <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <ShieldCheck className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{guidance.approvalHint[lang]}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground"
                onClick={handleDismiss}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
