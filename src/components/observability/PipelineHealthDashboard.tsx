import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, AlertTriangle, CheckCircle2, Clock, Zap, DollarSign, RotateCcw, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(142 76% 36%)",
  "hsl(0 84% 60%)",
  "hsl(38 92% 50%)",
  "hsl(262 83% 58%)",
];

function StatCard({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string | number; highlight?: boolean }) {
  return (
    <Card className="border-border/50">
      <CardContent className="flex items-center gap-2.5 p-3">
        <Icon className={`h-4 w-4 shrink-0 ${highlight ? "text-destructive" : "text-primary"}`} />
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className={`text-base font-bold font-display ${highlight ? "text-destructive" : ""}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function PipelineHealthDashboard() {
  const { currentOrg } = useOrg();
  const [hours, setHours] = useState(72);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["pipeline-health-summary", currentOrg?.id, hours],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("pipeline-health-metrics", {
        body: null,
        method: "GET",
      });
      // Fallback: use fetch directly since .invoke doesn't support query params well
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pipeline-health-metrics?organization_id=${currentOrg?.id}&view=summary&hours=${hours}`;
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch pipeline health");
      return res.json();
    },
    enabled: !!currentOrg?.id,
    refetchInterval: 60000,
    retry: false,
  });

  const { data: failuresData } = useQuery({
    queryKey: ["pipeline-health-failures", currentOrg?.id, hours],
    queryFn: async () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pipeline-health-metrics?organization_id=${currentOrg?.id}&view=failures&hours=${hours}`;
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch failures");
      return res.json();
    },
    enabled: !!currentOrg?.id,
    refetchInterval: 60000,
    retry: false,
  });

  const pathData = summary?.path_distribution
    ? Object.entries(summary.path_distribution).map(([name, value]) => ({ name: name === "fast_2call" ? "Fast Path" : "Safe Path", value }))
    : [];

  const riskData = summary?.risk_distribution
    ? Object.entries(summary.risk_distribution).map(([name, value]) => ({ name, value }))
    : [];

  const errorData = summary?.error_categories
    ? Object.entries(summary.error_categories)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .map(([name, value]) => ({ name, value }))
    : [];

  const timeline = summary?.timeline || [];
  const failures = failuresData?.failures || [];

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Período:</span>
        {[24, 48, 72, 168].map((h) => (
          <Badge
            key={h}
            variant={hours === h ? "default" : "outline"}
            className="cursor-pointer text-[10px]"
            onClick={() => setHours(h)}
          >
            {h}h
          </Badge>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Activity} label="Execuções" value={summary?.total_executions ?? "—"} />
        <StatCard icon={CheckCircle2} label="Taxa Sucesso" value={summary ? `${summary.success_rate}%` : "—"} />
        <StatCard icon={AlertTriangle} label="Falhas" value={summary?.failed ?? "—"} highlight={(summary?.failed || 0) > 0} />
        <StatCard icon={Clock} label="Latência Média" value={summary ? `${summary.avg_latency_ms}ms` : "—"} />
        <StatCard icon={Zap} label="Tokens Totais" value={summary?.total_tokens?.toLocaleString() ?? "—"} />
        <StatCard icon={DollarSign} label="Custo Total" value={summary ? `$${summary.total_cost_usd}` : "—"} />
        <StatCard icon={RotateCcw} label="Retries" value={summary?.total_retries ?? "—"} highlight={(summary?.total_retries || 0) > 5} />
        <StatCard icon={TrendingUp} label="Período" value={`${hours}h`} />
      </div>

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="bg-muted/30 border border-border/50">
          <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
          <TabsTrigger value="distribution" className="text-xs">Distribuição</TabsTrigger>
          <TabsTrigger value="failures" className="text-xs">Falhas</TabsTrigger>
          <TabsTrigger value="errors" className="text-xs">Categorias de Erro</TabsTrigger>
        </TabsList>

        {/* Timeline */}
        <TabsContent value="timeline" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Timeline de Execuções por Hora
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Sem dados no período</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeline} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => v.substring(11, 16)} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(value: number, name: string) => [value, name === "total" ? "Total" : "Falhas"]}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Total" />
                    <Bar dataKey="failed" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} name="Falhas" />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution */}
        <TabsContent value="distribution" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-display">Path de Execução</CardTitle>
              </CardHeader>
              <CardContent>
                {pathData.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Sem dados</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pathData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                        {pathData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-display">Distribuição de Risco</CardTitle>
              </CardHeader>
              <CardContent>
                {riskData.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Sem dados</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                        {riskData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Failures */}
        <TabsContent value="failures" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Falhas Recentes ({failures.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {failures.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Nenhuma falha no período 🎉</p>
                ) : (
                  <div className="space-y-2">
                    {failures.map((f: any) => (
                      <div key={f.id} className="border border-border/30 rounded-lg p-3 bg-muted/10">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-mono text-foreground truncate">{f.file_path}</p>
                            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{f.error_message || "Erro sem mensagem"}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant="destructive" className="text-[10px]">{f.error_category || "unknown"}</Badge>
                            <Badge variant="outline" className="text-[10px]">{f.risk_tier}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span>{f.execution_path}</span>
                          <span>{f.latency_ms}ms</span>
                          <span>{f.retry_count} retries</span>
                          <span className="ml-auto">{new Date(f.created_at).toLocaleString("pt-BR")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Error categories */}
        <TabsContent value="errors" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">Categorias de Erro</CardTitle>
            </CardHeader>
            <CardContent>
              {errorData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhum erro categorizado</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={errorData} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={90} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="value" fill="hsl(0 84% 60%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
