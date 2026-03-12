import { AppShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, BarChart3, AlertTriangle, Send, Sparkles, Layers } from "lucide-react";
import { useKnowledgeAcquisitionRoi } from "@/hooks/useKnowledgeAcquisitionRoi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

export default function KnowledgeAcquisitionRoiDashboard() {
  const roi = useKnowledgeAcquisitionRoi();
  const ov = roi.overview as any;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2.5 font-['Space_Grotesk']">
              <TrendingUp className="h-6 w-6 text-primary" />
              Knowledge Acquisition ROI
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Measure return on learning investment and optimize acquisition strategy</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => roi.feedbackToPlanner.mutate()} disabled={roi.feedbackToPlanner.isPending}>
              <Send className="h-3.5 w-3.5 mr-1.5" />Feed Planner
            </Button>
            <Button size="sm" onClick={() => roi.computeRoi.mutate()} disabled={roi.computeRoi.isPending}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />{roi.computeRoi.isPending ? "Computing…" : "Compute ROI"}
            </Button>
          </div>
        </div>

        {/* Overview metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Snapshots", value: ov.total || 0 },
            { label: "Avg ROI", value: `${((ov.avg_roi || 0) * 100).toFixed(0)}%` },
            { label: "Avg Efficiency", value: `${((ov.avg_cost_efficiency || 0) * 100).toFixed(0)}%` },
            { label: "Avg Noise", value: `${((ov.avg_noise_ratio || 0) * 100).toFixed(0)}%` },
            { label: "Canon Promoted", value: ov.total_canon_promoted || 0 },
            { label: "Low Value", value: ov.low_value_count || 0 },
          ].map((m) => (
            <Card key={m.label} className="bg-card/50 border-border/30">
              <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">{m.label}</CardTitle></CardHeader>
              <CardContent className="px-3 pb-3"><span className="text-xl font-bold">{m.value}</span></CardContent>
            </Card>
          ))}
        </div>

        {/* Extended metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Total Cost</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-lg font-bold">{ov.total_cost || 0}</span></CardContent>
          </Card>
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Total Candidates</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-lg font-bold">{ov.total_candidates || 0}</span></CardContent>
          </Card>
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Promotion Yield</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-lg font-bold">{((ov.avg_promotion_yield || 0) * 100).toFixed(0)}%</span></CardContent>
          </Card>
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Runtime Usage</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-lg font-bold">{ov.total_runtime_usage || 0}</span></CardContent>
          </Card>
        </div>

        {/* Top ROI bar */}
        {(ov.top_roi || []).length > 0 && (
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Top ROI Acquisitions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(ov.top_roi || []).map((t: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-24 truncate">{t.source_ref}</span>
                  <Progress value={t.roi_score * 100} className="h-2 flex-1" />
                  <span className="text-xs font-bold w-12 text-right">{(t.roi_score * 100).toFixed(0)}%</span>
                  <Badge variant="outline" className="text-[10px]">{t.mode}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="snapshots" className="space-y-4">
          <TabsList className="bg-muted/20 border border-border/20 flex-wrap h-auto gap-0.5 p-1">
            <TabsTrigger value="snapshots" className="text-xs gap-1.5"><BarChart3 className="h-3.5 w-3.5" />All Snapshots</TabsTrigger>
            <TabsTrigger value="sources" className="text-xs gap-1.5"><Layers className="h-3.5 w-3.5" />By Source</TabsTrigger>
            <TabsTrigger value="modes" className="text-xs gap-1.5"><TrendingUp className="h-3.5 w-3.5" />By Mode</TabsTrigger>
            <TabsTrigger value="low-value" className="text-xs gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />Low Value</TabsTrigger>
          </TabsList>

          <TabsContent value="snapshots">
            <Card className="bg-card/50 border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">ROI Snapshots</CardTitle></CardHeader>
              <CardContent>
                {roi.snapshots.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No ROI data. Click Compute ROI to analyze completed acquisitions.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Source</TableHead>
                      <TableHead className="text-xs">Mode</TableHead>
                      <TableHead className="text-xs text-right">ROI</TableHead>
                      <TableHead className="text-xs text-right">Cost</TableHead>
                      <TableHead className="text-xs text-right">Canon</TableHead>
                      <TableHead className="text-xs text-right">Yield</TableHead>
                      <TableHead className="text-xs text-right">Noise</TableHead>
                      <TableHead className="text-xs text-right">Downstream</TableHead>
                      <TableHead className="text-xs">Flag</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {roi.snapshots.slice(0, 25).map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs font-medium max-w-[120px] truncate">{s.source_ref}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{s.acquisition_mode}</Badge></TableCell>
                          <TableCell className="text-xs text-right font-bold">{(s.roi_score * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{s.total_cost}</TableCell>
                          <TableCell className="text-xs text-right">{s.canon_promoted}</TableCell>
                          <TableCell className="text-xs text-right">{(s.promotion_yield * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{(s.noise_ratio * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{(s.downstream_value_score * 100).toFixed(0)}%</TableCell>
                          <TableCell>{s.low_value_flag && <Badge variant="destructive" className="text-[10px]">Low</Badge>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sources">
            <Card className="bg-card/50 border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Source ROI Comparison</CardTitle></CardHeader>
              <CardContent>
                {roi.sources.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No source analysis data.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Source</TableHead>
                      <TableHead className="text-xs text-right">Count</TableHead>
                      <TableHead className="text-xs text-right">Avg ROI</TableHead>
                      <TableHead className="text-xs text-right">Avg Cost</TableHead>
                      <TableHead className="text-xs text-right">Canon</TableHead>
                      <TableHead className="text-xs text-right">Noise</TableHead>
                      <TableHead className="text-xs">Class</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {roi.sources.map((s: any) => (
                        <TableRow key={s.source}>
                          <TableCell className="text-xs font-medium max-w-[140px] truncate">{s.source}</TableCell>
                          <TableCell className="text-xs text-right">{s.count}</TableCell>
                          <TableCell className="text-xs text-right font-bold">{(s.avg_roi * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{s.avg_cost}</TableCell>
                          <TableCell className="text-xs text-right">{s.total_canon}</TableCell>
                          <TableCell className="text-xs text-right">{(s.avg_noise * 100).toFixed(0)}%</TableCell>
                          <TableCell>
                            <Badge variant={s.classification === "high_roi" ? "default" : s.classification === "low_roi" ? "destructive" : "secondary"} className="text-[10px]">
                              {s.classification}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modes">
            <Card className="bg-card/50 border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Mode ROI Comparison</CardTitle></CardHeader>
              <CardContent>
                {roi.modes.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No mode analysis data.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Mode</TableHead>
                      <TableHead className="text-xs text-right">Count</TableHead>
                      <TableHead className="text-xs text-right">Avg ROI</TableHead>
                      <TableHead className="text-xs text-right">Efficiency</TableHead>
                      <TableHead className="text-xs text-right">Yield</TableHead>
                      <TableHead className="text-xs text-right">Downstream</TableHead>
                      <TableHead className="text-xs text-right">Noise</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {roi.modes.map((m: any) => (
                        <TableRow key={m.mode}>
                          <TableCell className="text-xs font-medium">{m.mode}</TableCell>
                          <TableCell className="text-xs text-right">{m.count}</TableCell>
                          <TableCell className="text-xs text-right font-bold">{(m.avg_roi * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{(m.avg_cost_efficiency * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{(m.avg_promotion_yield * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{(m.avg_downstream_value * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{(m.avg_noise * 100).toFixed(0)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="low-value">
            <Card className="bg-card/50 border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />Low-Value Acquisitions</CardTitle></CardHeader>
              <CardContent>
                {roi.lowValue.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No low-value acquisitions detected.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Source</TableHead>
                      <TableHead className="text-xs text-right">ROI</TableHead>
                      <TableHead className="text-xs text-right">Cost</TableHead>
                      <TableHead className="text-xs text-right">Noise</TableHead>
                      <TableHead className="text-xs">Reasons</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {roi.lowValue.map((lv: any) => (
                        <TableRow key={lv.id}>
                          <TableCell className="text-xs font-medium max-w-[140px] truncate">{lv.source_ref}</TableCell>
                          <TableCell className="text-xs text-right">{(lv.roi_score * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{lv.total_cost}</TableCell>
                          <TableCell className="text-xs text-right">{(lv.noise_ratio * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs max-w-[200px]">
                            {(lv.low_value_reasons || []).map((r: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[10px] mr-1 mb-0.5">{r}</Badge>
                            ))}
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
      </div>
    </AppShell>
  );
}
