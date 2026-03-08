import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useArchitectureFitness } from "@/hooks/useArchitectureFitness";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  healthy: "bg-emerald-500/20 text-emerald-400",
  watch: "bg-yellow-500/20 text-yellow-400",
  degrading: "bg-orange-500/20 text-orange-400",
  critical: "bg-destructive/20 text-destructive",
  active: "bg-emerald-500/20 text-emerald-400",
  deprecated: "bg-muted text-muted-foreground",
  open: "bg-blue-500/20 text-blue-400",
  reviewed: "bg-cyan-500/20 text-cyan-400",
  accepted: "bg-emerald-500/20 text-emerald-400",
  rejected: "bg-destructive/20 text-destructive",
  dismissed: "bg-muted text-muted-foreground",
};

export function ArchitectureFitnessDashboard() {
  const { overview, dimensions, evaluations, recommendations, recompute, reviewRecommendation } = useArchitectureFitness();
  const ov = overview.data as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Architecture Fitness Functions</h2>
          <p className="text-sm text-muted-foreground">Continuously evaluate architecture quality across fitness dimensions</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => recompute.mutate()} disabled={recompute.isPending}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Recompute
        </Button>
      </div>

      {ov && (
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{ov.total_dimensions}</div><div className="text-xs text-muted-foreground">Dimensions</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-emerald-400">{ov.active_dimensions}</div><div className="text-xs text-muted-foreground">Active</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{ov.total_evaluations}</div><div className="text-xs text-muted-foreground">Evaluations</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-destructive">{ov.critical_evaluations}</div><div className="text-xs text-muted-foreground">Critical</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-orange-400">{ov.degrading_evaluations}</div><div className="text-xs text-muted-foreground">Degrading</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-blue-400">{ov.open_recommendations}</div><div className="text-xs text-muted-foreground">Open Recs</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{ov.total_reviews}</div><div className="text-xs text-muted-foreground">Reviews</div></CardContent></Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Fitness Dimensions</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {Array.isArray(dimensions.data) && dimensions.data.length > 0 ? (
                <div className="space-y-2">
                  {(dimensions.data as any[]).map((d: any) => (
                    <div key={d.id} className="border rounded p-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{d.dimension_name}</span>
                        <Badge className={STATUS_COLORS[d.status] || ""}>{d.status}</Badge>
                        <Badge variant="outline" className="text-xs">{d.dimension_scope}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">{d.dimension_key}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No dimensions defined yet.</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Evaluations</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {Array.isArray(evaluations.data) && evaluations.data.length > 0 ? (
                <div className="space-y-2">
                  {(evaluations.data as any[]).slice(0, 20).map((e: any) => (
                    <div key={e.id} className="border rounded p-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={STATUS_COLORS[e.degradation_status] || ""}>{e.degradation_status}</Badge>
                        <span className="text-sm">Score: {(Number(e.score) * 100).toFixed(0)}%</span>
                      </div>
                      {e.confidence_score && <span className="text-xs text-muted-foreground">conf: {(Number(e.confidence_score) * 100).toFixed(0)}%</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No evaluations yet.</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {Array.isArray(recommendations.data) && recommendations.data.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Fitness Recommendations</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(recommendations.data as any[]).slice(0, 15).map((r: any) => (
                <div key={r.id} className="border rounded p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[r.status] || ""}>{r.status}</Badge>
                    <span className="text-sm">{r.recommendation_type}</span>
                    <span className="text-xs text-muted-foreground">{r.target_scope}</span>
                  </div>
                  {r.status === "open" && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => reviewRecommendation.mutate({ recommendation_id: r.id, status: "accepted" })}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Accept
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => reviewRecommendation.mutate({ recommendation_id: r.id, status: "rejected" })}>
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
