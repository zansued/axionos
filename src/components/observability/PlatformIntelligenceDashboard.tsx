import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlatformIntelligence } from "@/hooks/usePlatformIntelligence";
import { Activity, AlertTriangle, BarChart3, CheckCircle, RefreshCw, XCircle, TrendingUp, Shield, Zap, DollarSign, Rocket } from "lucide-react";
import { motion } from "framer-motion";

const GRADE_COLORS: Record<string, string> = {
  A: "text-green-400", B: "text-emerald-400", C: "text-yellow-400", D: "text-orange-400", F: "text-destructive",
};

const SEVERITY_BADGE: Record<string, string> = {
  info: "bg-muted text-muted-foreground",
  warning: "bg-yellow-500/20 text-yellow-400",
  critical: "bg-destructive/20 text-destructive",
};

const STATUS_BADGE: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400",
  reviewed: "bg-yellow-500/20 text-yellow-400",
  resolved: "bg-green-500/20 text-green-400",
  open: "bg-blue-500/20 text-blue-400",
  accepted: "bg-green-500/20 text-green-400",
  rejected: "bg-destructive/20 text-destructive",
};

export function PlatformIntelligenceDashboard() {
  const {
    overview, healthMetrics, bottlenecks, patterns,
    recompute, markInsightReviewed, acceptRecommendation, rejectRecommendation,
  } = usePlatformIntelligence();

  const health = healthMetrics.data?.health;
  const insightsList = overview.data?.insights || [];
  const recsList = overview.data?.recommendations || [];
  const bottleneckList = bottlenecks.data?.bottlenecks || [];
  const patternList = patterns.data?.patterns || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" /> Platform Intelligence
        </h2>
        <Button
          size="sm" variant="outline" className="gap-1.5"
          onClick={() => recompute.mutate()}
          disabled={recompute.isPending}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${recompute.isPending ? "animate-spin" : ""}`} />
          Recompute
        </Button>
      </div>

      {/* Health Overview */}
      {health && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Platform Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 mb-4">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${GRADE_COLORS[health.health_grade] || "text-foreground"}`}>
                    {health.health_grade}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Grade</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{(health.overall_health_score * 100).toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground mt-1">Overall</div>
                </div>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                <HealthIndex icon={Shield} label="Reliability" value={health.reliability_index} />
                <HealthIndex icon={Zap} label="Stability" value={health.execution_stability_index} />
                <HealthIndex icon={AlertTriangle} label="Repair" value={1 - health.repair_burden_index} inverted />
                <HealthIndex icon={DollarSign} label="Cost Eff." value={health.cost_efficiency_index} />
                <HealthIndex icon={Rocket} label="Deploy" value={health.deploy_success_index} />
                <HealthIndex icon={BarChart3} label="Policy Eff." value={health.policy_effectiveness_index} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bottlenecks */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" /> Bottlenecks
              <Badge variant="outline" className="ml-auto text-xs">{bottleneckList.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[220px]">
              {bottleneckList.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No bottlenecks detected</p>
              ) : (
                <div className="space-y-2">
                  {bottleneckList.map((b: any, i: number) => (
                    <div key={i} className="p-2 rounded-md bg-muted/30 border border-border/30 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground">{b.affected_entity}</span>
                        <Badge className={`text-[10px] ${b.severity === "critical" ? "bg-destructive/20 text-destructive" : b.severity === "high" ? "bg-orange-500/20 text-orange-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                          {b.severity}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{b.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Patterns */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Detected Patterns
              <Badge variant="outline" className="ml-auto text-xs">{patternList.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[220px]">
              {patternList.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No patterns detected</p>
              ) : (
                <div className="space-y-2">
                  {patternList.map((p: any, i: number) => (
                    <div key={i} className="p-2 rounded-md bg-muted/30 border border-border/30 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground">{p.pattern_type}</span>
                        <Badge className={`text-[10px] ${p.severity === "high" ? "bg-destructive/20 text-destructive" : "bg-yellow-500/20 text-yellow-400"}`}>
                          {p.severity}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{p.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Insights */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Insights
              <Badge variant="outline" className="ml-auto text-xs">{insightsList.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {insightsList.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No insights yet — click Recompute</p>
              ) : (
                <div className="space-y-2">
                  {insightsList.slice(0, 20).map((ins: any) => (
                    <div key={ins.id} className="p-2 rounded-md bg-muted/30 border border-border/30 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground truncate max-w-[60%]">{ins.insight_type}</span>
                        <div className="flex items-center gap-1">
                          <Badge className={`text-[10px] ${SEVERITY_BADGE[ins.severity] || ""}`}>{ins.severity}</Badge>
                          <Badge className={`text-[10px] ${STATUS_BADGE[ins.status] || ""}`}>{ins.status}</Badge>
                        </div>
                      </div>
                      <p className="text-muted-foreground">{ins.affected_scope}</p>
                      {ins.status === "new" && (
                        <Button size="sm" variant="ghost" className="h-5 text-[10px] mt-1 px-1.5"
                          onClick={() => markInsightReviewed.mutate(ins.id)}>
                          Mark Reviewed
                        </Button>
                      )}
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
              <CheckCircle className="h-4 w-4 text-green-400" /> Recommendations
              <Badge variant="outline" className="ml-auto text-xs">{recsList.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {recsList.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No recommendations yet</p>
              ) : (
                <div className="space-y-2">
                  {recsList.slice(0, 20).map((rec: any) => (
                    <div key={rec.id} className="p-2 rounded-md bg-muted/30 border border-border/30 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground truncate max-w-[50%]">{rec.recommendation_type}</span>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[10px]">P{rec.priority_score?.toFixed(1)}</Badge>
                          <Badge className={`text-[10px] ${STATUS_BADGE[rec.status] || ""}`}>{rec.status}</Badge>
                        </div>
                      </div>
                      <p className="text-muted-foreground">{rec.target_scope}</p>
                      {rec.status === "open" && (
                        <div className="flex gap-1 mt-1">
                          <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5 text-green-400"
                            onClick={() => acceptRecommendation.mutate(rec.id)}>
                            <CheckCircle className="h-3 w-3 mr-0.5" /> Accept
                          </Button>
                          <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5 text-destructive"
                            onClick={() => rejectRecommendation.mutate(rec.id)}>
                            <XCircle className="h-3 w-3 mr-0.5" /> Reject
                          </Button>
                        </div>
                      )}
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

function HealthIndex({ icon: Icon, label, value, inverted }: { icon: any; label: string; value: number; inverted?: boolean }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "text-green-400" : pct >= 60 ? "text-yellow-400" : "text-destructive";
  return (
    <div className="text-center">
      <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
      <div className={`text-sm font-bold ${color}`}>{pct}%</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
