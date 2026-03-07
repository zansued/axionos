import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDiscoveryArchitecture } from "@/hooks/useDiscoveryArchitecture";
import { RefreshCw, Compass, AlertTriangle, TrendingUp, Shield, CheckCircle, X, Eye } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  moderate: "bg-yellow-500/20 text-yellow-400",
  high: "bg-orange-500/20 text-orange-400",
  critical: "bg-destructive/20 text-destructive",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-400",
  reviewed: "bg-yellow-500/20 text-yellow-400",
  accepted: "bg-green-500/20 text-green-400",
  rejected: "bg-destructive/20 text-destructive",
  implemented: "bg-primary/20 text-primary",
  dismissed: "bg-muted text-muted-foreground",
};

export function DiscoveryArchitectureDashboard() {
  const { overview, recommendations, stressMap, recompute, reviewAction } = useDiscoveryArchitecture();

  const ov = overview.data;
  const recs = recommendations.data?.recommendations || [];
  const clusters = recommendations.data?.clusters || [];
  const stress = stressMap.data?.stress_map || overview.data?.stress_map;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            Discovery-Driven Architecture
          </h2>
          <p className="text-sm text-muted-foreground">Advisory architecture recommendations from discovery signals</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => recompute.mutate()} disabled={recompute.isPending}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${recompute.isPending ? "animate-spin" : ""}`} />
          Recompute
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold">{ov?.signal_count ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Discovery Signals</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold">{ov?.recommendation_count ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Recommendations</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{ov?.open_recommendations ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Open</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold">{stress?.overall_stress != null ? `${Math.round(stress.overall_stress * 100)}%` : "—"}</p>
          <p className="text-xs text-muted-foreground">Architecture Stress</p>
        </CardContent></Card>
      </div>

      {/* Stress Map */}
      {stress?.dimensions?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Architecture Stress Map
            {stress.hotspots?.length > 0 && (
              <Badge variant="destructive" className="ml-2">{stress.hotspots.length} hotspot(s)</Badge>
            )}
          </CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {stress.dimensions.map((d: any) => (
              <div key={d.dimension} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{d.dimension.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{d.trend}</Badge>
                    <span className="text-muted-foreground">{Math.round(d.score * 100)}%</span>
                  </div>
                </div>
                <Progress value={d.score * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommendation Clusters */}
      {clusters.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Recommendation Clusters ({clusters.length})
          </CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {clusters.slice(0, 8).map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <div>
                    <span className="text-sm font-medium">{c.cluster_key}</span>
                    <span className="text-xs text-muted-foreground ml-2">({c.count} recs)</span>
                  </div>
                  <Badge variant="outline">{Math.round(c.max_priority * 100)}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" /> Architecture Recommendations ({recs.length})
        </CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {recs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No recommendations yet. Click Recompute to analyze signals.</p>}
              {recs.map((rec: any) => (
                <div key={rec.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{rec.recommendation_type.replace(/_/g, " ")}</span>
                      <Badge className={STATUS_COLORS[rec.status] || ""}>{rec.status}</Badge>
                      <Badge className={rec.safety_class === "high_review_required" ? "bg-orange-500/20 text-orange-400" : "bg-muted text-muted-foreground"}>
                        {rec.safety_class}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(rec.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Scope: {rec.target_scope} • Confidence: {rec.confidence_score ? `${Math.round(rec.confidence_score * 100)}%` : "—"} • Priority: {rec.priority_score ? `${Math.round(rec.priority_score * 100)}%` : "—"}</p>
                  {rec.status === "open" && (
                    <div className="flex gap-1.5 pt-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => reviewAction.mutate({ recommendation_id: rec.id, action: "review_recommendation" })}>
                        <Eye className="h-3 w-3" /> Review
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-400" onClick={() => reviewAction.mutate({ recommendation_id: rec.id, action: "accept_recommendation" })}>
                        <CheckCircle className="h-3 w-3" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive" onClick={() => reviewAction.mutate({ recommendation_id: rec.id, action: "dismiss_recommendation" })}>
                        <X className="h-3 w-3" /> Dismiss
                      </Button>
                    </div>
                  )}
                  {rec.status === "reviewed" && (
                    <div className="flex gap-1.5 pt-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-400" onClick={() => reviewAction.mutate({ recommendation_id: rec.id, action: "accept_recommendation" })}>
                        <CheckCircle className="h-3 w-3" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive" onClick={() => reviewAction.mutate({ recommendation_id: rec.id, action: "reject_recommendation" })}>
                        <X className="h-3 w-3" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
