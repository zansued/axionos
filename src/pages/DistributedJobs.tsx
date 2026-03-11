import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Server, Play, Pause, RotateCcw, XCircle, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useQuery } from "@tanstack/react-query";

function useDistributedJobs(orgId: string | undefined) {
  const invoke = (action: string, extra?: Record<string, unknown>) =>
    supabase.functions.invoke("distributed-jobs", { body: { action, organization_id: orgId, ...extra } }).then(r => r.data);

  const overview = useQuery({ queryKey: ["distributed-jobs-overview", orgId], queryFn: () => invoke("overview"), enabled: !!orgId });
  const jobs = useQuery({ queryKey: ["distributed-jobs-list", orgId], queryFn: () => invoke("list_jobs"), enabled: !!orgId });
  return { overview, jobs, invoke };
}

const STATUS_ICON: Record<string, typeof Play> = {
  queued: Clock, assigned: Server, running: Play, paused: Pause,
  retrying: RotateCcw, completed: CheckCircle2, failed: XCircle, aborted: AlertTriangle,
};

export default function DistributedJobs() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const { overview, jobs, invoke } = useDistributedJobs(orgId);
  const ov = overview.data as Record<string, any> | null;
  const items = ((jobs.data as any)?.jobs || []) as any[];
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    invoke("job_detail", { job_id: selected.id }).then(setDetail);
  }, [selected]);

  const kpis = ov ? [
    { label: "Total Jobs", value: ov.total ?? 0 },
    { label: "Active", value: ov.active ?? 0 },
    { label: "Queued", value: ov.queued ?? 0 },
    { label: "Running", value: ov.running ?? 0 },
    { label: "Paused", value: ov.paused ?? 0 },
    { label: "Retrying", value: ov.retrying ?? 0, warn: true },
    { label: "Failed", value: ov.failed ?? 0, warn: true },
    { label: "Aborted", value: ov.aborted ?? 0, warn: true },
  ] : [];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1 p-6 space-y-6 overflow-auto">
          <div className="flex items-center gap-3">
            <Server className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Distributed Job Control Plane</h1>
              <p className="text-sm text-muted-foreground">Governed job coordination — priority, routing, retry & abort visibility</p>
            </div>
            <Badge variant="outline" className="ml-auto border-primary/30 text-primary">Block R</Badge>
          </div>

          {kpis.length > 0 && (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
              {kpis.map(k => (
                <Card key={k.label} className="border-border/50">
                  <CardContent className="p-3 text-center">
                    <p className={`text-lg font-bold font-mono ${k.warn ? "text-yellow-400" : ""}`}>{k.value}</p>
                    <p className="text-[10px] text-muted-foreground">{k.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Tabs defaultValue="all">
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
              <TabsTrigger value="queued" className="text-xs">Queued</TabsTrigger>
              <TabsTrigger value="failed" className="text-xs">Failed</TabsTrigger>
              <TabsTrigger value="retrying" className="text-xs">Retrying</TabsTrigger>
            </TabsList>

            {["all", "active", "queued", "failed", "retrying"].map(tab => (
              <TabsContent key={tab} value={tab} className="mt-4 space-y-2">
                {items
                  .filter((j: any) => {
                    if (tab === "active") return ["queued", "assigned", "running", "paused", "retrying"].includes(j.status);
                    if (tab === "queued") return j.status === "queued";
                    if (tab === "failed") return j.status === "failed" || j.status === "aborted";
                    if (tab === "retrying") return j.status === "retrying";
                    return true;
                  })
                  .slice(0, 40)
                  .map((j: any) => {
                    const Icon = STATUS_ICON[j.status] || Clock;
                    return (
                      <Card key={j.id} className="border-border/50 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setSelected(j)}>
                        <CardContent className="p-4 flex items-center gap-3">
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{j.job_label || j.job_class}</p>
                            <p className="text-xs text-muted-foreground">
                              Priority {j.priority} · Target: {j.routing_target} · Retries: {j.retry_count}/{j.max_retries}
                            </p>
                          </div>
                          <JobStatusBadge status={j.status} />
                        </CardContent>
                      </Card>
                    );
                  })}
                {items.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Server className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No distributed jobs yet.</p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
            <SheetContent className="w-[480px] sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  {selected?.job_label || selected?.job_class}
                </SheetTitle>
              </SheetHeader>

              {detail && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground text-xs">Status</span><br /><JobStatusBadge status={detail.job?.status} /></div>
                    <div><span className="text-muted-foreground text-xs">Priority</span><br /><span className="font-mono">{detail.job?.priority}</span></div>
                    <div><span className="text-muted-foreground text-xs">Routing</span><br /><span className="font-mono">{detail.job?.routing_target}</span></div>
                    <div><span className="text-muted-foreground text-xs">Retries</span><br /><span className="font-mono">{detail.job?.retry_count}/{detail.job?.max_retries}</span></div>
                  </div>

                  {detail.job?.fail_reason && (
                    <Card className="border-destructive/30">
                      <CardContent className="p-3">
                        <p className="text-xs text-destructive font-semibold">Fail Reason</p>
                        <p className="text-sm">{detail.job.fail_reason}</p>
                      </CardContent>
                    </Card>
                  )}

                  {detail.job?.abort_reason && (
                    <Card className="border-yellow-500/30">
                      <CardContent className="p-3">
                        <p className="text-xs text-yellow-400 font-semibold">Abort Reason</p>
                        <p className="text-sm">{detail.job.abort_reason}</p>
                      </CardContent>
                    </Card>
                  )}

                  {(detail.assignments || []).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Assignments ({detail.assignments.length})</p>
                      <div className="space-y-1">
                        {detail.assignments.map((a: any) => (
                          <div key={a.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                            <span>{a.assigned_target}</span>
                            <JobStatusBadge status={a.assignment_status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(detail.dependencies || []).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Dependencies ({detail.dependencies.length})</p>
                      <div className="space-y-1">
                        {detail.dependencies.map((d: any) => (
                          <div key={d.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                            <span>{d.distributed_jobs?.job_label || "dependency"} ({d.dependency_type})</span>
                            <JobStatusBadge status={d.distributed_jobs?.status || "unknown"} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(detail.events || []).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Event Log ({detail.events.length})</p>
                      <div className="space-y-1">
                        {detail.events.slice(0, 15).map((e: any) => (
                          <div key={e.id} className="text-xs p-2 rounded bg-muted/30">
                            <span className="font-mono">{e.event_type}</span>
                            {e.from_status && <span className="text-muted-foreground"> {e.from_status} → {e.to_status}</span>}
                            {e.reason && <p className="text-muted-foreground mt-0.5">{e.reason}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground italic">Advisory-first: job control does not trigger autonomous structural changes.</p>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    queued: "bg-muted text-muted-foreground",
    assigned: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    running: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    paused: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    retrying: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
    aborted: "bg-red-500/20 text-red-400 border-red-500/30",
    cancelled: "bg-muted text-muted-foreground",
  };
  return <Badge className={`text-[10px] ${styles[status] || "bg-muted text-muted-foreground"}`}>{status}</Badge>;
}
