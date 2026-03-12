import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitBranch, Link2, ShieldAlert, BarChart3, RefreshCw, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useKnowledgeLineage } from "@/hooks/useKnowledgeLineage";

const eventTypeIcons: Record<string, string> = {
  created: "🟢",
  promoted: "⬆️",
  merged: "🔀",
  confidence_recalibrated: "📊",
  reinforced: "💪",
  deprecated: "🔻",
  retrieved: "🔍",
};

const severityStyles: Record<string, string> = {
  warning: "border-amber-500/30 bg-amber-500/5 text-amber-300",
  info: "border-blue-500/30 bg-blue-500/5 text-blue-300",
  critical: "border-red-500/30 bg-red-500/5 text-red-300",
};

export function KnowledgeLineageTab() {
  const {
    lineageEvents, provenanceLinks, confidenceBreakdowns,
    buildLineage, computeBreakdowns, checkIntegrity, loading,
  } = useKnowledgeLineage();

  const [integrityAlerts, setIntegrityAlerts] = useState<any[]>([]);

  const events = lineageEvents.data || [];
  const links = provenanceLinks.data || [];
  const breakdowns = confidenceBreakdowns.data || [];

  const handleCheckIntegrity = async () => {
    const result = await checkIntegrity.mutateAsync();
    setIntegrityAlerts(result?.alerts || []);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Source Provenance & Knowledge Lineage</h3>
          <p className="text-sm text-muted-foreground">Track the origin, evolution, and confidence of every knowledge object</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => buildLineage.mutate()} disabled={buildLineage.isPending}>
            <GitBranch className="w-4 h-4 mr-1" />
            {buildLineage.isPending ? "Building..." : "Build Lineage"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => computeBreakdowns.mutate()} disabled={computeBreakdowns.isPending}>
            <BarChart3 className="w-4 h-4 mr-1" />
            {computeBreakdowns.isPending ? "Computing..." : "Compute Breakdowns"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleCheckIntegrity} disabled={checkIntegrity.isPending}>
            <ShieldAlert className="w-4 h-4 mr-1" />
            {checkIntegrity.isPending ? "Checking..." : "Check Integrity"}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Lineage Events</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{events.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Provenance Links</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{links.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Confidence Breakdowns</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{breakdowns.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Integrity Alerts</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-400">{integrityAlerts.length}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList>
          <TabsTrigger value="timeline">Lineage Timeline</TabsTrigger>
          <TabsTrigger value="provenance">Provenance Links</TabsTrigger>
          <TabsTrigger value="confidence">Confidence Explained</TabsTrigger>
          <TabsTrigger value="integrity">Integrity Alerts</TabsTrigger>
        </TabsList>

        {/* Timeline */}
        <TabsContent value="timeline">
          <Card>
            <CardContent className="pt-4">
              {loading ? (
                <p className="text-sm text-muted-foreground p-4">Loading...</p>
              ) : events.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">No lineage events yet. Click "Build Lineage" to begin.</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {events.map((e: any) => (
                    <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/30 bg-card/40">
                      <span className="text-lg mt-0.5">{eventTypeIcons[e.event_type] || "📌"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{e.event_type}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{e.knowledge_object_type}</Badge>
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {new Date(e.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mt-1">{e.summary}</p>
                        {e.actor && <p className="text-[10px] text-muted-foreground mt-0.5">by {e.actor}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Provenance Links */}
        <TabsContent value="provenance">
          <Card>
            <CardContent className="pt-4">
              {links.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">No provenance links yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Link Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Confidence Contrib.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {links.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            <Link2 className="w-3 h-3 mr-1" />{l.link_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="text-muted-foreground">{l.source_object_type}:</span>{" "}
                          <span className="font-mono">{l.source_object_id?.substring(0, 8)}...</span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="text-muted-foreground">{l.target_object_type}:</span>{" "}
                          <span className="font-mono">{l.target_object_id?.substring(0, 8)}...</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{Number(l.weight).toFixed(3)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-primary">+{Number(l.confidence_contribution).toFixed(3)}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Confidence Explained */}
        <TabsContent value="confidence">
          <Card>
            <CardContent className="pt-4">
              {breakdowns.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">No breakdowns yet. Click "Compute Breakdowns".</p>
              ) : (
                <div className="space-y-4">
                  {breakdowns.map((b: any) => (
                    <div key={b.id} className="p-4 rounded-lg border border-border/30 bg-card/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-muted-foreground">
                          {b.knowledge_object_type}: {b.knowledge_object_id?.substring(0, 12)}...
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Final:</span>
                          <span className="text-lg font-bold font-mono">{Number(b.final_confidence).toFixed(3)}</span>
                        </div>
                      </div>

                      {/* Factor bars */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <FactorBar label="Base Confidence" value={Number(b.base_confidence)} />
                        <FactorBar label="Repo Trust" value={Number(b.repo_trust_contribution)} positive />
                        <FactorBar label="Recurrence" value={Number(b.recurrence_contribution)} positive />
                        <FactorBar label="Execution Reinforcement" value={Number(b.execution_reinforcement)} positive />
                        <FactorBar label="Merge Support" value={Number(b.merge_support)} positive />
                        <FactorBar label="Penalties" value={Number(b.negative_signal_penalty)} negative />
                      </div>

                      {/* Explanation */}
                      <p className="text-xs text-muted-foreground leading-relaxed">{b.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrity Alerts */}
        <TabsContent value="integrity">
          <Card>
            <CardContent className="pt-4">
              {integrityAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">
                  No integrity alerts. Click "Check Integrity" to scan.
                </p>
              ) : (
                <div className="space-y-2">
                  {integrityAlerts.map((a: any, i: number) => (
                    <div key={i} className={`p-3 rounded-lg border ${severityStyles[a.severity] || severityStyles.info}`}>
                      <div className="flex items-center gap-2">
                        {a.severity === "warning" ? <AlertTriangle className="w-4 h-4" /> :
                         a.severity === "critical" ? <ShieldAlert className="w-4 h-4" /> :
                         <Info className="w-4 h-4" />}
                        <Badge variant="outline" className="text-[10px]">{a.type}</Badge>
                        <span className="text-sm font-medium">{a.title || "Unknown"}</span>
                      </div>
                      <p className="text-xs mt-1 opacity-80">{a.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FactorBar({ label, value, positive, negative }: { label: string; value: number; positive?: boolean; negative?: boolean }) {
  const color = negative ? "text-red-400" : positive ? "text-emerald-400" : "text-foreground";
  const prefix = negative ? "-" : positive ? "+" : "";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-mono ${color}`}>{prefix}{value.toFixed(3)}</span>
      </div>
      <Progress value={Math.min(value * 100, 100)} className="h-1" />
    </div>
  );
}
