import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageGuidanceShell } from "@/components/guidance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOneClickDelivery } from "@/hooks/useOneClickDelivery";
import {
  Rocket, CheckCircle2, AlertTriangle, ExternalLink, GitBranch, Shield,
  ArrowRight, RotateCcw, Eye, Gauge, Loader2, XCircle, Clock,
} from "lucide-react";

const stateIcons: Record<string, any> = {
  deployed: CheckCircle2,
  ready: Rocket,
  blocked: AlertTriangle,
  failed: XCircle,
  deploying: Loader2,
  not_started: Clock,
};

const stateColors: Record<string, string> = {
  deployed: "text-green-400",
  ready: "text-primary",
  blocked: "text-destructive",
  failed: "text-destructive",
  deploying: "text-accent-foreground",
  not_started: "text-muted-foreground",
};

export default function Delivery() {
  const { overview } = useOneClickDelivery();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { assessReadiness, explain } = useOneClickDelivery();
  const [detail, setDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const { guidance, whyNowText } = usePageGuidance("deployments");

  const items = overview.data ?? [];
  const readyCount = items.filter((i: any) => i.is_ready).length;
  const blockedCount = items.filter((i: any) => i.blocker_count > 0).length;
  const deployedCount = items.filter((i: any) => !!i.deploy_url).length;

  const loadDetail = async (id: string) => {
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      const data = await explain(id);
      setDetail(data);
    } catch { setDetail(null); }
    setLoadingDetail(false);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {guidance && <PageIntroCard guidance={guidance} whyNow={whyNowText} compact />}
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" /> One-Click Delivery
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Governed, confidence-aware delivery from validated code to deployed software.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard label="Total Initiatives" value={items.length} icon={Eye} />
          <SummaryCard label="Ready to Deploy" value={readyCount} icon={CheckCircle2} color="text-green-400" />
          <SummaryCard label="Blocked" value={blockedCount} icon={AlertTriangle} color="text-destructive" />
          <SummaryCard label="Deployed" value={deployedCount} icon={Rocket} color="text-primary" />
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview" className="text-xs gap-1"><Eye className="h-3 w-3" /> Overview</TabsTrigger>
            <TabsTrigger value="detail" className="text-xs gap-1"><Gauge className="h-3 w-3" /> Detail</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item: any) => {
                const Icon = stateIcons[item.is_ready ? "ready" : item.blocker_count > 0 ? "blocked" : item.deploy_url ? "deployed" : "not_started"] ?? Clock;
                const color = item.deploy_url ? stateColors.deployed : item.is_ready ? stateColors.ready : item.blocker_count > 0 ? stateColors.blocked : stateColors.not_started;

                return (
                  <Card key={item.initiative_id} className="border-border/50 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => loadDetail(item.initiative_id)}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span className="truncate">{item.title || item.initiative_id}</span>
                        <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Readiness</span>
                        <span className="font-mono">{Math.round(item.readiness_score * 100)}%</span>
                      </div>
                      <Progress value={item.readiness_score * 100} className="h-1.5" />
                      <div className="flex items-center gap-2">
                        {item.blocker_count > 0 && (
                          <Badge variant="destructive" className="text-[10px]">{item.blocker_count} blocker(s)</Badge>
                        )}
                        {item.deploy_url && (
                          <Badge className="text-[10px] bg-primary/20 text-primary">Deployed</Badge>
                        )}
                        {item.is_ready && !item.deploy_url && (
                          <Badge className="text-[10px] bg-green-500/20 text-green-400">Ready</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {items.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
                  No initiatives found. Create an initiative to get started.
                </div>
              )}
            </div>
          </TabsContent>

          {/* Detail Tab */}
          <TabsContent value="detail" className="mt-4">
            {!selectedId && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Select an initiative from the Overview tab to see delivery details.
              </div>
            )}
            {loadingDetail && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            {detail && !loadingDetail && (
              <div className="space-y-4">
                {/* Readiness & Assurance */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Shield className="h-4 w-4" /> Deploy Readiness
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <MetricBar label="Readiness" value={detail.readiness?.deploy_readiness_score} />
                      <MetricBar label="Validation Gate" value={detail.readiness?.validation_gate_score} />
                      <MetricBar label="Blockers" value={detail.readiness?.blocker_score} invert />
                      <p className="text-xs text-muted-foreground mt-2">{detail.readiness?.readiness_rationale}</p>
                      {detail.readiness?.blockers?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {detail.readiness.blockers.map((b: any, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <AlertTriangle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                              <div>
                                <span className="font-medium">{b.description}</span>
                                <span className="text-muted-foreground block">{b.remediation_hint}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Gauge className="h-4 w-4" /> Deploy Assurance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <MetricBar label="Confidence" value={detail.assurance?.deploy_confidence_score} />
                      <MetricBar label="Assurance Quality" value={detail.assurance?.delivery_assurance_quality_score} />
                      <MetricBar label="Success Clarity" value={detail.assurance?.deploy_success_clarity_score} />
                      <MetricBar label="Friction" value={detail.assurance?.one_click_friction_score} invert />
                      <MetricBar label="Final Mile" value={detail.assurance?.final_mile_coherence_score} />
                      <p className="text-xs text-muted-foreground mt-2">{detail.assurance?.confidence_rationale}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Outputs & Recovery */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" /> Delivery Outputs
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <OutputRow label="Deploy URL" value={detail.outputs?.deploy_url} />
                      <OutputRow label="Preview URL" value={detail.outputs?.preview_url} />
                      <OutputRow label="Repo URL" value={detail.outputs?.repo_url} />
                      <div className="flex items-center justify-between text-xs mt-2">
                        <span className="text-muted-foreground">Handoff</span>
                        <Badge variant="outline" className="text-[10px]">{detail.handoff?.handoff_label}</Badge>
                      </div>
                      <MetricBar label="Accessibility" value={detail.outputs?.output_accessibility_score} />
                      <MetricBar label="Visibility" value={detail.outputs?.delivery_visibility_score} />
                    </CardContent>
                  </Card>

                  <Card className="border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <RotateCcw className="h-4 w-4" /> Recovery & Rollback
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Recovery State</span>
                        <Badge variant="outline" className="text-[10px]">{detail.recovery?.recovery_state}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Rollback Available</span>
                        <span>{detail.recovery?.rollback_available ? "✅ Yes" : "❌ No"}</span>
                      </div>
                      <MetricBar label="Recovery Readiness" value={detail.recovery?.recovery_readiness_score} />
                      <p className="text-xs text-muted-foreground mt-2">{detail.recovery?.recovery_rationale}</p>
                      <p className="text-xs font-medium mt-1">{detail.recovery?.recovery_action_label}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Friction */}
                {detail.friction?.signals?.length > 0 && (
                  <Card className="border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> Delivery Friction
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {detail.friction.signals.map((s: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <AlertTriangle className={`h-3 w-3 shrink-0 mt-0.5 ${s.severity === "high" ? "text-destructive" : "text-yellow-400"}`} />
                            <div>
                              <span className="font-medium">{s.description}</span>
                              <span className="text-muted-foreground block">{s.remediation_hint}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Summary */}
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{detail.summary}</p>
                        <p className="text-xs text-muted-foreground mt-1">Next: {detail.next_action}</p>
                      </div>
                      <Button size="sm" disabled={!detail.readiness?.is_ready} className="gap-1">
                        <Rocket className="h-3.5 w-3.5" /> Deploy <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color?: string }) {
  return (
    <Card className="border-border/50">
      <CardContent className="py-4 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${color ?? "text-muted-foreground"}`} />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricBar({ label, value, invert = false }: { label: string; value?: number; invert?: boolean }) {
  const pct = Math.round((value ?? 0) * 100);
  const color = invert
    ? pct > 30 ? "text-destructive" : pct > 10 ? "text-yellow-400" : "text-green-400"
    : pct > 70 ? "text-green-400" : pct > 40 ? "text-yellow-400" : "text-destructive";
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono font-medium ${color}`}>{pct}%</span>
    </div>
  );
}

function OutputRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      {value ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 truncate max-w-48">
          <ExternalLink className="h-3 w-3 shrink-0" />
          <span className="truncate">{value}</span>
        </a>
      ) : (
        <span className="text-muted-foreground italic">—</span>
      )}
    </div>
  );
}
