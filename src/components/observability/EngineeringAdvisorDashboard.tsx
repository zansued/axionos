import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEngineeringAdvisor } from "@/hooks/useEngineeringAdvisor";
import { Lightbulb, RefreshCw, CheckCircle, XCircle, Eye, Archive, Rocket, AlertTriangle, Shield, Layers } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-400",
  reviewed: "bg-yellow-500/20 text-yellow-400",
  accepted: "bg-green-500/20 text-green-400",
  rejected: "bg-destructive/20 text-destructive",
  implemented: "bg-primary/20 text-primary",
  dismissed: "bg-muted text-muted-foreground",
  low_risk_review: "bg-green-500/20 text-green-400",
  medium_risk_review: "bg-yellow-500/20 text-yellow-400",
  high_risk_review: "bg-destructive/20 text-destructive",
};

export function EngineeringAdvisorDashboard() {
  const {
    overview, recommendations,
    recompute, reviewRecommendation, acceptRecommendation, rejectRecommendation, dismissRecommendation, markImplemented,
  } = useEngineeringAdvisor();

  const ov = overview.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" /> Autonomous Engineering Advisor
          </h2>
          <p className="text-muted-foreground text-sm">Cross-layer advisory synthesis, prioritized guidance</p>
        </div>
        <Button size="sm" onClick={() => recompute.mutate({})} disabled={recompute.isPending}>
          <RefreshCw className={`h-4 w-4 mr-1 ${recompute.isPending ? "animate-spin" : ""}`} />
          Recompute
        </Button>
      </div>

      {/* Overview Stats */}
      {ov && (
        <>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-6">
            <StatCard label="Open" value={ov.open} color="text-blue-400" />
            <StatCard label="Reviewed" value={ov.reviewed} color="text-yellow-400" />
            <StatCard label="Accepted" value={ov.accepted} color="text-green-400" />
            <StatCard label="Rejected" value={ov.rejected} color="text-destructive" />
            <StatCard label="Implemented" value={ov.implemented} color="text-primary" />
            <StatCard label="Dismissed" value={ov.dismissed} color="text-muted-foreground" />
          </div>

          {/* Safety Breakdown */}
          <div className="grid gap-3 grid-cols-3">
            <Card>
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <p className="text-2xl font-bold text-green-400">{ov.safety_breakdown?.low_risk || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Low Risk</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <p className="text-2xl font-bold text-yellow-400">{ov.safety_breakdown?.medium_risk || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Medium Risk</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4 text-center">
                <p className="text-2xl font-bold text-destructive">{ov.safety_breakdown?.high_risk || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">High Risk</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Tabs */}
      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue" className="gap-1"><Layers className="h-3 w-3" /> Queue</TabsTrigger>
          <TabsTrigger value="reviews" className="gap-1"><Eye className="h-3 w-3" /> Reviews</TabsTrigger>
        </TabsList>

        {/* Queue */}
        <TabsContent value="queue" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Prioritized Recommendations</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {(recommendations.data?.recommendations || []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">No recommendations. Run recompute with layer signals.</p>
                ) : (
                  <div className="space-y-3">
                    {(recommendations.data?.recommendations || []).map((rec: any) => (
                      <div key={rec.id} className="p-3 rounded-lg border bg-card space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{rec.recommendation_type}</p>
                            <p className="text-xs text-muted-foreground">{rec.target_scope} • priority: {rec.priority_score} • confidence: {rec.confidence_score}</p>
                          </div>
                          <div className="flex gap-1">
                            <Badge className={STATUS_COLORS[rec.safety_class] || ""}>{rec.safety_class?.replace(/_/g, " ")}</Badge>
                            <Badge className={STATUS_COLORS[rec.status] || ""}>{rec.status}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {rec.status === "open" && (
                            <Button size="sm" variant="outline" onClick={() => reviewRecommendation.mutate({ recommendation_id: rec.id })}>
                              <Eye className="h-3 w-3 mr-1" /> Review
                            </Button>
                          )}
                          {(rec.status === "open" || rec.status === "reviewed") && (
                            <>
                              <Button size="sm" variant="default" onClick={() => acceptRecommendation.mutate({ recommendation_id: rec.id })}>
                                <CheckCircle className="h-3 w-3 mr-1" /> Accept
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => rejectRecommendation.mutate({ recommendation_id: rec.id })}>
                                <XCircle className="h-3 w-3 mr-1" /> Reject
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => dismissRecommendation.mutate({ recommendation_id: rec.id })}>
                                <Archive className="h-3 w-3 mr-1" /> Dismiss
                              </Button>
                            </>
                          )}
                          {rec.status === "accepted" && (
                            <Button size="sm" variant="default" onClick={() => markImplemented.mutate({ recommendation_id: rec.id })}>
                              <Rocket className="h-3 w-3 mr-1" /> Mark Implemented
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews */}
        <TabsContent value="reviews" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Recent Reviews</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {(ov?.recent_reviews || []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">No reviews yet.</p>
                ) : (
                  <div className="space-y-2">
                    {(ov?.recent_reviews || []).map((r: any) => (
                      <div key={r.id} className="p-3 rounded-lg border bg-card flex items-center justify-between">
                        <div>
                          <p className="text-sm">{r.recommendation_id?.slice(0, 8)}...</p>
                          <p className="text-xs text-muted-foreground">{r.review_notes || "No notes"}</p>
                        </div>
                        <Badge className={STATUS_COLORS[r.review_status] || ""}>{r.review_status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4 text-center">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}
