import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useArchitectureRolloutSandbox } from "@/hooks/useArchitectureRolloutSandbox";
import { RefreshCw, Box, CheckCircle2, XCircle, AlertTriangle, Eye, Archive } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    prepared: "bg-blue-500/20 text-blue-400",
    active: "bg-primary/20 text-primary",
    completed: "bg-green-500/20 text-green-400",
    blocked: "bg-yellow-500/20 text-yellow-400",
    expired: "bg-muted text-muted-foreground",
    archived: "bg-muted text-muted-foreground",
  };
  return <Badge className={colors[status] || "bg-muted text-muted-foreground"}>{status}</Badge>;
}

function ModeBadge({ mode }: { mode: string }) {
  const colors: Record<string, string> = {
    dry_run: "bg-blue-500/20 text-blue-400",
    staged_preview: "bg-yellow-500/20 text-yellow-400",
    shadow_readiness: "bg-primary/20 text-primary",
  };
  return <Badge variant="outline" className={colors[mode] || ""}>{mode}</Badge>;
}

export function ArchitectureRolloutSandboxDashboard() {
  const { overview, sandboxes, recompute, reviewAction } = useArchitectureRolloutSandbox();
  const ov = overview.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Box className="h-6 w-6 text-primary" />
            Architecture Rollout Sandbox
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Rehearse architecture rollout plans in bounded sandbox environments
          </p>
        </div>
        <Button onClick={() => recompute.mutate()} disabled={recompute.isPending} size="sm" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${recompute.isPending ? "animate-spin" : ""}`} />
          Recompute Sandboxes
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Sandboxes", value: ov?.sandbox_count || 0 },
          { label: "Active", value: ov?.active_sandboxes || 0 },
          { label: "Outcomes", value: ov?.outcome_count || 0 },
          { label: "Profiles", value: ov?.profile_count || 0 },
          { label: "Hooks", value: ov?.hook_count || 0 },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rollout Sandboxes</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {(sandboxes.data?.sandboxes || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No sandboxes yet. Mark plans as rollout-ready and recompute.</p>
            ) : (
              <div className="space-y-3">
                {(sandboxes.data?.sandboxes || []).map((sb: any) => (
                  <div key={sb.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{sb.sandbox_name}</span>
                        <StatusBadge status={sb.status} />
                        <ModeBadge mode={sb.rehearsal_mode} />
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(sb.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Scope:</span>{" "}
                        <span className="font-medium">{sb.sandbox_scope}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Mode:</span>{" "}
                        <span className="font-medium">{sb.rehearsal_mode}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>{" "}
                        <span className="font-medium">{sb.status}</span>
                      </div>
                    </div>

                    {!["archived", "expired"].includes(sb.status) && (
                      <div className="flex gap-2">
                        {sb.status === "prepared" && (
                          <Button size="sm" variant="outline" className="gap-1 text-xs h-7"
                            onClick={() => reviewAction.mutate({ sandbox_id: sb.id, action: "review_sandbox" })}>
                            <Eye className="h-3 w-3" /> Review
                          </Button>
                        )}
                        {sb.status === "completed" && (
                          <Button size="sm" variant="outline" className="gap-1 text-xs h-7 text-green-400"
                            onClick={() => reviewAction.mutate({ sandbox_id: sb.id, action: "mark_migration_ready" })}>
                            <CheckCircle2 className="h-3 w-3" /> Migration Ready
                          </Button>
                        )}
                        {!["archived", "expired", "blocked"].includes(sb.status) && (
                          <>
                            <Button size="sm" variant="outline" className="gap-1 text-xs h-7 text-yellow-400"
                              onClick={() => reviewAction.mutate({ sandbox_id: sb.id, action: "block_sandbox", blocker_reasons: ["Manual block"] })}>
                              <AlertTriangle className="h-3 w-3" /> Block
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1 text-xs h-7 text-destructive"
                              onClick={() => reviewAction.mutate({ sandbox_id: sb.id, action: "reject_sandbox" })}>
                              <XCircle className="h-3 w-3" /> Reject
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" className="gap-1 text-xs h-7"
                          onClick={() => reviewAction.mutate({ sandbox_id: sb.id, action: "archive_sandbox" })}>
                          <Archive className="h-3 w-3" /> Archive
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
  );
}
