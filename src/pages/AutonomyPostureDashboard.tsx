import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useOutcomeAutonomy } from "@/hooks/useOutcomeAutonomy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, TrendingDown, AlertTriangle, Activity } from "lucide-react";

const levelColors: Record<number, string> = {
  0: "bg-muted text-muted-foreground",
  1: "bg-primary/20 text-primary",
  2: "bg-accent/20 text-accent-foreground",
  3: "bg-secondary/50 text-secondary-foreground",
  4: "bg-primary/40 text-primary",
  5: "bg-destructive/20 text-destructive",
};

const levelNames: Record<number, string> = {
  0: "Manual Only",
  1: "Assisted",
  2: "Supervised",
  3: "Bounded Auto",
  4: "Trusted Auto",
  5: "Full Bounded",
};

export default function AutonomyPostureDashboard() {
  const { domains, adjustments, breaches, regressions, loadingDomains } = useOutcomeAutonomy();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Autonomy Posture</h1>
            <p className="text-muted-foreground text-sm">Evidence-based autonomy levels with bounded reversibility.</p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Domains</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{domains.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Adjustments</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{adjustments.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Breaches</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{breaches.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Regressions</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{regressions.length}</div></CardContent>
            </Card>
          </div>

          <Tabs defaultValue="domains">
            <TabsList>
              <TabsTrigger value="domains">Domains</TabsTrigger>
              <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
              <TabsTrigger value="breaches">Breaches</TabsTrigger>
              <TabsTrigger value="regressions">Regressions</TabsTrigger>
            </TabsList>

            <TabsContent value="domains">
              <Card>
                <CardContent className="pt-6">
                  {loadingDomains ? (
                    <p className="text-muted-foreground text-sm">Loading…</p>
                  ) : domains.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No autonomy domains configured yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Domain</TableHead>
                          <TableHead>Level</TableHead>
                          <TableHead>Evidence</TableHead>
                          <TableHead>Validation</TableHead>
                          <TableHead>Rollback Dep.</TableHead>
                          <TableHead>Incident Pen.</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {domains.map((d: any) => (
                          <TableRow key={d.id}>
                            <TableCell className="font-medium">{d.domain_name}</TableCell>
                            <TableCell>
                              <Badge className={levelColors[d.current_autonomy_level] || ""}>
                                L{d.current_autonomy_level} — {levelNames[d.current_autonomy_level] || "Unknown"}
                              </Badge>
                            </TableCell>
                            <TableCell>{(Number(d.evidence_score) * 100).toFixed(0)}%</TableCell>
                            <TableCell>{(Number(d.validation_success_rate) * 100).toFixed(0)}%</TableCell>
                            <TableCell>{(Number(d.rollback_dependence_score) * 100).toFixed(0)}%</TableCell>
                            <TableCell>{(Number(d.incident_penalty_score) * 100).toFixed(0)}%</TableCell>
                            <TableCell><Badge variant="outline">{d.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="adjustments">
              <Card>
                <CardContent className="pt-6">
                  {adjustments.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No adjustment events yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>From</TableHead>
                          <TableHead>To</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>By</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adjustments.map((a: any) => (
                          <TableRow key={a.id}>
                            <TableCell>
                              <Badge variant={a.adjustment_type === "upgrade" ? "default" : "destructive"}>
                                {a.adjustment_type}
                              </Badge>
                            </TableCell>
                            <TableCell>L{a.previous_level}</TableCell>
                            <TableCell>L{a.new_level}</TableCell>
                            <TableCell className="max-w-xs truncate">{a.adjustment_reason}</TableCell>
                            <TableCell>{a.adjusted_by}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="breaches">
              <Card>
                <CardContent className="pt-6">
                  {breaches.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No guardrail breaches recorded.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Blocked</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {breaches.map((b: any) => (
                          <TableRow key={b.id}>
                            <TableCell>{b.breach_type}</TableCell>
                            <TableCell>
                              <Badge variant={b.severity === "critical" ? "destructive" : "outline"}>
                                {b.severity}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{b.action_attempted}</TableCell>
                            <TableCell>{b.blocked ? "Yes" : "No"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="regressions">
              <Card>
                <CardContent className="pt-6">
                  {regressions.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No regression cases detected.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Trigger</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {regressions.map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell>{r.regression_type}</TableCell>
                            <TableCell>
                              <Badge variant={r.severity === "critical" ? "destructive" : "outline"}>
                                {r.severity}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{r.trigger_event}</TableCell>
                            <TableCell><Badge variant="outline">{r.resolution_status}</Badge></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </SidebarProvider>
  );
}
