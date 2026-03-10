import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCanonReuseEngine } from "@/hooks/useCanonReuseEngine";
import { RefreshCw, Play, Pause } from "lucide-react";

const STAGE_COLORS: Record<string, string> = {
  discovery: "bg-accent/20 text-accent-foreground",
  architecture: "bg-primary/20 text-primary",
  engineering: "bg-primary/30 text-primary",
  validation: "bg-muted text-muted-foreground",
  repair: "bg-destructive/20 text-destructive",
  publish: "bg-secondary text-secondary-foreground",
};

const STATUS_COLORS: Record<string, string> = {
  advisory: "bg-muted text-muted-foreground",
  active: "bg-primary/20 text-primary",
};

export default function CanonReuseImpactDashboard() {
  const {
    rules, rulesLoading, metrics, applyGuidance, activateRule, deactivateRule,
  } = useCanonReuseEngine();

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Canon Reuse Impact</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Operational canon guidance injected into pipeline stages — advisory-first, governance-bounded.
            </p>
          </div>
          <Button
            onClick={() => applyGuidance.mutate()}
            disabled={applyGuidance.isPending}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${applyGuidance.isPending ? "animate-spin" : ""}`} />
            Apply Guidance
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Rules</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-foreground">{metrics?.total_rules || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Applications</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-primary">{metrics?.total_applications || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active Rules</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-primary">{metrics?.by_status?.active || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Advisory Rules</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-muted-foreground">{metrics?.by_status?.advisory || 0}</div></CardContent>
          </Card>
        </div>

        {/* Stage distribution */}
        {metrics?.by_stage && Object.keys(metrics.by_stage).length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Rules by Pipeline Stage</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(metrics.by_stage).map(([stage, count]) => (
                  <div key={stage} className="flex items-center gap-2">
                    <Badge className={STAGE_COLORS[stage] || ""}>{stage}</Badge>
                    <span className="text-sm font-medium text-foreground">{count as number}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rules table */}
        <Card>
          <CardContent className="p-0">
            {rulesLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading…</div>
            ) : rules.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No reuse rules yet. Apply guidance from active canon records to begin.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pattern</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((r: any) => {
                    const candidate = r.canon_learning_records?.learning_candidates;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-foreground">
                          {candidate?.pattern_signature || r.canon_record_id?.slice(0, 8) || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={STAGE_COLORS[r.affected_stage] || ""}>{r.affected_stage}</Badge>
                        </TableCell>
                        <TableCell><Badge variant="outline">{r.reuse_type}</Badge></TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[r.activation_status] || ""}>{r.activation_status}</Badge>
                        </TableCell>
                        <TableCell>{r.times_applied}</TableCell>
                        <TableCell>
                          {r.activation_status === "advisory" ? (
                            <Button size="sm" variant="ghost" onClick={() => activateRule.mutate(r.id)} title="Activate">
                              <Play className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => deactivateRule.mutate(r.id)} title="Set advisory">
                              <Pause className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
