import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useArchitectureRolloutPilot } from "@/hooks/useArchitectureRolloutPilot";
import { RefreshCw, Play, Pause, RotateCcw, XCircle, Archive, CheckCircle2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  eligible: "bg-blue-500/20 text-blue-400",
  approved: "bg-green-500/20 text-green-400",
  active: "bg-emerald-500/20 text-emerald-400",
  paused: "bg-yellow-500/20 text-yellow-400",
  completed: "bg-primary/20 text-primary",
  rolled_back: "bg-orange-500/20 text-orange-400",
  rejected: "bg-destructive/20 text-destructive",
  archived: "bg-muted text-muted-foreground",
};

const MODE_LABELS: Record<string, string> = {
  shadow: "Shadow",
  traffic_slice: "Traffic Slice",
  tenant_limited: "Tenant Limited",
  feature_gated: "Feature Gated",
};

export function ArchitectureRolloutPilotDashboard() {
  const { overview, pilots, outcomes, rollbacks, recompute, pilotAction } = useArchitectureRolloutPilot();
  const ov = overview.data as any;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Architecture Rollout Pilots</h2>
          <p className="text-sm text-muted-foreground">Bounded real-world pilot governance for architecture changes</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => recompute.mutate()} disabled={recompute.isPending}>
          <RefreshCw className={`h-4 w-4 mr-1 ${recompute.isPending ? "animate-spin" : ""}`} />
          Generate Pilots
        </Button>
      </div>

      {/* Overview Cards */}
      {ov && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{ov.total_pilots}</div><div className="text-xs text-muted-foreground">Total Pilots</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-emerald-400">{ov.active_pilots}</div><div className="text-xs text-muted-foreground">Active</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{ov.total_outcomes}</div><div className="text-xs text-muted-foreground">Outcomes</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-orange-400">{ov.total_rollbacks}</div><div className="text-xs text-muted-foreground">Rollbacks</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{ov.total_reviews}</div><div className="text-xs text-muted-foreground">Reviews</div></CardContent></Card>
        </div>
      )}

      {/* Pilot Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pilot Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {Array.isArray(pilots.data) && pilots.data.length > 0 ? (
              <div className="space-y-3">
                {(pilots.data as any[]).map((pilot: any) => (
                  <div key={pilot.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{pilot.pilot_name}</span>
                        <Badge className={STATUS_COLORS[pilot.status] || ""}>{pilot.status}</Badge>
                        <Badge variant="outline" className="text-xs">{MODE_LABELS[pilot.pilot_mode] || pilot.pilot_mode}</Badge>
                      </div>
                      <div className="flex gap-1">
                        {(pilot.status === "draft" || pilot.status === "eligible") && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => pilotAction.mutate({ pilot_id: pilot.id, action: "approve_pilot" })}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                          </Button>
                        )}
                        {pilot.status === "approved" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => pilotAction.mutate({ pilot_id: pilot.id, action: "activate_pilot" })}>
                            <Play className="h-3 w-3 mr-1" /> Activate
                          </Button>
                        )}
                        {pilot.status === "active" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => pilotAction.mutate({ pilot_id: pilot.id, action: "pause_pilot" })}>
                            <Pause className="h-3 w-3 mr-1" /> Pause
                          </Button>
                        )}
                        {(pilot.status === "active" || pilot.status === "paused") && (
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => pilotAction.mutate({ pilot_id: pilot.id, action: "rollback_pilot" })}>
                            <RotateCcw className="h-3 w-3 mr-1" /> Rollback
                          </Button>
                        )}
                        {!["archived", "rejected", "rolled_back"].includes(pilot.status) && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => pilotAction.mutate({ pilot_id: pilot.id, action: "reject_pilot" })}>
                            <XCircle className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        )}
                        {["completed", "rolled_back", "rejected"].includes(pilot.status) && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => pilotAction.mutate({ pilot_id: pilot.id, action: "archive_pilot" })}>
                            <Archive className="h-3 w-3 mr-1" /> Archive
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>Scope: <span className="text-foreground">{pilot.pilot_scope}</span></div>
                      <div>Rollback triggers: <span className="text-foreground">{Array.isArray(pilot.rollback_triggers) ? pilot.rollback_triggers.length : 0}</span></div>
                      <div>Stop conditions: <span className="text-foreground">{Array.isArray(pilot.stop_conditions) ? pilot.stop_conditions.length : 0}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No pilot candidates yet. Generate pilots from rollout-ready plans.</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Rollbacks */}
      {Array.isArray(rollbacks.data) && rollbacks.data.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Rollback History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(rollbacks.data as any[]).slice(0, 10).map((rb: any) => (
                <div key={rb.id} className="border rounded p-2 text-sm flex items-center justify-between">
                  <div className="flex gap-2 items-center">
                    <RotateCcw className="h-3.5 w-3.5 text-orange-400" />
                    <Badge variant="outline" className="text-xs">{rb.rollback_mode}</Badge>
                    <span className="text-muted-foreground">{new Date(rb.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
