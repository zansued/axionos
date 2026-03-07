import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitBranch, TrendingUp, AlertTriangle, CheckCircle, XCircle, Eye } from "lucide-react";
import {
  useCrossStageOverview,
  useCrossStageEdges,
  useCrossStagePolicies,
  useCrossStageOutcomes,
} from "@/hooks/useCrossStagelearning";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  draft: "bg-muted text-muted-foreground",
  watch: "bg-yellow-500/20 text-yellow-400",
  deprecated: "bg-destructive/20 text-destructive",
};

const OUTCOME_BADGE: Record<string, string> = {
  helpful: "bg-green-500/20 text-green-400",
  neutral: "bg-muted text-muted-foreground",
  harmful: "bg-destructive/20 text-destructive",
  inconclusive: "bg-yellow-500/20 text-yellow-400",
  pending: "bg-muted text-muted-foreground",
};

export function CrossStageLearningDashboard() {
  const { data: overview, isLoading: loadingOverview } = useCrossStageOverview();
  const { data: edgesData } = useCrossStageEdges();
  const { data: policiesData } = useCrossStagePolicies();
  const { data: outcomesData } = useCrossStageOutcomes();

  const edges = edgesData?.edges || [];
  const policies = policiesData?.policies || [];
  const outcomes = outcomesData?.outcomes || [];

  if (loadingOverview) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <OverviewCard label="Edges" value={overview?.total_edges || 0} sub={`${overview?.active_edges || 0} active`} />
        <OverviewCard label="Policies" value={overview?.total_policies || 0} sub={`${overview?.active_policies || 0} active`} />
        <OverviewCard label="Draft" value={overview?.draft_policies || 0} sub="awaiting review" />
        <OverviewCard label="Watch" value={overview?.watch_policies || 0} sub="under observation" />
        <OverviewCard label="Outcomes" value={overview?.total_outcomes || 0} sub={`${overview?.helpful_outcomes || 0} helpful`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Cross-Stage Edges */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" /> Cross-Stage Influence Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            {edges.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No cross-stage edges detected yet</p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {edges.slice(0, 20).map((edge: any) => (
                    <div key={edge.id} className="flex items-center gap-3 rounded-md border border-border/30 bg-muted/10 p-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-mono text-xs">{edge.from_stage_key}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-mono text-xs">{edge.to_stage_key}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span>{edge.relationship_type}</span>
                          <span>•</span>
                          <span>support: {edge.support_count}</span>
                          <span>•</span>
                          <span>conf: {(edge.confidence_score * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[edge.status] || ""}`}>
                        {edge.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Active Policies */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Cross-Stage Policies
            </CardTitle>
          </CardHeader>
          <CardContent>
            {policies.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No policies synthesized yet</p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {policies.slice(0, 20).map((p: any) => (
                    <div key={p.id} className="rounded-md border border-border/30 bg-muted/10 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{p.policy_type}</span>
                        <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[p.status] || ""}`}>
                          {p.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span>scope: {p.policy_scope}</span>
                        <span>•</span>
                        <span>conf: {(p.confidence_score * 100).toFixed(0)}%</span>
                        <span>•</span>
                        <span>support: {p.support_count}</span>
                        <span>•</span>
                        <span>mode: {p.action_mode}</span>
                      </div>
                      {p.affected_stages?.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {p.affected_stages.map((s: string) => (
                            <Badge key={s} variant="secondary" className="text-[9px] px-1.5 py-0">{s}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Outcomes */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" /> Policy Outcomes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {outcomes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No outcomes recorded yet</p>
          ) : (
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {outcomes.slice(0, 20).map((o: any) => (
                  <div key={o.id} className="flex items-center gap-3 rounded-md border border-border/30 bg-muted/10 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span>{o.cross_stage_policy_profiles?.policy_type || "unknown"}</span>
                        {o.spillover_detected && (
                          <Badge variant="destructive" className="text-[9px] px-1">spillover</Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(o.created_at).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${OUTCOME_BADGE[o.observed_outcome] || ""}`}>
                      {o.observed_outcome}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OverviewCard({ label, value, sub }: { label: string; value: number | string; sub: string }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold mt-0.5">{value}</p>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
