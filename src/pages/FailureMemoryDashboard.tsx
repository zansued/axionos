import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrg } from "@/contexts/OrgContext";
import {
  useFailureMemoryEntries, useRepairAttemptRecords, useFalseFixRecords,
  useMitigationPatterns, useExplainFailure, useDetectFalseFixes,
} from "@/hooks/useFailureMemoryArchive";
import { AlertTriangle, CheckCircle, XCircle, Shield, Bug, Wrench, TrendingUp, Info } from "lucide-react";

function riskBadge(score: number) {
  if (score >= 0.8) return <Badge variant="destructive" className="text-xs">Critical</Badge>;
  if (score >= 0.5) return <Badge className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/30">High</Badge>;
  if (score >= 0.3) return <Badge variant="secondary" className="text-xs">Medium</Badge>;
  return <Badge variant="outline" className="text-xs">Low</Badge>;
}

export default function FailureMemoryDashboard() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

  const { data: entries, isLoading } = useFailureMemoryEntries(orgId);
  const { data: attempts } = useRepairAttemptRecords(orgId, selectedEntry || undefined);
  const { data: falseFixes } = useFalseFixRecords(orgId);
  const { data: mitigations } = useMitigationPatterns(orgId);
  const explainMutation = useExplainFailure();
  const detectMutation = useDetectFalseFixes();

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bug className="h-6 w-6 text-destructive" />
              Failure Memory & Repair Intelligence
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Governed archive of failure patterns, repair outcomes, and mitigation intelligence.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">Sprint 117</Badge>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Bug className="h-4 w-4 text-destructive" />
                <span className="text-sm text-muted-foreground">Failure Entries</span>
              </div>
              <p className="text-2xl font-bold mt-1">{entries?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Mitigations</span>
              </div>
              <p className="text-2xl font-bold mt-1">{mitigations?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-400" />
                <span className="text-sm text-muted-foreground">False Fixes</span>
              </div>
              <p className="text-2xl font-bold mt-1">{falseFixes?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">High Recurrence</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {entries?.filter((e: any) => e.recurrence_score >= 0.5).length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="failures" className="space-y-4">
          <TabsList>
            <TabsTrigger value="failures">Failure Archive</TabsTrigger>
            <TabsTrigger value="repairs">Repair History</TabsTrigger>
            <TabsTrigger value="false-fixes">False Fixes</TabsTrigger>
            <TabsTrigger value="mitigations">Mitigations</TabsTrigger>
          </TabsList>

          <TabsContent value="failures" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Failure Memory Entries</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : !entries?.length ? (
                  <p className="text-sm text-muted-foreground">No failure entries archived yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Signature</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Recurrence</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((e: any) => (
                        <TableRow key={e.id} className={selectedEntry === e.id ? "bg-muted/50" : ""}>
                          <TableCell className="font-mono text-xs max-w-[200px] truncate">{e.signature || e.symptom_summary}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{e.failure_type}</Badge></TableCell>
                          <TableCell>{riskBadge(e.recurrence_score)}</TableCell>
                          <TableCell>
                            <Badge variant={e.confidence_score >= 0.6 ? "default" : "secondary"} className="text-xs">
                              {(e.confidence_score * 100).toFixed(0)}%
                            </Badge>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{e.lifecycle_status}</Badge></TableCell>
                          <TableCell className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setSelectedEntry(e.id)}>
                              <Info className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => explainMutation.mutate({ failure_memory_id: e.id })}>
                              Explain
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {explainMutation.data && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-2">
                    <p className="text-sm font-medium">{explainMutation.data.summary}</p>
                    <p className="text-xs text-muted-foreground">{explainMutation.data.rootCauseStatus}</p>
                    <p className="text-xs text-muted-foreground">{explainMutation.data.repairLandscape}</p>
                    <p className="text-xs">{explainMutation.data.riskAssessment}</p>
                    {explainMutation.data.warnings?.map((w: string, i: number) => (
                      <p key={i} className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{w}</p>
                    ))}
                    {explainMutation.data.recommendations?.map((r: string, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground">→ {r}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="repairs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Repair Attempt Records</CardTitle>
                <CardDescription>{selectedEntry ? "Filtered by selected failure" : "All recent attempts"}</CardDescription>
              </CardHeader>
              <CardContent>
                {!attempts?.length ? (
                  <p className="text-sm text-muted-foreground">No repair attempts recorded.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Strategy</TableHead>
                        <TableHead>Attempt</TableHead>
                        <TableHead>Outcome</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attempts.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-sm">{a.repair_strategy}</TableCell>
                          <TableCell className="text-xs">#{a.attempt_number}</TableCell>
                          <TableCell>
                            {a.outcome === 'success' ? <CheckCircle className="h-4 w-4 text-primary" /> :
                             a.outcome === 'failure' ? <XCircle className="h-4 w-4 text-destructive" /> :
                             <Badge variant="outline" className="text-xs">{a.outcome}</Badge>}
                          </TableCell>
                          <TableCell className="text-xs">{a.duration_ms ? `${a.duration_ms}ms` : '—'}</TableCell>
                          <TableCell className="text-xs">{a.agent_type || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="false-fixes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                  False Fix Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!falseFixes?.length ? (
                  <p className="text-sm text-muted-foreground">No false fixes detected.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Danger</TableHead>
                        <TableHead>Detection</TableHead>
                        <TableHead>Recurred</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {falseFixes.map((f: any) => (
                        <TableRow key={f.id}>
                          <TableCell><Badge variant="outline" className="text-xs">{f.false_fix_type}</Badge></TableCell>
                          <TableCell className="text-xs max-w-[300px] truncate">{f.description}</TableCell>
                          <TableCell>
                            <Badge variant={f.danger_level === 'critical' || f.danger_level === 'high' ? 'destructive' : 'outline'} className="text-xs">
                              {f.danger_level}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{f.detection_method}</TableCell>
                          <TableCell>{f.recurrence_after_fix ? <AlertTriangle className="h-4 w-4 text-destructive" /> : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mitigations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Mitigation Patterns
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!mitigations?.length ? (
                  <p className="text-sm text-muted-foreground">No mitigation patterns extracted yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pattern</TableHead>
                        <TableHead>Strategy</TableHead>
                        <TableHead>Success Rate</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Samples</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mitigations.map((m: any) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-sm font-medium">{m.pattern_name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{m.strategy_type}</Badge></TableCell>
                          <TableCell>
                            <Badge variant={m.success_rate >= 0.7 ? "default" : "secondary"} className="text-xs">
                              {(m.success_rate * 100).toFixed(0)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{(m.confidence_score * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs">{m.sample_size}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{m.lifecycle_status}</Badge></TableCell>
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
