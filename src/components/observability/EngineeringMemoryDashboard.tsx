import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Database, Link, Search, Eye, Clock, Tag } from "lucide-react";

const MEMORY_TYPE_LABELS: Record<string, string> = {
  ExecutionMemory: "Execução",
  ErrorMemory: "Erro",
  StrategyMemory: "Estratégia",
  DesignMemory: "Design",
  DecisionMemory: "Decisão",
  OutcomeMemory: "Resultado",
};

const MEMORY_TYPE_COLORS: Record<string, string> = {
  ExecutionMemory: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  ErrorMemory: "bg-red-500/10 text-red-500 border-red-500/20",
  StrategyMemory: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  DesignMemory: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  DecisionMemory: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  OutcomeMemory: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
};

export function EngineeringMemoryDashboard() {
  const { currentOrg } = useOrg();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Metrics
  const { data: metrics } = useQuery({
    queryKey: ["memory-metrics", currentOrg?.id],
    enabled: !!currentOrg?.id,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("engineering-memory-service", {
        body: { action: "metrics", organization_id: currentOrg!.id },
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  // Retrieval metrics (Sprint 16)
  const { data: retrievalMetrics } = useQuery({
    queryKey: ["memory-retrieval-metrics", currentOrg?.id],
    enabled: !!currentOrg?.id,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("memory-retrieval-surface", {
        body: { action: "retrieval_metrics", organization_id: currentOrg!.id },
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  // Entries
  const { data: searchResult } = useQuery({
    queryKey: ["memory-entries", currentOrg?.id, typeFilter],
    enabled: !!currentOrg?.id,
    queryFn: async () => {
      const body: Record<string, unknown> = {
        action: "search",
        organization_id: currentOrg!.id,
        limit: 50,
      };
      if (typeFilter !== "all") body.memory_type = typeFilter;
      const { data, error } = await supabase.functions.invoke("engineering-memory-service", {
        body,
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const entries = searchResult?.memory_entries || [];
  const filtered = searchTerm
    ? entries.filter(
        (e: any) =>
          e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.summary?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : entries;

  const typeDistribution = Object.entries(metrics?.entries_by_type || {}).map(
    ([type, count]) => ({ type, count: count as number, label: MEMORY_TYPE_LABELS[type] || type })
  );

  const byContext = retrievalMetrics?.by_context || {};
  const contextEntries = Object.entries(byContext).map(([ctx, count]) => ({ context: ctx, count: count as number }));

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-6">
        <MetricCard
          icon={Database}
          label="Total Memórias"
          value={metrics?.total_entries ?? 0}
        />
        <MetricCard
          icon={Link}
          label="Links"
          value={metrics?.total_links ?? 0}
        />
        <MetricCard
          icon={Eye}
          label="Consultas (7d)"
          value={metrics?.retrieval_frequency_7d ?? 0}
        />
        <MetricCard
          icon={Brain}
          label="Tipos Ativos"
          value={typeDistribution.length}
        />
        <MetricCard
          icon={Search}
          label="Retrievals (7d)"
          value={retrievalMetrics?.total_retrievals_7d ?? 0}
        />
        <MetricCard
          icon={Clock}
          label="Decision-Assisted"
          value={retrievalMetrics?.decision_assisted_count ?? 0}
        />
      </div>

      {/* Retrieval by Context (Sprint 16) */}
      {contextEntries.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Retrieval by Surface</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {contextEntries.map(({ context, count }) => (
                <Badge key={context} variant="outline" className="gap-1.5">
                  {context.replace(/_/g, " ")}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Type Distribution */}
      {typeDistribution.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {typeDistribution.map(({ type, count, label }) => (
                <Badge
                  key={type}
                  variant="outline"
                  className={`${MEMORY_TYPE_COLORS[type] || ""} gap-1.5`}
                >
                  {label}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo de Memória" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            {Object.entries(MEMORY_TYPE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar memórias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Memory Entries */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Entradas de Memória ({searchResult?.total_count ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Brain className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma memória registrada</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Memórias são criadas automaticamente a partir de eventos do sistema
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((entry: any) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-border/30 bg-muted/10 p-3 hover:border-primary/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="text-sm font-medium truncate">{entry.title}</h4>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${MEMORY_TYPE_COLORS[entry.memory_type] || ""}`}
                          >
                            {MEMORY_TYPE_LABELS[entry.memory_type] || entry.memory_type}
                          </Badge>
                          {entry.memory_subtype && (
                            <Badge variant="outline" className="text-[10px]">
                              {entry.memory_subtype}
                            </Badge>
                          )}
                        </div>
                        {entry.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                            {entry.summary}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          {entry.source_type && <span>Fonte: {entry.source_type}</span>}
                          {entry.related_stage && <span>• Stage: {entry.related_stage}</span>}
                          {entry.related_component && <span>• {entry.related_component}</span>}
                          <span>
                            • {new Date(entry.created_at).toLocaleDateString("pt-BR")}
                          </span>
                          {entry.times_retrieved > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Eye className="h-2.5 w-2.5" />
                              {entry.times_retrieved}
                            </span>
                          )}
                        </div>
                        {entry.tags && Array.isArray(entry.tags) && entry.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Tag className="h-2.5 w-2.5 text-muted-foreground" />
                            {(entry.tags as string[]).slice(0, 5).map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-[9px] h-4 px-1">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-muted-foreground">
                          Conf: {(Number(entry.confidence_score) * 100).toFixed(0)}%
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Rel: {(Number(entry.relevance_score) * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Most Accessed */}
      {metrics?.most_accessed && metrics.most_accessed.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Mais Acessadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {metrics.most_accessed.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between py-1.5 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${MEMORY_TYPE_COLORS[entry.memory_type] || ""}`}
                    >
                      {MEMORY_TYPE_LABELS[entry.memory_type] || entry.memory_type}
                    </Badge>
                    <span className="truncate text-xs">{entry.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {entry.times_retrieved}×
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Safety Notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3 flex items-start gap-3">
          <Brain className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Infraestrutura Informacional.</span>{" "}
            Engineering Memory é somente leitura. Memórias não alteram comportamento do pipeline,
            governança ou billing. São contexto estruturado para decisões futuras.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card className="border-border/50">
      <CardContent className="flex items-center gap-2.5 p-3">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-base font-bold font-display">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
