import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Database, Activity, RefreshCw, Snowflake, ThumbsUp, ThumbsDown } from "lucide-react";
import { useSemanticRetrieval } from "@/hooks/useSemanticRetrieval";

export function SemanticRetrievalDashboard() {
  const {
    loading,
    overview,
    domains,
    indices,
    sessions,
    fetchOverview,
    fetchDomains,
    fetchIndices,
    fetchSessions,
    rebuildIndex,
    freezeIndex,
  } = useSemanticRetrieval();

  useEffect(() => {
    fetchOverview();
    fetchDomains();
    fetchIndices();
    fetchSessions();
  }, []);

  const quality = overview?.quality;

  return (
    <div className="space-y-4">
      {/* Overview Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Sessões (7d)</p>
            <p className="text-lg font-bold font-display">{quality?.total_sessions_7d ?? "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Taxa Útil</p>
            <p className="text-lg font-bold font-display text-green-400">{quality ? `${(quality.helpful_rate * 100).toFixed(1)}%` : "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Confiança Média</p>
            <p className="text-lg font-bold font-display">{quality?.avg_confidence?.toFixed(3) ?? "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Domínios Ativos</p>
            <p className="text-lg font-bold font-display">{domains.filter((d: any) => d.status === "active").length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Domain Registry */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" /> Domínios de Recuperação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              {domains.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhum domínio registrado</p>
              ) : (
                <div className="space-y-1.5">
                  {domains.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between rounded-md border border-border/30 bg-muted/10 p-2.5">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{d.domain_name}</p>
                        <p className="text-[10px] text-muted-foreground">{d.domain_key} · {d.scope_type}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {d.embedding_enabled && <Badge variant="outline" className="text-[9px]">Embed</Badge>}
                        <Badge variant={d.status === "active" ? "default" : "secondary"} className="text-[9px]">{d.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Index Registry */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" /> Índices de Recuperação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              {indices.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhum índice registrado</p>
              ) : (
                <div className="space-y-1.5">
                  {indices.map((idx: any) => (
                    <div key={idx.id} className="flex items-center justify-between rounded-md border border-border/30 bg-muted/10 p-2.5">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{idx.index_key}</p>
                        <p className="text-[10px] text-muted-foreground">{idx.embedding_model} · {idx.vector_dimensions}d</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {idx.is_stale && <Badge variant="destructive" className="text-[9px]">Stale</Badge>}
                        <Badge variant={idx.status === "active" ? "default" : idx.status === "frozen" ? "outline" : "secondary"} className="text-[9px]">{idx.status}</Badge>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => rebuildIndex(idx.id)} disabled={loading || idx.status === "frozen"}>
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => freezeIndex(idx.id)} disabled={loading || idx.status === "frozen"}>
                          <Snowflake className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Sessões Recentes de Recuperação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma sessão registrada</p>
            ) : (
              <div className="space-y-1.5">
                {sessions.slice(0, 20).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between rounded-md border border-border/30 bg-muted/10 p-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{s.session_type}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Domínios: {Array.isArray(s.domains_used) ? s.domains_used.join(", ") : "—"} · Confiança: {s.confidence_score?.toFixed(3) ?? "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(s.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Top Domains Usage */}
      {quality?.top_domains && quality.top_domains.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Domínios Mais Utilizados (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {quality.top_domains.map((d: any) => (
                <Badge key={d.domain} variant="outline" className="text-xs gap-1">
                  {d.domain} <span className="text-muted-foreground">({d.count})</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
