import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useCompoundingAdvantage } from "@/hooks/useCompoundingAdvantage";
import { useColdStart } from "@/hooks/useColdStart";
import { ColdStartBanner } from "@/components/observability/ColdStartBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, TrendingUp, AlertTriangle, Package } from "lucide-react";

const moatColors: Record<string, string> = {
  confirmed: "bg-primary/20 text-primary",
  emerging: "bg-accent/20 text-accent-foreground",
  candidate: "bg-muted text-muted-foreground",
  weak: "bg-destructive/20 text-destructive",
};

export default function CompoundingAdvantageDashboard() {
  const { moats, scores, packs, weakZones, loadingMoats } = useCompoundingAdvantage();
  const { data: coldStart } = useColdStart();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Compounding Advantage</h1>
            <p className="text-muted-foreground text-sm">Identify and operationalize durable capability moats from accumulated learning.</p>
          </div>

          {coldStart?.is_cold_start && (
            <ColdStartBanner label={coldStart.label} summary={coldStart.summary} signals={coldStart.signals} />
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Moat Domains</CardTitle>
                <Trophy className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{moats.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Scores</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{scores.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Doctrine Packs</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{packs.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Weak Zones</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{weakZones.length}</div></CardContent>
            </Card>
          </div>

          <Tabs defaultValue="moats">
            <TabsList>
              <TabsTrigger value="moats">Moat Domains</TabsTrigger>
              <TabsTrigger value="scores">Scores</TabsTrigger>
              <TabsTrigger value="packs">Doctrine Packs</TabsTrigger>
              <TabsTrigger value="weak">Weak Zones</TabsTrigger>
            </TabsList>

            <TabsContent value="moats">
              <Card>
                <CardContent className="pt-6">
                  {loadingMoats ? (
                    <p className="text-muted-foreground text-sm">Loading…</p>
                  ) : moats.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No moat domains detected yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Domain</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Compounding</TableHead>
                          <TableHead>Uniqueness</TableHead>
                          <TableHead>Reuse</TableHead>
                          <TableHead>Resilience</TableHead>
                          <TableHead>Productization</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {moats.map((m: any) => (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">{m.domain_name}</TableCell>
                            <TableCell><Badge className={moatColors[m.moat_status] || ""}>{m.moat_status}</Badge></TableCell>
                            <TableCell>{(Number(m.compounding_score) * 100).toFixed(0)}%</TableCell>
                            <TableCell>{(Number(m.uniqueness_score) * 100).toFixed(0)}%</TableCell>
                            <TableCell>{(Number(m.reuse_density_score) * 100).toFixed(0)}%</TableCell>
                            <TableCell>{(Number(m.failure_resilience_score) * 100).toFixed(0)}%</TableCell>
                            <TableCell className="max-w-xs truncate text-xs">{m.recommended_productization}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scores">
              <Card>
                <CardContent className="pt-6">
                  {scores.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No compounding scores computed yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Domain</TableHead>
                          <TableHead>Stack</TableHead>
                          <TableHead>Compounding</TableHead>
                          <TableHead>Uniqueness</TableHead>
                          <TableHead>Reuse</TableHead>
                          <TableHead>Doctrine</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scores.map((s: any) => (
                          <TableRow key={s.id}>
                            <TableCell>{s.domain_scope}</TableCell>
                            <TableCell>{s.stack_scope}</TableCell>
                            <TableCell>{(Number(s.compounding_score) * 100).toFixed(0)}%</TableCell>
                            <TableCell>{(Number(s.uniqueness_score) * 100).toFixed(0)}%</TableCell>
                            <TableCell>{(Number(s.reuse_density_score) * 100).toFixed(0)}%</TableCell>
                            <TableCell>{(Number(s.doctrine_stability_score) * 100).toFixed(0)}%</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(s.computed_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="packs">
              <Card>
                <CardContent className="pt-6">
                  {packs.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No doctrine packs created yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pack</TableHead>
                          <TableHead>Domain</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {packs.map((p: any) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.pack_name}</TableCell>
                            <TableCell>{p.domain_scope}</TableCell>
                            <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="weak">
              <Card>
                <CardContent className="pt-6">
                  {weakZones.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No weak compounding zones detected.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Zone</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {weakZones.map((w: any) => (
                          <TableRow key={w.id}>
                            <TableCell className="font-medium">{w.zone_name}</TableCell>
                            <TableCell>{w.weakness_type}</TableCell>
                            <TableCell><Badge variant={w.severity === "high" ? "destructive" : "outline"}>{w.severity}</Badge></TableCell>
                            <TableCell className="max-w-xs truncate text-xs">{w.recommended_action}</TableCell>
                            <TableCell><Badge variant="outline">{w.status}</Badge></TableCell>
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
