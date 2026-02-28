import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Code2, FileText, GitBranch, Lightbulb, BarChart3, Loader2,
  Package, Eye, CheckCircle2, XCircle, Clock, Send,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useArtifactReview } from "@/hooks/useArtifactReview";
import { ArtifactReviewActions } from "@/components/artifacts/ArtifactReviewActions";
import { ArtifactReviewHistory } from "@/components/artifacts/ArtifactReviewHistory";

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  code: { label: "Código", icon: Code2, color: "text-blue-400" },
  content: { label: "Conteúdo", icon: FileText, color: "text-green-400" },
  decision: { label: "Decisão", icon: Lightbulb, color: "text-yellow-400" },
  analysis: { label: "Análise", icon: BarChart3, color: "text-purple-400" },
};

const STATUS_CONFIG: Record<string, { label: string; icon: any; className: string }> = {
  draft: { label: "Rascunho", icon: Clock, className: "bg-muted text-muted-foreground" },
  pending_review: { label: "Em Revisão", icon: Eye, className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  approved: { label: "Aprovado", icon: CheckCircle2, className: "bg-green-500/20 text-green-400 border-green-500/30" },
  rejected: { label: "Rejeitado", icon: XCircle, className: "bg-red-500/20 text-red-400 border-red-500/30" },
  deployed: { label: "Deployed", icon: Send, className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

export default function Artifacts() {
  const { currentOrg } = useOrg();
  const reviewActions = useArtifactReview();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);

  const { data: outputs = [], isLoading } = useQuery({
    queryKey: ["agent-outputs", currentOrg?.id],
    enabled: !!currentOrg,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_outputs")
        .select("*, agents(name, role)")
        .eq("organization_id", currentOrg!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: adrs = [] } = useQuery({
    queryKey: ["adrs", currentOrg?.id],
    enabled: !!currentOrg,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("adrs")
        .select("*, agent_outputs(organization_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data?.filter((a: any) => a.agent_outputs?.organization_id === currentOrg!.id) || [];
    },
  });

  const { data: validations = [] } = useQuery({
    queryKey: ["artifact-validations", currentOrg?.id],
    enabled: !!currentOrg,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("validation_runs")
        .select("*, agent_outputs(organization_id)")
        .order("executed_at", { ascending: false });
      if (error) throw error;
      return data?.filter((v: any) => v.agent_outputs?.organization_id === currentOrg!.id) || [];
    },
  });

  const filtered = outputs.filter((o: any) => {
    if (typeFilter !== "all" && o.type !== typeFilter) return false;
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    return true;
  });

  const selected = selectedArtifact ? outputs.find((o: any) => o.id === selectedArtifact) : null;

  const stats = {
    total: outputs.length,
    byType: Object.entries(TYPE_CONFIG).map(([key, cfg]) => ({
      key, label: cfg.label, count: outputs.filter((o: any) => o.type === key).length,
    })),
    totalTokens: outputs.reduce((acc: number, o: any) => acc + (o.tokens_used || 0), 0),
    totalCost: outputs.reduce((acc: number, o: any) => acc + Number(o.cost_estimate || 0), 0),
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Artefatos</h1>
            <p className="text-muted-foreground mt-1">Outputs versionados e rastreáveis dos agentes</p>
          </div>
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
            </CardContent>
          </Card>
          {stats.byType.map((t) => (
            <Card key={t.key} className="border-border/50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{t.count}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="artifacts">
          <TabsList>
            <TabsTrigger value="artifacts" className="gap-1.5">
              <Package className="h-3.5 w-3.5" /> Artefatos ({filtered.length})
            </TabsTrigger>
            <TabsTrigger value="decisions" className="gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" /> Decisões ({adrs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="artifacts" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
              {/* List */}
              <div className="space-y-2">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filtered.length === 0 ? (
                  <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center py-12 text-center">
                      <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground">Nenhum artefato encontrado. Execute subtasks no Workspace para gerar artefatos.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <AnimatePresence>
                    {filtered.map((output: any) => {
                      const typeInfo = TYPE_CONFIG[output.type] || TYPE_CONFIG.analysis;
                      const statusInfo = STATUS_CONFIG[output.status] || STATUS_CONFIG.draft;
                      const TypeIcon = typeInfo.icon;
                      const isSelected = selectedArtifact === output.id;

                      return (
                        <motion.div key={output.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <Card
                            className={`border-border/50 cursor-pointer transition-colors hover:bg-muted/20 ${isSelected ? "ring-1 ring-primary" : ""}`}
                            onClick={() => setSelectedArtifact(isSelected ? null : output.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <TypeIcon className={`h-5 w-5 mt-0.5 shrink-0 ${typeInfo.color}`} />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{output.summary || "Sem resumo"}</p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      {output.agents && (
                                        <span className="text-[10px] text-muted-foreground">
                                          @{output.agents.name} ({output.agents.role})
                                        </span>
                                      )}
                                      <span className="text-[10px] text-muted-foreground">
                                        {output.model_used}
                                      </span>
                                      {output.tokens_used > 0 && (
                                        <span className="text-[10px] text-muted-foreground">
                                          {output.tokens_used.toLocaleString()} tokens
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                  <Badge className={`text-[10px] ${statusInfo.className}`}>{statusInfo.label}</Badge>
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(output.created_at).toLocaleDateString("pt-BR")}
                                  </span>
                                  <ArtifactReviewActions
                                    status={output.status}
                                    onSubmitForReview={(c) => reviewActions.submitForReview(output.id, c)}
                                    onApprove={(c) => reviewActions.approve(output.id, c)}
                                    onReject={(c) => reviewActions.reject(output.id, c)}
                                    onRequestChanges={(c) => reviewActions.requestChanges(output.id, c)}
                                    onDeploy={(c) => reviewActions.deploy(output.id, validations, c)}
                                    onComment={(c) => reviewActions.addComment(output.id, output.status, c)}
                                    deployBlocked={!validations.some((v: any) => v.artifact_id === output.id && v.result === "pass")}
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>

              {/* Detail panel */}
              {selected && (
                <Card className="border-border/50 sticky top-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-display">Detalhes do Artefato</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Tipo:</span> <Badge variant="outline" className="ml-1">{TYPE_CONFIG[selected.type]?.label}</Badge></div>
                      <div><span className="text-muted-foreground">Status:</span> <Badge className={`ml-1 ${STATUS_CONFIG[selected.status]?.className}`}>{STATUS_CONFIG[selected.status]?.label}</Badge></div>
                      <div><span className="text-muted-foreground">Modelo:</span> {selected.model_used}</div>
                      <div><span className="text-muted-foreground">Tokens:</span> {selected.tokens_used?.toLocaleString()}</div>
                      <div><span className="text-muted-foreground">Custo:</span> ${Number(selected.cost_estimate || 0).toFixed(4)}</div>
                      <div><span className="text-muted-foreground">Data:</span> {new Date(selected.created_at).toLocaleString("pt-BR")}</div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Output</p>
                      <ScrollArea className="h-[250px] rounded-md border border-border/30 bg-muted/20 p-3">
                        <pre className="text-xs whitespace-pre-wrap text-foreground/80">
                          {typeof selected.raw_output === "object" && selected.raw_output !== null && !Array.isArray(selected.raw_output) && "text" in selected.raw_output
                            ? String((selected.raw_output as Record<string, unknown>).text)
                            : JSON.stringify(selected.raw_output, null, 2)}
                        </pre>
                      </ScrollArea>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Histórico de Revisão</p>
                      <ArtifactReviewHistory outputId={selected.id} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="decisions" className="mt-4">
            <div className="space-y-3">
              {adrs.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="flex flex-col items-center py-12 text-center">
                    <Lightbulb className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">Nenhuma ADR encontrada. Decisões arquiteturais serão geradas automaticamente pelos agentes Architect.</p>
                  </CardContent>
                </Card>
              ) : (
                adrs.map((adr: any) => (
                  <Card key={adr.id} className="border-border/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-display flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-yellow-400" />
                          {adr.title}
                        </CardTitle>
                        <Badge variant="outline">{adr.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {adr.context && (
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Contexto</p>
                          <p className="text-xs text-foreground/80 mt-1">{adr.context}</p>
                        </div>
                      )}
                      {adr.decision && (
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Decisão</p>
                          <ScrollArea className="max-h-[200px]">
                            <pre className="text-xs whitespace-pre-wrap text-foreground/80 mt-1">{adr.decision}</pre>
                          </ScrollArea>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
