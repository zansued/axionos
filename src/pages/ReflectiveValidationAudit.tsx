import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReflectiveValidation } from "@/hooks/useReflectiveValidation";
import { ShieldCheck, AlertTriangle, TrendingUp, TrendingDown, Minus, Eye } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  validating: "bg-primary/20 text-primary",
  validated: "bg-accent/20 text-accent-foreground",
  disputed: "bg-destructive/20 text-destructive",
  reviewed: "bg-secondary/50 text-secondary-foreground",
  closed: "bg-muted text-muted-foreground",
};

export default function ReflectiveValidationAudit() {
  const { events, validationRuns, displacements, loading } = useReflectiveValidation();
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const selectedRuns = validationRuns.filter((r: any) => r.revision_event_id === selectedEvent);
  const selectedDisplacements = displacements.filter((d: any) => d.revision_event_id === selectedEvent);
  const selectedEventData = events.find((e: any) => e.id === selectedEvent);

  const totalValidated = events.filter((e: any) => e.audit_status === "validated" || e.audit_status === "reviewed").length;
  const totalDisplacements = displacements.length;
  const avgEffectiveness = validationRuns.length > 0
    ? validationRuns.reduce((s: number, r: any) => s + Number(r.net_effectiveness_score || 0), 0) / validationRuns.length
    : 0;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-6 space-y-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Reflective Validation & Self-Revision Audit</h1>
              <p className="text-sm text-muted-foreground">
                Audit whether self-corrections actually improve the system or merely displace problems.
              </p>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Revision Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{events.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Validated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{totalValidated}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Displacement Signals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-foreground">{totalDisplacements}</div>
                  {totalDisplacements > 0 && <AlertTriangle className="h-4 w-4 text-destructive" />}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Avg Net Effectiveness</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-foreground">{avgEffectiveness.toFixed(4)}</div>
                  {avgEffectiveness > 0.05 ? <TrendingUp className="h-4 w-4 text-accent-foreground" /> :
                   avgEffectiveness < -0.05 ? <TrendingDown className="h-4 w-4 text-destructive" /> :
                   <Minus className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="events">
            <TabsList>
              <TabsTrigger value="events">Revision Events</TabsTrigger>
              <TabsTrigger value="displacements">Displacement Alerts</TabsTrigger>
            </TabsList>

            <TabsContent value="events">
              <Card>
                <CardHeader>
                  <CardTitle>Self-Revision Timeline</CardTitle>
                  <CardDescription>All revision events with audit status and effectiveness.</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-muted-foreground text-sm">Loading...</p>
                  ) : events.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No revision events registered yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Origin</TableHead>
                          <TableHead>Scope</TableHead>
                          <TableHead>Intended Outcome</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {events.map((event: any) => (
                          <TableRow key={event.id}>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {event.origin_type?.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-foreground max-w-[200px] truncate">
                              {event.revision_scope || "—"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                              {event.intended_outcome || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge className={STATUS_COLORS[event.audit_status] || STATUS_COLORS.pending}>
                                {event.audit_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(event.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" onClick={() => setSelectedEvent(event.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="displacements">
              <Card>
                <CardHeader>
                  <CardTitle>Displacement Alert Panel</CardTitle>
                  <CardDescription>Detected cases where a fix displaced problems to adjacent surfaces.</CardDescription>
                </CardHeader>
                <CardContent>
                  {displacements.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No displacement signals detected.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Displaced Surface</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Detected</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displacements.map((d: any) => (
                          <TableRow key={d.id}>
                            <TableCell className="text-sm text-foreground">{d.displaced_surface}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{d.displacement_type}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={Number(d.severity) > 0.5 ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"}>
                                {Number(d.severity).toFixed(4)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(d.detected_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Detail Dialog */}
          <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Revision Audit Detail
                </DialogTitle>
              </DialogHeader>
              {selectedEventData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Origin</p>
                      <p className="text-sm text-foreground">{selectedEventData.origin_type?.replace(/_/g, " ")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge className={STATUS_COLORS[selectedEventData.audit_status] || ""}>
                        {selectedEventData.audit_status}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Intended Outcome</p>
                      <p className="text-sm text-foreground">{selectedEventData.intended_outcome || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Observed Outcome</p>
                      <p className="text-sm text-foreground">{selectedEventData.observed_outcome || "Not yet observed"}</p>
                    </div>
                  </div>

                  {selectedRuns.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Validation Results</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedRuns.map((run: any) => (
                          <div key={run.id} className="grid grid-cols-2 gap-2 text-sm">
                            <div><span className="text-muted-foreground">Local Improvement:</span> {Number(run.local_improvement_score).toFixed(4)}</div>
                            <div><span className="text-muted-foreground">Displacement Risk:</span> {Number(run.displacement_risk_score).toFixed(4)}</div>
                            <div><span className="text-muted-foreground">Regression Prob.:</span> {Number(run.regression_probability).toFixed(4)}</div>
                            <div><span className="text-muted-foreground">Net Effectiveness:</span> {Number(run.net_effectiveness_score).toFixed(4)}</div>
                            <div><span className="text-muted-foreground">Confidence:</span> {Number(run.confidence_score).toFixed(4)}</div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {selectedDisplacements.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" /> Displacement Signals
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedDisplacements.map((d: any) => (
                          <div key={d.id} className="flex justify-between items-center text-sm py-1 border-b border-border last:border-0">
                            <span className="text-foreground">{d.displaced_surface}</span>
                            <Badge variant="outline" className="text-xs">{d.displacement_type}</Badge>
                            <span className="text-muted-foreground">Severity: {Number(d.severity).toFixed(4)}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </SidebarProvider>
  );
}
