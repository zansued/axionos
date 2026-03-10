import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOperationalPosture } from "@/hooks/useOperationalPosture";
import { RefreshCw, Activity } from "lucide-react";

const POSTURE_COLORS: Record<string, string> = {
  exploratory: "bg-accent/20 text-accent-foreground",
  accelerated: "bg-primary/20 text-primary",
  stabilizing: "bg-secondary text-secondary-foreground",
  recovery: "bg-destructive/20 text-destructive",
  constrained: "bg-destructive/10 text-destructive",
  observation_heavy: "bg-muted text-muted-foreground",
};

const POSTURE_DESCRIPTIONS: Record<string, string> = {
  exploratory: "System exploring new patterns with high learning sensitivity",
  accelerated: "High confidence — fast autonomy, aggressive repair, fast-track publishing",
  stabilizing: "Stabilization mode — strict validation, conservative repair",
  recovery: "Recovery mode — maximum repair, blocked publishing, frozen autonomy",
  constrained: "Resource-constrained — restricted operations, conservative stance",
  observation_heavy: "Observation mode — gathering signals before committing to a stance",
};

export default function OperationalPostureDashboard() {
  const {
    postures, posturesLoading, metrics, evaluatePosture,
  } = useOperationalPosture();

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Operational Posture</h1>
            <p className="text-muted-foreground text-sm mt-1">
              System strategic stance — adapts pipeline behavior based on operational signals.
            </p>
          </div>
          <Button
            onClick={() => evaluatePosture.mutate({})}
            disabled={evaluatePosture.isPending}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${evaluatePosture.isPending ? "animate-spin" : ""}`} />
            Evaluate Posture
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active Postures</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-foreground">{metrics?.total || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Confidence</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-primary">{metrics?.avg_confidence || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Posture Distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {metrics?.by_posture && Object.entries(metrics.by_posture).map(([p, c]) => (
                  <Badge key={p} className={POSTURE_COLORS[p] || ""}>{p}: {c as number}</Badge>
                ))}
                {(!metrics?.by_posture || Object.keys(metrics.by_posture).length === 0) && (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Posture states */}
        <Card>
          <CardContent className="p-0">
            {posturesLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading…</div>
            ) : postures.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No posture evaluations yet. Run evaluation to determine operational stance.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Posture</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Stack</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Signals</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postures.map((p: any) => {
                    const signals = Array.isArray(p.trigger_signals) ? p.trigger_signals : [];
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge className={POSTURE_COLORS[p.current_posture] || ""}>
                              <Activity className="h-3 w-3 mr-1" />
                              {p.current_posture}
                            </Badge>
                            <p className="text-xs text-muted-foreground">{POSTURE_DESCRIPTIONS[p.current_posture] || ""}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.tenant_id || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.stack_id || "—"}</TableCell>
                        <TableCell>{p.posture_confidence}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {signals.slice(0, 3).map((s: any, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {s.signal}: {typeof s.value === "number" ? s.value.toFixed(2) : s.value}
                              </Badge>
                            ))}
                            {signals.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{signals.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(p.updated_at).toLocaleString()}
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
