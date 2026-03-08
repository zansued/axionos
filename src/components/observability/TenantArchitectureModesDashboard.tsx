import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTenantArchitectureModes } from "@/hooks/useTenantArchitectureModes";
import { Building2, Shield, Activity, AlertTriangle, TrendingUp, Layers } from "lucide-react";

export function TenantArchitectureModesDashboard() {
  const { overview, health } = useTenantArchitectureModes();

  const modes = overview.data?.modes || [];
  const preferences = overview.data?.preferences || [];
  const outcomes = overview.data?.outcomes || [];
  const recommendations = overview.data?.recommendations || [];
  const reviews = overview.data?.reviews || [];
  const healthData = health.data;

  const statusColor = (s: string) => {
    switch (s) {
      case "active": case "healthy": case "helpful": return "bg-green-500/20 text-green-400";
      case "watch": case "neutral": return "bg-yellow-500/20 text-yellow-400";
      case "draft": case "inconclusive": return "bg-muted text-muted-foreground";
      case "deprecated": case "harmful": case "critical": return "bg-destructive/20 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      {/* Health Overview */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Building2 className="h-3 w-3" /> Modes
            </div>
            <p className="text-2xl font-bold">{modes.length}</p>
            <p className="text-xs text-muted-foreground">{modes.filter((m: any) => m.status === "active").length} active</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Activity className="h-3 w-3" /> Health
            </div>
            <p className="text-2xl font-bold">{healthData?.overall_health_score?.toFixed(2) ?? "—"}</p>
            {healthData?.health_status && <Badge className={`text-[10px] ${statusColor(healthData.health_status)}`}>{healthData.health_status}</Badge>}
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <AlertTriangle className="h-3 w-3" /> Recommendations
            </div>
            <p className="text-2xl font-bold">{recommendations.filter((r: any) => r.status === "open").length}</p>
            <p className="text-xs text-muted-foreground">open</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" /> Outcomes
            </div>
            <p className="text-2xl font-bold">{outcomes.length}</p>
            <p className="text-xs text-muted-foreground">{outcomes.filter((o: any) => o.outcome_status === "helpful").length} helpful</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Mode Registry */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Architecture Mode Registry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {modes.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No architecture modes defined</p>
              ) : (
                <div className="space-y-2">
                  {modes.map((mode: any) => (
                    <div key={mode.id} className="rounded-md border border-border/30 bg-muted/10 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{mode.mode_name}</span>
                        <Badge className={`text-[10px] ${statusColor(mode.status)}`}>{mode.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{mode.mode_key}</span>
                        <span>•</span>
                        <span>{mode.mode_scope}</span>
                        <span>•</span>
                        <span>{mode.activation_mode}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" /> Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {recommendations.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No recommendations</p>
              ) : (
                <div className="space-y-2">
                  {recommendations.map((rec: any) => (
                    <div key={rec.id} className="rounded-md border border-border/30 bg-muted/10 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{rec.recommendation_type}</span>
                        <Badge className={`text-[10px] ${statusColor(rec.status)}`}>{rec.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{rec.target_scope}</span>
                        {rec.confidence_score && <><span>•</span><span>conf: {rec.confidence_score.toFixed(2)}</span></>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Preference Profiles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              {preferences.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No preference profiles</p>
              ) : (
                <div className="space-y-2">
                  {preferences.map((p: any) => (
                    <div key={p.id} className="rounded-md border border-border/30 bg-muted/10 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{p.preference_scope}</span>
                        <Badge className={`text-[10px] ${statusColor(p.status)}`}>{p.status}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">support: {p.support_count}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Reviews */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              {reviews.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No reviews</p>
              ) : (
                <div className="space-y-2">
                  {reviews.map((r: any) => (
                    <div key={r.id} className="rounded-md border border-border/30 bg-muted/10 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{r.review_status}</span>
                      </div>
                      {r.review_notes && <p className="text-[10px] text-muted-foreground">{r.review_notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
