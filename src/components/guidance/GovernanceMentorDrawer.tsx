/**
 * GovernanceMentorDrawer — Governance decision-support panel
 *
 * Provides structured advisory context for platform_admin / platform_reviewer.
 * All recommendations are advisory-only — no autonomous approval or execution.
 */

import { X, Shield, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2, Clock, Ban, FlaskConical, BarChart3, Lock, ArrowRight, HelpCircle, Scale, RotateCcw, ExternalLink, Compass, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/contexts/I18nContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { GovernanceMentorContent, RiskLevel, BlastRadius, RollbackPosture, MentorRecommendation } from "@/lib/guidance/governance-mentor-types";

interface GovernanceMentorDrawerProps {
  content: GovernanceMentorContent;
  open: boolean;
  onClose: () => void;
}

// ─── Config maps ────────────────────────────────────────────────────────────

const RISK_CONFIG: Record<RiskLevel, { className: string; label: { pt: string; en: string } }> = {
  low:    { className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", label: { pt: "Risco baixo", en: "Low risk" } },
  medium: { className: "bg-warning/10 text-warning border-warning/20", label: { pt: "Risco médio", en: "Medium risk" } },
  high:   { className: "bg-destructive/10 text-destructive border-destructive/20", label: { pt: "Risco alto", en: "High risk" } },
};

const BLAST_CONFIG: Record<BlastRadius, { label: { pt: string; en: string } }> = {
  local:    { label: { pt: "Impacto local", en: "Local impact" } },
  tenant:   { label: { pt: "Impacto no tenant", en: "Tenant impact" } },
  platform: { label: { pt: "Impacto na plataforma", en: "Platform-wide impact" } },
};

const ROLLBACK_CONFIG: Record<RollbackPosture, { icon: typeof RotateCcw; className: string; label: { pt: string; en: string } }> = {
  clear:   { icon: CheckCircle2, className: "text-emerald-600", label: { pt: "Rollback claro e reversível", en: "Clear and reversible rollback" } },
  partial: { icon: AlertTriangle, className: "text-warning", label: { pt: "Rollback parcial — reversão limitada", en: "Partial rollback — limited reversal" } },
  complex: { icon: ShieldAlert, className: "text-destructive", label: { pt: "Rollback complexo — recuperação difícil", en: "Complex rollback — difficult recovery" } },
};

const RECOMMENDATION_CONFIG: Record<MentorRecommendation, { icon: typeof Shield; className: string; badgeClass: string; label: { pt: string; en: string } }> = {
  approve:              { icon: CheckCircle2, className: "text-emerald-600", badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", label: { pt: "Aprovar", en: "Approve" } },
  approve_with_caution: { icon: ShieldCheck, className: "text-warning", badgeClass: "bg-warning/10 text-warning border-warning/20", label: { pt: "Aprovar com cautela", en: "Approve with caution" } },
  defer:                { icon: Clock, className: "text-muted-foreground", badgeClass: "bg-muted text-muted-foreground border-border", label: { pt: "Adiar", en: "Defer" } },
  reject:               { icon: Ban, className: "text-destructive", badgeClass: "bg-destructive/10 text-destructive border-destructive/20", label: { pt: "Rejeitar", en: "Reject" } },
  needs_evidence:       { icon: FlaskConical, className: "text-info", badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20", label: { pt: "Precisa de mais evidência", en: "Needs more evidence" } },
  send_to_benchmark:    { icon: BarChart3, className: "text-info", badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20", label: { pt: "Enviar para benchmark", en: "Send to benchmark" } },
  restrict_scope:       { icon: Lock, className: "text-warning", badgeClass: "bg-warning/10 text-warning border-warning/20", label: { pt: "Restringir escopo primeiro", en: "Restrict scope first" } },
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function MentorSection({ title, icon: Icon, children, className }: {
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

// ─── Main component ─────────────────────────────────────────────────────────

export function GovernanceMentorDrawer({ content, open, onClose }: GovernanceMentorDrawerProps) {
  const { locale } = useI18n();
  const lang = locale === "pt-BR" ? "pt" : "en";
  const navigate = useNavigate();

  const recCfg = RECOMMENDATION_CONFIG[content.recommendation];
  const RecIcon = recCfg.icon;
  const riskCfg = RISK_CONFIG[content.riskLevel];
  const blastCfg = BLAST_CONFIG[content.blastRadius];
  const rollCfg = ROLLBACK_CONFIG[content.rollbackPosture];
  const RollIcon = rollCfg.icon;

  const confidencePct = Math.round(content.confidence * 100);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="fixed right-0 top-0 bottom-0 w-[400px] z-50 border-l border-border bg-card shadow-xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between h-12 px-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">
                {lang === "pt" ? "Mentor Mode de Governança" : "Governance Mentor Mode"}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Decision type + summary */}
              <div>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 mb-2">
                  {content.decisionType[lang]}
                </Badge>
                <p className="text-sm text-foreground/90 leading-relaxed">{content.summary[lang]}</p>
              </div>

              <Separator />

              {/* Why review matters now */}
              <MentorSection title={lang === "pt" ? "Por que revisar agora" : "Why review matters now"} icon={Info}>
                <p className="text-sm text-foreground/80 leading-relaxed">{content.whyNow[lang]}</p>
              </MentorSection>

              <Separator />

              {/* Recommendation */}
              <MentorSection title={lang === "pt" ? "Recomendação" : "Recommendation"} icon={Compass}>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <RecIcon className={`h-4 w-4 shrink-0 ${recCfg.className}`} />
                    <Badge variant="outline" className={`text-xs px-2 py-0.5 ${recCfg.badgeClass}`}>
                      {recCfg.label[lang]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{content.recommendationReason[lang]}</p>

                  {/* Confidence bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {lang === "pt" ? "Confiança" : "Confidence"}
                      </span>
                      <span className="text-[10px] font-medium text-foreground">{confidencePct}%</span>
                    </div>
                    <Progress value={confidencePct} className="h-1.5" />
                  </div>
                </div>
              </MentorSection>

              <Separator />

              {/* Risk & Blast Radius */}
              <MentorSection title={lang === "pt" ? "Risco & Raio de Impacto" : "Risk & Blast Radius"} icon={AlertTriangle}>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${riskCfg.className}`}>
                    {riskCfg.label[lang]}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {blastCfg.label[lang]}
                  </Badge>
                </div>
              </MentorSection>

              {/* Rollback */}
              <MentorSection title={lang === "pt" ? "Postura de Rollback" : "Rollback Posture"} icon={RotateCcw}>
                <div className="flex items-center gap-2">
                  <RollIcon className={`h-3.5 w-3.5 shrink-0 ${rollCfg.className}`} />
                  <span className="text-xs">{rollCfg.label[lang]}</span>
                </div>
              </MentorSection>

              {/* Uncertainties */}
              {content.uncertainties.length > 0 && (
                <>
                  <Separator />
                  <MentorSection title={lang === "pt" ? "O que ainda é incerto" : "What remains uncertain"} icon={HelpCircle}>
                    <ul className="space-y-1.5">
                      {content.uncertainties.map((u, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="text-warning mt-0.5">•</span>
                          <span className="leading-relaxed">{u[lang]}</span>
                        </li>
                      ))}
                    </ul>
                  </MentorSection>
                </>
              )}

              {/* Trade-offs */}
              {content.tradeoffs && content.tradeoffs.length > 0 && (
                <>
                  <Separator />
                  <MentorSection title={lang === "pt" ? "Trade-offs" : "Trade-offs"} icon={Scale}>
                    <div className="space-y-2.5">
                      {content.tradeoffs.map((t, i) => (
                        <div key={i} className="rounded-md border border-border bg-muted/30 p-2.5">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">
                            {t.label[lang]}
                          </span>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-start gap-1.5">
                              <ArrowRight className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                              <span className="text-foreground/80">{t.sideA[lang]}</span>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <ArrowRight className="h-3 w-3 text-warning mt-0.5 shrink-0" />
                              <span className="text-foreground/80">{t.sideB[lang]}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </MentorSection>
                </>
              )}

              {/* Suggested actions */}
              {content.suggestedActions && content.suggestedActions.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 block">
                      {lang === "pt" ? "Ações sugeridas" : "Suggested actions"}
                    </span>
                    <div className="space-y-1">
                      {content.suggestedActions.map((action, i) => (
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
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2.5 shrink-0">
            <p className="text-[10px] text-muted-foreground/60 text-center">
              {lang === "pt"
                ? "Mentor de Governança • Consultivo apenas • Não aprova nem executa"
                : "Governance Mentor • Advisory only • Does not approve or execute"}
            </p>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
