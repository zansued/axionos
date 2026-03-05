import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, AlertTriangle, Lightbulb, Loader2 } from "lucide-react";
import { BrainDAGGraph } from "./BrainDAGGraph";

interface ProjectBrainPanelProps {
  initiativeId: string;
}

export function ProjectBrainPanel({ initiativeId }: ProjectBrainPanelProps) {
  const { data: nodes = [], isLoading: nodesLoading } = useQuery({
    queryKey: ["brain-nodes", initiativeId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("project_brain_nodes") as any)
        .select("*")
        .eq("initiative_id", initiativeId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!initiativeId,
  });

  const { data: edges = [], isLoading: edgesLoading } = useQuery({
    queryKey: ["brain-edges", initiativeId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("project_brain_edges") as any)
        .select("*")
        .eq("initiative_id", initiativeId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!initiativeId,
  });

  const { data: decisions = [], isLoading: decisionsLoading } = useQuery({
    queryKey: ["brain-decisions", initiativeId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("project_decisions") as any)
        .select("*")
        .eq("initiative_id", initiativeId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!initiativeId,
  });

  const { data: errors = [], isLoading: errorsLoading } = useQuery({
    queryKey: ["brain-errors", initiativeId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("project_errors") as any)
        .select("*")
        .eq("initiative_id", initiativeId)
        .order("detected_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!initiativeId,
  });

  const isLoading = nodesLoading || edgesLoading || decisionsLoading || errorsLoading;
  const unfixedErrors = errors.filter((e: any) => !e.fixed);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="graph" className="w-full">
        <TabsList>
          <TabsTrigger value="graph" className="gap-1.5">
            <Brain className="h-4 w-4" /> DAG
            {nodes.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{nodes.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="decisions" className="gap-1.5">
            <Lightbulb className="h-4 w-4" /> Decisões
            {decisions.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{decisions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="errors" className="gap-1.5">
            <AlertTriangle className="h-4 w-4" /> Erros
            {unfixedErrors.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">{unfixedErrors.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="graph" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : nodes.length === 0 ? (
            <Card className="border-dashed border-2 border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Brain className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <h3 className="font-semibold text-lg">Project Brain vazio</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  O grafo de conhecimento será populado automaticamente conforme o pipeline executa cada estágio.
                </p>
              </CardContent>
            </Card>
          ) : (
            <BrainDAGGraph nodes={nodes} edges={edges} />
          )}
        </TabsContent>

        <TabsContent value="decisions" className="mt-4">
          {decisionsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : decisions.length === 0 ? (
            <Card className="border-dashed border-2 border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Lightbulb className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <h3 className="font-semibold text-lg">Nenhuma decisão registrada</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Decisões arquiteturais serão registradas automaticamente durante os estágios de arquitetura e planejamento.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {decisions.map((d: any) => (
                <Card key={d.id} className="border-border/50 bg-card/80">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-medium">{d.decision}</CardTitle>
                      <Badge variant="outline" className="shrink-0 text-[10px] bg-blue-500/15 text-blue-400 border-blue-500/30">
                        {d.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{d.reason}</p>
                    {d.impact && (
                      <p className="text-xs text-muted-foreground/70 mt-1 italic">Impacto: {d.impact}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="errors" className="mt-4">
          {errorsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : errors.length === 0 ? (
            <Card className="border-dashed border-2 border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <h3 className="font-semibold text-lg">Nenhum erro detectado</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Erros encontrados durante a validação serão registrados aqui com regras de prevenção para uso futuro.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {errors.map((err: any) => (
                <Card key={err.id} className={`border-border/50 bg-card/80 ${err.fixed ? "opacity-60" : ""}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle className={`h-4 w-4 shrink-0 ${err.fixed ? "text-green-400" : "text-destructive"}`} />
                        <CardTitle className="text-sm font-medium truncate">
                          {err.file_path || "Unknown file"}
                        </CardTitle>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[10px]">{err.error_type}</Badge>
                        {err.fixed && (
                          <Badge variant="outline" className="text-[10px] bg-green-500/15 text-green-400 border-green-500/30">
                            Corrigido
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground font-mono line-clamp-2">{err.error_message}</p>
                    {err.prevention_rule && (
                      <p className="text-xs text-yellow-400/80 mt-1">⚠️ {err.prevention_rule}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
