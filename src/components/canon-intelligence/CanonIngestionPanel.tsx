import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCanonCandidateReview } from "@/hooks/useCanonCandidateReview";
  Loader2, Play, RefreshCw, Zap, Globe, CheckCircle2, XCircle, Clock,
  ArrowUpCircle, DatabaseZap, Bot, Sparkles, GitMerge, TrendingUp,
  Search, Star, Shield, ThumbsUp, ThumbsDown, ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";
import { useCanonPipeline } from "@/hooks/useCanonPipeline";
import { useCanonEvolutionEngine } from "@/hooks/useCanonEvolutionEngine";
import { useSourceDiscoveryAgent, type DiscoveryCandidate } from "@/hooks/useSourceDiscoveryAgent";
import { INGESTION_LIFECYCLE_LABELS } from "@/lib/canon/canon-types";
import type { IngestionLifecycleState } from "@/lib/canon/canon-types";

interface CanonIngestionPanelProps {
  sources: any[];
  syncRuns: any[];
  onRefresh: () => void;
  onNavigateToHumanReview?: () => void;
}

const SYNC_STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
  completed_empty: <Clock className="h-3.5 w-3.5 text-amber-400" />,
  in_progress: <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />,
  failed: <XCircle className="h-3.5 w-3.5 text-destructive" />,
};

const LIFECYCLE_COLOR: Record<string, string> = {
  discovered: "bg-muted text-muted-foreground",
  queued: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  fetched: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  parsed: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  chunked: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  classified: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  candidate_generated: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  canon_promoted: "bg-primary/10 text-primary border-primary/30",
  rejected: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
};

const SYNC_STATUS_LABEL: Record<string, string> = {
  completed: "concluído",
  completed_empty: "concluído (vazio)",
  in_progress: "em andamento",
  failed: "falhou",
};

