import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ProposalCounts, ProposalsData } from "@/hooks/useGovernanceInsightsData";
import { BookOpen, Settings2, Bot, Gauge, ChevronRight, Layers } from "lucide-react";

function SeverityBadge({ severity, count }: { severity: string; count: number }) {
  const colors: Record<string, string> = {
    critical: "bg-destructive/20 text-destructive border-destructive/30",
    high: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    medium: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    low: "bg-muted text-muted-foreground",
    info: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={`text-[10px] ${colors[severity] || colors.info}`}>
      {severity}: {count}
    </Badge>
  );
}

function ProposalSection({ title, icon: Icon, data, color }: {
  title: string; icon: React.ElementType; data: ProposalCounts; color: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (data.total === 0) {
    return (
      <Card className="border-border/30 opacity-60">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${color}`} />
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Badge variant="secondary" className="ml-auto text-xs">No proposals</Badge>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <Card className="border-border/40">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-secondary/30 transition-colors">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <div className="ml-auto flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{data.total} total</Badge>
                {data.proposed > 0 && <Badge className="text-xs bg-yellow-500/20 text-yellow-500 border-yellow-500/30">{data.proposed} pending</Badge>}
                {data.highSeverity > 0 && <Badge variant="destructive" className="text-xs">{data.highSeverity} high sev</Badge>}
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStat label="Proposed" value={data.proposed} color="text-yellow-500" />
              <MiniStat label="Under Review" value={data.under_review} color="text-blue-500" />
              <MiniStat label="Accepted" value={data.accepted} color="text-emerald-500" />
              <MiniStat label="Rejected" value={data.rejected} color="text-destructive" />
            </div>

            {Object.keys(data.byType).length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase">By Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(data.byType).map(([type, count]) => (
                    <Badge key={type} variant="secondary" className="text-[10px] font-mono">
                      {type.replace(/_/g, " ")}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(data.bySeverity).length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase">By Severity</p>
                <div className="flex gap-2">
                  {Object.entries(data.bySeverity).map(([sev, count]) => (
                    <SeverityBadge key={sev} severity={sev} count={count as number} />
                  ))}
                </div>
              </div>
            )}

            {data.recent.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase">Recent Proposals</p>
                <div className="space-y-1.5">
                  {data.recent.map((p: any, i: number) => (
                    <div key={p.id || i} className="flex items-center gap-3 p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {p.recommendation || p.evidence_summary || p.rationale || "Proposal"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-[10px]">
                            {(p.proposal_type || "unknown").replace(/_/g, " ")}
                          </Badge>
                          {p.confidence != null && (
                            <span className="text-[10px] text-muted-foreground">
                              conf: {(p.confidence * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {(p.review_status || "proposed").replace(/_/g, " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-secondary/50 rounded-md p-2 text-center">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}

export function EvolutionProposalsPanel({ data }: { data: ProposalsData }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Layers className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Evolution Proposals</h3>
        <Badge variant="outline" className="text-xs ml-auto">{data.totalProposals} total</Badge>
        {data.pendingReview > 0 && (
          <Badge className="text-xs bg-yellow-500/20 text-yellow-500 border-yellow-500/30">{data.pendingReview} pending review</Badge>
        )}
      </div>

      <ProposalSection title="Canon Evolution" icon={BookOpen} data={data.canonEvolution} color="text-primary" />
      <ProposalSection title="Policy Tuning" icon={Settings2} data={data.policyTuning} color="text-blue-500" />
      <ProposalSection title="Agent Selection Tuning" icon={Bot} data={data.agentSelectionTuning} color="text-emerald-500" />
      <ProposalSection title="Readiness Tuning" icon={Gauge} data={data.readinessTuning} color="text-yellow-500" />
    </div>
  );
}
