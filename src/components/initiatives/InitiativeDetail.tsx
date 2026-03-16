import { useState, useEffect } from "react";
import { AnimatedTooltip, type TooltipItem } from "@/components/ui/animated-tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Brain, Users, FileText, Cpu, Loader2, Target, TrendingUp, Shield,
  Layers, AlertTriangle, ArrowRight, Sparkles, Rocket, BookOpen,
  CheckCircle2, Clock, DollarSign, Zap, RotateCcw, GitBranch, ExternalLink,
  Download, Globe, Trash2
} from "lucide-react";
import { InitiativeCodePreview } from "./InitiativeCodePreview";
import { AgentMessagesTimeline } from "./AgentMessagesTimeline";
import { ExecutionProgress } from "./ExecutionProgress";
import { BuildHealthReport } from "./BuildHealthReport";
import { CIFixSwarmStatus } from "./CIFixSwarmStatus";
import { ArchitecturalDriftStatus } from "./ArchitecturalDriftStatus";
import { RuntimeValidationStatus } from "./RuntimeValidationStatus";
import { ProjectBrainPanel } from "@/components/brain/ProjectBrainPanel";
import { DeployErrorParser } from "./DeployErrorParser";
import { InitiativeObservabilityCard } from "./InitiativeObservabilityCard";
import { InitiativeOutcomeCard } from "./InitiativeOutcomeCard";
import { RepairEvidenceCard } from "./RepairEvidenceCard";
import { RepairRoutingCard } from "./RepairRoutingCard";
import { ArchitectureSubjobsPanel } from "./ArchitectureSubjobsPanel";
import { MACRO_STAGES, getMacroStageIndex, getAvailableActions, RISK_COLORS } from "./pipeline-config";
import PipelineGraphView from "./PipelineGraphView";
import { ReadinessPanel } from "./ReadinessPanel";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface GitConnection {
  id: string;
  repo_owner: string;
  repo_name: string;
  default_branch: string;
  github_token?: string | null;
}

interface InitiativeDetailProps {
  initiative: any;
  jobs: any[];
  stories?: any[];
  runningStage: string | null;
  gitConnections?: GitConnection[];
  onRunStage: (stage: string, comment?: string, publishParams?: { github_token: string; owner: string; repo: string; base_branch: string }) => void;
  onApprove: () => void;
  onRollbackToStage?: (macroKey: string) => void;
  onDelete?: () => void;
}

