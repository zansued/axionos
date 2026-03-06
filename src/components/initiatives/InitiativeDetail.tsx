import { useState, useEffect } from "react";
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
import { MACRO_STAGES, getMacroStageIndex, getAvailableActions, RISK_COLORS } from "./pipeline-config";
import RadialOrbitalTimeline from "./RadialOrbitalTimeline";

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
  const repoUrl = publishJob?.outputs?.repo_url;

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
                ) : action.type === "publish" ? (
                  <Button
                    key={action.stage}
                    onClick={() => setPublishOpen(true)}
                    disabled={!!runningStage}
                    className="gap-2 bg-foreground text-background hover:bg-foreground/90"
                  >
                    {runningStage === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
                    {runningStage === "publish" ? "Publicando..." : action.label}
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
          <RadialOrbitalTimeline
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
                {runningStage === "validation" && "Validando qualidade dos artefatos com IA..."}
                {runningStage === "publish" && "Criando branch, commitando artefatos e abrindo PR..."}
              </p>
              <p className="text-xs text-muted-foreground">
                {runningStage === "planning" ? "Isso pode levar ~2 minutos." :
                 runningStage === "execution" ? "Isso pode levar vários minutos dependendo do número de subtasks." :
                 runningStage === "validation" ? "Cada artefato será analisado individualmente. ~1 min." :
                 runningStage === "publish" ? "Commitando arquivos no GitHub..." :
                 "Isso pode levar ~30 segundos."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Execution Progress (real-time) */}
      <ExecutionProgress initiativeId={initiative.id} stageStatus={stageStatus} />

      {/* CI / Fix Swarm Status */}
      <CIFixSwarmStatus initiativeId={initiative.id} />

      {/* Architectural Drift Detection */}
      <ArchitecturalDriftStatus initiativeId={initiative.id} />

      {/* Runtime Validation (tsc + vite build) */}
      <RuntimeValidationStatus executionProgress={initiative.execution_progress} initiativeId={initiative.id} />

      {/* Repo Result Card */}
      {repoUrl && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GitBranch className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Código publicado direto no main ✅</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {publishJob?.outputs?.owner}/{publishJob?.outputs?.repo} → main
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <a href={repoUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    Repositório <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </div>
            </div>
            <Separator />
            <div className="flex gap-2 flex-wrap">
              {/* Download ZIP */}
              {publishJob?.outputs?.owner && publishJob?.outputs?.repo && (
                <a
                  href={`https://github.com/${publishJob.outputs.owner}/${publishJob.outputs.repo}/archive/refs/heads/${publishJob.outputs.branch || "main"}.zip`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    Download ZIP
                  </Button>
                </a>
              )}
              {/* Deploy to Vercel — uses the repo directly (main branch) */}
              {publishJob?.outputs?.owner && publishJob?.outputs?.repo && (
                <a
                  href={`https://vercel.com/new/clone?repository-url=${encodeURIComponent(`https://github.com/${publishJob.outputs.owner}/${publishJob.outputs.repo}`)}&project-name=${encodeURIComponent(publishJob.outputs.repo)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    Deploy no Vercel
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Stories generated by planning */}
      {stories.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-info" /> Stories ({stories.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

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