import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Brain, Users, FileText, Cpu, Loader2, Target, TrendingUp, Shield,
  Layers, AlertTriangle, ArrowRight, Sparkles, Rocket, BookOpen,
  CheckCircle2, Clock, DollarSign, Zap, RotateCcw
} from "lucide-react";
import { MACRO_STAGES, getMacroStageIndex, getAvailableActions, RISK_COLORS } from "./pipeline-config";

interface InitiativeDetailProps {
  initiative: any;
  jobs: any[];
  runningStage: string | null;
  onRunStage: (stage: string, comment?: string) => void;
  onApprove: () => void;
}

export function InitiativeDetail({ initiative, jobs, runningStage, onRunStage, onApprove }: InitiativeDetailProps) {
  const stageStatus = initiative.stage_status || initiative.status || "draft";
  const macroIdx = getMacroStageIndex(stageStatus);
  const actions = getAvailableActions(stageStatus);
  const dp = initiative.discovery_payload || {};

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");

  const handleReject = () => {
    if (rejectComment.trim().length < 10) return;
    onRunStage("reject", rejectComment.trim());
    setRejectOpen(false);
    setRejectComment("");
  };

  return (
    <div className="space-y-4">
      {/* Header + Macro Pipeline */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <CardTitle className="font-display text-xl">{initiative.title}</CardTitle>
              {initiative.description && <p className="text-sm text-muted-foreground mt-1 break-words">{initiative.description}</p>}
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap justify-end">
              {actions.map((action) => (
                action.type === "reject" ? (
                  <Button
                    key={action.stage}
                    onClick={() => setRejectOpen(true)}
                    disabled={!!runningStage}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {action.label}
                  </Button>
                ) : (
                  <Button
                    key={action.stage}
                    onClick={() => action.type === "approve" ? onApprove() : onRunStage(action.stage)}
                    disabled={!!runningStage}
                    variant={action.type === "approve" ? "default" : "secondary"}
                    className="gap-2"
                  >
                    {runningStage === action.stage ? <Loader2 className="h-4 w-4 animate-spin" /> :
                      action.type === "approve" ? <CheckCircle2 className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                    {runningStage === action.stage ? "Processando..." : action.label}
                  </Button>
                )
              ))}
            </div>
          </div>
          {/* Macro pipeline steps */}
          <div className="flex items-center gap-1 mt-4">
            {MACRO_STAGES.map((stage, i) => {
              const Icon = stage.icon;
              const isDone = i < macroIdx;
              const isActive = i === macroIdx;
              return (
                <div key={stage.key} className="flex items-center shrink-0">
                  <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
                    isActive ? "bg-primary/15 text-primary border border-primary/30" :
                    isDone ? "bg-success/10 text-success" : "bg-muted/30 text-muted-foreground"
                  }`}>
                    {isDone ? <CheckCircle2 className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                    <span className="hidden sm:inline">{stage.label}</span>
                  </div>
                  {i < MACRO_STAGES.length - 1 && <ArrowRight className={`h-3 w-3 mx-0.5 shrink-0 ${isDone ? "text-success" : "text-muted-foreground/20"}`} />}
                </div>
              );
            })}
          </div>
          {/* Approval timestamps */}
          <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
            {initiative.approved_at_discovery && (
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> Discovery aprovado</span>
            )}
            {initiative.approved_at_squad && (
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> Squad aprovado</span>
            )}
            {initiative.approved_at_planning && (
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> Planning aprovado</span>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-destructive" />
              Solicitar Ajustes
            </DialogTitle>
            <DialogDescription>
              Descreva o que precisa ser corrigido. O pipeline voltará ao estágio anterior e um job de rework será registrado.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Descreva os ajustes necessários (mínimo 10 caracteres)..."
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectComment.trim().length < 10}
              className="gap-1.5"
            >
              <RotateCcw className="h-4 w-4" />
              Confirmar Ajustes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Running indicator */}
      {runningStage && runningStage !== "approve" && runningStage !== "reject" && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">
                {runningStage === "discovery" && "IA analisando ideia, mercado e viabilidade..."}
                {runningStage === "squad_formation" && "Montando squad ideal de agentes..."}
                {runningStage === "planning" && "Gerando PRD → Arquitetura → Stories..."}
                {runningStage === "execution" && "Agentes executando subtasks automaticamente..."}
              </p>
              <p className="text-xs text-muted-foreground">
                {runningStage === "planning" ? "Isso pode levar ~2 minutos." :
                 runningStage === "execution" ? "Isso pode levar vários minutos dependendo do número de subtasks." :
                 "Isso pode levar ~30 segundos."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discovery Results */}
      {(dp.refined_idea || initiative.refined_idea) && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Brain className="h-4 w-4 text-accent" /> Descoberta Inteligente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <MetricCard icon={Layers} label="Complexidade" value={initiative.complexity} className={RISK_COLORS[initiative.complexity] || ""} />
              <MetricCard icon={AlertTriangle} label="Risco" value={initiative.risk_level} className={RISK_COLORS[initiative.risk_level] || ""} />
              {(dp.initial_estimate?.effort_weeks) && (
                <MetricCard icon={Target} label="Estimativa" value={`${dp.initial_estimate.effort_weeks} sem.`} />
              )}
              {(dp.initial_estimate?.estimated_stories) && (
                <MetricCard icon={BookOpen} label="Stories est." value={dp.initial_estimate.estimated_stories} />
              )}
            </div>
            <Separator />
            <DiscoverySection icon={Sparkles} title="Ideia Refinada" content={dp.refined_idea} />
            <DiscoverySection icon={TrendingUp} title="Modelo de Negócio" content={dp.business_model} />
            <DiscoverySection icon={Target} title="Escopo MVP" content={dp.mvp_scope} />
            <DiscoverySection icon={Shield} title="Análise de Mercado" content={dp.market_analysis} />
            <DiscoverySection icon={Cpu} title="Stack Sugerida" content={dp.suggested_stack} />
            <DiscoverySection icon={Rocket} title="Visão Estratégica" content={dp.strategic_vision} />
            <DiscoverySection icon={AlertTriangle} title="Viabilidade" content={dp.feasibility_analysis} />
          </CardContent>
        </Card>
      )}

      {/* Squad */}
      {initiative.squads?.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Users className="h-4 w-4 text-info" /> Squad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(initiative.squads[0].squad_members || []).map((sm: any) => (
                <Badge key={sm.id} variant="secondary" className="text-xs gap-1.5 py-1">
                  <span className="font-semibold">{sm.agents?.name || "?"}</span>
                  <span className="text-muted-foreground">· {sm.role_in_squad}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PRD */}
      {initiative.prd_content && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> PRD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px] rounded border border-border/30 bg-muted/20 p-3">
              <pre className="text-xs whitespace-pre-wrap break-words">{initiative.prd_content}</pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Architecture */}
      {initiative.architecture_content && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Cpu className="h-4 w-4 text-accent" /> Arquitetura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px] rounded border border-border/30 bg-muted/20 p-3">
              <pre className="text-xs whitespace-pre-wrap break-words">{initiative.architecture_content}</pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Jobs History */}
      {jobs.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" /> Jobs (Rastreabilidade)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {jobs.map((job: any) => (
                <div key={job.id} className="flex items-center justify-between gap-2 text-xs border border-border/30 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={job.status === "success" ? "default" : job.status === "failed" ? "destructive" : "secondary"}
                      className="text-[10px]"
                    >
                      {job.status}
                    </Badge>
                    <span className="font-medium">{job.stage}</span>
                    {job.stage === "rework" && (
                      <span className="text-destructive text-[10px]">⟲ rollback</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    {job.duration_ms && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{(job.duration_ms / 1000).toFixed(1)}s</span>}
                    {job.cost_usd > 0 && <span className="flex items-center gap-0.5"><DollarSign className="h-3 w-3" />${Number(job.cost_usd).toFixed(4)}</span>}
                    {job.model && <span>{job.model}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, className = "" }: { icon: any; label: string; value: any; className?: string }) {
  return (
    <div className={`rounded-lg p-2.5 text-center ${className || "bg-muted/30"}`}>
      <Icon className="h-4 w-4 mx-auto mb-1 opacity-70" />
      <p className="text-xs font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function DiscoverySection({ icon: Icon, title, content }: { icon: any; title: string; content: string | null }) {
  if (!content) return null;
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h4>
      <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">{content}</p>
    </div>
  );
}
