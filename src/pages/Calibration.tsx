import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Activity, Brain, FileText, History, Shield, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, RefreshCw, BarChart3, Gauge,
} from "lucide-react";

const DOMAIN_ICONS: Record<string, typeof Activity> = {
  META_AGENT_PERFORMANCE: Brain,
  PROPOSAL_USEFULNESS: FileText,
  HISTORICAL_CONTEXT_VALUE: History,
  REDUNDANCY_GUARD_EFFECTIVENESS: Shield,
  NOVELTY_BALANCE: TrendingUp,
  DECISION_FOLLOW_THROUGH: CheckCircle,
};

const DOMAIN_LABELS: Record<string, string> = {
  META_AGENT_PERFORMANCE: "Meta-Agent Performance",
  PROPOSAL_USEFULNESS: "Proposal Usefulness",
  HISTORICAL_CONTEXT_VALUE: "Historical Context Value",
  REDUNDANCY_GUARD_EFFECTIVENESS: "Redundancy Guard",
  NOVELTY_BALANCE: "Novelty Balance",
  DECISION_FOLLOW_THROUGH: "Follow-Through",
};

function strengthColor(s: number) {
  if (s >= 0.7) return "text-destructive";
  if (s >= 0.4) return "text-amber-500";
  return "text-emerald-500";
}

function strengthBadge(s: number) {
  if (s >= 0.7) return "destructive" as const;
  if (s >= 0.4) return "outline" as const;
  return "secondary" as const;
}

