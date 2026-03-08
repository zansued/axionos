import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useArchitectureSimulation } from "@/hooks/useArchitectureSimulation";
import { RefreshCw, FlaskConical, CheckCircle2, XCircle, AlertTriangle, Layers, Eye } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    reviewed: "bg-blue-500/20 text-blue-400",
    approved_for_simulation: "bg-yellow-500/20 text-yellow-400",
    simulated: "bg-purple-500/20 text-purple-400",
    generated: "bg-muted text-muted-foreground",
    accepted: "bg-green-500/20 text-green-400",
    rejected: "bg-destructive/20 text-destructive",
    dismissed: "bg-muted text-muted-foreground",
  };
  return <Badge className={colors[status] || "bg-muted text-muted-foreground"}>{status}</Badge>;
}

export function ArchitectureSimulationDashboard() {
  const { overview, proposals, outcomes, recompute, reviewAction } = useArchitectureSimulation();
  const ov = overview.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" />
            Architecture Change Simulation
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Simulate and evaluate architectural recommendations before implementation
          </p>
        </div>
        <Button onClick={() => recompute.mutate()} disabled={recompute.isPending} size="sm" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${recompute.isPending ? "animate-spin" : ""}`} />
          Recompute Simulations
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{ov?.proposal_count || 0}</div>
            <div className="text-xs text-muted-foreground">Total Proposals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{ov?.open_proposals || 0}</div>
            <div className="text-xs text-muted-foreground">Open Proposals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{ov?.outcome_count || 0}</div>
            <div className="text-xs text-muted-foreground">Simulation Outcomes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{ov?.review_count || 0}</div>
            <div className="text-xs text-muted-foreground">Reviews</div>
          </CardContent>
        </Card>
      </div>

      {/* Proposals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" /> Architecture Change Proposals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {(proposals.data?.proposals || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No proposals yet. Link recommendations or recompute to generate.</p>
            ) : (
              <div className="space-y-3">
                {(proposals.data?.proposals || []).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{p.proposal_type}</div>
                      <div className="text-xs text-muted-foreground">Scope: {p.target_scope}</div>
                      <div className="flex gap-2 mt-1">
                        <StatusBadge status={p.status} />
                        <Badge variant="outline" className="text-xs">{p.safety_class}</Badge>
                        {p.confidence_score && (
                          <Badge variant="outline" className="text-xs">conf: {(p.confidence_score * 100).toFixed(0)}%</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Simulation Outcomes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" /> Simulation Outcomes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {(outcomes.data?.outcomes || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No simulation outcomes yet.</p>
            ) : (
              <div className="space-y-4">
                {(outcomes.data?.outcomes || []).map((o: any) => {
                  const benefits = Array.isArray(o.expected_benefits) ? o.expected_benefits : [];
                  const tradeoffs = Array.isArray(o.expected_tradeoffs) ? o.expected_tradeoffs : [];
                  const risks = Array.isArray(o.risk_flags) ? o.risk_flags : [];
                  const layers = Array.isArray(o.affected_layers) ? o.affected_layers : [];

                  return (
                    <div key={o.id} className="p-4 rounded-lg border border-border/50 bg-card/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <StatusBadge status={o.status} />
                        {o.confidence_score && (
                          <Badge variant="outline" className="text-xs">
                            confidence: {(o.confidence_score * 100).toFixed(0)}%
                          </Badge>
                        )}
                      </div>

                      {/* Affected Layers */}
                      <div className="flex gap-1 flex-wrap">
                        {layers.map((l: string) => (
                          <Badge key={l} variant="secondary" className="text-xs">{l}</Badge>
                        ))}
                      </div>

                      {/* Benefits */}
                      {benefits.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-green-400 flex items-center gap-1 mb-1">
                            <CheckCircle2 className="h-3 w-3" /> Expected Benefits
                          </div>
                          {benefits.map((b: any, i: number) => (
                            <div key={i} className="text-xs text-muted-foreground ml-4">
                              • {b.dimension}: {b.rationale} ({(b.magnitude * 100).toFixed(0)}%)
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Tradeoffs */}
                      {tradeoffs.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-yellow-400 flex items-center gap-1 mb-1">
                            <AlertTriangle className="h-3 w-3" /> Expected Tradeoffs
                          </div>
                          {tradeoffs.map((t: any, i: number) => (
                            <div key={i} className="text-xs text-muted-foreground ml-4">
                              • {t.dimension}: {t.rationale} ({(t.magnitude * 100).toFixed(0)}%)
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Risk Flags */}
                      {risks.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {risks.map((r: string, i: number) => (
                            <Badge key={i} variant="destructive" className="text-xs">{r}</Badge>
                          ))}
                        </div>
                      )}

                      {/* Review Actions */}
                      {o.status === "generated" && (
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline" className="text-xs gap-1"
                            onClick={() => reviewAction.mutate({ simulation_outcome_id: o.id, action: "review_simulation" })}>
                            Review
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs gap-1 text-destructive"
                            onClick={() => reviewAction.mutate({ simulation_outcome_id: o.id, action: "dismiss_simulation" })}>
                            <XCircle className="h-3 w-3" /> Dismiss
                          </Button>
                        </div>
                      )}
                      {o.status === "reviewed" && (
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline" className="text-xs gap-1 text-green-400"
                            onClick={() => reviewAction.mutate({ simulation_outcome_id: o.id, action: "accept_simulation" })}>
                            <CheckCircle2 className="h-3 w-3" /> Accept
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs gap-1 text-destructive"
                            onClick={() => reviewAction.mutate({ simulation_outcome_id: o.id, action: "reject_simulation" })}>
                            <XCircle className="h-3 w-3" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
