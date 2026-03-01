import { AiAnalysis, AnalysisResult } from "@/hooks/useArtifactAnalysis";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import {
  Brain, CheckCircle2, XCircle, RotateCcw, Loader2,
  ShieldCheck, ShieldAlert, AlertTriangle, Shield,
  ThumbsUp, AlertCircle, Lightbulb,
} from "lucide-react";
import { motion } from "framer-motion";

const VERDICT_CONFIG = {
  approve: { label: "Aprovado pela IA", icon: CheckCircle2, className: "bg-green-500/20 text-green-400 border-green-500/30" },
  reject: { label: "Rejeitado pela IA", icon: XCircle, className: "bg-red-500/20 text-red-400 border-red-500/30" },
  request_changes: { label: "Alterações sugeridas", icon: RotateCcw, className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
};

const RISK_CONFIG = {
  low: { label: "Baixo", icon: ShieldCheck, className: "text-green-400" },
  medium: { label: "Médio", icon: Shield, className: "text-yellow-400" },
  high: { label: "Alto", icon: ShieldAlert, className: "text-orange-400" },
  critical: { label: "Crítico", icon: AlertTriangle, className: "text-red-400" },
};

interface Props {
  artifactId: string;
  analysisResult: AnalysisResult | undefined;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onApplyVerdict?: (verdict: "approve" | "reject" | "request_changes") => void;
}

export function ArtifactAiAnalysis({ artifactId, analysisResult, isAnalyzing, onAnalyze, onApplyVerdict }: Props) {
  const [showReasoning, setShowReasoning] = useState(false);
  const analysis = analysisResult?.analysis;
  const reasoning = analysisResult?.reasoning;

  if (!analysis) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
        onClick={(e) => { e.stopPropagation(); onAnalyze(); }}
        disabled={isAnalyzing}
      >
        {isAnalyzing ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Brain className="h-3 w-3" />
        )}
        {isAnalyzing ? "Analisando..." : "Análise IA"}
      </Button>
    );
  }

  const verdict = VERDICT_CONFIG[analysis.verdict];
  const risk = RISK_CONFIG[analysis.risk_level];
  const VerdictIcon = verdict.icon;
  const RiskIcon = risk.icon;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <Card className="border-border/50 bg-muted/10 mt-3 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-400 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Análise IA</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className={`text-[10px] ${verdict.className}`}>
                <VerdictIcon className="h-3 w-3 mr-1" />
                {verdict.label}
              </Badge>
              <Badge variant="outline" className="text-[10px] gap-1">
                <RiskIcon className={`h-3 w-3 ${risk.className}`} />
                Risco {risk.label}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {analysis.confidence}% confiança
              </Badge>
            </div>
          </div>

          <p className="text-sm text-foreground/90 break-words">{analysis.summary}</p>

          <ScrollArea className="max-h-[200px]">
            <div className="space-y-3">
              {analysis.strengths.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <ThumbsUp className="h-3 w-3" /> Pontos Fortes
                  </p>
                  <ul className="space-y-0.5">
                    {analysis.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-foreground/70 pl-3 relative break-words before:content-['•'] before:absolute before:left-0 before:text-green-400">{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.issues.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <AlertCircle className="h-3 w-3" /> Problemas
                  </p>
                  <ul className="space-y-0.5">
                    {analysis.issues.map((s, i) => (
                      <li key={i} className="text-xs text-foreground/70 pl-3 relative break-words before:content-['•'] before:absolute before:left-0 before:text-red-400">{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.suggestions.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-yellow-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Lightbulb className="h-3 w-3" /> Sugestões
                  </p>
                  <ul className="space-y-0.5">
                    {analysis.suggestions.map((s, i) => (
                      <li key={i} className="text-xs text-foreground/70 pl-3 relative break-words before:content-['•'] before:absolute before:left-0 before:text-yellow-400">{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </ScrollArea>

          {reasoning && (
            <div className="border-t border-border/30 pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] gap-1 text-muted-foreground"
                onClick={() => setShowReasoning(!showReasoning)}
              >
                <Brain className="h-3 w-3" />
                {showReasoning ? "Ocultar raciocínio" : "Ver raciocínio da IA"}
              </Button>
              {showReasoning && (
                <ScrollArea className="max-h-[200px] mt-2 rounded-md border border-border/30 bg-muted/20 p-3">
                  <pre className="text-[11px] whitespace-pre-wrap text-muted-foreground italic">{reasoning}</pre>
                </ScrollArea>
              )}
            </div>
          )}

          {onApplyVerdict && (
            <div className="flex items-center gap-2 pt-1 border-t border-border/30">
              <span className="text-[10px] text-muted-foreground">Aplicar veredito:</span>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] gap-1"
                onClick={() => onApplyVerdict(analysis.verdict)}
              >
                <VerdictIcon className="h-3 w-3" />
                {analysis.verdict === "approve" ? "Aprovar" : analysis.verdict === "reject" ? "Rejeitar" : "Solicitar Alterações"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] gap-1"
                onClick={onAnalyze}
              >
                <Brain className="h-3 w-3" /> Reanalisar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