export default function Calibration() {
  const { currentOrg } = useOrg();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  const observability = useQuery({
    queryKey: ["calibration-observability", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return null;
      const { data, error } = await supabase.functions.invoke("advisory-calibration-engine", {
        body: { action: "get_observability", organization_id: currentOrg.id },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id,
  });

  const signals = useQuery({
    queryKey: ["calibration-signals", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase.functions.invoke("advisory-calibration-engine", {
        body: { action: "get_signals", organization_id: currentOrg.id, limit: 100 },
      });
      if (error) throw error;
      return data?.signals || [];
    },
    enabled: !!currentOrg?.id,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrg?.id) throw new Error("No org");
      const { data, error } = await supabase.functions.invoke("advisory-calibration-engine", {
        body: { action: "generate_signals", organization_id: currentOrg.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Calibration Complete", description: `Generated ${data?.persisted || 0} advisory signals.` });
      qc.invalidateQueries({ queryKey: ["calibration-observability"] });
      qc.invalidateQueries({ queryKey: ["calibration-signals"] });
    },
    onError: () => toast({ title: "Calibration Failed", description: "Could not generate signals.", variant: "destructive" }),
  });

  const obs = observability.data;
  const allSignals = (signals.data || []) as any[];

  const signalsByDomain = (domain: string) => allSignals.filter((s: any) => s.calibration_domain === domain);

  return (
    <AppLayout>
      <div className="flex-1 space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Advisory Calibration</h1>
            <p className="text-sm text-muted-foreground">
              Structured diagnostic signals for system tuning. Advisory only — no automatic changes.
            </p>
          </div>
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${generateMutation.isPending ? "animate-spin" : ""}`} />
            Run Calibration
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Signals</CardDescription>
              <CardTitle className="text-2xl">{obs?.total_signals ?? "—"}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg Signal Strength</CardDescription>
              <CardTitle className={`text-2xl ${strengthColor(obs?.avg_signal_strength || 0)}`}>
                {obs?.avg_signal_strength != null ? `${(obs.avg_signal_strength * 100).toFixed(0)}%` : "—"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg Confidence</CardDescription>
              <CardTitle className="text-2xl">
                {obs?.avg_confidence != null ? `${(obs.avg_confidence * 100).toFixed(0)}%` : "—"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Domains Active</CardDescription>
              <CardTitle className="text-2xl">{obs?.by_domain ? Object.keys(obs.by_domain).length : "—"}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="agents">Meta-Agent Performance</TabsTrigger>
            <TabsTrigger value="usefulness">Proposal Usefulness</TabsTrigger>
            <TabsTrigger value="context">Historical Context</TabsTrigger>
            <TabsTrigger value="redundancy">Redundancy / Novelty</TabsTrigger>
            <TabsTrigger value="all">All Signals</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            {obs?.by_domain && Object.entries(obs.by_domain as Record<string, any>).map(([domain, info]) => {
              const Icon = DOMAIN_ICONS[domain] || Activity;
              return (
                <Card key={domain}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm">{DOMAIN_LABELS[domain] || domain}</CardTitle>
                      <Badge variant="outline" className="ml-auto">{info.count} signals</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Avg strength: <strong className={strengthColor(info.avg_strength)}>{(info.avg_strength * 100).toFixed(0)}%</strong></span>
                    </div>
                    {info.signals?.map((s: any, i: number) => (
                      <div key={i} className="mt-2 text-xs border-l-2 border-muted pl-3 py-1">
                        <span className="font-medium">{s.title}</span>
                        <span className="ml-2 text-muted-foreground">({(Number(s.signal_strength) * 100).toFixed(0)}% strength)</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
            {!obs?.by_domain || Object.keys(obs.by_domain).length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No calibration signals yet. Click "Run Calibration" to analyze system performance.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Domain-specific tabs */}
          {["agents", "usefulness", "context", "redundancy"].map((tab) => {
            const domainMap: Record<string, string> = {
              agents: "META_AGENT_PERFORMANCE",
              usefulness: "PROPOSAL_USEFULNESS",
              context: "HISTORICAL_CONTEXT_VALUE",
              redundancy: "REDUNDANCY_GUARD_EFFECTIVENESS",
            };
            const domain = domainMap[tab];
            const domainSignals = signalsByDomain(domain);
            // Also include follow-through for usefulness
            const extra = tab === "usefulness" ? signalsByDomain("DECISION_FOLLOW_THROUGH") : [];
            const combined = [...domainSignals, ...extra];

            return (
              <TabsContent key={tab} value={tab} className="space-y-3">
                {combined.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No signals for this domain. Run calibration to generate analysis.
                    </CardContent>
                  </Card>
                ) : combined.map((s: any) => (
                  <SignalCard key={s.id} signal={s} />
                ))}
              </TabsContent>
            );
          })}

          {/* All Signals */}
          <TabsContent value="all">
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {allSignals.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No calibration signals yet.
                    </CardContent>
                  </Card>
                ) : allSignals.map((s: any) => (
                  <SignalCard key={s.id} signal={s} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Advisory Note */}
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
          <span>
            Calibration signals are <strong>advisory only</strong> and do not automatically tune the system.
            All tuning decisions require human review and approval.
          </span>
        </div>
      </div>
    </AppLayout>
  );
}

function SignalCard({ signal }: { signal: any }) {
  const strength = Number(signal.signal_strength || 0);
  const confidence = Number(signal.confidence_score || 0);
  const risk = Number(signal.risk_of_overcorrection || 0);
  const Icon = DOMAIN_ICONS[signal.calibration_domain] || Activity;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm flex-1">{signal.title}</CardTitle>
          <Badge variant={strengthBadge(strength)}>
            {signal.signal_type?.replace(/_/g, " ")}
          </Badge>
        </div>
        <CardDescription>{signal.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Strength</span>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={strength * 100} className="h-1.5 flex-1" />
              <span className={`font-mono ${strengthColor(strength)}`}>{(strength * 100).toFixed(0)}%</span>
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Confidence</span>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={confidence * 100} className="h-1.5 flex-1" />
              <span className="font-mono">{(confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Overcorrection Risk</span>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={risk * 100} className="h-1.5 flex-1" />
              <span className="font-mono">{(risk * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
        {signal.recommended_action && (
          <>
            <Separator />
            <div className="text-xs">
              <span className="text-muted-foreground font-medium">Recommended Action: </span>
              {signal.recommended_action}
            </div>
          </>
        )}
        {signal.evidence_refs && Array.isArray(signal.evidence_refs) && signal.evidence_refs.length > 0 && (
          <details className="text-xs">
            <summary className="text-muted-foreground cursor-pointer hover:text-foreground">Evidence</summary>
            <pre className="mt-1 bg-muted/50 rounded p-2 overflow-auto text-[10px]">
              {JSON.stringify(signal.evidence_refs, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