export function InitiativeDetail({ initiative, jobs, stories = [], runningStage, gitConnections = [], onRunStage, onApprove, onRollbackToStage, onDelete }: InitiativeDetailProps) {
  const stageStatus = initiative.stage_status || initiative.status || "draft";
  const macroIdx = getMacroStageIndex(stageStatus);
  const actions = getAvailableActions(stageStatus);
  const liveExecution = initiative.execution_progress && typeof initiative.execution_progress === "object"
    ? initiative.execution_progress as Record<string, any>
    : null;
  const liveTraceLabel = runningStage === "execution"
    ? liveExecution?.current_subtask_description || liveExecution?.current_file || null
    : runningStage === "validation"
      ? liveExecution?.validation?.current_artifact_summary || liveExecution?.validation?.last_issue_summary || null
      : null;
  const dp = initiative.discovery_payload || {};
  const { toast: publishToast } = useToast();
  const [rollbackConfirm, setRollbackConfirm] = useState<{ key: string; label: string } | null>(null);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [publishOpen, setPublishOpen] = useState(false);
  const [ghToken, setGhToken] = useState("");
  const [ghOwner, setGhOwner] = useState(gitConnections[0]?.repo_owner || "");
  const [ghRepo, setGhRepo] = useState(gitConnections[0]?.repo_name || "");
  const [ghBranch, setGhBranch] = useState(gitConnections[0]?.default_branch || "main");
  const [selectedConnectionId, setSelectedConnectionId] = useState(gitConnections[0]?.id || "manual");
  const [saveToken, setSaveToken] = useState(true);

  // Load saved token when connection changes
  useEffect(() => {
    if (selectedConnectionId && selectedConnectionId !== "manual") {
      const conn = gitConnections.find(c => c.id === selectedConnectionId);
      if (conn?.github_token) {
        setGhToken(conn.github_token);
      }
    }
  }, [selectedConnectionId, gitConnections]);

  const handleSelectConnection = (connId: string) => {
    setSelectedConnectionId(connId);
    if (connId === "manual") {
      setGhOwner("");
      setGhRepo("");
      setGhBranch("main");
      setGhToken("");
    } else {
      const conn = gitConnections.find(c => c.id === connId);
      if (conn) {
        setGhOwner(conn.repo_owner);
        setGhRepo(conn.repo_name);
        setGhBranch(conn.default_branch);
        if (conn.github_token) setGhToken(conn.github_token);
      }
    }
  };

  const handleReject = () => {
    if (rejectComment.trim().length < 10) return;
    onRunStage("reject", rejectComment.trim());
    setRejectOpen(false);
    setRejectComment("");
  };

  const handlePublish = async () => {
    if (!ghToken || !ghOwner) return;
    // Save token to git_connection if requested
    if (saveToken && selectedConnectionId && selectedConnectionId !== "manual") {
      const { error } = await supabase
        .from("git_connections")
        .update({ github_token: ghToken } as any)
        .eq("id", selectedConnectionId);
      if (error) {
        console.error("Failed to save token:", error);
      } else {
        publishToast({ title: "Token salvo na conexão Git" });
      }
    }
    onRunStage("publish", undefined, { github_token: ghToken, owner: ghOwner, repo: ghRepo, base_branch: ghBranch || "main" });
    setPublishOpen(false);
  };

  // Find publish job with repo URL
  const publishJob = jobs.find((j: any) => j.stage === "publish" && j.status === "success");
  const repoUrl = initiative.repo_url || publishJob?.outputs?.repo_url;
  const deployUrl = initiative.deploy_url;
  const deployStatus = initiative.deploy_status;
  const healthStatus = initiative.health_status;

  return (
    <div className="space-y-4">
      {/* Header + Macro Pipeline */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <CardTitle className="font-display text-xl truncate">{initiative.title}</CardTitle>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap justify-end">
              {actions.map((action) => {
                const hasDescription = !!action.description;
                
                if (action.type === "reject") {
                  return (
                    <Button
                      key={action.stage}
                      onClick={() => setRejectOpen(true)}
                      disabled={!!runningStage}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                      title={action.description}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {action.label}
                    </Button>
                  );
                }
                
                if (action.type === "publish") {
                  return (
                    <Button
                      key={action.stage}
                      onClick={() => setPublishOpen(true)}
                      disabled={!!runningStage}
                      className="gap-2 bg-foreground text-background hover:bg-foreground/90"
                      title={action.description}
                    >
                      {runningStage === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
                      {runningStage === "publish" ? "Publicando..." : action.label}
                    </Button>
                  );
                }

                return (
                  <div key={action.stage} className="relative group">
                    <Button
                      onClick={() => action.type === "approve" ? onApprove() : onRunStage(action.stage)}
                      disabled={!!runningStage}
                      variant={action.variant === "primary" ? "default" : action.variant === "outline" ? "outline" : action.type === "approve" ? "default" : "secondary"}
                      className="gap-2"
                      title={action.description}
                    >
                      {runningStage === action.stage ? <Loader2 className="h-4 w-4 animate-spin" /> :
                        action.type === "approve" ? <CheckCircle2 className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                      {runningStage === action.stage ? "Processando..." : action.label}
                    </Button>
                    {hasDescription && (
                      <div className="absolute z-50 hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-2.5 rounded-lg border border-border bg-popover text-popover-foreground text-[11px] leading-relaxed shadow-lg pointer-events-none">
                        {action.description}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-popover border-r border-b border-border rotate-45 -mt-1" />
                      </div>
                    )}
                  </div>
                );
              })}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteOpen(true)}
                  disabled={!!runningStage}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            </div>
            {initiative.description && <p className="text-sm text-muted-foreground line-clamp-2 break-words">{initiative.description}</p>}
          </div>
          <PipelineGraphView
            currentMacroIndex={macroIdx}
            runningStage={runningStage}
            onRollbackToStage={onRollbackToStage}
          />
          {/* Approval timestamps + PR link */}
          <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground flex-wrap">
            {initiative.approved_at_discovery && (
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> Discovery aprovado</span>
            )}
            {initiative.approved_at_squad && (
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> Squad aprovado</span>
            )}
            {initiative.approved_at_planning && (
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> Planning aprovado</span>
            )}
            {repoUrl && (
              <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                <GitBranch className="h-3 w-3" /> Repositório
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
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

      {/* Rollback confirmation dialog */}
      <Dialog open={!!rollbackConfirm} onOpenChange={(open) => !open && setRollbackConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-warning" />
              Voltar para "{rollbackConfirm?.label}"
            </DialogTitle>
            <DialogDescription>
              O pipeline será retornado para o estágio <strong>{rollbackConfirm?.label}</strong>, permitindo refazer essa etapa. Os dados posteriores serão preservados mas poderão ser sobrescritos ao re-executar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackConfirm(null)}>Cancelar</Button>
            <Button
              variant="default"
              className="gap-1.5 bg-warning text-warning-foreground hover:bg-warning/90"
              onClick={() => {
                if (rollbackConfirm && onRollbackToStage) {
                  onRollbackToStage(rollbackConfirm.key);
                }
                setRollbackConfirm(null);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Confirmar Rollback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir Iniciativa
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>"{initiative.title}"</strong>? Esta ação é irreversível e removerá todos os dados associados: stories, subtasks, artefatos, código, validações, mensagens de agentes e jobs do pipeline.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              className="gap-1.5"
              onClick={() => {
                setDeleteOpen(false);
                onDelete?.();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Excluir Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish dialog — creates a NEW repo */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              Publicar no GitHub
            </DialogTitle>
            <DialogDescription>
              Um <strong>novo repositório</strong> será criado automaticamente para esta iniciativa. O AxionOS commitará os artefatos e abrirá um Pull Request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="gh-token" className="text-xs">GitHub Token (PAT com escopo <code className="text-[10px] bg-muted px-1 rounded">repo</code>)</Label>
              <Input id="gh-token" type="password" placeholder="ghp_..." value={ghToken} onChange={(e) => setGhToken(e.target.value)} />
              {gitConnections.length > 0 && (
                <div className="mt-2">
                  <Label className="text-xs text-muted-foreground">Ou usar token de uma conexão existente:</Label>
                  <Select value={selectedConnectionId} onValueChange={handleSelectConnection}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Inserir manualmente</SelectItem>
                      {gitConnections.map(conn => (
                        <SelectItem key={conn.id} value={conn.id}>
                          {conn.repo_owner}/{conn.repo_name} {conn.github_token ? "🔑" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="gh-owner" className="text-xs">Owner / Organização GitHub</Label>
              <Input id="gh-owner" placeholder="meu-usuario-ou-org" value={ghOwner} onChange={(e) => setGhOwner(e.target.value)} />
              <p className="text-[10px] text-muted-foreground mt-0.5">O repositório será criado sob este usuário/org.</p>
            </div>
            <div>
              <Label htmlFor="gh-repo" className="text-xs">Nome do repositório (opcional)</Label>
              <Input
                id="gh-repo"
                placeholder={initiative.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "meu-app"}
                value={ghRepo}
                onChange={(e) => setGhRepo(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Se vazio, será gerado a partir do título da iniciativa.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)}>Cancelar</Button>
            <Button
              onClick={handlePublish}
              disabled={!ghToken || !ghOwner}
              className="gap-1.5"
            >
              <Rocket className="h-4 w-4" />
              Criar Repo & Publicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Outcome Card — product-level status */}
      <InitiativeOutcomeCard initiative={initiative} />

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
                {runningStage === "validation" && "🔁 Fix Loop — Validando e corrigindo artefatos com IA..."}
                {runningStage === "deep_validation" && "🔬 Deep Static Analysis — Verificando imports, tipos e build..."}
                {runningStage === "drift_detection" && "🏗️ Drift Detection — Verificando desvios arquiteturais..."}
                {runningStage === "runtime_validation" && "🚀 Runtime Validation — Executando tsc + vite build..."}
                {runningStage === "preventive_validation" && "🛡️ Validação Preventiva da Arquitetura..."}
                {runningStage === "publish" && "Criando branch, commitando artefatos e abrindo PR..."}
                {runningStage === "deploy_vercel" && "Iniciando deploy no Vercel..."}
                {!["discovery","squad_formation","planning","execution","validation","deep_validation","drift_detection","runtime_validation","preventive_validation","publish","deploy_vercel"].includes(runningStage || "") && `Executando ${runningStage}...`}
              </p>
              <p className="text-xs text-muted-foreground">
                {runningStage === "planning" ? "Isso pode levar ~2 minutos." :
                 runningStage === "execution" ? "Isso pode levar vários minutos dependendo do número de subtasks." :
                 runningStage === "validation" ? "Cada artefato é analisado e corrigido automaticamente. Pode levar alguns minutos." :
                 runningStage === "deep_validation" ? "Análise estática profunda dos arquivos gerados. ~30 seg." :
                 runningStage === "drift_detection" ? "Verificando conformidade arquitetural. ~30 seg." :
                 runningStage === "runtime_validation" ? "Build completo para validar em runtime. ~1 min." :
                 runningStage === "publish" ? "Commitando arquivos no GitHub..." :
                 runningStage === "deploy_vercel" ? "Conectando ao Vercel e iniciando deploy..." :
                 "Isso pode levar ~30 segundos."}
              </p>
              {liveTraceLabel && (
                <p className="mt-2 text-xs font-medium text-foreground/90 leading-relaxed">
                  Rastreando agora: {liveTraceLabel}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Readiness Evaluation (Phase 4) */}
      <ReadinessPanel initiative={initiative} />

      {/* Architecture Subjobs Panel */}
      <ArchitectureSubjobsPanel
        initiativeId={initiative.id}
        jobId={jobs.find((j: any) => j.stage === "architecture")?.id || null}
      />

      {/* Execution Progress (real-time) */}
      <ExecutionProgress initiativeId={initiative.id} stageStatus={stageStatus} />

      {/* CI / Fix Swarm Status */}
      <CIFixSwarmStatus initiativeId={initiative.id} />

      {/* Architectural Drift Detection */}
      <ArchitecturalDriftStatus initiativeId={initiative.id} />

      {/* Runtime Validation (tsc + vite build) */}
      <RuntimeValidationStatus executionProgress={initiative.execution_progress} initiativeId={initiative.id} />

      {/* Repo & Deploy Actions */}
      {repoUrl && (
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <GitBranch className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">
                    {publishJob?.outputs?.owner}/{publishJob?.outputs?.repo}
                  </p>
                  <p className="text-[10px] text-muted-foreground">main branch</p>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <a href={repoUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <GitBranch className="h-3.5 w-3.5" /> Repository <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
                {publishJob?.outputs?.owner && publishJob?.outputs?.repo && (
                  <a
                    href={`https://github.com/${publishJob.outputs.owner}/${publishJob.outputs.repo}/archive/refs/heads/${publishJob.outputs.branch || "main"}.zip`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <Download className="h-3.5 w-3.5" /> ZIP
                    </Button>
                  </a>
                )}
                {deployUrl && (
                  <a href={deployUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="gap-1.5 text-xs">
                      <Globe className="h-3.5 w-3.5" /> Open Deploy <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deploy Status Card */}
      {(deployStatus || stageStatus === "deploying" || stageStatus === "deployed" || stageStatus === "deploy_failed") && (
        <Card className={`border-border/50 ${
          stageStatus === "deployed" ? "border-success/30 bg-success/5" :
          stageStatus === "deploy_failed" ? "border-destructive/30 bg-destructive/5" :
          stageStatus === "deploying" ? "border-warning/30 bg-warning/5" :
          ""
        }`}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Globe className={`h-5 w-5 ${
                stageStatus === "deployed" ? "text-success" :
                stageStatus === "deploy_failed" ? "text-destructive" :
                stageStatus === "deploying" ? "text-warning animate-pulse" :
                "text-muted-foreground"
              }`} />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {stageStatus === "deployed" && "Deploy concluído ✅"}
                  {stageStatus === "deploy_failed" && "Deploy falhou ❌"}
                  {stageStatus === "deploying" && "Deploy em andamento..."}
                  {!["deployed", "deploy_failed", "deploying"].includes(stageStatus) && `Deploy: ${deployStatus || "pendente"}`}
                </p>
                {initiative.deploy_target && (
                  <p className="text-xs text-muted-foreground">Target: {initiative.deploy_target}</p>
                )}
              </div>
              <Badge variant={
                stageStatus === "deployed" ? "default" :
                stageStatus === "deploy_failed" ? "destructive" :
                "secondary"
              }>
                {deployStatus || stageStatus}
              </Badge>
            </div>
            {deployUrl && (
              <div className="flex items-center gap-2">
                <a href={deployUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  {deployUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            {/* Error details — Unified Deploy Error Parser */}
            {(initiative.deploy_error_code || initiative.deploy_error_message) && stageStatus === "deploy_failed" && (
              <DeployErrorParser
                errorSuggestions={
                  jobs.find((j: any) => j.stage === "deploy" && j.outputs?.error_suggestions)?.outputs?.error_suggestions as any[] | undefined
                }
                errorCode={initiative.deploy_error_code}
                errorMessage={initiative.deploy_error_message}
              />
            )}
            {/* Health + timestamps */}
            <div className="flex items-center gap-3 flex-wrap">
              {healthStatus && (
                <Badge variant={healthStatus === "healthy" ? "default" : healthStatus === "unhealthy" ? "destructive" : "secondary"} className="text-[10px]">
                  Health: {healthStatus}
                </Badge>
              )}
              {initiative.deployed_at && (
                <span className="text-[10px] text-muted-foreground">
                  Deployed: {new Date(initiative.deployed_at).toLocaleString()}
                </span>
              )}
              {initiative.last_deploy_check_at && (
                <span className="text-[10px] text-muted-foreground">
                  Last check: {new Date(initiative.last_deploy_check_at).toLocaleString()}
                </span>
              )}
              {initiative.commit_hash && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  {initiative.commit_hash.slice(0, 7)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Runtime Intelligence Card */}
      {getMacroStageIndex(stageStatus) >= 27 && stageStatus !== "completed" && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-success/20 flex items-center justify-center">
                  <Cpu className="h-4 w-4 text-success animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Runtime Intelligence</p>
                  <p className="text-xs text-muted-foreground">Inteligência autônoma operando em background</p>
                </div>
              </div>
              <Badge variant="default" className="bg-success/20 text-success border-success/30">
                Ativo
              </Badge>
            </div>
            {(() => {
              const runtimeStages = [
                { key: "observability_ready", label: "System Observability", icon: "📡" },
                { key: "observing_product", label: "Observando Produto", icon: "📡", active: true },
                { key: "product_observed", label: "Produto Observado", icon: "📡" },
                { key: "analytics_ready", label: "Product Analytics", icon: "📊" },
                { key: "analyzing_product_metrics", label: "Analisando Métricas", icon: "📊", active: true },
                { key: "product_metrics_analyzed", label: "Métricas Analisadas", icon: "📊" },
                { key: "behavior_analyzed", label: "User Behavior Analysis", icon: "🧠" },
                { key: "analyzing_user_behavior", label: "Analisando Comportamento", icon: "🧠", active: true },
                { key: "user_behavior_analyzed", label: "Comportamento Analisado", icon: "🧠" },
                { key: "optimizing_growth", label: "Otimizando Growth", icon: "🚀", active: true },
                { key: "growth_optimized", label: "Growth Otimizado", icon: "🚀" },
                { key: "evolving_product", label: "Evoluindo Produto", icon: "🔄", active: true },
                { key: "product_evolved", label: "Produto Evoluído", icon: "🔄" },
                { key: "evolving_architecture", label: "Evoluindo Arquitetura", icon: "🏗️", active: true },
                { key: "architecture_evolved", label: "Arquitetura Evoluída", icon: "🏗️" },
                { key: "managing_portfolio", label: "Gerenciando Portfólio", icon: "📁", active: true },
                { key: "portfolio_managed", label: "Portfólio Gerenciado", icon: "📁" },
                { key: "evolving_system", label: "Evoluindo Sistema", icon: "⚡", active: true },
                { key: "system_evolved", label: "Sistema Evoluído", icon: "⚡" },
              ];
              const currentIdx = runtimeStages.findIndex(s => s.key === stageStatus);
              const visiblePhases = [
                { label: "Observability", icon: "📡", keys: ["observability_ready", "observing_product", "product_observed"] },
                { label: "Analytics", icon: "📊", keys: ["analytics_ready", "analyzing_product_metrics", "product_metrics_analyzed"] },
                { label: "Behavior", icon: "🧠", keys: ["behavior_analyzed", "analyzing_user_behavior", "user_behavior_analyzed"] },
                { label: "Growth", icon: "🚀", keys: ["optimizing_growth", "growth_optimized"] },
                { label: "Product Evolution", icon: "🔄", keys: ["evolving_product", "product_evolved"] },
                { label: "Arch Evolution", icon: "🏗️", keys: ["evolving_architecture", "architecture_evolved"] },
                { label: "System Evolution", icon: "⚡", keys: ["evolving_system", "system_evolved"] },
              ];
              return (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Estágio atual: <span className="text-foreground font-medium">{runtimeStages.find(s => s.key === stageStatus)?.label || stageStatus}</span>
                  </p>
                  <div className="grid grid-cols-7 gap-1">
                    {visiblePhases.map((phase) => {
                      const phaseCurrentIdx = runtimeStages.findIndex(s => s.key === stageStatus);
                      const phaseFirstIdx = runtimeStages.findIndex(s => phase.keys.includes(s.key));
                      const phaseLastIdx = runtimeStages.length - 1 - [...runtimeStages].reverse().findIndex(s => phase.keys.includes(s.key));
                      const isCurrent = phase.keys.includes(stageStatus);
                      const isDone = phaseLastIdx < phaseCurrentIdx && phaseFirstIdx >= 0;
                      const isPending = phaseFirstIdx > phaseCurrentIdx;
                      return (
                        <div key={phase.label} className={`text-center p-1.5 rounded-md border text-[10px] ${
                          isCurrent ? "border-success/50 bg-success/10 text-success" :
                          isDone ? "border-border/30 bg-muted/30 text-muted-foreground" :
                          "border-border/20 bg-background/50 text-muted-foreground/50"
                        }`}>
                          <span className="block text-sm">{phase.icon}</span>
                          <span className="block mt-0.5 leading-tight">{phase.label}</span>
                          {isCurrent && <Loader2 className="h-2.5 w-2.5 animate-spin mx-auto mt-0.5 text-success" />}
                          {isDone && <CheckCircle2 className="h-2.5 w-2.5 mx-auto mt-0.5 text-muted-foreground" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
      <RepairEvidenceCard initiativeId={initiative.id} />

      {/* Repair Routing */}
      <RepairRoutingCard initiativeId={initiative.id} />

      {/* Build Health Report */}
      {publishJob?.outputs?.health_report && (
        <BuildHealthReport report={publishJob.outputs.health_report} />
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
            {(() => {
              const members: TooltipItem[] = (initiative.squads[0].squad_members || []).map(
                (sm: any, i: number) => ({
                  id: i,
                  name: sm.agents?.name || "Agent",
                  designation: sm.role_in_squad || sm.agents?.role || "member",
                  image: `https://image.pollinations.ai/prompt/${encodeURIComponent(
                    `${sm.agents?.role || "ai"} AI robot avatar, ${sm.agents?.name || "agent"}, futuristic, minimal`
                  )}?width=128&height=128&nologo=true&seed=${(sm.agents?.name || "x").length}`,
                })
              );
              return members.length > 0 ? (
                <AnimatedTooltip items={members} className="pl-3" />
              ) : (
                <p className="text-xs text-muted-foreground italic">Sem membros</p>
              );
            })()}
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

      {/* Stories generated by planning */}
      {(stories.length > 0 || macroIdx >= 2) && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-info" /> Stories ({stories.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stories.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Carregando stories...</p>
            ) : (
            <div className="space-y-3">
              {stories.map((story: any) => {
                const phases = story.story_phases || [];
                const allSubtasks = phases.flatMap((p: any) => p.story_subtasks || []);
                const completed = allSubtasks.filter((s: any) => s.status === "completed").length;
                const total = allSubtasks.length;
                return (
                  <div key={story.id} className="border border-border/30 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={story.priority === "critical" ? "destructive" : "secondary"} className="text-[10px]">
                          {story.priority}
                        </Badge>
                        <span className="text-sm font-medium">{story.title}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {completed}/{total} subtasks
                      </span>
                    </div>
                    {story.description && (
                      <p className="text-xs text-muted-foreground">{story.description}</p>
                    )}
                    {phases.length > 0 && (
                      <div className="space-y-1.5">
                        {phases
                          .sort((a: any, b: any) => a.sort_order - b.sort_order)
                          .map((phase: any) => (
                          <div key={phase.id}>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{phase.name}</p>
                            <div className="ml-2 space-y-0.5">
                              {(phase.story_subtasks || [])
                                .sort((a: any, b: any) => a.sort_order - b.sort_order)
                                .map((st: any) => (
                                <div key={st.id} className="flex items-center gap-2 text-xs">
                                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                    st.status === "completed" ? "bg-success" :
                                    st.status === "in_progress" ? "bg-primary" :
                                    st.status === "failed" ? "bg-destructive" : "bg-muted-foreground/30"
                                  }`} />
                                  <span className="truncate">{st.description}</span>
                                  {st.file_path && (
                                    <code className="text-[10px] text-muted-foreground bg-muted/50 px-1 rounded shrink-0">
                                      {st.file_path}
                                    </code>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Product Metrics */}
      <InitiativeObservabilityCard initiativeId={initiative.id} />

      {/* Project Brain */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Brain className="h-4 w-4 text-muted-foreground" /> Project Brain
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectBrainPanel initiativeId={initiative.id} />
        </CardContent>
      </Card>

      {/* Chain-of-Agents Timeline */}
      <AgentMessagesTimeline initiativeId={initiative.id} />

      {/* Code Preview */}
      <InitiativeCodePreview initiativeId={initiative.id} organizationId={initiative.organization_id} />

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
                    {job.stage === "publish" && job.outputs?.repo_url && (
                      <a href={job.outputs.repo_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5">
                        Repo <ExternalLink className="h-2.5 w-2.5" />
                      </a>
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