export function CanonIngestionPanel({ sources, syncRuns, onRefresh, onNavigateToHumanReview }: CanonIngestionPanelProps) {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const [ingesting, setIngesting] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [ingestingAll, setIngestingAll] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [absorbingRepo, setAbsorbingRepo] = useState(false);
  const [discoveryTopic, setDiscoveryTopic] = useState("");
  const { stats, promoting, batchPromoteApproved } = useCanonPipeline();
  const evolution = useCanonEvolutionEngine();
  const discovery = useSourceDiscoveryAgent();

  const seedSources = async () => {
    if (!currentOrg?.id) return;
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("canon-ingestion-agent", {
        body: { action: "seed_sources", organization_id: currentOrg.id },
      });
      if (error) throw error;
      toast({ title: "Fontes Adicionadas", description: `${data.sources_created} fontes de conhecimento adicionadas.` });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const ingestSource = async (sourceId: string, sourceName: string) => {
    if (!currentOrg?.id) return;
    setIngesting(sourceId);
    try {
      const { data, error } = await supabase.functions.invoke("canon-ingestion-agent", {
        body: { action: "ingest_source", organization_id: currentOrg.id, source_id: sourceId },
      });
      if (error) throw error;
      toast({
        title: "Ingestão Concluída",
        description: `${sourceName}: ${data.candidates_created || 0} novos padrões extraídos.`,
      });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Falha na Ingestão", description: err.message, variant: "destructive" });
    } finally {
      setIngesting(null);
    }
  };

  const absorbRepo = async () => {
    if (!currentOrg?.id || !repoUrl) return;
    setAbsorbingRepo(true);
    try {
      const { data, error } = await supabase.functions.invoke("deep-repo-absorber-engine", {
        body: { orgId: currentOrg.id, repoUrl: repoUrl },
      });
      if (error) throw error;
      toast({
        title: "Repositório Absorvido",
        description: `Extraídos ${data.patterns_extracted} padrões canônicos de ${data.architecture}.`,
      });
      setRepoUrl("");
      onRefresh();
    } catch (err: any) {
      toast({ title: "Falha na Absorção", description: err.message, variant: "destructive" });
    } finally {
      setAbsorbingRepo(false);
    }
  };

  const ingestAll = async () => {
    if (!currentOrg?.id) return;
    const active = sources.filter((s: any) => s.status === "active");
    if (active.length === 0) {
      toast({ title: "Sem fontes ativas", description: "Adicione fontes antes de ingerir.", variant: "destructive" });
      return;
    }
    setIngestingAll(true);
    let totalCreated = 0;
    let processed = 0;
    try {
      // Phase 1: Ingest all sources
      for (const src of active) {
        try {
          const { data, error } = await supabase.functions.invoke("canon-ingestion-agent", {
            body: { action: "ingest_source", organization_id: currentOrg.id, source_id: src.id },
          });
          if (!error && data) {
            totalCreated += data.candidates_created || 0;
          }
          processed++;
        } catch (err: any) {
          console.error(`Ingestion failed for ${src.source_name}:`, err.message);
          processed++;
        }
        if (processed < active.length) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      // Phase 2: Auto review + promote all new candidates
      let reviewInfo: any = {};
      let promoInfo: any = {};
      if (totalCreated > 0) {
        try {
          const { data, error } = await supabase.functions.invoke("canon-review-engine", {
            body: { action: "run_full_pipeline", organization_id: currentOrg.id },
          });
          if (!error && data) {
            reviewInfo = data.review || {};
            promoInfo = data.promotion || {};
          }
        } catch (err: any) {
          console.error("Auto review/promote failed:", err.message);
        }
      }

      toast({
        title: "Pipeline Completo Concluído",
        description: `Ingestão: ${totalCreated} candidatos de ${processed} fontes. Revisão: ${reviewInfo.approved || 0} aprovados. Promoção: ${promoInfo.promoted || 0} ao Canon.`,
      });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Falha no Pipeline", description: err.message, variant: "destructive" });
    } finally {
      setIngestingAll(false);
    }
  };

  const activeSources = sources.filter((s: any) => s.status === "active");
  const recentSyncs = syncRuns.slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Pipeline Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          <MiniStat label="Fontes" value={stats.totalSources} />
          <MiniStat label="Candidatos" value={stats.totalCandidates} />
          <MiniStat label="Pendente Review" value={stats.pendingCandidates} accent />
          <MiniStat label="Revisão Humana" value={stats.needsHumanReview || 0} onClick={onNavigateToHumanReview} clickable />
          <MiniStat label="Prontos p/ Promoção" value={stats.approvedCandidates} accent />
          <MiniStat label="Promovidos" value={stats.promotedCandidates} />
          <MiniStat label="Entradas Canon" value={stats.totalCanonEntries} />
          <MiniStat label="Recuperáveis" value={stats.retrievablePatterns} accent />
        </div>
      )}

      <Tabs defaultValue="sources" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="sources" className="text-xs">Fontes & Ingestão</TabsTrigger>
          <TabsTrigger value="discovery" className="text-xs">
            Descoberta de Fontes
            {discovery.pendingCandidates.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[9px] px-1 py-0">{discovery.pendingCandidates.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="review" className="text-xs">Revisar Descobertas</TabsTrigger>
          <TabsTrigger value="runs" className="text-xs">Execuções</TabsTrigger>
        </TabsList>

        {/* Tab: Sources & Ingestion */}
        <TabsContent value="sources" className="space-y-4 mt-4">
          {/* Action bar */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={ingestAll} disabled={ingestingAll || activeSources.length === 0}>
              {ingestingAll ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1.5" />}
              Ingerir Todas as Fontes
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => review.reviewPending.mutate(undefined)}
              disabled={review.reviewPending.isPending}
              className="border-primary/30"
            >
              {review.reviewPending.isPending
                ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <Bot className="h-3.5 w-3.5 mr-1.5" />}
              Revisar Pendentes
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => review.promoteReady.mutate()}
              disabled={review.promoteReady.isPending}
              className="border-emerald-500/30"
            >
              {review.promoteReady.isPending
                ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <ArrowUpCircle className="h-3.5 w-3.5 mr-1.5" />}
              Promover Aprovados
            </Button>
            <Button size="sm" variant="ghost" onClick={onRefresh}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Atualizar
            </Button>
          </div>

          {/* GitHub Repo Absorb */}
          <Card className="border-border/30 bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <GitMerge className="h-4 w-4 text-primary" />
                Absorver Repositório GitHub
              </CardTitle>
              <CardDescription className="text-xs">
                Cole a URL de um repositório público do GitHub para extrair padrões canônicos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="https://github.com/owner/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={absorbRepo}
                  disabled={absorbingRepo || !repoUrl || !repoUrl.includes("github.com")}
                >
                  {absorbingRepo ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <DatabaseZap className="h-3.5 w-3.5 mr-1.5" />}
                  Absorver
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Source Registry */}
          <Card className="border-border/30 bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Registro de Fontes</CardTitle>
              <CardDescription className="text-xs">{activeSources.length} fontes ativas configuradas</CardDescription>
            </CardHeader>
            <CardContent>
              {activeSources.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Nenhuma fonte registrada. Use "Seed Fontes Iniciais" ou "Descoberta de Fontes" para adicionar.
                </p>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {activeSources.map((src: any) => {
                      const lifecycleState = (src.ingestion_lifecycle_state || "discovered") as IngestionLifecycleState;
                      return (
                        <div key={src.id} className="p-3 rounded-lg border border-border/20 bg-muted/10 hover:bg-muted/20 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{src.source_name}</p>
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{src.source_url}</p>
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <Badge variant="outline" className="text-[9px]">{src.source_type}</Badge>
                                <Badge variant="outline" className="text-[9px]">{src.domain_scope}</Badge>
                                <Badge className={`text-[9px] border ${LIFECYCLE_COLOR[lifecycleState] || ""}`}>
                                  {INGESTION_LIFECYCLE_LABELS[lifecycleState] || lifecycleState}
                                </Badge>
                                {src.last_synced_at && (
                                  <span className="text-[9px] text-muted-foreground/60">
                                    Último: {new Date(src.last_synced_at).toLocaleDateString("pt-BR")}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0"
                              onClick={() => ingestSource(src.id, src.source_name)}
                              disabled={ingesting === src.id}
                            >
                              {ingesting === src.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Discovery */}
        <TabsContent value="discovery" className="space-y-4 mt-4">
          <Card className="border-border/30 bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                Descoberta Inteligente de Fontes
              </CardTitle>
              <CardDescription className="text-xs">
                Descubra fontes oficiais de documentação e repositórios GitHub por tópico/tecnologia.
                O agente prioriza domínios oficiais, organizações verificadas e fontes de alta confiança.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: React, Kubernetes, Supabase, OpenTelemetry..."
                  value={discoveryTopic}
                  onChange={(e) => setDiscoveryTopic(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => { if (discoveryTopic) discovery.discoverSources.mutate(discoveryTopic); }}
                  disabled={!discoveryTopic || discovery.discoverSources.isPending}
                >
                  {discovery.discoverSources.isPending
                    ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    : <Globe className="h-3.5 w-3.5 mr-1.5" />}
                  Descobrir Fontes Oficiais
                </Button>
                <Button
                  size="sm" variant="secondary"
                  onClick={() => { if (discoveryTopic) discovery.discoverRepos.mutate(discoveryTopic); }}
                  disabled={!discoveryTopic || discovery.discoverRepos.isPending}
                >
                  {discovery.discoverRepos.isPending
                    ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    : <GitMerge className="h-3.5 w-3.5 mr-1.5" />}
                  Descobrir Repositórios Oficiais
                </Button>
              </div>

              {/* Quick topic buttons */}
              <div className="flex flex-wrap gap-1.5">
                {["React", "Next.js", "Supabase", "Docker", "Kubernetes", "TypeScript", "Postgres", "Vite", "Tailwind", "LangChain"].map((t) => (
                  <Button
                    key={t} size="sm" variant="outline"
                    className="h-6 text-[10px] px-2"
                    onClick={() => setDiscoveryTopic(t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Discovery runs */}
          {discovery.runs.length > 0 && (
            <Card className="border-border/30 bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Execuções de Descoberta</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {discovery.runs.map((run) => (
                      <div key={run.id} className="p-2 rounded-lg border border-border/20 bg-muted/10 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium">{run.query_topic}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                            <Badge variant="outline" className="text-[9px]">{run.discovery_type}</Badge>
                            <span>Encontrados: {run.candidates_found}</span>
                            <span>Aprovados: {run.candidates_approved}</span>
                            <span>{new Date(run.created_at).toLocaleDateString("pt-BR")}</span>
                          </div>
                        </div>
                        <Badge variant={run.status === "completed" ? "default" : "secondary"} className="text-[9px]">
                          {run.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Review Discovered */}
        <TabsContent value="review" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Pendentes" value={discovery.pendingCandidates.length} accent />
            <MiniStat label="Aprovados" value={discovery.approvedCandidates.length} />
            <MiniStat label="Rejeitados" value={discovery.rejectedCandidates.length} />
          </div>

          {discovery.highTrustPending.length > 0 && (
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs font-medium text-primary flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5" />
                {discovery.highTrustPending.length} candidatos de alta confiança aguardam revisão
              </p>
            </div>
          )}

          <Card className="border-border/30 bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Candidatos Descobertos
              </CardTitle>
              <CardDescription className="text-xs">
                Revise, aprove ou rejeite fontes descobertas antes de adicioná-las ao canon.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {discovery.pendingCandidates.length === 0 && discovery.approvedCandidates.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Nenhum candidato descoberto. Use a aba "Descoberta de Fontes" para encontrar novas fontes.
                </p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {discovery.candidates.map((c) => (
                      <DiscoveryCandidateCard
                        key={c.id}
                        candidate={c}
                        onApprove={() => discovery.approveCandidate.mutate(c.id)}
                        onReject={() => discovery.rejectCandidate.mutate({ candidateId: c.id })}
                        approving={discovery.approveCandidate.isPending}
                        rejecting={discovery.rejectCandidate.isPending}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Runs */}
        <TabsContent value="runs" className="mt-4">
          <Card className="border-border/30 bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Execuções Recentes de Ingestão</CardTitle>
              <CardDescription className="text-xs">{recentSyncs.length} ingestões recentes</CardDescription>
            </CardHeader>
            <CardContent>
              {recentSyncs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma execução registrada ainda.</p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {recentSyncs.map((run: any) => (
                      <div key={run.id} className="p-3 rounded-lg border border-border/20 bg-muted/10">
                        <div className="flex items-center gap-2">
                          {SYNC_STATUS_ICON[run.sync_status] || <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                          <span className="text-xs font-medium">{SYNC_STATUS_LABEL[run.sync_status] || run.sync_status}</span>
                          {run.lifecycle_state && (
                            <Badge variant="outline" className="text-[9px]">{run.lifecycle_state}</Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {new Date(run.created_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground flex-wrap">
                          <span>Docs: {run.documents_fetched || 0}</span>
                          <span>Chunks: {run.chunks_created || 0}</span>
                          <span>Encontrados: {run.candidates_found}</span>
                          <span>Aceitos: {run.candidates_accepted}</span>
                          <span>Dupl.: {run.duplicates_skipped || run.candidates_rejected}</span>
                          {(run.candidates_promoted || 0) > 0 && (
                            <span className="text-primary">Promovidos: {run.candidates_promoted}</span>
                          )}
                        </div>
                        {run.sync_notes && (
                          <p className="text-[10px] text-muted-foreground/70 mt-1 truncate">{run.sync_notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Subcomponents ───

function DiscoveryCandidateCard({
  candidate,
  onApprove,
  onReject,
  approving,
  rejecting,
}: {
  candidate: DiscoveryCandidate;
  onApprove: () => void;
  onReject: () => void;
  approving: boolean;
  rejecting: boolean;
}) {
  const trustColor = candidate.composite_trust_score >= 0.7
    ? "text-emerald-400"
    : candidate.composite_trust_score >= 0.4
    ? "text-amber-400"
    : "text-destructive";

  const stageColor: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    rejected: "bg-destructive/10 text-destructive border-destructive/30",
  };

  return (
    <div className="p-3 rounded-lg border border-border/20 bg-muted/10 hover:bg-muted/20 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{candidate.source_name}</p>
            <a
              href={candidate.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary shrink-0"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{candidate.source_url}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <Badge variant="outline" className="text-[9px]">{candidate.source_type}</Badge>
            <Badge className={`text-[9px] border ${stageColor[candidate.review_status] || ""}`}>
              {candidate.review_status}
            </Badge>
            <span className={`text-[10px] font-mono font-bold ${trustColor}`}>
              {(candidate.composite_trust_score * 100).toFixed(0)}%
            </span>
            {candidate.official_domain_match && (
              <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">oficial</Badge>
            )}
            {candidate.official_org_match && (
              <Badge variant="outline" className="text-[9px] border-blue-500/30 text-blue-400">org oficial</Badge>
            )}
            {candidate.github_verified_org && (
              <Badge variant="outline" className="text-[9px] border-violet-500/30 text-violet-400">verificado</Badge>
            )}
            {candidate.repo_stars && candidate.repo_stars > 0 && (
              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                <Star className="h-2.5 w-2.5" />{candidate.repo_stars.toLocaleString()}
              </span>
            )}
          </div>
          {/* Trust score breakdown */}
          <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground/60">
            <span>Docs: {(candidate.docs_quality_score * 100).toFixed(0)}%</span>
            <span>Arq: {(candidate.architecture_relevance_score * 100).toFixed(0)}%</span>
            <span>Ruído: {(candidate.noise_risk_score * 100).toFixed(0)}%</span>
            <span>Fresh: {(candidate.freshness_score * 100).toFixed(0)}%</span>
          </div>
          {candidate.rejection_reason && (
            <p className="text-[10px] text-destructive/70 mt-1">{candidate.rejection_reason}</p>
          )}
        </div>
        {candidate.review_status === "pending" && (
          <div className="flex gap-1 shrink-0">
            <Button
              size="sm" variant="ghost"
              className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              onClick={onApprove} disabled={approving}
            >
              {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
            </Button>
            <Button
              size="sm" variant="ghost"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
              onClick={onReject} disabled={rejecting}
            >
              {rejecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        )}
        {candidate.review_status === "approved" && candidate.promoted_source_id && (
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent, clickable, onClick }: { label: string; value: number; accent?: boolean; clickable?: boolean; onClick?: () => void }) {
  return (
    <Card
      className={`border-border/30 bg-card/40 ${clickable ? "cursor-pointer hover:bg-card/60 hover:border-primary/40 transition-colors" : ""}`}
      onClick={clickable ? onClick : undefined}
    >
      <CardContent className="pt-3 pb-2 text-center">
        <p className={`text-lg font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5 truncate">
          {clickable && "👁 "}{label}
        </p>
      </CardContent>
    </Card>
  );
}
