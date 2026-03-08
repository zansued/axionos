import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useArchitectureChangePlanning } from "@/hooks/useArchitectureChangePlanning";
import { RefreshCw, Map, CheckCircle2, XCircle, AlertTriangle, Shield, Eye, Archive, Ban } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    reviewed: "bg-blue-500/20 text-blue-400",
    ready_for_rollout: "bg-green-500/20 text-green-400",
    blocked: "bg-yellow-500/20 text-yellow-400",
    rejected: "bg-destructive/20 text-destructive",
    archived: "bg-muted text-muted-foreground",
  };
  return <Badge className={colors[status] || "bg-muted text-muted-foreground"}>{status}</Badge>;
}

function RiskBadge({ risk }: { risk: string }) {
  const colors: Record<string, string> = {
    low: "bg-green-500/20 text-green-400",
    moderate: "bg-yellow-500/20 text-yellow-400",
    high: "bg-orange-500/20 text-orange-400",
    critical: "bg-destructive/20 text-destructive",
  };
  return <Badge className={colors[risk] || "bg-muted text-muted-foreground"}>{risk}</Badge>;
}

export function ArchitectureChangePlanningDashboard() {
  const { overview, plans, recompute, reviewAction } = useArchitectureChangePlanning();
  const ov = overview.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Map className="h-6 w-6 text-primary" />
            Architecture Change Planning
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Convert accepted simulations into governed implementation plans
          </p>
        </div>
        <Button onClick={() => recompute.mutate()} disabled={recompute.isPending} size="sm" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${recompute.isPending ? "animate-spin" : ""}`} />
          Recompute Plans
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{ov?.plan_count || 0}</div>
            <div className="text-xs text-muted-foreground">Total Plans</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{ov?.active_plans || 0}</div>
            <div className="text-xs text-muted-foreground">Active Plans</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{ov?.review_count || 0}</div>
            <div className="text-xs text-muted-foreground">Reviews</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{ov?.profile_count || 0}</div>
            <div className="text-xs text-muted-foreground">Rollout Profiles</div>
          </CardContent>
        </Card>
      </div>

      {/* Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Architecture Change Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {(plans.data?.plans || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No plans generated yet. Accept simulation outcomes and recompute.</p>
            ) : (
              <div className="space-y-3">
                {(plans.data?.plans || []).map((plan: any) => {
                  const blastRadius = plan.blast_radius || {};
                  const readiness = plan.readiness_score ? Math.round(plan.readiness_score * 100) : 0;
                  return (
                    <div key={plan.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{plan.plan_name}</span>
                          <StatusBadge status={plan.status} />
                          <RiskBadge risk={plan.implementation_risk} />
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(plan.created_at).toLocaleDateString()}</span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Scope:</span>{" "}
                          <span className="font-medium">{plan.target_scope}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Blast Radius:</span>{" "}
                          <span className="font-medium">{blastRadius.size || "—"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Readiness:</span>{" "}
                          <span className="font-medium">{readiness}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">High-Risk Nodes:</span>{" "}
                          <span className="font-medium">{blastRadius.high_risk_nodes?.length || 0}</span>
                        </div>
                      </div>

                      {/* Dependency summary */}
                      {Array.isArray(plan.dependency_graph) && plan.dependency_graph.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">{plan.dependency_graph.length}</span> dependency nodes
                          {blastRadius.tenant_impact && <Badge variant="outline" className="ml-2 text-[10px]">Tenant Impact</Badge>}
                          {blastRadius.observability_impact && <Badge variant="outline" className="ml-2 text-[10px]">Obs Impact</Badge>}
                        </div>
                      )}

                      {/* Actions */}
                      {!["rejected", "archived"].includes(plan.status) && (
                        <div className="flex gap-2">
                          {plan.status === "draft" && (
                            <Button size="sm" variant="outline" className="gap-1 text-xs h-7"
                              onClick={() => reviewAction.mutate({ plan_id: plan.id, action: "review_plan" })}>
                              <Eye className="h-3 w-3" /> Review
                            </Button>
                          )}
                          {plan.status === "reviewed" && (
                            <Button size="sm" variant="outline" className="gap-1 text-xs h-7 text-green-400"
                              onClick={() => reviewAction.mutate({ plan_id: plan.id, action: "mark_ready" })}>
                              <CheckCircle2 className="h-3 w-3" /> Ready
                            </Button>
                          )}
                          {!["rejected", "archived", "blocked"].includes(plan.status) && (
                            <>
                              <Button size="sm" variant="outline" className="gap-1 text-xs h-7 text-yellow-400"
                                onClick={() => reviewAction.mutate({ plan_id: plan.id, action: "block_plan", blocker_reasons: ["Manual block"] })}>
                                <AlertTriangle className="h-3 w-3" /> Block
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1 text-xs h-7 text-destructive"
                                onClick={() => reviewAction.mutate({ plan_id: plan.id, action: "reject_plan" })}>
                                <XCircle className="h-3 w-3" /> Reject
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" className="gap-1 text-xs h-7"
                            onClick={() => reviewAction.mutate({ plan_id: plan.id, action: "archive_plan" })}>
                            <Archive className="h-3 w-3" /> Archive
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

      {/* Recent Reviews */}
      {(ov?.recent_reviews || []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(ov?.recent_reviews || []).map((review: any) => (
                <div key={review.id} className="flex items-center justify-between text-sm border-b pb-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={review.review_status} />
                    <span className="text-xs text-muted-foreground">{review.review_notes || "No notes"}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
