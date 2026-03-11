import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useOrg } from "@/contexts/OrgContext";
import { useOrganismMemory } from "@/hooks/useOrganismMemory";
import { Brain, Database, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const TYPE_LABELS: Record<string, string> = {
  episodic: "Episodic",
  procedural: "Procedural",
  doctrinal: "Doctrinal",
  strategic: "Strategic",
};

const TYPE_COLORS: Record<string, string> = {
  episodic: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  procedural: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  doctrinal: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  strategic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export default function OrganismMemoryDashboard() {
  const { currentOrg } = useOrg();
  const { metrics } = useOrganismMemory(currentOrg?.id ?? null);

  const data = metrics.data;
  const layers = data?.layers || [];
  const growth = data?.growth || [];
  const strategic = data?.strategic_patterns || [];
  const total = data?.total_memories ?? 0;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Organism Memory</h1>
            <p className="text-sm text-muted-foreground">
              Layered operational memory across episodic, procedural, doctrinal, and strategic dimensions
            </p>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Database className="h-6 w-6 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Memories</p>
                    <p className="text-2xl font-bold">{total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            {layers.map((layer: any) => (
              <Card key={layer.type}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={TYPE_COLORS[layer.type] || ""}>{TYPE_LABELS[layer.type] || layer.type}</Badge>
                    <span className="text-lg font-bold">{layer.count}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">Avg confidence: {(layer.avg_confidence * 100).toFixed(1)}%</p>
                  <Progress value={layer.avg_confidence * 100} className="h-2" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Memory Growth (7 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {growth.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={growth}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No growth data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Strategic Patterns */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4" /> Strategic Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              {strategic.length > 0 ? (
                <div className="space-y-3">
                  {strategic.map((s: any) => (
                    <div key={s.memory_id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{s.memory_signature?.slice(0, 16)}…</p>
                        <p className="text-xs text-muted-foreground">Scope: {s.memory_scope}</p>
                      </div>
                      <Badge variant="outline">{(Number(s.confidence_score) * 100).toFixed(0)}%</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No strategic patterns recorded yet</p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </SidebarProvider>
  );
}
