import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRuntimeFeedbackMesh } from "@/hooks/useRuntimeFeedbackMesh";
import { Activity, AlertTriangle, RotateCcw, Heart } from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-muted text-muted-foreground",
  low: "bg-secondary text-secondary-foreground",
  medium: "bg-accent/20 text-accent-foreground",
  high: "bg-destructive/20 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

const HEALTH_COLORS: Record<string, string> = {
  healthy: "text-primary",
  stable: "text-primary",
  degraded: "text-accent-foreground",
  critical: "text-destructive",
};

export default function RuntimeFeedbackDashboard() {
  const {
    events, incidents, health,
    loadingEvents, loadingIncidents, loadingHealth,
  } = useRuntimeFeedbackMesh();
  const [tab, setTab] = useState("overview");

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Runtime Feedback Mesh</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Live runtime signals, deploy outcomes, incidents, and health.
          </p>
        </div>

        {/* Health summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Health</CardTitle></CardHeader>
            <CardContent>
              {loadingHealth ? (
                <div className="text-muted-foreground">…</div>
              ) : (
                <div className={`text-2xl font-bold ${HEALTH_COLORS[health?.health_classification] || "text-foreground"}`}>
                  {health?.health_classification || "unknown"}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Stability</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{health?.stability_score ?? "—"}<span className="text-sm text-muted-foreground">/100</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Events (24h)</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-foreground">{events.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Incidents</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{incidents.filter((i: any) => i.resolution_status === "open").length}
                <span className="text-sm text-muted-foreground ml-1">open</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {health?.risk_signals && health.risk_signals.length > 0 && (
          <Card className="border-destructive/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Risk Signals</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {health.risk_signals.map((s: string, i: number) => (
                  <Badge key={i} variant="outline" className="border-destructive/30 text-destructive">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview"><Heart className="h-4 w-4 mr-1" />Overview</TabsTrigger>
            <TabsTrigger value="events"><Activity className="h-4 w-4 mr-1" />Events</TabsTrigger>
            <TabsTrigger value="incidents"><AlertTriangle className="h-4 w-4 mr-1" />Incidents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                {loadingEvents ? "Loading…" : events.length === 0 ? "No runtime events recorded yet. Events will appear here as deployments generate runtime feedback." : `${events.length} runtime events tracked. Use the Events and Incidents tabs for details.`}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card>
              <CardContent className="p-0">
                {loadingEvents ? (
                  <div className="p-8 text-center text-muted-foreground">Loading…</div>
                ) : events.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No runtime events yet.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Surface</TableHead>
                        <TableHead>Classification</TableHead>
                        <TableHead>Occurred</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((e: any) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium text-foreground">{e.event_type}</TableCell>
                          <TableCell><Badge className={SEVERITY_COLORS[e.severity] || ""}>{e.severity}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{e.event_source}</TableCell>
                          <TableCell className="text-sm">{e.affected_surface || "—"}</TableCell>
                          <TableCell><Badge variant="outline">{e.outcome_classification}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(e.occurred_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="incidents">
            <Card>
              <CardContent className="p-0">
                {loadingIncidents ? (
                  <div className="p-8 text-center text-muted-foreground">Loading…</div>
                ) : incidents.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No incidents recorded.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Component</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incidents.map((i: any) => (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium text-foreground">{i.incident_type}</TableCell>
                          <TableCell><Badge className={SEVERITY_COLORS[i.severity] || ""}>{i.severity}</Badge></TableCell>
                          <TableCell className="text-sm">{i.affected_component || "—"}</TableCell>
                          <TableCell><Badge variant="outline">{i.resolution_status}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(i.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
