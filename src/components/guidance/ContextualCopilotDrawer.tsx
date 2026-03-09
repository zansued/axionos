/**
 * ContextualCopilotDrawer — Phase 2 Guidance Layer
 *
 * Expandable side drawer providing contextual decision-support.
 * Consumes existing PageGuidanceContract + CopilotDrawerContent.
 *
 * Canon invariants preserved:
 *   - advisory-first (guide, don't act)
 *   - governance before autonomy
 *   - human approval for structural change
 *   - no autonomous architecture mutation
 */

import { useState } from "react";
import { X, Compass, ArrowRight, ShieldCheck, ShieldAlert, Shield, EyeOff, Zap, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/contexts/I18nContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { PageGuidanceContract, CopilotRoleContent, ApprovalPosture } from "@/lib/guidance/types";
import { getCopilotContent } from "@/lib/guidance/copilot-content";

interface ContextualCopilotDrawerProps {
  pageKey: string;
  guidance: PageGuidanceContract;
  canonicalRole: string;
  open: boolean;
  onClose: () => void;
}

const APPROVAL_CONFIG: Record<ApprovalPosture, { icon: typeof Shield; className: string; label: { pt: string; en: string } }> = {
  none: {
    icon: Shield,
    className: "text-muted-foreground",
    label: { pt: "Nenhuma aprovação necessária", en: "No approval required" },
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

function DrawerSection({ title, icon: Icon, children, className }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      {children}
    </div>
  );
}

export function ContextualCopilotDrawer({ pageKey, guidance, canonicalRole, open, onClose }: ContextualCopilotDrawerProps) {
  const { locale } = useI18n();
  const lang = locale === "pt-BR" ? "pt" : "en";
  const navigate = useNavigate();

  // Resolve copilot content with role fallback
  const copilotData = getCopilotContent(pageKey);
  const roleContent = copilotData?.roleOverrides?.[canonicalRole];
  const base = copilotData?.default;

  // Merge: role override takes precedence, then base copilot, then guidance contract
  const resolve = <T,>(field: keyof CopilotRoleContent): { pt: string; en: string } | undefined => {
    return (roleContent as any)?.[field] ?? (base as any)?.[field];
  };

  const summary = resolve("summary") ?? guidance.description;
  const whyNow = resolve("whyNow") ?? undefined;
  const nextAction = resolve("nextAction") ?? guidance.nextStep;
  const secondaryAction = resolve("secondaryAction");
  const nextActionReason = resolve("nextActionReason");
  const approvalExplanation = resolve("approvalExplanation") ?? guidance.approvalHint;
  const ignoreForNow = resolve("ignoreForNow") ?? guidance.whenIgnorable;
  const suggestedActions = roleContent?.suggestedActions ?? base?.suggestedActions ?? [];

  const approvalCfg = APPROVAL_CONFIG[guidance.approvalPosture];
  const ApprovalIcon = approvalCfg.icon;

  const surfaceLabel = guidance.surface === "product"
    ? (lang === "pt" ? "Superfície de Produto" : "Product Surface")
    : guidance.surface === "workspace"
    ? (lang === "pt" ? "Governança do Workspace" : "Workspace Governance")
    : (lang === "pt" ? "Governança da Plataforma" : "Platform Governance");

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 380, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="fixed right-0 top-0 bottom-0 w-[380px] z-50 border-l border-border bg-card shadow-xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between h-12 px-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">
                {lang === "pt" ? "Guia Contextual" : "Contextual Guide"}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-5">
              {/* Page title + surface badge */}
              <div>
                <h3 className="text-base font-semibold text-foreground">{guidance.title[lang]}</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {surfaceLabel}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {lang === "pt" ? "Para:" : "For:"} {guidance.audience[lang]}
                  </span>
                </div>
              </div>

              <Separator />

              {/* What this is */}
              <DrawerSection title={lang === "pt" ? "O que é" : "What this is"} icon={Compass}>
                <p className="text-sm text-foreground/90 leading-relaxed">{summary[lang]}</p>
              </DrawerSection>

              {/* Why now */}
              {whyNow && (
                <DrawerSection title={lang === "pt" ? "Por que agora" : "Why now"} icon={Zap}>
                  <p className="text-sm text-foreground/80 leading-relaxed">{whyNow[lang]}</p>
                </DrawerSection>
              )}

              {/* Next best action */}
              <DrawerSection title={lang === "pt" ? "Próximo passo recomendado" : "Recommended next step"} icon={ArrowRight}>
                <div className="space-y-1.5">
                  <p className="text-sm text-foreground/90 leading-relaxed font-medium">{nextAction[lang]}</p>
                  {nextActionReason && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{nextActionReason[lang]}</p>
                  )}
                  {secondaryAction && (
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      <span className="font-medium">{lang === "pt" ? "Alternativa:" : "Alternative:"}</span>{" "}
                      {secondaryAction[lang]}
                    </p>
                  )}
                </div>
              </DrawerSection>

              {/* Risk / Approval */}
              <DrawerSection title={lang === "pt" ? "Risco & Aprovação" : "Risk & Approval"} icon={ApprovalIcon} className={approvalCfg.className}>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <ApprovalIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-sm font-medium">{approvalCfg.label[lang]}</span>
                  </div>
                  {approvalExplanation && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{approvalExplanation[lang]}</p>
                  )}
                </div>
              </DrawerSection>

              {/* Ignore for now */}
              {ignoreForNow && (
                <DrawerSection title={lang === "pt" ? "Pode ignorar por agora" : "Safe to ignore for now"} icon={EyeOff}>
                  <p className="text-xs text-muted-foreground leading-relaxed">{ignoreForNow[lang]}</p>
                </DrawerSection>
              )}

              {/* Suggested actions */}
              {suggestedActions.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 block">
                      {lang === "pt" ? "Ações sugeridas" : "Suggested actions"}
                    </span>
                    <div className="space-y-1">
                      {suggestedActions.map((action, i) => (
                        <Button
                          key={i}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-between h-8 text-xs"
                          onClick={() => {
                            if (action.route) {
                              navigate(action.route);
                              onClose();
                            }
                          }}
                        >
                          <span>{action.label[lang]}</span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Available actions from guidance */}
              {guidance.actions.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 block">
                      {lang === "pt" ? "O que você pode fazer aqui" : "What you can do here"}
                    </span>
                    <ul className="space-y-1">
                      {guidance.actions.map((action, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{action[lang]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2.5 shrink-0">
            <p className="text-[10px] text-muted-foreground/60 text-center">
              {lang === "pt"
                ? "Guia contextual • Consultivo apenas • Sem ações autônomas"
                : "Contextual guide • Advisory only • No autonomous actions"}
            </p>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
