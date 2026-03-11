import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ShieldCheck, TrendingUp, TrendingDown, AlertTriangle, HelpCircle, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useQuery } from "@tanstack/react-query";

function useOutcomeAssurance(orgId: string | undefined) {
  const invoke = (action: string, extra?: Record<string, unknown>) =>
    supabase.functions.invoke("outcome-assurance", { body: { action, organization_id: orgId, ...extra } }).then(r => r.data);

  const overview = useQuery({ queryKey: ["outcome-assurance-overview", orgId], queryFn: () => invoke("overview"), enabled: !!orgId });
  const postures = useQuery({ queryKey: ["outcome-assurance-postures", orgId], queryFn: () => invoke("list_assurance_postures"), enabled: !!orgId });
  return { overview, postures, invoke };
}

export default function OutcomeAssurance() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const { overview, postures, invoke } = useOutcomeAssurance(orgId);
  const ov = overview.data as Record<string, any> | null;
  const items = ((postures.data as any)?.postures || []) as any[];
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    invoke("assurance_posture_detail", { posture_id: selected.id }).then(setDetail);
  }, [selected]);

  const kpis = ov ? [
    { label: "Total Postures", value: ov.total_postures ?? 0 },
    { label: "High Confidence", value: ov.high_confidence ?? 0, good: true },
    { label: "Low Confidence", value: ov.low_confidence ?? 0, warn: true },
    { label: "High Uncertainty", value: ov.high_uncertainty ?? 0, warn: true },
    { label: "High Risk", value: ov.high_risk ?? 0, warn: true },
    { label: "Blockers", value: ov.total_blockers ?? 0, warn: true },
    { label: "Pending Reviews", value: ov.pending_reviews ?? 0 },
    { label: "Open Recs", value: ov.open_recommendations ?? 0 },
  ] : [];

  return (
    <AppShell>
      <div className="space-y-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Outcome Assurance 2.0</h1>
              <p className="text-sm text-muted-foreground">Synthesized delivery confidence, readiness, risk & uncertainty — advisory-first</p>
            </div>
            <Badge variant="outline" className="ml-auto border-primary/30 text-primary">Block Q Complete</Badge>
          </div>

          {kpis.length > 0 && (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
              {kpis.map(k => (
                <Card key={k.label} className="border-border/50">
                  <CardContent className="p-3 text-center">
                    <p className={`text-lg font-bold font-mono ${k.warn ? "text-yellow-400" : k.good ? "text-emerald-400" : ""}`}>{k.value}</p>
                    <p className="text-[10px] text-muted-foreground">{k.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Tabs defaultValue="all">
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="high_conf" className="text-xs">High Confidence</TabsTrigger>
              <TabsTrigger value="low_conf" className="text-xs">Low Confidence</TabsTrigger>
              <TabsTrigger value="high_risk" className="text-xs">High Risk</TabsTrigger>
              <TabsTrigger value="blockers" className="text-xs">With Blockers</TabsTrigger>
            </TabsList>

            {["all", "high_conf", "low_conf", "high_risk", "blockers"].map(tab => (
              <TabsContent key={tab} value={tab} className="mt-4 space-y-2">
                {items
                  .filter((p: any) => {
                    if (tab === "high_conf") return p.confidence_score >= 0.7;
                    if (tab === "low_conf") return p.confidence_score < 0.4;
                    if (tab === "high_risk") return p.risk_score > 0.6;
                    if (tab === "blockers") return p.blocker_count > 0;
                    return true;
                  })
                  .slice(0, 30)
                  .map((p: any) => (
                    <Card key={p.id} className="border-border/50 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setSelected(p)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-sm">{p.posture_label}</p>
                          <PostureBadge status={p.posture_status} />
                        </div>
                        <div className="grid grid-cols-5 gap-3">
                          <ScoreBar label="Confidence" value={p.confidence_score} />
                          <ScoreBar label="Readiness" value={p.readiness_score} />
                          <ScoreBar label="Reliability" value={p.reliability_score} />
                          <ScoreBar label="Risk" value={p.risk_score} warn />
                          <ScoreBar label="Uncertainty" value={p.uncertainty_score} warn />
                        </div>
                        {p.blocker_count > 0 && (
                          <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {p.blocker_count} blocker(s)</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                {items.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShieldCheck className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No assurance postures yet.</p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
            <SheetContent className="w-[480px] sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  {selected?.posture_label}
                </SheetTitle>
              </SheetHeader>

              {detail && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <ScoreBar label="Confidence" value={detail.posture?.confidence_score} />
                    <ScoreBar label="Readiness" value={detail.posture?.readiness_score} />
                    <ScoreBar label="Reliability" value={detail.posture?.reliability_score} />
                    <ScoreBar label="Risk" value={detail.posture?.risk_score} warn />
                    <ScoreBar label="Uncertainty" value={detail.posture?.uncertainty_score} warn />
                  </div>

                  {detail.posture?.review_summary && (
                    <Card className="border-border/50">
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground mb-1">Review Summary</p>
                        <p className="text-sm">{detail.posture.review_summary}</p>
                      </CardContent>
                    </Card>
                  )}

                  {(detail.factors || []).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Contributing Factors ({detail.factors.length})</p>
                      <div className="space-y-1">
                        {detail.factors.map((f: any) => (
                          <div key={f.id} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/30">
                            {f.factor_direction === "positive" ? <TrendingUp className="h-3 w-3 text-emerald-400" /> :
                             f.factor_direction === "negative" ? <TrendingDown className="h-3 w-3 text-red-400" /> :
                             f.factor_direction === "uncertain" ? <HelpCircle className="h-3 w-3 text-yellow-400" /> :
                             <CheckCircle2 className="h-3 w-3 text-muted-foreground" />}
                            <span className="flex-1">{f.factor_label || f.factor_type}</span>
                            <span className="font-mono text-muted-foreground">{((f.weight || 0) * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(detail.recommendations || []).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Recommendations ({detail.recommendations.length})</p>
                      <div className="space-y-1">
                        {detail.recommendations.map((r: any) => (
                          <div key={r.id} className="text-xs p-2 rounded bg-muted/30 flex items-center gap-2">
                            <Badge className="text-[9px]" variant="outline">{r.recommendation_type}</Badge>
                            <span className="flex-1">{r.recommendation_text}</span>
                            <PostureBadge status={r.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(detail.reviews || []).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Review History ({detail.reviews.length})</p>
                      <div className="space-y-1">
                        {detail.reviews.map((r: any) => (
                          <div key={r.id} className="text-xs p-2 rounded bg-muted/30 flex items-center justify-between">
                            <span>{r.review_notes || "No notes"}</span>
                            <PostureBadge status={r.review_status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground italic">Advisory-first: assurance posture does not trigger autonomous structural changes.</p>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function PostureBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    assessed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    reviewed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    accepted: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    flagged: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    archived: "bg-muted text-muted-foreground",
    open: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
    dismissed: "bg-muted text-muted-foreground",
  };
  return <Badge className={`text-[10px] ${styles[status] || "bg-muted text-muted-foreground"}`}>{status}</Badge>;
}

function ScoreBar({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  const pct = (value || 0) * 100;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className={`text-[10px] font-mono ${warn && pct > 50 ? "text-yellow-400" : ""}`}>{pct.toFixed(0)}%</span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}
