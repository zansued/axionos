import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useArchitecturePortfolioGovernance } from "@/hooks/useArchitecturePortfolioGovernance";
import { RefreshCw, Archive, CheckCircle, XCircle } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/20 text-emerald-400",
  watch: "bg-yellow-500/20 text-yellow-400",
  constrained: "bg-orange-500/20 text-orange-400",
  deprecated: "bg-destructive/20 text-destructive",
  archived: "bg-muted text-muted-foreground",
  open: "bg-blue-500/20 text-blue-400",
  reviewed: "bg-cyan-500/20 text-cyan-400",
  accepted: "bg-emerald-500/20 text-emerald-400",
  rejected: "bg-destructive/20 text-destructive",
  dismissed: "bg-muted text-muted-foreground",
};

export function ArchitecturePortfolioGovernanceDashboard() {
  const { overview, portfolios, recommendations, recompute, reviewRecommendation, archivePortfolio } = useArchitecturePortfolioGovernance();
  const ov = overview.data as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Architecture Portfolio Governance</h2>
          <p className="text-sm text-muted-foreground">Manage architecture changes as a coherent, prioritized portfolio</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => recompute.mutate()} disabled={recompute.isPending}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Recompute
        </Button>
      </div>

      {ov && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{ov.total_portfolios}</div><div className="text-xs text-muted-foreground">Portfolios</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-emerald-400">{ov.active_portfolios}</div><div className="text-xs text-muted-foreground">Active</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{ov.total_members}</div><div className="text-xs text-muted-foreground">Members</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-emerald-400">{ov.active_members}</div><div className="text-xs text-muted-foreground">Active Members</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-orange-400">{ov.conflicting_members}</div><div className="text-xs text-muted-foreground">Conflicting</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-blue-400">{ov.open_recommendations}</div><div className="text-xs text-muted-foreground">Open Recs</div></CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Portfolios</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {Array.isArray(portfolios.data) && portfolios.data.length > 0 ? (
              <div className="space-y-3">
                {(portfolios.data as any[]).map((p: any) => (
                  <div key={p.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{p.portfolio_name}</span>
                        <Badge className={STATUS_COLORS[p.lifecycle_status] || ""}>{p.lifecycle_status}</Badge>
                        <Badge variant="outline" className="text-xs">{p.portfolio_scope}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{p.portfolio_theme}</div>
                    </div>
                    {!["archived", "deprecated"].includes(p.lifecycle_status) && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => archivePortfolio.mutate(p.id)}>
                        <Archive className="h-3 w-3 mr-1" /> Archive
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No portfolios yet.</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {Array.isArray(recommendations.data) && recommendations.data.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Recommendations</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(recommendations.data as any[]).slice(0, 15).map((r: any) => (
                <div key={r.id} className="border rounded p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[r.status] || ""}>{r.status}</Badge>
                    <span className="text-sm">{r.recommendation_type}</span>
                    {r.confidence_score && <span className="text-xs text-muted-foreground">conf: {(r.confidence_score * 100).toFixed(0)}%</span>}
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
