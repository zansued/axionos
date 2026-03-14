import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Play, RefreshCw, Zap, Globe, CheckCircle2, XCircle, Clock, ArrowUpCircle, DatabaseZap, Bot, Sparkles, GitMerge, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";
import { useCanonPipeline } from "@/hooks/useCanonPipeline";
import { useCanonEvolutionEngine } from "@/hooks/useCanonEvolutionEngine";
import { INGESTION_LIFECYCLE_LABELS } from "@/lib/canon/canon-types";
import type { IngestionLifecycleState } from "@/lib/canon/canon-types";

interface CanonIngestionPanelProps {
  sources: any[];
  syncRuns: any[];
  onRefresh: () => void;
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

export function CanonIngestionPanel({ sources, syncRuns, onRefresh }: CanonIngestionPanelProps) {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const [ingesting, setIngesting] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [ingestingAll, setIngestingAll] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [absorbingRepo, setAbsorbingRepo] = useState(false);
  const [reviewingPipeline, setReviewingPipeline] = useState(false);
  const { stats, promoting, batchPromoteApproved } = useCanonPipeline();
  const evolution = useCanonEvolutionEngine();

  const runReviewPipeline = async () => {
    if (!currentOrg?.id) return;
    setReviewingPipeline(true);
    try {
      const { data, error } = await supabase.functions.invoke("canon-review-engine", {
        body: { action: "run_full_pipeline", organization_id: currentOrg.id },
      });
      if (error) throw error;
      const reviewInfo = data?.review || {};
      const promoInfo = data?.promotion || {};
      toast({
        title: "Pipeline de Review Concluído",
        description: `Revisados: ${reviewInfo.reviewed || 0} (${reviewInfo.approved || 0} aprovados, ${reviewInfo.rejected || 0} rejeitados). Promovidos: ${promoInfo.promoted || 0} ao Canon.`,
      });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Falha no Pipeline de Review", description: err.message, variant: "destructive" });
    } finally {
      setReviewingPipeline(false);
    }
  };

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
    setIngestingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke("canon-ingestion-agent", {
        body: { action: "ingest_all", organization_id: currentOrg.id },
      });
      if (error) throw error;
      const total = (data.results || []).reduce((sum: number, r: any) => sum + (r.candidates_created || 0), 0);
      toast({
        title: "Ingestão em Lote Concluída",
        description: `${total} novos candidatos extraídos de ${data.results?.length || 0} fontes.`,
      });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Falha na Ingestão em Lote", description: err.message, variant: "destructive" });
    } finally {
      setIngestingAll(false);
    }
  };

  const activeSources = sources.filter((s: any) => s.status === "active");
  const recentSyncs = syncRuns.slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Estatísticas do Pipeline */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          <MiniStat label="Fontes" value={stats.totalSources} />
          <MiniStat label="Candidatos" value={stats.totalCandidates} />
          <MiniStat label="Pendente Review" value={stats.pendingCandidates} accent />
          <MiniStat label="Revisão Humana" value={stats.needsHumanReview || 0} />
          <MiniStat label="Prontos p/ Promoção" value={stats.approvedCandidates} accent />
          <MiniStat label="Promovidos" value={stats.promotedCandidates} />
          <MiniStat label="Entradas Canon" value={stats.totalCanonEntries} />
          <MiniStat label="Recuperáveis" value={stats.retrievablePatterns} accent />
        </div>
      )}

      {/* Barra de ações */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={seedSources} disabled={seeding}>
          {seeding ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Globe className="h-3.5 w-3.5 mr-1.5" />}
          Adicionar Fontes Padrão
        </Button>
        <Button size="sm" onClick={ingestAll} disabled={ingestingAll || activeSources.length === 0}>
          {ingestingAll ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1.5" />}
          Ingerir Todas as Fontes
        </Button>
        {stats && stats.pendingCandidates > 0 && (
          <Button size="sm" variant="secondary" onClick={runReviewPipeline} disabled={reviewingPipeline}>
            {reviewingPipeline ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Bot className="h-3.5 w-3.5 mr-1.5" />}
            Revisar e Promover ({stats.pendingCandidates} pendentes)
          </Button>
        )}
        {stats && stats.approvedCandidates > 0 && (
          <Button size="sm" variant="default" onClick={batchPromoteApproved} disabled={promoting}>
            {promoting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <ArrowUpCircle className="h-3.5 w-3.5 mr-1.5" />}
            Promover {stats.approvedCandidates} ao Canon
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => evolution.runFullPipeline.mutate()}
          disabled={evolution.runFullPipeline.isPending}
          className="border-primary/30"
        >
          {evolution.runFullPipeline.isPending
            ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
          Pipeline de Evolução
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => evolution.processBacklog.mutate()}
          disabled={evolution.processBacklog.isPending}
        >
          {evolution.processBacklog.isPending
            ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            : <TrendingUp className="h-3.5 w-3.5 mr-1.5" />}
          Processar Backlog
        </Button>
        <Button size="sm" variant="ghost" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Atualizar
        </Button>
      </div>

      {/* Absorção de Repositório GitHub */}
      <Card className="border-border/30 bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitMerge className="h-4 w-4 text-primary" />
            Absorver Repositório GitHub
          </CardTitle>
          <CardDescription className="text-xs">
            Cole a URL de um repositório público do GitHub para extrair padrões canônicos, arquitetura e boas práticas.
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
              {absorbingRepo ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <DatabaseZap className="h-3.5 w-3.5 mr-1.5" />
              )}
              Absorver
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Registro de Fontes */}
        <Card className="border-border/30 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Registro de Fontes</CardTitle>
            <CardDescription className="text-xs">{activeSources.length} fontes ativas configuradas</CardDescription>
          </CardHeader>
          <CardContent>
            {activeSources.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Nenhuma fonte registrada. Clique em "Adicionar Fontes Padrão" para adicionar fontes de conhecimento de exemplo.
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
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 shrink-0"
                            onClick={() => ingestSource(src.id, src.source_name)}
                            disabled={ingesting === src.id}
                          >
                            {ingesting === src.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
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

        {/* Execuções Recentes de Sincronização */}
        <Card className="border-border/30 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Execuções Recentes</CardTitle>
            <CardDescription className="text-xs">{recentSyncs.length} ingestões recentes</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSyncs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma execução registrada ainda.</p>
            ) : (
              <ScrollArea className="h-[300px]">
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
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card className="border-border/30 bg-card/40">
      <CardContent className="pt-3 pb-2 text-center">
        <p className={`text-lg font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5 truncate">{label}</p>
      </CardContent>
    </Card>
  );
}
