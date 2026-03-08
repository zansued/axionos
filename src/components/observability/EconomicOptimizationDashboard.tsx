import { useOrg } from "@/contexts/OrgContext";
import { useEconomicOptimization } from "@/hooks/useEconomicOptimization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, ShieldAlert, BarChart3, Target, Activity } from "lucide-react";

export function EconomicOptimizationDashboard() {
  const { currentOrg } = useOrg();
  const { overview, health } = useEconomicOptimization(currentOrg?.id);

  const ov = overview.data || {};
  const h = health.data || {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Economic Optimization
        </h2>
        <p className="text-sm text-muted-foreground">Advisory-first cost and ROI awareness across architecture changes.</p>
      </div>

      {/* Health Metrics */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <MetricCard label="Confidence Index" value={formatPct(h.economic_confidence_index)} icon={Target} />
        <MetricCard label="Tradeoff Index" value={formatPct(h.economic_tradeoff_index)} icon={BarChart3} />
        <MetricCard label="Forecast Accuracy" value={formatPct(h.forecast_accuracy_index)} icon={Activity} />
        <MetricCard label="Rec. Hit Rate" value={formatPct(h.recommendation_hit_rate)} icon={TrendingUp} />
      </div>

      {/* Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Projected Savings</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-400">${(ov.total_projected_savings || 0).toFixed(4)}</p>
            <p className="text-xs text-muted-foreground mt-1">{ov.total_assessments || 0} assessments</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Cost Exposure</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-400">${(ov.total_cost_exposure || 0).toFixed(4)}</p>
            <p className="text-xs text-muted-foreground mt-1">Avg confidence: {formatPct(ov.avg_confidence)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Open Recommendations</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{ov.open_recommendations || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{ov.recent_outcomes || 0} recent outcomes</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Recommendations */}
      {(ov.top_recommendations || []).length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Top Recommendations</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(ov.top_recommendations || []).map((rec: any, i: number) => (
                <div key={rec.id || i} className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{rec.recommendation_type}</Badge>
                    <span className="text-muted-foreground">{rec.target_scope}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">EV: ${(rec.expected_value || 0).toFixed(4)}</span>
                    <Badge variant="secondary" className="text-xs">{formatPct(rec.confidence_score)} conf</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Assessments */}
      {(ov.recent_assessments || []).length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Recent Assessments</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(ov.recent_assessments || []).map((a: any, i: number) => (
                <div key={a.id || i} className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{a.change_type}</Badge>
                    <Badge variant={a.status === "assessed" ? "default" : "secondary"} className="text-xs">{a.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Cost: ${(Number(a.projected_change_cost) || 0).toFixed(4)}</span>
                    <span>ROI 30d: {((Number(a.migration_roi_30d) || 0) * 100).toFixed(0)}%</span>
                    <span>Score: {((Number(a.economic_tradeoff_score) || 0) * 100).toFixed(0)}/100</span>
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

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-lg font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function formatPct(v: number | undefined): string {
  if (v === undefined || v === null) return "—";
  return `${Math.round(v * 100)}%`;
}
