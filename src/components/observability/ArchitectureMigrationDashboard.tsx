import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useArchitectureMigrationExecution } from "@/hooks/useArchitectureMigrationExecution";
import { Play, Pause, RotateCcw, Archive, ArrowRight } from "lucide-react";

const STATE_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  approved: "bg-green-500/20 text-green-400",
  preparing: "bg-blue-500/20 text-blue-400",
  checkpoint_ready: "bg-cyan-500/20 text-cyan-400",
  executing: "bg-emerald-500/20 text-emerald-400",
  paused: "bg-yellow-500/20 text-yellow-400",
  completed: "bg-primary/20 text-primary",
  rolled_back: "bg-orange-500/20 text-orange-400",
  failed: "bg-destructive/20 text-destructive",
  archived: "bg-muted text-muted-foreground",
};

export function ArchitectureMigrationDashboard() {
  const { overview, executions, rollbacks, migrationAction } = useArchitectureMigrationExecution();
  const ov = overview.data as any;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Controlled Architecture Migration</h2>
        <p className="text-sm text-muted-foreground">Staged, checkpoint-gated, reversible migration execution</p>
      </div>

      {ov && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{ov.total_migrations}</div><div className="text-xs text-muted-foreground">Total Migrations</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-emerald-400">{ov.active_migrations}</div><div className="text-xs text-muted-foreground">Active</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{ov.total_outcomes}</div><div className="text-xs text-muted-foreground">Outcomes</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-orange-400">{ov.total_rollbacks}</div><div className="text-xs text-muted-foreground">Rollbacks</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{ov.total_reviews}</div><div className="text-xs text-muted-foreground">Reviews</div></CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Migration Queue</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {Array.isArray(executions.data) && executions.data.length > 0 ? (
              <div className="space-y-3">
                {(executions.data as any[]).map((mig: any) => {
                  const phases = Array.isArray(mig.phase_sequence) ? mig.phase_sequence : [];
                  return (
                    <div key={mig.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{mig.migration_name}</span>
                          <Badge className={STATE_COLORS[mig.migration_state] || ""}>{mig.migration_state}</Badge>
                          <span className="text-xs text-muted-foreground">Phase {mig.active_phase + 1}/{phases.length}</span>
                        </div>
                        <div className="flex gap-1">
                          {["approved", "checkpoint_ready"].includes(mig.migration_state) && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => migrationAction.mutate({ migration_id: mig.id, action: "activate_phase" })}>
                              <Play className="h-3 w-3 mr-1" /> Execute
                            </Button>
                          )}
                          {mig.migration_state === "executing" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => migrationAction.mutate({ migration_id: mig.id, action: "pause_migration" })}>
                              <Pause className="h-3 w-3 mr-1" /> Pause
                            </Button>
                          )}
                          {mig.migration_state === "paused" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => migrationAction.mutate({ migration_id: mig.id, action: "continue_migration" })}>
                              <ArrowRight className="h-3 w-3 mr-1" /> Continue
                            </Button>
                          )}
                          {["executing", "paused", "checkpoint_ready"].includes(mig.migration_state) && (
                            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => migrationAction.mutate({ migration_id: mig.id, action: "rollback_migration" })}>
                              <RotateCcw className="h-3 w-3 mr-1" /> Rollback
                            </Button>
                          )}
                          {["completed", "rolled_back", "failed"].includes(mig.migration_state) && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => migrationAction.mutate({ migration_id: mig.id, action: "archive_migration" })}>
                              <Archive className="h-3 w-3 mr-1" /> Archive
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div>Scope: <span className="text-foreground">{mig.target_scope}</span></div>
                        <div>Phases: <span className="text-foreground">{phases.length}</span></div>
                        <div>Created: <span className="text-foreground">{new Date(mig.created_at).toLocaleDateString()}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No migration executions yet.</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

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
                    <Badge variant="outline" className="text-xs">{rb.rollback_scope}</Badge>
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
