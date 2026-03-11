import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useOrg } from "@/contexts/OrgContext";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { Activity, TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";

const METRIC_LABELS: Record<string, string> = {
  resilience: "Resilience",
  coherence: "Coherence",
  learning_velocity: "Learning Velocity",
  governance_integrity: "Governance Integrity",
  operator_trust: "Operator Trust",
  compounding_strength: "Compounding Strength",
};

const GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  B: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  C: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  D: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  F: "bg-destructive/20 text-destructive border-destructive/30",
};

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "improving") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (trend === "declining") return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export default function SystemHealthDashboard() {
  const { currentOrg } = useOrg();
  const { metrics, evaluate } = useSystemHealth(currentOrg?.id ?? null);

  const data = metrics.data;
  const metricsList = data?.metrics || [];
  const grade = data?.health_grade || "—";
  const overall = data?.overall_health_score ?? 0;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">System Health</h1>
              <p className="text-sm text-muted-foreground">
                Systemic health assessment across all operational dimensions
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => evaluate.mutate()}
              disabled={evaluate.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${evaluate.isPending ? "animate-spin" : ""}`} />
              Evaluate Health
            </Button>
          </div>

          {/* Overall Score */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <Activity className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Overall Health Score</p>
                    <p className="text-3xl font-bold">{(overall * 100).toFixed(1)}%</p>
                  </div>
                </div>
                <Badge className={`text-lg px-4 py-1 ${GRADE_COLORS[grade] || ""}`}>
                  Grade {grade}
                </Badge>
              </div>
              <Progress value={overall * 100} className="mt-4 h-3" />
            </CardContent>
          </Card>

          {/* Metric Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metricsList.map((m: any) => {
              const val = Number(m.metric_value ?? m.value ?? 0);
              const trend = m.metric_trend ?? m.trend ?? "stable";
              const type = m.metric_type ?? m.type;
              return (
                <Card key={type}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      {METRIC_LABELS[type] || type}
                      <TrendIcon trend={trend} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{(val * 100).toFixed(1)}%</p>
                    <Progress value={val * 100} className="mt-2 h-2" />
                    <p className="text-xs text-muted-foreground mt-1 capitalize">{trend}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {metricsList.length === 0 && !metrics.isLoading && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No health data yet. Click "Evaluate Health" to generate the first assessment.
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}
